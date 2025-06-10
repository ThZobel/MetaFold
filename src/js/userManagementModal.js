// User Management Modal - ENHANCED with User Editing Functionality

const userManagementModal = {
    modal: null,
    userGroupMap: {}, // Stores User -> Group mapping
    editingUser: null, // Currently editing user

    show() {
        this.loadUserGroupMapping();
        this.createModal();
        this.renderUserList();
    },

    loadUserGroupMapping() {
        try {
            const mapping = JSON.parse(localStorage.getItem('metafold_user_group_mapping') || '{}');
            this.userGroupMap = mapping;
            console.log('📊 User-Group mapping loaded:', this.userGroupMap);
        } catch (error) {
            console.warn('Error loading user-group mapping:', error);
            this.userGroupMap = {};
        }
    },

    saveUserGroupMapping() {
        try {
            localStorage.setItem('metafold_user_group_mapping', JSON.stringify(this.userGroupMap));
            console.log('💾 User-Group mapping saved');
        } catch (error) {
            console.warn('Error saving user-group mapping:', error);
        }
    },

    createModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('userManagementModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modalHTML = `
            <div id="userManagementModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                backdrop-filter: blur(5px);
            ">
                <div style="
                    background: linear-gradient(135deg, #1e1e2e, #2a2a40);
                    padding: 2.5rem;
                    border-radius: 16px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 85vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #e0e0e0;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                        <h2 style="margin: 0; color: #7c3aed; font-size: 1.8rem;">👥 User Management</h2>
                        <button onclick="userManagementModal.close()" style="
                            background: rgba(255, 255, 255, 0.1);
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #9ca3af;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            transition: all 0.3s ease;
                        " onmouseover="this.style.background='rgba(255,255,255,0.2)'; this.style.color='#e0e0e0'"
                           onmouseout="this.style.background='rgba(255,255,255,0.1)'; this.style.color='#9ca3af'">✕</button>
                    </div>
                    
                    <!-- ADD NEW USER SECTION -->
                    <div style="margin-bottom: 2rem; padding: 1.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.1);">
                        <h3 style="margin: 0 0 1.5rem 0; color: #a855f7; font-size: 1.2rem;">➕ Add New User</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 1rem; align-items: end;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #d1d5db; font-size: 0.9rem;">Name:</label>
                                <input type="text" id="newUserName" placeholder="Dr. John Doe" style="
                                    width: 100%;
                                    padding: 0.75rem;
                                    border: 1px solid rgba(255, 255, 255, 0.2);
                                    border-radius: 8px;
                                    box-sizing: border-box;
                                    background: rgba(255, 255, 255, 0.05);
                                    color: #e0e0e0;
                                    font-size: 0.95rem;
                                    transition: all 0.3s ease;
                                " onfocus="this.style.borderColor='#7c3aed'"
                                   onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #d1d5db; font-size: 0.9rem;">Group:</label>
                                <input type="text" id="newUserGroup" placeholder="Lab A" style="
                                    width: 100%;
                                    padding: 0.75rem;
                                    border: 1px solid rgba(255, 255, 255, 0.2);
                                    border-radius: 8px;
                                    box-sizing: border-box;
                                    background: rgba(255, 255, 255, 0.05);
                                    color: #e0e0e0;
                                    font-size: 0.95rem;
                                    transition: all 0.3s ease;
                                " onfocus="this.style.borderColor='#7c3aed'"
                                   onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'">
                            </div>
                            <button onclick="userManagementModal.addUser()" style="
                                background: linear-gradient(45deg, #059669, #10b981);
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                white-space: nowrap;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">➕ Add</button>
                        </div>
                        <small style="color: #9ca3af; margin-top: 1rem; display: block; font-size: 0.85rem;">
                            💡 Users are automatically organized by groups for template sharing
                        </small>
                    </div>
                    
                    <!-- EDIT USER SECTION (Initially Hidden) -->
                    <div id="editUserSection" style="display: none; margin-bottom: 2rem; padding: 1.5rem; background: rgba(245, 158, 11, 0.1); border-radius: 12px; border: 1px solid rgba(245, 158, 11, 0.3);">
                        <h3 style="margin: 0 0 1.5rem 0; color: #f59e0b; font-size: 1.2rem;">✏️ Edit User</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 1rem; align-items: end;">
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #d1d5db; font-size: 0.9rem;">Name:</label>
                                <input type="text" id="editUserName" style="
                                    width: 100%;
                                    padding: 0.75rem;
                                    border: 1px solid rgba(245, 158, 11, 0.4);
                                    border-radius: 8px;
                                    box-sizing: border-box;
                                    background: rgba(255, 255, 255, 0.05);
                                    color: #e0e0e0;
                                    font-size: 0.95rem;
                                    transition: all 0.3s ease;
                                " onfocus="this.style.borderColor='#f59e0b'"
                                   onblur="this.style.borderColor='rgba(245, 158, 11, 0.4)'">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.5rem; font-weight: 600; color: #d1d5db; font-size: 0.9rem;">Group:</label>
                                <input type="text" id="editUserGroup" style="
                                    width: 100%;
                                    padding: 0.75rem;
                                    border: 1px solid rgba(245, 158, 11, 0.4);
                                    border-radius: 8px;
                                    box-sizing: border-box;
                                    background: rgba(255, 255, 255, 0.05);
                                    color: #e0e0e0;
                                    font-size: 0.95rem;
                                    transition: all 0.3s ease;
                                " onfocus="this.style.borderColor='#f59e0b'"
                                   onblur="this.style.borderColor='rgba(245, 158, 11, 0.4)'">
                            </div>
                            <button onclick="userManagementModal.saveUserEdit()" style="
                                background: linear-gradient(45deg, #059669, #10b981);
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                white-space: nowrap;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">💾 Save</button>
                            <button onclick="userManagementModal.cancelUserEdit()" style="
                                background: linear-gradient(45deg, #6b7280, #9ca3af);
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 8px;
                                cursor: pointer;
                                white-space: nowrap;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">❌ Cancel</button>
                        </div>
                        <small style="color: #f59e0b; margin-top: 1rem; display: block; font-size: 0.85rem;">
                            ⚠️ Changing the name will migrate all user data. Group changes affect template access.
                        </small>
                    </div>
                    
                    <!-- EXISTING USERS -->
                    <div>
                        <h3 style="margin: 0 0 1.5rem 0; color: #a855f7; font-size: 1.2rem;">📋 Existing Users</h3>
                        <div id="userList" style="
                            max-height: 320px;
                            overflow-y: auto;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 12px;
                            background: rgba(255, 255, 255, 0.02);
                        "></div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                        <button onclick="userManagementModal.close()" style="
                            background: linear-gradient(45deg, #374151, #4b5563);
                            color: white;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 12px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(75, 85, 99, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'"
                           onmouseout="this.style.transform='translateY(0)'">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('userManagementModal');
        
        // Enter key support for both add and edit inputs
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

        // Focus on name input
        setTimeout(() => {
            const nameInput = document.getElementById('newUserName');
            if (nameInput) nameInput.focus();
        }, 100);
    },

    renderUserList() {
        const listContainer = document.getElementById('userList');
        if (!listContainer) return;

        const users = window.userManager?.users || [];

        if (users.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #9ca3af;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">👤</div>
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">No users available yet</div>
                    <div style="font-size: 0.9rem;">Add the first user above to get started!</div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = users.map(user => {
            const group = this.userGroupMap[user] || 'Default';
            const color = window.userManager?.generateUserColor(user) || '#7c3aed';
            const initials = window.userManager?.getUserInitials(user) || '??';
            const isCurrent = user === window.userManager?.currentUser;
            const isEditing = this.editingUser === user;
            
            return `
                <div style="
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                    ${isCurrent ? 'background: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed;' : ''}
                    ${isEditing ? 'background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b;' : ''}
                " onmouseover="${!isCurrent && !isEditing ? 'this.style.background="rgba(255,255,255,0.05)"' : ''}"
                   onmouseout="${!isCurrent && !isEditing ? 'this.style.background="transparent"' : ''}">
                    <div style="
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background: ${color};
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 0.9rem;
                        margin-right: 1rem;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    ">${initials}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #e0e0e0; font-size: 1rem;">${user}</div>
                        <div style="color: #9ca3af; font-size: 0.9rem; margin-top: 2px;">
                            Group: ${group}
                            ${isCurrent ? ' <span style="color: #7c3aed; font-weight: 600;">(current user)</span>' : ''}
                            ${isEditing ? ' <span style="color: #f59e0b; font-weight: 600;">(editing)</span>' : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${!isEditing ? `
                            <button onclick="userManagementModal.startEditUser('${user.replace(/'/g, "\\'")}', '${group.replace(/'/g, "\\'")}')" style="
                                background: linear-gradient(45deg, #f59e0b, #d97706);
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 0.9rem;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
                            " onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">
                                ✏️ Edit
                            </button>
                        ` : ''}
                        <button onclick="userManagementModal.switchToUser('${user.replace(/'/g, "\\'")}', '${group.replace(/'/g, "\\'")}')" style="
                            background: ${isCurrent ? 'rgba(124, 58, 237, 0.2)' : 'linear-gradient(45deg, #7c3aed, #a855f7)'};
                            color: ${isCurrent ? '#9ca3af' : 'white'};
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 8px;
                            cursor: ${isCurrent ? 'not-allowed' : 'pointer'};
                            font-size: 0.9rem;
                            font-weight: 600;
                            transition: all 0.3s ease;
                            ${isCurrent ? '' : 'box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);'}
                        " ${isCurrent ? 'disabled' : ''} 
                           ${!isCurrent ? 'onmouseover="this.style.transform=\'translateY(-1px)\'" onmouseout="this.style.transform=\'translateY(0)\'"' : ''}>
                            ${isCurrent ? '✓ Active' : 'Switch'}
                        </button>
                        ${!isCurrent && !isEditing ? `
                            <button onclick="userManagementModal.deleteUser('${user.replace(/'/g, "\\'")}')'" style="
                                background: linear-gradient(45deg, #dc2626, #ef4444);
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 0.9rem;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
                            " onmouseover="this.style.transform='translateY(-1px)'"
                               onmouseout="this.style.transform='translateY(0)'">
                                🗑️ Delete
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // NEW: Start editing a user
    startEditUser(username, group) {
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

    // NEW: Save user edit
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
        const oldGroup = this.userGroupMap[oldName] || 'Default';
        
        // Validation
        if (!newName || !newGroup) {
            this.showError('Please enter both name and group.');
            return;
        }

        if (newName.length < 2) {
            this.showError('Name must be at least 2 characters long.');
            return;
        }
        
        // Check if new name conflicts with existing user (but not self)
        if (newName !== oldName && window.userManager?.users?.includes(newName)) {
            this.showError('A user with this name already exists.');
            return;
        }
        
        try {
            // Update user data
            await this.performUserUpdate(oldName, newName, oldGroup, newGroup);
            
            // Success
            this.showSuccess(`User updated: "${newName}" (${newGroup})`);
            this.cancelUserEdit();
            this.renderUserList();
            
        } catch (error) {
            console.error('Error updating user:', error);
            this.showError('Failed to update user: ' + error.message);
        }
    },

    // NEW: Perform the actual user update with data migration
    async performUserUpdate(oldName, newName, oldGroup, newGroup) {
        console.log(`🔄 Updating user: "${oldName}" → "${newName}", Group: "${oldGroup}" → "${newGroup}"`);
        
        // 1. Update user list in userManager
        if (window.userManager && window.userManager.users) {
            const userIndex = window.userManager.users.indexOf(oldName);
            if (userIndex >= 0) {
                window.userManager.users[userIndex] = newName;
                
                // Update current user if necessary
                if (window.userManager.currentUser === oldName) {
                    window.userManager.currentUser = newName;
                    window.userManager.currentGroup = newGroup;
                }
                
                // Save updated user list
                try {
                    localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
                } catch (error) {
                    console.warn('Could not save user history:', error);
                }
            }
        }
        
        // 2. Update user-group mapping
        if (oldName !== newName) {
            delete this.userGroupMap[oldName];
        }
        this.userGroupMap[newName] = newGroup;
        this.saveUserGroupMapping();
        
        // 3. Migrate storage keys if name changed
        if (oldName !== newName) {
            await this.migrateUserStorageKeys(oldName, newName);
        }
        
        // 4. Update last user if necessary
        try {
            const lastUser = localStorage.getItem('metafold_last_user');
            if (lastUser) {
                const lastUserObj = JSON.parse(lastUser);
                if (lastUserObj.username === oldName) {
                    lastUserObj.username = newName;
                    lastUserObj.groupname = newGroup;
                    localStorage.setItem('metafold_last_user', JSON.stringify(lastUserObj));
                }
            }
        } catch (error) {
            console.warn('Could not update last user:', error);
        }
        
        // 5. Update storage prefix if this is the current user
        if (window.userManager?.currentUser === newName && window.storage?.setUserPrefix) {
            window.storage.setUserPrefix(newName);
        }
        
        // 6. Reload templates if this is the current user
        if (window.userManager?.currentUser === newName && window.templateManager?.init) {
            window.templateManager.init();
        }
        
        console.log('✅ User update completed successfully');
    },

    // NEW: Migrate storage keys when username changes
    async migrateUserStorageKeys(oldName, newName) {
        console.log(`📦 Migrating storage keys: "${oldName}" → "${newName}"`);
        
        try {
            // Find all storage keys for the old user
            const oldPrefix = `metafold_${oldName}_`;
            const newPrefix = `metafold_${newName}_`;
            
            const keysToMigrate = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(oldPrefix)) {
                    keysToMigrate.push(key);
                }
            }
            
            console.log(`📦 Found ${keysToMigrate.length} storage keys to migrate:`, keysToMigrate);
            
            // Migrate each key
            keysToMigrate.forEach(oldKey => {
                const newKey = oldKey.replace(oldPrefix, newPrefix);
                const data = localStorage.getItem(oldKey);
                
                if (data) {
                    localStorage.setItem(newKey, data);
                    localStorage.removeItem(oldKey);
                    console.log(`📦 Migrated: ${oldKey} → ${newKey}`);
                }
            });
            
            console.log('✅ Storage migration completed');
            
        } catch (error) {
            console.error('❌ Storage migration failed:', error);
            throw new Error('Failed to migrate user data: ' + error.message);
        }
    },

    // NEW: Cancel user edit
    cancelUserEdit() {
        this.editingUser = null;
        
        // Hide edit section
        const editSection = document.getElementById('editUserSection');
        if (editSection) {
            editSection.style.display = 'none';
        }
        
        // Clear edit fields
        const nameInput = document.getElementById('editUserName');
        const groupInput = document.getElementById('editUserGroup');
        if (nameInput) nameInput.value = '';
        if (groupInput) groupInput.value = '';
        
        // Re-render user list
        this.renderUserList();
    },

    // NEW: Delete user
    deleteUser(username) {
        const group = this.userGroupMap[username] || 'Default';
        const isCurrent = username === window.userManager?.currentUser;
        
        if (isCurrent) {
            this.showError('Cannot delete the currently active user.');
            return;
        }
        
        const confirmed = confirm(
            `Delete user "${username}" from group "${group}"?\n\n` +
            `⚠️ This will permanently remove:\n` +
            `• User from the system\n` +
            `• All user templates and data\n` +
            `• User's storage keys\n\n` +
            `This action cannot be undone!`
        );
        
        if (confirmed) {
            try {
                this.performUserDeletion(username);
                this.showSuccess(`User "${username}" deleted successfully`);
                this.renderUserList();
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showError('Failed to delete user: ' + error.message);
            }
        }
    },

    // NEW: Perform user deletion
    performUserDeletion(username) {
        console.log(`🗑️ Deleting user: "${username}"`);
        
        // 1. Remove from user list
        if (window.userManager && window.userManager.users) {
            const userIndex = window.userManager.users.indexOf(username);
            if (userIndex >= 0) {
                window.userManager.users.splice(userIndex, 1);
                
                // Save updated user list
                try {
                    localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
                } catch (error) {
                    console.warn('Could not save user history:', error);
                }
            }
        }
        
        // 2. Remove from user-group mapping
        delete this.userGroupMap[username];
        this.saveUserGroupMapping();
        
        // 3. Remove all storage keys for this user
        const userPrefix = `metafold_${username}_`;
        const keysToDelete = [];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(userPrefix)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Deleted storage key: ${key}`);
        });
        
        console.log(`✅ User "${username}" deleted successfully (${keysToDelete.length} storage keys removed)`);
    },

    // EXISTING: Add user (unchanged)
    addUser() {
        const nameInput = document.getElementById('newUserName');
        const groupInput = document.getElementById('newUserGroup');
        
        if (!nameInput || !groupInput) {
            console.error('Input elements not found');
            return;
        }
        
        const name = nameInput.value.trim();
        const group = groupInput.value.trim();
        
        if (!name || !group) {
            this.showError('Please enter both name and group.');
            return;
        }

        if (name.length < 2) {
            this.showError('Name must be at least 2 characters long.');
            return;
        }
        
        if (window.userManager && window.userManager.users && window.userManager.users.includes(name)) {
            this.showError('This user already exists.');
            return;
        }
        
        // Add user to history
        if (window.userManager && window.userManager.addUserToHistory) {
            window.userManager.addUserToHistory(name, group);
        }
        
        // Store user-group mapping
        this.userGroupMap[name] = group;
        this.saveUserGroupMapping();
        
        // Clear inputs
        nameInput.value = '';
        groupInput.value = '';
        
        // Refresh list
        this.renderUserList();
        
        // Show success message
        this.showSuccess(`User "${name}" added to group "${group}"`);
        
        // Focus back to name input
        nameInput.focus();
        
        console.log(`✅ User added: ${name} (${group})`);
    },

    // EXISTING: Switch to user (unchanged)
    switchToUser(username, group) {
        if (username === window.userManager?.currentUser) return;
        
        if (confirm(`Switch to user "${username}" (${group})?`)) {
            if (window.userManager && window.userManager.switchUser) {
                window.userManager.switchUser(username, group);
                this.close();
                
                // Show success message
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess(`Switched to user "${username}" (${group})!`);
                }
            }
        }
    },

    // Message handling methods
    showError(message) {
        this.showMessage(message, 'error');
    },

    showSuccess(message) {
        this.showMessage(message, 'success');
    },

    showMessage(message, type) {
        // Remove existing message
        const existingMessage = this.modal.querySelector('.user-mgmt-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-mgmt-message';
        
        const isError = type === 'error';
        const isSuccess = type === 'success';
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? 'linear-gradient(45deg, #dc2626, #ef4444)' : 
                         isSuccess ? 'linear-gradient(45deg, #059669, #10b981)' : 
                         'linear-gradient(45deg, #7c3aed, #a855f7)'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            z-index: 10001;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-weight: 500;
            max-width: 350px;
            animation: slideInRight 0.3s ease-out;
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

    close() {
        // Cancel any ongoing edit
        this.cancelUserEdit();
        
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
};

window.userManagementModal = userManagementModal;
console.log('✅ userManagementModal loaded (ENHANCED with Edit Functionality)');