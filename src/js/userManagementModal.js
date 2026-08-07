// User & Group Management Modal - Enhanced with RDM/ISA Metadata
// Tab-based UI: Users | Groups
// ✅ Extended user profiles (E-Mail, ORCID, Affiliation, Role)
// ✅ Group management (PI, Institution, ROR, Funding)
// ✅ Import/Export profiles (without passwords)
// ✅ Hybrid dropdowns (predefined + freetext)

// Remove existing userManagementModal if already defined
if (window.userManagementModal) {
    console.log('🔧 Removing existing userManagementModal');
    delete window.userManagementModal;
}

const userManagementModal = {
    modal: null,
    editingUser: null,
    editingGroup: null,
    activeTab: 'users', // 'users' or 'groups'

    // =================== MAIN FUNCTIONS ===================
    
    /**
     * Show user management modal (main entry point)
     */
    async show() {
        console.log('👥 Opening user management modal');
        this.createModal();
        this.renderActiveTab();
    },

    // =================== UI CREATION ===================

    /**
     * Create the modal UI with tab system
     */
    createModal() {
        // Remove existing modal
        const existingModal = document.getElementById('userManagementModal');
        if (existingModal) {
            existingModal.remove();
        }

        const currentUser = window.userManager?.currentUser;
        const isAdmin = currentUser === 'Admin';
        
        // Auto-enable password system
        this.ensurePasswordSystemEnabled();

        const modalHTML = `
            <div id="userManagementModal">
                <div class="user-modal-container">
                    <!-- Header -->
                    <div class="user-modal-header">
                        <h2 class="user-modal-title">
                            👥 User & Group Management
                            <span style="color: #f59e0b; font-size: 1.2rem; margin-left: 0.5rem;">🔐</span>
                        </h2>
                        <button onclick="userManagementModal.close()" class="user-modal-close">×</button>
                    </div>
                    
                    <!-- Tab Navigation -->
                    <div class="ugm-tab-nav">
                        <button class="ugm-tab-btn active" data-tab="users" onclick="userManagementModal.switchTab('users')">
                            👤 Users
                        </button>
                        <button class="ugm-tab-btn" data-tab="groups" onclick="userManagementModal.switchTab('groups')">
                            📁 Groups
                        </button>
                    </div>

                    <!-- Tab Content Container -->
                    <div id="ugmTabContent"></div>
                    
                    <!-- Footer with Import/Export -->
                    <div class="ugm-footer">
                        <div class="ugm-footer-actions">
                            <button onclick="userManagementModal.importProfiles()" class="btn btn-secondary btn-small">
                                📥 Import
                            </button>
                            <button onclick="userManagementModal.exportProfiles()" class="btn btn-secondary btn-small">
                                📤 Export
                            </button>
                        </div>
                        <button onclick="userManagementModal.close()" class="btn btn-secondary" style="padding: 0.75rem 2rem;">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('userManagementModal');
    },

    /**
     * Switch between tabs
     */
    switchTab(tab) {
        this.activeTab = tab;
        this.editingUser = null;
        this.editingGroup = null;

        // Update tab buttons
        document.querySelectorAll('.ugm-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        this.renderActiveTab();
    },

    /**
     * Render the currently active tab
     */
    renderActiveTab() {
        const container = document.getElementById('ugmTabContent');
        if (!container) return;

        if (this.activeTab === 'users') {
            this.renderUsersTab(container);
        } else {
            this.renderGroupsTab(container);
        }
    },

    // =================== USERS TAB ===================

    renderUsersTab(container) {
        const currentUser = window.userManager?.currentUser;
        const isAdmin = currentUser === 'Admin';

        container.innerHTML = `
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
            </div>
            
            <!-- Add User Section -->
            <div class="user-modal-section add-user-section">
                <h3 class="section-title">➕ Add New User</h3>
                <div class="ugm-form-grid-2col">
                    <div class="form-group">
                        <label class="form-label">Username (Login): <span class="required-star">*</span></label>
                        <input type="text" id="newUserName" placeholder="jdoe" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Title:</label>
                        <input type="text" id="newUserTitle" placeholder="Dr." class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">First Name:</label>
                        <input type="text" id="newUserFirstName" placeholder="John" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name:</label>
                        <input type="text" id="newUserLastName" placeholder="Doe" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Group:</label>
                        ${this._buildGroupHybridSelect('newUserGroup')}
                    </div>
                    <div class="form-group">
                        <label class="form-label">E-Mail:</label>
                        <input type="email" id="newUserEmail" placeholder="john.doe@uni.de" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ORCID:</label>
                        <input type="text" id="newUserOrcid" placeholder="0000-0001-2345-6789" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Affiliation:</label>
                        <input type="text" id="newUserAffiliation" placeholder="University of..." class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role:</label>
                        ${this._buildRoleHybridSelect('newUserRole')}
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center;">
                    <button onclick="userManagementModal.addUser()" class="btn btn-success">➕ Add User</button>
                    <small class="section-description" style="margin: 0;">Only name is required. All other fields are optional.</small>
                </div>
            </div>
            
            <!-- Edit User Section (Initially Hidden) -->
            <div id="editUserSection" class="user-modal-section edit-user-section">
                <h3 class="section-title" style="color: #f59e0b;">✏️ Edit User</h3>
                <div class="ugm-form-grid-2col">
                    <div class="form-group">
                        <label class="form-label">Username:</label>
                        <input type="text" id="editUserName" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Title:</label>
                        <input type="text" id="editUserTitle" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">First Name:</label>
                        <input type="text" id="editUserFirstName" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Last Name:</label>
                        <input type="text" id="editUserLastName" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Group:</label>
                        ${this._buildGroupHybridSelect('editUserGroup', true)}
                    </div>
                    <div class="form-group">
                        <label class="form-label">E-Mail:</label>
                        <input type="email" id="editUserEmail" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">ORCID:</label>
                        <input type="text" id="editUserOrcid" class="form-input edit-input" placeholder="0000-0001-2345-6789">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Affiliation:</label>
                        <input type="text" id="editUserAffiliation" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Role:</label>
                        ${this._buildRoleHybridSelect('editUserRole', true)}
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="userManagementModal.saveUserEdit()" class="btn btn-success btn-small">💾 Save</button>
                    <button onclick="userManagementModal.cancelUserEdit()" class="btn btn-secondary btn-small">❌ Cancel</button>
                </div>
            </div>
            
            <!-- User List -->
            <div>
                <h3 class="section-title">📋 Existing Users</h3>
                <div id="userList"></div>
            </div>
        `;

        // Setup event listeners
        this._setupUserTabListeners();
        this.renderUserList();
    },

    // =================== GROUPS TAB ===================

    renderGroupsTab(container) {
        container.innerHTML = `
            <!-- Add Group Section -->
            <div class="user-modal-section add-user-section">
                <h3 class="section-title">➕ Create New Group</h3>
                <div class="ugm-form-grid-2col">
                    <div class="form-group">
                        <label class="form-label">Group Name: <span class="required-star">*</span></label>
                        <input type="text" id="newGroupName" placeholder="AG Smith" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Principal Investigator:</label>
                        <input type="text" id="newGroupPI" placeholder="Prof. Dr. Jane Smith" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">E-Mail:</label>
                        <input type="email" id="newGroupEmail" placeholder="lab@uni.de" class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Institution:</label>
                        <input type="text" id="newGroupInstitution" placeholder="University of..." class="form-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department:</label>
                        <input type="text" id="newGroupDepartment" placeholder="Faculty of..." class="form-input">
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center;">
                    <button onclick="userManagementModal.addGroup()" class="btn btn-success">➕ Create Group</button>
                    <small class="section-description" style="margin: 0;">Only group name is required. All other fields are optional.</small>
                </div>
            </div>

            <!-- Edit Group Section (Initially Hidden) -->
            <div id="editGroupSection" class="user-modal-section edit-user-section">
                <h3 class="section-title" style="color: #f59e0b;">✏️ Edit Group</h3>
                <div class="ugm-form-grid-2col">
                    <div class="form-group">
                        <label class="form-label">Group Name:</label>
                        <input type="text" id="editGroupName" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Principal Investigator:</label>
                        <input type="text" id="editGroupPI" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">E-Mail:</label>
                        <input type="email" id="editGroupEmail" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Institution:</label>
                        <input type="text" id="editGroupInstitution" class="form-input edit-input">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Department:</label>
                        <input type="text" id="editGroupDepartment" class="form-input edit-input">
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="userManagementModal.saveGroupEdit()" class="btn btn-success btn-small">💾 Save</button>
                    <button onclick="userManagementModal.cancelGroupEdit()" class="btn btn-secondary btn-small">❌ Cancel</button>
                </div>
            </div>
            
            <!-- Group List -->
            <div>
                <h3 class="section-title">📋 Existing Groups</h3>
                <div id="groupList"></div>
            </div>
        `;

        this._setupGroupTabListeners();
        this.renderGroupList();
    },

    // =================== HYBRID SELECT BUILDERS ===================

    /**
     * Build a hybrid group select (dropdown + freetext option)
     */
    _buildGroupHybridSelect(id, isEdit = false) {
        const groups = window.profileManager ? window.profileManager.getAllGroups() : [];
        const editClass = isEdit ? 'edit-input' : '';
        
        return `
            <div class="ugm-hybrid-select">
                <select id="${id}" class="form-select ${editClass}" onchange="userManagementModal._onGroupSelectChange('${id}')">
                    <option value="">Default</option>
                    ${groups.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
                    <option value="__new__">➕ New Group...</option>
                </select>
                <input type="text" id="${id}_custom" class="form-input ${editClass}" 
                       placeholder="Enter new group name" style="display: none;"
                       onkeypress="if(event.key==='Escape'){userManagementModal._cancelCustomGroup('${id}')}">
            </div>
        `;
    },

    _onGroupSelectChange(id) {
        const select = document.getElementById(id);
        const customInput = document.getElementById(`${id}_custom`);
        if (!select || !customInput) return;

        if (select.value === '__new__') {
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.focus();
        }
    },

    _cancelCustomGroup(id) {
        const select = document.getElementById(id);
        const customInput = document.getElementById(`${id}_custom`);
        if (!select || !customInput) return;

        customInput.style.display = 'none';
        customInput.value = '';
        select.style.display = 'block';
        select.value = '';
    },

    _getGroupValue(id) {
        const select = document.getElementById(id);
        const customInput = document.getElementById(`${id}_custom`);
        
        if (customInput && customInput.style.display !== 'none' && customInput.value.trim()) {
            return customInput.value.trim();
        }
        
        if (select && select.value && select.value !== '__new__') {
            return select.value;
        }

        return 'Default';
    },

    /**
     * Build a hybrid role select (dropdown + freetext option)
     */
    _buildRoleHybridSelect(id, isEdit = false) {
        const roles = window.profileManager ? window.profileManager.getPredefinedRoles() : [];
        const editClass = isEdit ? 'edit-input' : '';
        
        return `
            <div class="ugm-hybrid-select">
                <select id="${id}" class="form-select ${editClass}" onchange="userManagementModal._onRoleSelectChange('${id}')">
                    <option value="">None</option>
                    ${roles.map(r => `<option value="${r}">${r}</option>`).join('')}
                    <option value="__custom__">✏️ Custom...</option>
                </select>
                <input type="text" id="${id}_custom" class="form-input ${editClass}" 
                       placeholder="Enter custom role" style="display: none;"
                       onkeypress="if(event.key==='Escape'){userManagementModal._cancelCustomRole('${id}')}">
            </div>
        `;
    },

    _onRoleSelectChange(id) {
        const select = document.getElementById(id);
        const customInput = document.getElementById(`${id}_custom`);
        if (!select || !customInput) return;

        if (select.value === '__custom__') {
            select.style.display = 'none';
            customInput.style.display = 'block';
            customInput.focus();
        }
    },

    _cancelCustomRole(id) {
        const select = document.getElementById(id);
        const customInput = document.getElementById(`${id}_custom`);
        if (!select || !customInput) return;

        customInput.style.display = 'none';
        customInput.value = '';
        select.style.display = 'block';
        select.value = '';
    },

    _getRoleValue(id) {
        const select = document.getElementById(id);
        const customInput = document.getElementById(`${id}_custom`);
        
        if (customInput && customInput.style.display !== 'none' && customInput.value.trim()) {
            return customInput.value.trim();
        }
        
        if (select && select.value && select.value !== '__custom__') {
            return select.value;
        }

        return '';
    },

    // =================== EVENT LISTENERS ===================

    _setupUserTabListeners() {
        // Enter key support for add user
        const nameInput = document.getElementById('newUserName');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addUser();
            });
        }

        // Password enter key
        const passwordInput = document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.setPassword();
            });
        }

        // Populate password user select if admin
        const currentUser = window.userManager?.currentUser;
        if (currentUser === 'Admin') {
            setTimeout(() => this.populatePasswordUserSelect(), 100);
        }
    },

    _setupGroupTabListeners() {
        const nameInput = document.getElementById('newGroupName');
        if (nameInput) {
            nameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.addGroup();
            });
        }
    },

    populatePasswordUserSelect() {
        const userSelect = document.getElementById('passwordUser');
        if (!userSelect) return;

        let users = window.userManager?.users || [];
        const adminExists = window.secureStorage?.hasUserPassword?.('Admin');
        if (adminExists && !users.includes('Admin')) {
            users = ['Admin', ...users];
        }
        
        userSelect.innerHTML = '<option value="">Select user...</option>';
        users.forEach(user => {
            const hasPassword = window.secureStorage?.hasUserPassword?.(user) ? '🔒' : '';
            userSelect.innerHTML += `<option value="${user}">${user} ${hasPassword}</option>`;
        });
    },

    // =================== USER MANAGEMENT ACTIONS ===================

    async addUser() {
        const name = document.getElementById('newUserName')?.value?.trim();
        if (!name) {
            this.showError('Please enter a user name');
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

        const title = document.getElementById('newUserTitle')?.value?.trim() || '';
        const firstName = document.getElementById('newUserFirstName')?.value?.trim() || '';
        const lastName = document.getElementById('newUserLastName')?.value?.trim() || '';
        const group = this._getGroupValue('newUserGroup');
        const email = document.getElementById('newUserEmail')?.value?.trim() || '';
        const orcid = document.getElementById('newUserOrcid')?.value?.trim() || '';
        const affiliation = document.getElementById('newUserAffiliation')?.value?.trim() || '';
        const role = this._getRoleValue('newUserRole');

        // Validate ORCID if provided
        if (orcid && window.profileManager && !window.profileManager.validateOrcid(orcid)) {
            this.showError('Invalid ORCID format. Expected: 0000-0001-2345-6789');
            return;
        }

        // Validate Email if provided
        if (email && !this.validateEmail(email)) {
            this.showError('Invalid E-Mail format');
            return;
        }

        try {
            // Add to userManager history
            if (window.userManager?.addUserToHistory) {
                window.userManager.addUserToHistory(name, group);
            }

            // Create extended profile in profileManager
            if (window.profileManager) {
                await window.profileManager.createOrUpdateUser({
                    username: name,
                    title: title,
                    firstName: firstName,
                    lastName: lastName,
                    groupName: group,
                    email: email,
                    orcid: orcid,
                    affiliation: affiliation,
                    role: role
                });
            }

            // Clear inputs
            document.getElementById('newUserName').value = '';
            document.getElementById('newUserTitle').value = '';
            document.getElementById('newUserFirstName').value = '';
            document.getElementById('newUserLastName').value = '';
            document.getElementById('newUserEmail').value = '';
            document.getElementById('newUserOrcid').value = '';
            document.getElementById('newUserAffiliation').value = '';
            this._cancelCustomGroup('newUserGroup');
            this._cancelCustomRole('newUserRole');

            this.renderUserList();
            this.populatePasswordUserSelect();
            this.showSuccess(`User "${name}" added to group "${group}"`);
            
            document.getElementById('newUserName')?.focus();
        } catch (error) {
            console.error('Error adding user:', error);
            this.showError('Failed to add user: ' + error.message);
        }
    },

    startEditUser(username) {
        const currentUser = window.userManager?.currentUser;
        if (currentUser !== 'Admin' && currentUser !== username) {
            this.showError('You can only edit your own account.');
            return;
        }

        this.editingUser = username;

        // Get profile data
        const profile = window.profileManager?.getUserByUsername(username);
        const group = window.profileManager?.getUserPrimaryGroupName(username) || 
                      window.userManager?.getUserGroup(username) || 'Default';

        // Show edit section and populate
        const editSection = document.getElementById('editUserSection');
        if (editSection) {
            editSection.style.display = 'block';

            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('editUserName', username);
            setVal('editUserTitle', profile?.title);
            setVal('editUserFirstName', profile?.firstName);
            setVal('editUserLastName', profile?.lastName);
            setVal('editUserEmail', profile?.email);
            setVal('editUserOrcid', profile?.orcid);
            setVal('editUserAffiliation', profile?.affiliation);

            // Set group select
            const groupSelect = document.getElementById('editUserGroup');
            if (groupSelect) {
                // Check if group exists in options
                const hasOption = Array.from(groupSelect.options).some(o => o.value === group);
                if (hasOption) {
                    groupSelect.value = group;
                } else {
                    // Show custom input
                    this._onGroupSelectChange('editUserGroup');
                    const customInput = document.getElementById('editUserGroup_custom');
                    if (customInput) customInput.value = group;
                }
            }

            // Set role select
            const roleSelect = document.getElementById('editUserRole');
            const roleValue = profile?.role || '';
            if (roleSelect) {
                const hasRoleOption = Array.from(roleSelect.options).some(o => o.value === roleValue);
                if (hasRoleOption) {
                    roleSelect.value = roleValue;
                } else if (roleValue) {
                    this._onRoleSelectChange('editUserRole');
                    const customRoleInput = document.getElementById('editUserRole_custom');
                    if (customRoleInput) customRoleInput.value = roleValue;
                }
            }

            setTimeout(() => document.getElementById('editUserName')?.focus(), 100);
        }

        this.renderUserList();
    },

    async saveUserEdit() {
        if (!this.editingUser) return;

        const newName = document.getElementById('editUserName')?.value?.trim();
        const title = document.getElementById('editUserTitle')?.value?.trim() || '';
        const firstName = document.getElementById('editUserFirstName')?.value?.trim() || '';
        const lastName = document.getElementById('editUserLastName')?.value?.trim() || '';
        const newGroup = this._getGroupValue('editUserGroup');
        const email = document.getElementById('editUserEmail')?.value?.trim() || '';
        const orcid = document.getElementById('editUserOrcid')?.value?.trim() || '';
        const affiliation = document.getElementById('editUserAffiliation')?.value?.trim() || '';
        const role = this._getRoleValue('editUserRole');

        if (!newName || newName.length < 2) {
            this.showError('Name must be at least 2 characters long');
            return;
        }

        if (orcid && window.profileManager && !window.profileManager.validateOrcid(orcid)) {
            this.showError('Invalid ORCID format. Expected: 0000-0001-2345-6789');
            return;
        }

        if (email && !this.validateEmail(email)) {
            this.showError('Invalid E-Mail format');
            return;
        }

        const oldName = this.editingUser;

        try {
            // Update in userManager
            if (window.userManager?.users) {
                const userIndex = window.userManager.users.indexOf(oldName);
                if (userIndex >= 0) {
                    window.userManager.users[userIndex] = newName;
                    if (window.userManager.currentUser === oldName) {
                        window.userManager.currentUser = newName;
                        window.userManager.currentGroup = newGroup;
                    }
                    localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
                }
            }

            // Update group mapping
            const mapping = JSON.parse(localStorage.getItem('metafold_user_group_mapping') || '{}');
            if (oldName !== newName) delete mapping[oldName];
            mapping[newName] = newGroup;
            localStorage.setItem('metafold_user_group_mapping', JSON.stringify(mapping));

            // Update in profileManager
            if (window.profileManager) {
                const profile = window.profileManager.getUserByUsername(oldName);
                if (profile) {
                    await window.profileManager.updateUser(profile.id, {
                        username: newName,
                        title: title,
                        firstName: firstName,
                        lastName: lastName,
                        groupName: newGroup,
                        email: email,
                        orcid: orcid,
                        affiliation: affiliation,
                        role: role
                    });
                } else {
                    await window.profileManager.createOrUpdateUser({
                        username: newName,
                        title: title,
                        firstName: firstName,
                        lastName: lastName,
                        groupName: newGroup,
                        email: email,
                        orcid: orcid,
                        affiliation: affiliation,
                        role: role
                    });
                }
            }

            // Migrate storage if name changed
            if (oldName !== newName) {
                await this._migrateUserStorage(oldName, newName);
            }

            this.showSuccess(`User updated: "${newName}" (${newGroup})`);
            this.cancelUserEdit();
            this.renderUserList();
        } catch (error) {
            console.error('Migration failed:', error);
            this.showError('Failed to migrate user data: ' + error.message);
        }
    },

    // NEW: Email validation helper
    validateEmail(email) {
        if (!email) return true;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    cancelUserEdit() {
        this.editingUser = null;
        const editSection = document.getElementById('editUserSection');
        if (editSection) editSection.style.display = 'none';
        this.renderUserList();
    },

    async switchToUser(username, group) {
        try {
            const currentUser = window.userManager?.currentUser;
            if (username === currentUser) {
                this.showError('You are already logged in as this user');
                return;
            }

            const actualGroup = username === 'Admin' ? 'System' : group;
            const hasPassword = this.isPasswordSystemEnabled() && 
                            window.secureStorage?.hasUserPassword?.(username);

            if (hasPassword) {
                const password = await this._promptForPassword(username);
                if (!password) return;

                const isValid = await window.secureStorage.verifyUserPassword(username, password);
                if (!isValid) {
                    this.showError('Invalid password');
                    return;
                }

                if (window.settingsManager?.setUserPasswordForEntropy) {
                    window.settingsManager.setUserPasswordForEntropy(username, password);
                }
            }

            if (window.userManager?.switchUser) {
                await window.userManager.switchUser(username, actualGroup);
                this.close();
                this.showSuccess(`Switched to user: ${username}`);
            }
        } catch (error) {
            console.error('Error during user switch:', error);
            this.showError('User switch failed: ' + error.message);
        }
    },

    deleteUser(username) {
        const currentUser = window.userManager?.currentUser;
        if (currentUser !== 'Admin') {
            this.showError('Only Admin can delete users');
            return;
        }
        if (username === currentUser) {
            this.showError('You cannot delete your own account while logged in');
            return;
        }

        const confirmed = confirm(
            `Delete user "${username}"?\n\n⚠️ This will permanently remove the user and all their settings.\nPasswords will be removed.\n\nThis action cannot be undone!`
        );
        if (!confirmed) return;

        try {
            // Remove from userManager
            if (window.userManager?.users) {
                const idx = window.userManager.users.indexOf(username);
                if (idx >= 0) {
                    window.userManager.users.splice(idx, 1);
                    localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
                }
            }

            // Remove from mapping
            const mapping = JSON.parse(localStorage.getItem('metafold_user_group_mapping') || '{}');
            delete mapping[username];
            localStorage.setItem('metafold_user_group_mapping', JSON.stringify(mapping));

            // Remove password
            if (window.secureStorage?.removeUserPassword) {
                window.secureStorage.removeUserPassword(username);
            }

            // Remove from profileManager
            if (window.profileManager) {
                const profile = window.profileManager.getUserByUsername(username);
                if (profile) {
                    window.profileManager.deleteUser(profile.id);
                }
            }

            // Clean up localStorage
            const userPrefix = `metafold_${username}_`;
            const keysToDelete = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(userPrefix)) keysToDelete.push(key);
            }
            keysToDelete.forEach(k => localStorage.removeItem(k));

            this.renderUserList();
            this.populatePasswordUserSelect();
            this.showSuccess(`User "${username}" deleted successfully`);
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showError('Failed to delete user: ' + error.message);
        }
    },

    // =================== GROUP MANAGEMENT ACTIONS ===================

    async addGroup() {
        const name = document.getElementById('newGroupName')?.value?.trim();
        if (!name) {
            this.showError('Please enter a group name');
            return;
        }
        if (name.length < 2) {
            this.showError('Group name must be at least 2 characters');
            return;
        }

        const email = document.getElementById('newGroupEmail')?.value?.trim() || '';
        if (email && !this.validateEmail(email)) {
            this.showError('Invalid E-Mail format');
            return;
        }

        try {
            if (!window.profileManager) {
                this.showError('Profile Manager not available');
                return;
            }

            await window.profileManager.createGroup({
                name: name,
                principalInvestigator: document.getElementById('newGroupPI')?.value?.trim() || '',
                email: document.getElementById('newGroupEmail')?.value?.trim() || '',
                institution: document.getElementById('newGroupInstitution')?.value?.trim() || '',
                department: document.getElementById('newGroupDepartment')?.value?.trim() || ''
            });

            // Clear inputs
            ['newGroupName', 'newGroupPI', 'newGroupEmail',
             'newGroupInstitution', 'newGroupDepartment'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });

            this.renderGroupList();
            this.showSuccess(`Group "${name}" created`);
            document.getElementById('newGroupName')?.focus();
        } catch (error) {
            console.error('Error creating group:', error);
            this.showError('Failed to create group: ' + error.message);
        }
    },

    startEditGroup(groupId) {
        const group = window.profileManager?.getGroupById(groupId);
        if (!group) return;

        this.editingGroup = groupId;

        const editSection = document.getElementById('editGroupSection');
        if (editSection) {
            editSection.style.display = 'block';

            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('editGroupName', group.name);
            setVal('editGroupPI', group.principalInvestigator);
            setVal('editGroupEmail', group.email);
            setVal('editGroupInstitution', group.institution);
            setVal('editGroupDepartment', group.department);

            setTimeout(() => document.getElementById('editGroupName')?.focus(), 100);
        }

        this.renderGroupList();
    },

    async saveGroupEdit() {
        if (!this.editingGroup) return;

        const name = document.getElementById('editGroupName')?.value?.trim();
        if (!name || name.length < 2) {
            this.showError('Group name must be at least 2 characters');
            return;
        }

        const email = document.getElementById('editGroupEmail')?.value?.trim() || '';
        if (email && !this.validateEmail(email)) {
            this.showError('Invalid E-Mail format');
            return;
        }

        try {
            await window.profileManager.updateGroup(this.editingGroup, {
                name: name,
                principalInvestigator: document.getElementById('editGroupPI')?.value?.trim() || '',
                email: document.getElementById('editGroupEmail')?.value?.trim() || '',
                institution: document.getElementById('editGroupInstitution')?.value?.trim() || '',
                department: document.getElementById('editGroupDepartment')?.value?.trim() || ''
            });

            this.showSuccess(`Group "${name}" updated`);
            this.cancelGroupEdit();
            this.renderGroupList();
        } catch (error) {
            console.error('Error updating group:', error);
            this.showError('Failed to update group: ' + error.message);
        }
    },

    cancelGroupEdit() {
        this.editingGroup = null;
        const editSection = document.getElementById('editGroupSection');
        if (editSection) editSection.style.display = 'none';
        this.renderGroupList();
    },

    deleteGroup(groupId) {
        const group = window.profileManager?.getGroupById(groupId);
        if (!group) return;

        const membersCount = window.profileManager.getUsersByGroup(groupId).length;
        const confirmed = confirm(
            `Delete group "${group.name}"?\n\n` +
            (membersCount > 0 ? `⚠️ ${membersCount} user(s) are in this group. They will be moved to "Default".\n\n` : '') +
            `This action cannot be undone!`
        );
        if (!confirmed) return;

        try {
            window.profileManager.deleteGroup(groupId);
            this.renderGroupList();
            this.showSuccess(`Group "${group.name}" deleted`);
        } catch (error) {
            console.error('Error deleting group:', error);
            this.showError('Failed to delete group: ' + error.message);
        }
    },

    // =================== RENDER USER LIST ===================

    renderUserList() {
        const listContainer = document.getElementById('userList');
        if (!listContainer) return;

        let users = window.userManager?.users || [];
        const adminExists = window.secureStorage?.hasUserPassword?.('Admin');
        if (adminExists && !users.includes('Admin')) {
            users = ['Admin', ...users];
        }
        
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
            const profile = window.profileManager?.getUserByUsername(user);
            const groupName = user === 'Admin' ? 'System' : 
                (window.profileManager?.getUserPrimaryGroupName(user) || 
                 window.userManager?.getUserGroup(user) || 'Default');
            const color = window.userManager?.generateUserColor?.(user) || '#7c3aed';
            const initials = window.userManager?.getUserInitials?.(user) || '??';
            const isCurrent = user === currentUser;
            const isEditing = this.editingUser === user;
            const isAdmin = user === 'Admin';
            const hasPassword = this.isPasswordSystemEnabled() && window.secureStorage?.hasUserPassword?.(user);

            // Extended info line
            let extendedInfo = '';
            if (profile) {
                const infoParts = [];
                const fullName = [profile.title, profile.firstName, profile.lastName].filter(Boolean).join(' ');
                if (fullName) infoParts.push(`👤 ${fullName}`);
                if (profile.email) infoParts.push(`📧 ${profile.email}`);
                if (profile.orcid) infoParts.push(`🆔 ${profile.orcid}`);
                if (profile.role) infoParts.push(`🏷️ ${profile.role}`);
                if (infoParts.length > 0) {
                    extendedInfo = `<div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">${infoParts.join(' · ')}</div>`;
                }
            }

            return `
                <div class="ugm-user-item ${isCurrent ? 'current' : ''} ${isEditing ? 'editing' : ''}">
                    <!-- Avatar -->
                    <div class="ugm-avatar" style="background: ${color};">
                        ${initials}
                        ${hasPassword ? '<div class="ugm-avatar-badge password">🔒</div>' : ''}
                        ${isAdmin ? '<div class="ugm-avatar-badge admin">👑</div>' : ''}
                    </div>
                    
                    <!-- User Info -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="font-weight: 600; color: #e0e0e0;">${user}</span>
                            ${isAdmin ? '<span style="color: #f59e0b; font-size: 0.8rem; font-weight: 600;">ADMIN</span>' : ''}
                            ${hasPassword ? '<span style="color: #10b981; font-size: 0.8rem;">🔒</span>' : ''}
                            ${isCurrent ? '<span style="color: #7c3aed; font-size: 0.8rem; font-weight: 600;">CURRENT</span>' : ''}
                        </div>
                        <div style="color: #9ca3af; font-size: 0.9rem; margin-top: 2px;">
                            Group: ${groupName}
                            ${isEditing ? ' <span style="color: #f59e0b; font-weight: 600;">(editing)</span>' : ''}
                        </div>
                        ${extendedInfo}
                    </div>
                    
                    <!-- Actions -->
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; flex-shrink: 0;">
                        ${!isEditing && (currentUser === 'Admin' || currentUser === user) ? `
                            <button onclick="userManagementModal.startEditUser('${user}')" class="btn btn-warning btn-small">✏️</button>
                        ` : ''}
                        ${!isCurrent ? `
                            <button onclick="userManagementModal.switchToUser('${user}', '${groupName}')" class="btn btn-primary btn-small">Switch</button>
                        ` : `
                            <button disabled class="btn btn-disabled btn-small">✓ Active</button>
                        `}
                        ${!isCurrent && !isEditing && currentUser === 'Admin' && user !== 'Admin' ? `
                            <button onclick="userManagementModal.deleteUser('${user}')" class="btn btn-danger btn-small">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // =================== RENDER GROUP LIST ===================

    renderGroupList() {
        const listContainer = document.getElementById('groupList');
        if (!listContainer) return;

        const groups = window.profileManager ? window.profileManager.getAllGroups() : [];
        const currentUser = window.userManager?.currentUser;
        const isAdmin = currentUser === 'Admin';

        if (groups.length === 0) {
            listContainer.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #9ca3af;">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">📁</div>
                    <div style="font-weight: 500; margin-bottom: 0.5rem;">No groups defined yet</div>
                    <div style="font-size: 0.9rem;">Create your first research group above!</div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = groups.map(group => {
            const members = window.profileManager.getUsersByGroup(group.id);
            const isEditing = this.editingGroup === group.id;

            const infoParts = [];
            if (group.principalInvestigator) infoParts.push(`👨‍🔬 ${group.principalInvestigator}`);
            if (group.email) infoParts.push(`📧 ${group.email}`);
            if (group.institution) infoParts.push(`🏛️ ${group.institution}`);
            if (group.department) infoParts.push(group.department);

            return `
                <div class="ugm-user-item ${isEditing ? 'editing' : ''}">
                    <div class="ugm-avatar" style="background: linear-gradient(135deg, #059669, #10b981);">
                        📁
                    </div>
                    
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <span style="font-weight: 600; color: #e0e0e0;">${group.name}</span>
                            <span style="color: #9ca3af; font-size: 0.8rem;">${members.length} member${members.length !== 1 ? 's' : ''}</span>
                            ${isEditing ? '<span style="color: #f59e0b; font-size: 0.8rem; font-weight: 600;">(editing)</span>' : ''}
                        </div>
                        ${infoParts.length > 0 ? `
                            <div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">${infoParts.join(' · ')}</div>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 0.5rem; flex-shrink: 0;">
                        ${!isEditing ? `
                            <button onclick="userManagementModal.startEditGroup('${group.id}')" class="btn btn-warning btn-small">✏️</button>
                        ` : ''}
                        ${isAdmin && members.length === 0 ? `
                            <button onclick="userManagementModal.deleteGroup('${group.id}')" class="btn btn-danger btn-small">🗑️</button>
                        ` : isAdmin && members.length > 0 ? `
                            <button onclick="userManagementModal.deleteGroup('${group.id}')" class="btn btn-danger btn-small" title="Group has members - they will be moved to Default">🗑️</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // =================== PASSWORD MANAGEMENT ===================

    async setPassword() {
        const currentUser = window.userManager?.currentUser;
        const passwordInput = document.getElementById('newPassword');
        const userSelect = document.getElementById('passwordUser');

        if (!passwordInput) return;

        let targetUser;
        if (currentUser === 'Admin') {
            targetUser = userSelect?.value;
            if (!targetUser) {
                this.showError('Please select a user');
                return;
            }
        } else {
            targetUser = currentUser;
        }

        const password = passwordInput.value;

        if (password === '') {
            if (targetUser === 'Admin') {
                this.showError('The Admin account must have a password for security reasons.');
                return;
            }
            return this._removeUserPassword(targetUser, passwordInput, userSelect);
        }

        if (password.length < 4) {
            this.showError('Password must be at least 4 characters (or leave empty to remove)');
            return;
        }

        try {
            await window.secureStorage.storeUserPassword(targetUser, password);
            passwordInput.value = '';
            if (userSelect) userSelect.value = '';
            this.renderUserList();
            this.populatePasswordUserSelect();
            this.showSuccess(`🔑 Password set for "${targetUser}"`);
        } catch (error) {
            this.showError('Failed to set password: ' + error.message);
        }
    },

    async _removeUserPassword(targetUser, passwordInput, userSelect) {
        try {
            if (window.secureStorage?.removeUserPassword) {
                window.secureStorage.removeUserPassword(targetUser);
                passwordInput.value = '';
                if (userSelect) userSelect.value = '';
                this.renderUserList();
                this.populatePasswordUserSelect();
                this.showSuccess(`🔓 Password removed for "${targetUser}"`);
            }
        } catch (error) {
            this.showError('Failed to remove password: ' + error.message);
        }
    },

    // =================== IMPORT / EXPORT ===================

    async importProfiles() {
        if (!window.profileManager) {
            this.showError('Profile Manager not available');
            return;
        }

        try {
            const result = await window.profileManager.importProfiles('merge');
            
            if (result.success) {
                const stats = result.stats;
                let message = `Import complete! ${stats.groupsAdded} groups, ${stats.usersAdded} users added.`;
                
                if (stats.groupsSkipped > 0 || stats.usersSkipped > 0) {
                    message += ` (${stats.groupsSkipped + stats.usersSkipped} skipped - already exist)`;
                }

                // Sync imported users to userManager history
                if (window.userManager) {
                    const allProfileUsers = window.profileManager.getAllUsers();
                    for (const u of allProfileUsers) {
                        if (!window.userManager.users.includes(u.username)) {
                            window.userManager.users.push(u.username);
                        }
                    }
                    localStorage.setItem('metafold_user_history', JSON.stringify(window.userManager.users));
                }

                this.showSuccess(message);

                // Show password reminder for imported users
                if (stats.usersNeedPassword && stats.usersNeedPassword.length > 0) {
                    setTimeout(() => {
                        this.showMessage(
                            `⚠️ Imported users have no passwords on this system. Please set passwords for: ${stats.usersNeedPassword.join(', ')}`,
                            'warning'
                        );
                    }, 3500);
                }

                // Re-render
                this.renderActiveTab();
            } else {
                this.showError('Import failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Import failed: ' + error.message);
        }
    },

    async exportProfiles() {
        if (!window.profileManager) {
            this.showError('Profile Manager not available');
            return;
        }

        try {
            const result = await window.profileManager.exportProfiles();
            if (result.success) {
                this.showSuccess('📤 Profiles exported successfully');
            } else {
                this.showError('Export failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    },

    // =================== UTILITY ===================

    ensurePasswordSystemEnabled() {
        try {
            if (window.settingsManager?.settings) {
                window.settingsManager.settings['security.password_system_enabled'] = true;
                window.settingsManager.settings['security.password_min_length'] = 4;
                window.settingsManager.settings['security.allow_empty_passwords'] = true;
                if (typeof window.settingsManager.saveSettings === 'function') {
                    window.settingsManager.saveSettings();
                }
            }
            if (window.secureStorage && !window.secureStorage.isInitialized) {
                window.secureStorage.init().catch(err => console.warn('SecureStorage init:', err));
            }
            return true;
        } catch (error) {
            console.error('Auto-enable password system failed:', error);
            return false;
        }
    },

    isPasswordSystemEnabled() {
        return true; // Always enabled when modal is open
    },

    async _promptForPassword(username) {
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
                        <h3 style="margin: 0 0 1rem 0; color: #7c3aed; text-align: center;">🔐 Password Required</h3>
                        <p style="color: #9ca3af; text-align: center; margin-bottom: 1.5rem;">
                            Enter password for <strong style="color: #a855f7;">${username}</strong>:
                        </p>
                        <input type="password" id="promptPassword" placeholder="Enter password" autofocus style="
                            width: 100%; padding: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 8px; font-size: 1rem; box-sizing: border-box;
                            background: rgba(255, 255, 255, 0.05); color: #e0e0e0; font-family: inherit;
                            margin-bottom: 1.5rem; outline: none;
                        ">
                        <div style="display: flex; gap: 1rem;">
                            <button id="promptPasswordCancelBtn"
                                    style="flex: 1; background: linear-gradient(45deg, #6b7280, #9ca3af);
                                           color: white; border: none; padding: 0.75rem; border-radius: 8px;
                                           cursor: pointer; font-weight: 600;">Cancel</button>
                            <button id="promptPasswordContinueBtn"
                                    style="flex: 1; background: linear-gradient(45deg, #7c3aed, #a855f7);
                                     color: white; border: none; padding: 0.75rem; border-radius: 8px;
                                     cursor: pointer; font-weight: 600;">Continue</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', promptHTML);
            setTimeout(() => {
                const input = document.getElementById('promptPassword');
                const cancelBtn = document.getElementById('promptPasswordCancelBtn');
                const continueBtn = document.getElementById('promptPasswordContinueBtn');

                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        document.getElementById('passwordPrompt').remove();
                        resolve(null);
                    });
                }

                if (continueBtn) {
                    continueBtn.addEventListener('click', () => {
                        const pwd = document.getElementById('promptPassword').value;
                        document.getElementById('passwordPrompt').remove();
                        resolve(pwd);
                    });
                }

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

    async _migrateUserStorage(oldName, newName) {
        const oldPrefix = `metafold_${oldName}_`;
        const newPrefix = `metafold_${newName}_`;
        const keysToMigrate = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(oldPrefix)) keysToMigrate.push(key);
        }
        keysToMigrate.forEach(oldKey => {
            const newKey = oldKey.replace(oldPrefix, newPrefix);
            const data = localStorage.getItem(oldKey);
            if (data) {
                localStorage.setItem(newKey, data);
                localStorage.removeItem(oldKey);
            }
        });
        console.log(`📦 Migrated ${keysToMigrate.length} storage keys: ${oldName} → ${newName}`);
    },

    // =================== MESSAGES ===================

    showSuccess(message) { this.showMessage(message, 'success'); },
    showError(message) { this.showMessage(message, 'error'); },

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'user-mgmt-message';
        const isError = type === 'error';
        const isWarning = type === 'warning';
        const isSuccess = type === 'success';

        messageDiv.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10001;
            background: ${isError ? 'linear-gradient(45deg, #dc2626, #ef4444)' : 
                         isWarning ? 'linear-gradient(45deg, #f59e0b, #d97706)' :
                         isSuccess ? 'linear-gradient(45deg, #059669, #10b981)' : 
                         'linear-gradient(45deg, #7c3aed, #a855f7)'};
            color: white; padding: 1rem 1.5rem; border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.3); font-family: inherit;
            font-weight: 500; max-width: 400px; animation: slideInRight 0.3s ease-out;
        `;

        messageDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">${isError ? '⚠️' : isWarning ? '⚠️' : isSuccess ? '✅' : 'ℹ️'}</span>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(messageDiv);

        if (!document.getElementById('userMgmtAnimations')) {
            const style = document.createElement('style');
            style.id = 'userMgmtAnimations';
            style.textContent = `
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
            `;
            document.head.appendChild(style);
        }

        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => { if (messageDiv.parentElement) messageDiv.remove(); }, 300);
            }
        }, isError ? 5000 : isWarning ? 8000 : 3000);
    },

    close() {
        this.cancelUserEdit();
        this.cancelGroupEdit();
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    },

    // NEW: Email validation helper
    validateEmail(email) {
        if (!email) return true;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
};

// Make available globally
window.userManagementModal = userManagementModal;
console.log('✅ User & Group Management Modal loaded - Enhanced with RDM/ISA Metadata');