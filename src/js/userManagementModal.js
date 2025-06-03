// User Management Modal (Enhanced with better UI and functionality)

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
                    max-width: 600px;
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
        
        // Enter key support for both inputs
        ['newUserName', 'newUserGroup'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.addUser();
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
            
            return `
                <div style="
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    transition: all 0.3s ease;
                    ${isCurrent ? 'background: rgba(124, 58, 237, 0.1); border-left: 4px solid #7c3aed;' : ''}
                " onmouseover="${!isCurrent ? 'this.style.background="rgba(255,255,255,0.05)"' : ''}"
                   onmouseout="${!isCurrent ? 'this.style.background="transparent"' : ''}">
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
                        </div>
                    </div>
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
                </div>
            `;
        }).join('');
    },

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
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
};

window.userManagementModal = userManagementModal;
console.log('✅ userManagementModal loaded (Enhanced UI and functionality)');