// Simple User Management Modal - Clean, Functional & Maintainable
// Replaces the complex 100KB+ version with a 5-10KB solution
// ✅ Password system: Admin can change any password, users can change their own
// ✅ 4-digit PINs allowed, simple validation
// ✅ Keeps all existing user management functionality

// Remove existing userManagementModal if already defined
if (window.userManagementModal) {
    console.log('🔧 Removing existing complex userManagementModal');
    delete window.userManagementModal;
}

const userManagementModal = {
    modal: null,
    userGroupMap: {},
    editingUser: null,

    // =================== MAIN FUNCTIONS ===================
    
    /**
     * Show user management modal (main entry point)
     */
    async show() {
        console.log('👥 Opening user management modal');
        this.loadUserGroupMapping();
        this.createModal();
        this.renderUserList();
    },

    /**
     * Load user-group mapping from storage
     */
    loadUserGroupMapping() {
        try {
            const mapping = JSON.parse(localStorage.getItem('metafold_user_group_mapping') || '{}');
            this.userGroupMap = mapping;
            console.log('📊 User-group mapping loaded:', Object.keys(this.userGroupMap).length, 'users');
        } catch (error) {
            console.warn('Error loading user-group mapping:', error);
            this.userGroupMap = {};
        }
    },

    /**
     * Save user-group mapping to storage
     */
    saveUserGroupMapping() {
        try {
            localStorage.setItem('metafold_user_group_mapping', JSON.stringify(this.userGroupMap));
            console.log('💾 User-group mapping saved');
        } catch (error) {
            console.warn('Error saving user-group mapping:', error);
        }
    },

    // =================== UI CREATION ===================

    /**
     * Create the modal UI - ENHANCED: Auto-enable password system, remove enable button
     */
    createModal() {
        // Remove existing modal
        const existingModal = document.getElementById('userManagementModal');
        if (existingModal) {
            existingModal.remove();
        }

        const currentUser = window.userManager?.currentUser;
        const isAdmin = currentUser === 'Admin';
        
        // AUTO-ENABLE password system when User Management is opened
        const passwordSystemEnabled = this.ensurePasswordSystemEnabled();

        const modalHTML = `
            <div id="userManagementModal">
                <div class="user-modal-container">
                    <!-- Header -->
                    <div class="user-modal-header">
                        <h2 class="user-modal-title">
                            👥 User Management
                            <span style="color: #f59e0b; font-size: 1.2rem; margin-left: 0.5rem;">🔐</span>
                        </h2>
                        <button onclick="userManagementModal.close()" class="user-modal-close">×</button>
                    </div>
                    
                    <!-- Password Management Section -->
                    <div class="user-modal-section password-section">
                        <h3 class="section-title">🔑 Password Management</h3>
                        <p class="section-description">
                            ${isAdmin ? 'As Admin, you can set/reset passwords for any user. Leave empty to remove password.' : 'You can change your own password below. Leave empty to remove password.'}
                        </p>
                        <div class="${isAdmin ? 'password-grid' : 'password-grid single-col'}">
                            ${isAdmin ? `
                                <div class="form-group">
                                    <label class="form-label">User:</label>
                                    <select id="passwordUser" class="form-select">
                                        <option value="">Select user...</option>
                                    </select>
                                </div>
                            ` : ''}
                            <div class="form-group">
                                <label class="form-label">
                                    New Password/PIN: 
                                    <span style="color: #9ca3af; font-weight: normal; font-size: 0.8rem;">(empty = no password)</span>
                                </label>
                                <input type="password" id="newPassword" placeholder="4+ chars or leave empty" class="form-input">
                            </div>
                            <button onclick="userManagementModal.setPassword()" class="btn btn-warning">🔑 Set/Clear</button>
                        </div>
                        <small class="section-description" style="margin-top: 1rem; margin-bottom: 0;">
                            🔐 Optional passwords: Users can work without passwords. Leave empty to disable password for a user.
                        </small>
                    </div>
                    
                    <!-- Add User Section -->
                    <div class="user-modal-section add-user-section">
                        <h3 class="section-title">➕ Add New User</h3>
                        <div class="add-user-grid">
                            <div class="form-group">
                                <label class="form-label">Name:</label>
                                <input type="text" id="newUserName" placeholder="Dr. John Doe" class="form-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Group:</label>
                                <input type="text" id="newUserGroup" placeholder="Lab A" class="form-input">
                            </div>
                            <button onclick="userManagementModal.addUser()" class="btn btn-success">➕ Add</button>
                        </div>
                        <small class="section-description" style="margin-top: 1rem; margin-bottom: 0;">
                            💡 Users are organized by groups for template sharing. No password required initially.
                        </small>
                    </div>
                    
                    <!-- Edit User Section (Initially Hidden) -->
                    <div id="editUserSection" class="user-modal-section edit-user-section">
                        <h3 class="section-title" style="color: #f59e0b;">✏️ Edit User</h3>
                        <div class="edit-user-grid">
                            <div class="form-group">
                                <label class="form-label">Name:</label>
                                <input type="text" id="editUserName" class="form-input edit-input">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Group:</label>
                                <input type="text" id="editUserGroup" class="form-input edit-input">
                            </div>
                            <button onclick="userManagementModal.saveUserEdit()" class="btn btn-success btn-small">💾 Save</button>
                            <button onclick="userManagementModal.cancelUserEdit()" class="btn btn-secondary btn-small">❌ Cancel</button>
                        </div>
                    </div>
                    
                    <!-- User List -->
                    <div>
                        <h3 class="section-title">📋 Existing Users</h3>
                        <div id="userList"></div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <button onclick="userManagementModal.close()" class="btn btn-secondary" style="padding: 0.75rem 2rem;">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('userManagementModal');

        // Setup event listeners
        this.setupEventListeners();

        // Focus on name input
        setTimeout(() => {
            const nameInput = document.getElementById('newUserName');
            if (nameInput) nameInput.focus();
        }, 100);
    },

    /**
     * Setup event listeners for the modal
     */
    setupEventListeners() {
        // Enter key support for add user
        ['newUserName', 'newUserGroup', 'editUserName', 'editUserGroup'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        if (id.startsWith('new')) {
                            this.addUser();
                        } else if (id.startsWith('edit')) {
                            this.saveUserEdit();
                        }
                    }
                });
            }
        });

        // Password management enter key
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.setPassword();
                }
            });
        }

        // Populate password user select if admin
        const currentUser = window.userManager?.currentUser;
        if (currentUser === 'Admin' && this.isPasswordSystemEnabled()) {
            setTimeout(() => {
                this.populatePasswordUserSelect();
            }, 100);
        }
    },

    /**
     * Populate password user select for admin
     */
    populatePasswordUserSelect() {
        const userSelect = document.getElementById('passwordUser');
        if (!userSelect) return;

        const users = window.userManager?.users || [];
        userSelect.innerHTML = '<option value="">Select user...</option>';

        users.forEach(user => {
            const hasPassword = window.secureStorage?.hasUserPassword?.(user) ? '🔒' : '';
            userSelect.innerHTML += `<option value="${user}">${user} ${hasPassword}</option>`;
        });
    },

    // =================== USER MANAGEMENT ACTIONS ===================

    /**
     * Add new user
     */
    async addUser() {
        const nameInput = document.getElementById('newUserName');
        const groupInput = document.getElementById('newUserGroup');

        if (!nameInput || !groupInput) {
            this.showError('Input fields not found');
            return;
        }

        const name = nameInput.value.trim();
        const group = groupInput.value.trim();

        if (!name || !group) {
            this.showError('Please enter both name and group');
            return;
        }

        if (name.length < 2) {
            this.showError('Name must be at least 2 characters long');
            return;
        }

        if (window.userManager?.users?.includes(name)) {
            this.showError('User already exists');
            return;
        }

        try {
            // Add user to history
            if (window.userManager?.addUserToHistory) {
                window.userManager.addUserToHistory(name, group);
            }

            // Store user-group mapping
            this.userGroupMap[name] = group;
            this.saveUserGroupMapping();

            // Clear inputs
            nameInput.value = '';
            groupInput.value = '';

            // Refresh UI
            this.renderUserList();
            this.populatePasswordUserSelect(); // Update password dropdown
            this.showSuccess(`User "${name}" added to group "${group}"`);

            // Focus back to name input
            nameInput.focus();

            console.log(`✅ User added: ${name} (${group})`);

        } catch (error) {
            console.error('Error adding user:', error);
            this.showError('Failed to add user: ' + error.message);
        }
    },

    /**
     * Start editing a user (with permission check)
     */
    startEditUser(username, group) {
        const currentUser = window.userManager?.currentUser;
        
        // Permission check: Admin can edit anyone, users can edit themselves
        if (currentUser !== 'Admin' && currentUser !== username) {
            this.showError('You can only edit your own account.');
            return;
        }

        console.log(`✏️ Starting edit for user: ${username}`);

        this.editingUser = username;

        // Show edit section
        const editSection = document.getElementById('editUserSection');
        if (editSection) {
            editSection.style.display = 'block';

            // Fill edit fields
            const nameInput = document.getElementById('editUserName');
            const groupInput = document.getElementById('editUserGroup');
            if (nameInput) nameInput.value = username;
            if (groupInput) groupInput.value = group;

            // Focus on name field
            setTimeout(() => {
                if (nameInput) nameInput.focus();
            }, 100);
        }

        // Re-render user list to show editing state
        this.renderUserList();
        this.showSuccess(`Editing user "${username}"`);
    },

    /**
     * Save user edit
     */
    async saveUserEdit() {
        const nameInput = document.getElementById('editUserName');
        const groupInput = document.getElementById('editUserGroup');

        if (!nameInput || !groupInput || !this.editingUser) {
            this.showError('Edit form not available or no user being edited');
            return;
        }

        const newName = nameInput.value.trim();
        const newGroup = groupInput.value.trim();
        const oldName = this.editingUser;

        // Validation
        if (!newName || !newGroup) {
            this.showError('Please enter both name and group');
            return;
        }

        if (newName.length < 2) {
            this.showError('Name must be at least 2 characters long');
            return;
        }

        // Check if new name conflicts with existing user (but not self)
        if (newName !== oldName && window.userManager?.users?.includes(newName)) {
            this.showError('A user with this name already exists');
            return;
        }

        try {
            await this.performUserUpdate(oldName, newName, newGroup);
            this.showSuccess(`User updated: "${newName}" (${newGroup})`);
            this.cancelUserEdit();
            this.renderUserList();

        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Failed to update user: ' + error.message);
        }
    },

    /**
     * Perform user update (including data migration)
     */
    async performUserUpdate(oldName, newName, newGroup) {
        console.log(`🔄 Updating user: "${oldName}" → "${newName}", Group: "${newGroup}"`);

        // Update user list
        if (window.userManager?.users) {
            const userIndex = window.userManager.users.indexOf(oldName);
            if (userIndex >= 0) {
                window.userManager.users[userIndex] = newName;

                // Update current user if necessary
                if (window.userManager.currentUser === oldName) {
                    window.userManager.currentUser = newName;
                    window.userManager.currentGroup = newGroup;
                }

                // Save updated user list
                localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
            }
        }

        // Update user-group mapping
        if (oldName !== newName) {
            delete this.userGroupMap[oldName];
        }
        this.userGroupMap[newName] = newGroup;
        this.saveUserGroupMapping();

        // Migrate storage keys if name changed
        if (oldName !== newName) {
            await this.migrateUserStorage(oldName, newName);
        }

        console.log('✅ User update completed');
    },

    /**
     * Migrate user storage keys
     */
    async migrateUserStorage(oldName, newName) {
        console.log(`📦 Migrating storage: "${oldName}" → "${newName}"`);

        const oldPrefix = `metafold_${oldName}_`;
        const newPrefix = `metafold_${newName}_`;
        const keysToMigrate = [];

        // Find keys to migrate
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(oldPrefix)) {
                keysToMigrate.push(key);
            }
        }

        // Migrate each key
        keysToMigrate.forEach(oldKey => {
            const newKey = oldKey.replace(oldPrefix, newPrefix);
            const data = localStorage.getItem(oldKey);
            if (data) {
                localStorage.setItem(newKey, data);
                localStorage.removeItem(oldKey);
            }
        });

        console.log(`✅ Migrated ${keysToMigrate.length} storage keys`);
    },

    /**
     * Cancel user edit
     */
    cancelUserEdit() {
        this.editingUser = null;

        const editSection = document.getElementById('editUserSection');
        if (editSection) {
            editSection.style.display = 'none';
        }

        // Clear edit fields
        const nameInput = document.getElementById('editUserName');
        const groupInput = document.getElementById('editUserGroup');
        if (nameInput) nameInput.value = '';
        if (groupInput) groupInput.value = '';

        this.renderUserList();
    },

    /**
     * Switch to user (with password check if needed)
     */
    async switchToUser(username, group) {
        try {
            const currentUser = window.userManager?.currentUser;

            if (username === currentUser) {
                this.showError('You are already logged in as this user');
                return;
            }

            console.log(`🔄 Switching to user: ${username}`);

            // Check if user has password
            const hasPassword = this.isPasswordSystemEnabled() && 
                              window.secureStorage?.hasUserPassword?.(username);

            if (hasPassword) {
                const password = await this.promptForPassword(username);
                if (!password) {
                    console.log('❌ Switch cancelled - no password provided');
                    return;
                }

                const isValid = await window.secureStorage.verifyUserPassword(username, password);
                if (!isValid) {
                    this.showError('Invalid password');
                    return;
                }

                console.log(`✅ Password verified for user switch: ${username}`);
            }

            // Perform switch
            if (window.userManager?.switchUser) {
                await window.userManager.switchUser(username, group);
                this.close();
                this.showSuccess(`Switched to user: ${username}`);
            } else {
                throw new Error('UserManager switchUser function not available');
            }

        } catch (error) {
            console.error('Error during user switch:', error);
            this.showError('User switch failed: ' + error.message);
        }
    },

    /**
     * Delete user (with permission check)
     */
    deleteUser(username) {
        const currentUser = window.userManager?.currentUser;
        const group = this.userGroupMap[username] || 'Default';

        // Permission check: Admin can delete others (but not self), users cannot delete
        if (currentUser !== 'Admin') {
            this.showError('Only Admin can delete users');
            return;
        }

        if (username === currentUser) {
            this.showError('You cannot delete your own account while logged in');
            return;
        }

        const confirmed = confirm(
            `Delete user "${username}" from group "${group}"?\n\n` +
            `⚠️ This will permanently remove:\n` +
            `• User from the system\n` +
            `• All user data and settings\n` +
            `• User's password (if set)\n\n` +
            `This action cannot be undone!`
        );

        if (!confirmed) return;

        try {
            this.performUserDeletion(username);
            this.renderUserList();
            this.populatePasswordUserSelect(); // Update password dropdown
            this.showSuccess(`User "${username}" deleted successfully`);

        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user: ' + error.message);
        }
    },

    /**
     * Perform user deletion
     */
    performUserDeletion(username) {
        console.log(`🗑️ Deleting user: "${username}"`);

        // Remove from user list
        if (window.userManager?.users) {
            const userIndex = window.userManager.users.indexOf(username);
            if (userIndex >= 0) {
                window.userManager.users.splice(userIndex, 1);
                localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
            }
        }

        // Remove from user-group mapping
        delete this.userGroupMap[username];
        this.saveUserGroupMapping();

        // Remove user password if exists
        if (window.secureStorage?.removeUserPassword) {
            window.secureStorage.removeUserPassword(username);
        }

        // Remove all storage keys for this user
        const userPrefix = `metafold_${username}_`;
        const passwordKey = `user_password_${username}`;
        const keysToDelete = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith(userPrefix) || key === passwordKey)) {
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
        });

        console.log(`✅ User "${username}" deleted (${keysToDelete.length} storage keys removed)`);
    },

    // =================== PASSWORD MANAGEMENT ===================

    /**
     * Set password for user (ENHANCED: Supports empty passwords to remove protection)
     */
    async setPassword() {
        const currentUser = window.userManager?.currentUser;
        const passwordInput = document.getElementById('newPassword');
        const userSelect = document.getElementById('passwordUser');

        if (!passwordInput) {
            this.showError('Password input not found');
            return;
        }

        let targetUser;
        if (currentUser === 'Admin') {
            // Admin can set password for any user
            targetUser = userSelect?.value || currentUser;
            if (!targetUser || targetUser === '') {
                this.showError('Please select a user');
                return;
            }
        } else {
            // Regular users can only change their own password
            targetUser = currentUser;
        }

        const password = passwordInput.value;

        // Allow empty password to remove protection
        if (password === '') {
            return this.removeUserPassword(targetUser, passwordInput, userSelect);
        }

        // Validate non-empty password
        if (password.length < 4) {
            this.showError('Password must be at least 4 characters long (or leave empty to remove password)');
            return;
        }

        try {
            // Set password
            await window.secureStorage.storeUserPassword(targetUser, password);

            // Clear form
            passwordInput.value = '';
            if (userSelect) userSelect.value = '';

            // Refresh UI
            this.renderUserList();
            this.populatePasswordUserSelect(); // Update dropdown indicators
            this.showSuccess(`🔑 Password set for user "${targetUser}"`);

            console.log(`🔑 Password set for user: ${targetUser}`);

        } catch (error) {
            console.error('Error setting password:', error);
            this.showError('Failed to set password: ' + error.message);
        }
    },

    /**
     * Prompt for password (modal)
     */
    async promptForPassword(username) {
        return new Promise((resolve) => {
            const promptHTML = `
                <div id="passwordPrompt" style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;
                    z-index: 10003; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                ">
                    <div style="
                        background: linear-gradient(135deg, #1e1e2e, #2a2a40); padding: 2rem; border-radius: 16px;
                        max-width: 400px; width: 90%; box-shadow: 0 20px 40px rgba(0,0,0,0.6);
                        border: 1px solid rgba(255, 255, 255, 0.1); color: #e0e0e0;
                    ">
                        <h3 style="margin: 0 0 1rem 0; color: #7c3aed; text-align: center; font-size: 1.3rem;">🔐 Password Required</h3>
                        <p style="color: #9ca3af; text-align: center; margin-bottom: 1.5rem;">
                            Enter password for <strong style="color: #a855f7;">${username}</strong>:
                        </p>
                        <input type="password" id="promptPassword" placeholder="Enter password" autofocus style="
                            width: 100%; padding: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 8px; font-size: 1rem; box-sizing: border-box;
                            background: rgba(255, 255, 255, 0.05); color: #e0e0e0; font-family: inherit;
                            margin-bottom: 1.5rem; outline: none;
                        " onfocus="this.style.borderColor='#7c3aed'"
                           onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'">
                        <div style="display: flex; gap: 1rem;">
                            <button onclick="document.getElementById('passwordPrompt').remove(); resolve(null);" 
                                    style="flex: 1; background: linear-gradient(45deg, #6b7280, #9ca3af);
                                           color: white; border: none; padding: 0.75rem; border-radius: 8px;
                                           cursor: pointer; font-weight: 600;">Cancel</button>
                            <button onclick="
                                const pwd = document.getElementById('promptPassword').value;
                                document.getElementById('passwordPrompt').remove();
                                resolve(pwd);
                            " style="flex: 1; background: linear-gradient(45deg, #7c3aed, #a855f7);
                                     color: white; border: none; padding: 0.75rem; border-radius: 8px;
                                     cursor: pointer; font-weight: 600;">Continue</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', promptHTML);

            // Focus and enter key support
            setTimeout(() => {
                const input = document.getElementById('promptPassword');
                if (input) {
                    input.focus();
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const pwd = input.value;
                            document.getElementById('passwordPrompt').remove();
                            resolve(pwd);
                        }
                    });
                }
            }, 100);
        });
    },

    // =================== USER LIST RENDERING ===================

    /**
     * Render user list
     */
    renderUserList() {
        const listContainer = document.getElementById('userList');
        if (!listContainer) return;

        const users = window.userManager?.users || [];
        const currentUser = window.userManager?.currentUser;

        if (users.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #9ca3af;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">👤</div>
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">No users yet</div>
                    <div style="font-size: 0.9rem;">Add your first user above to get started!</div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = users.map(user => {
            const group = this.userGroupMap[user] || 'Default';
            const color = window.userManager?.generateUserColor?.(user) || '#7c3aed';
            const initials = window.userManager?.getUserInitials?.(user) || '??';
            const isCurrent = user === currentUser;
            const isEditing = this.editingUser === user;
            const isAdmin = user === 'Admin';
            const hasPassword = this.isPasswordSystemEnabled() && 
                              window.secureStorage?.hasUserPassword?.(user);

            return `
                <div style="
                    display: flex; align-items: center; padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s ease;
                    ${isCurrent ? 'background: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed;' : ''}
                    ${isEditing ? 'background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b;' : ''}
                " onmouseover="${!isCurrent && !isEditing ? 'this.style.background="rgba(255,255,255,0.05)"' : ''}"
                   onmouseout="${!isCurrent && !isEditing ? 'this.style.background="transparent"' : ''}">
                    
                    <!-- Avatar -->
                    <div style="
                        width: 40px; height: 40px; border-radius: 50%; background: ${color}; color: white;
                        display: flex; align-items: center; justify-content: center; font-weight: bold;
                        font-size: 0.9rem; margin-right: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        position: relative;
                    ">
                        ${initials}
                        ${hasPassword ? `
                            <div style="position: absolute; bottom: -2px; right: -2px; width: 16px; height: 16px;
                                        background: #10b981; border-radius: 50%; display: flex; align-items: center;
                                        justify-content: center; font-size: 10px; border: 2px solid #1e1e2e;">🔒</div>
                        ` : ''}
                        ${isAdmin ? `
                            <div style="position: absolute; top: -2px; right: -2px; width: 16px; height: 16px;
                                        background: #f59e0b; border-radius: 50%; display: flex; align-items: center;
                                        justify-content: center; font-size: 10px; border: 2px solid #1e1e2e;">👑</div>
                        ` : ''}
                    </div>
                    
                    <!-- User Info -->
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-weight: 600; color: #e0e0e0; font-size: 1rem;">${user}</span>
                            ${isAdmin ? '<span style="color: #f59e0b; font-size: 0.8rem; font-weight: 600;">ADMIN</span>' : ''}
                            ${hasPassword ? '<span style="color: #10b981; font-size: 0.8rem;">🔒 Protected</span>' : ''}
                            ${isCurrent ? '<span style="color: #7c3aed; font-size: 0.8rem; font-weight: 600;">CURRENT</span>' : ''}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9rem; margin-top: 2px;">
                            Group: ${group}
                            ${isEditing ? ' <span style="color: #f59e0b; font-weight: 600;">(editing)</span>' : ''}
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${!isEditing && (currentUser === 'Admin' || currentUser === user) ? `
                            <button onclick="userManagementModal.startEditUser('${user}', '${group}')" style="
                                background: linear-gradient(45deg, #f59e0b, #d97706); color: white; border: none;
                                padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
                                font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
                            " onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">✏️ Edit</button>
                        ` : ''}
                        ${!isCurrent ? `
                            <button onclick="userManagementModal.switchToUser('${user}', '${group}')" style="
                                background: linear-gradient(45deg, #7c3aed, #a855f7); color: white; border: none;
                                padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
                                font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
                            " onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">Switch</button>
                        ` : `
                            <button disabled style="
                                background: rgba(124, 58, 237, 0.2); color: #9ca3af; border: none;
                                padding: 0.5rem 1rem; border-radius: 8px; cursor: not-allowed; font-size: 0.9rem;
                                font-weight: 600;">✓ Active</button>
                        `}
                        ${!isCurrent && !isEditing && currentUser === 'Admin' && user !== 'Admin' ? `
                            <button onclick="userManagementModal.deleteUser('${user}')" style="
                                background: linear-gradient(45deg, #dc2626, #ef4444); color: white; border: none;
                                padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem;
                                font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
                            " onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">🗑️ Delete</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // =================== PASSWORD MANAGEMENT ENHANCED ===================

    /**
     * Auto-enable password system when User Management is opened (ENHANCED)
     */
    ensurePasswordSystemEnabled() {
        try {
            console.log('🔐 Auto-enabling password system for User Management...');
            
            // Auto-enable password system when User Management is accessed
            if (window.settingsManager?.settings) {
                window.settingsManager.settings['security.password_system_enabled'] = true;
                window.settingsManager.settings['security.password_min_length'] = 4;
                window.settingsManager.settings['security.allow_empty_passwords'] = true; // NEW: Allow optional passwords
                
                // Save settings
                if (typeof window.settingsManager.saveSettings === 'function') {
                    window.settingsManager.saveSettings();
                }
            }
            
            // Initialize secure storage if needed
            if (window.secureStorage && !window.secureStorage.isInitialized) {
                window.secureStorage.init().catch(err => {
                    console.warn('🔐 SecureStorage init warning:', err);
                });
            }
            
            console.log('✅ Password system auto-enabled (optional passwords allowed)');
            return true;
            
        } catch (error) {
            console.error('🔐 Auto-enable password system failed:', error);
            return false;
        }
    },

    /**
     * Remove password protection for user (NEW FUNCTION)
     */
    async removeUserPassword(targetUser, passwordInput, userSelect) {
        try {
            console.log(`🔓 Removing password protection for user: ${targetUser}`);
            
            // Remove password using secureStorage
            if (window.secureStorage?.removeUserPassword) {
                const success = window.secureStorage.removeUserPassword(targetUser);
                
                if (success) {
                    // Clear form
                    passwordInput.value = '';
                    if (userSelect) userSelect.value = '';

                    // Refresh UI
                    this.renderUserList();
                    this.populatePasswordUserSelect(); // Update dropdown indicators
                    this.showSuccess(`🔓 Password protection removed for "${targetUser}" - they can now login without a password`);

                    console.log(`✅ Password protection removed for user: ${targetUser}`);
                } else {
                    this.showError('Failed to remove password protection');
                }
            } else {
                this.showError('Password removal not available - secureStorage not initialized');
            }

        } catch (error) {
            console.error('Error removing password:', error);
            this.showError('Failed to remove password protection: ' + error.message);
        }
    },

    // =================== UTILITY FUNCTIONS ===================

    /**
     * Check if password system is enabled (ENHANCED: Always true for User Management)
     */
    isPasswordSystemEnabled() {
        try {
            // Password system is always enabled when User Management is opened
            // This simplifies the logic and removes the need for the enable button
            return true;
            
        } catch (error) {
            console.warn('🔐 Error checking password system:', error);
            return true; // Default to enabled
        }
    },

    // enablePasswordSystem() function removed - password system is now always enabled

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    /**
     * Show error message
     */
    showError(message) {
        this.showMessage(message, 'error');
    },

    /**
     * Show message toast
     */
    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-mgmt-message';

        const isError = type === 'error';
        const isSuccess = type === 'success';

        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10001;
            background: ${isError ? 'linear-gradient(45deg, #dc2626, #ef4444)' : 
                         isSuccess ? 'linear-gradient(45deg, #059669, #10b981)' : 
                         'linear-gradient(45deg, #7c3aed, #a855f7)'};
            color: white; padding: 1rem 1.5rem; border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3); font-family: inherit;
            font-weight: 500; max-width: 350px; animation: slideInRight 0.3s ease-out;
        `;

        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">${isError ? '⚠️' : isSuccess ? '✅' : 'ℹ️'}</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageDiv);

        // Add CSS animation if not exists
        if (!document.getElementById('userMgmtAnimations')) {
            const style = document.createElement('style');
            style.id = 'userMgmtAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // Auto-remove after time
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (messageDiv.parentElement) {
                        messageDiv.remove();
                    }
                }, 300);
            }
        }, isError ? 5000 : 3000);
    },

    /**
     * Close modal
     */
    close() {
        // Cancel any ongoing edit
        this.cancelUserEdit();

        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
};

// Make available globally
window.userManagementModal = userManagementModal;
console.log('✅ Simple User Management Modal loaded - Clean & Functional');