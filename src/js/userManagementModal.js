const userManagementModal = {
    modal: null,
    userGroupMap: {}, // Stores User -> Group mapping

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
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            ">
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #007bff;">👥 User Management</h2>
                        <button onclick="userManagementModal.close()" style="
                            background: none;
                            border: none;
                            font-size: 1.5rem;
                            cursor: pointer;
                            color: #666;
                        ">✕</button>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #333;">➕ Add New User</h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 0.5rem; align-items: end;">
                            <div>
                                <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem;">Name:</label>
                                <input type="text" id="newUserName" placeholder="John Doe" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    box-sizing: border-box;
                                ">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 0.25rem; font-size: 0.9rem;">Group:</label>
                                <input type="text" id="newUserGroup" placeholder="Lab A" style="
                                    width: 100%;
                                    padding: 0.5rem;
                                    border: 1px solid #ddd;
                                    border-radius: 4px;
                                    box-sizing: border-box;
                                ">
                            </div>
                            <button onclick="userManagementModal.addUser()" style="
                                background: #28a745;
                                color: white;
                                border: none;
                                padding: 0.5rem 1rem;
                                border-radius: 4px;
                                cursor: pointer;
                                white-space: nowrap;
                            ">➕ Add</button>
                        </div>
                    </div>
                    
                    <div>
                        <h3 style="margin: 0 0 1rem 0; color: #333;">📋 Existing Users</h3>
                        <div id="userList" style="
                            max-height: 300px;
                            overflow-y: auto;
                            border: 1px solid #eee;
                            border-radius: 4px;
                        "></div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 1.5rem;">
                        <button onclick="userManagementModal.close()" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 4px;
                            cursor: pointer;
                        ">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('userManagementModal');
        
        // Enter key support
        ['newUserName', 'newUserGroup'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addUser();
            });
        });
    },

    renderUserList() {
        const listContainer = document.getElementById('userList');
        if (!listContainer) return;

        const users = window.userManager?.users || [];

        if (users.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: #666;">
                    No users available yet.<br>
                    Add the first user!
                </div>
            `;
            return;
        }

        listContainer.innerHTML = users.map(user => {
            const group = this.userGroupMap[user] || 'Default';
            const color = window.userManager.generateUserColor(user);
            const initials = window.userManager.getUserInitials(user);
            const isCurrent = user === window.userManager?.currentUser;
            
            return `
                <div style="
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-bottom: 1px solid #eee;
                    ${isCurrent ? 'background: #e3f2fd;' : ''}
                ">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: ${color};
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 0.8rem;
                        margin-right: 1rem;
                    ">${initials}</div>
                    <div style="flex: 1;">
                        <strong>${user}</strong><br>
                        <small style="color: #666;">Group: ${group}</small>
                        ${isCurrent ? '<span style="color: #007bff; font-size: 0.8rem;"> (current)</span>' : ''}
                    </div>
                    <button onclick="userManagementModal.switchToUser('${user.replace(/'/g, "\\'")}', '${group.replace(/'/g, "\\'")}')" style="
                        background: #007bff;
                        color: white;
                        border: none;
                        padding: 0.25rem 0.5rem;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        ${isCurrent ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    " ${isCurrent ? 'disabled' : ''}>Switch</button>
                </div>
            `;
        }).join('');
    },

    addUser() {
        const nameInput = document.getElementById('newUserName');
        const groupInput = document.getElementById('newUserGroup');
        
        const name = nameInput.value.trim();
        const group = groupInput.value.trim();
        
        if (!name || !group) {
            alert('Please enter both name and group.');
            return;
        }
        
        if (window.userManager.users.includes(name)) {
            alert('This user already exists.');
            return;
        }
        
        // Add user to history
        window.userManager.addUserToHistory(name, group);
        
        // Store user-group mapping
        this.userGroupMap[name] = group;
        this.saveUserGroupMapping();
        
        // Clear inputs
        nameInput.value = '';
        groupInput.value = '';
        
        // Refresh list
        this.renderUserList();
        
        console.log(`✅ User added: ${name} (${group})`);
    },

    switchToUser(username, group) {
        if (username === window.userManager?.currentUser) return;
        
        if (confirm(`Switch to user "${username}" (${group})?`)) {
            window.userManager.setCurrentUser(username, group);
            this.close();
            
            // Reload the app to reflect new user
            if (window.templateManager && window.templateManager.renderList) {
                window.templateManager.renderList();
            }
            
            // Show success message
            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(`Switched to user "${username}" (${group})!`);
            }
        }
    },

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
};

window.userManagementModal = userManagementModal;
console.log('✅ userManagementModal loaded (English translation)');