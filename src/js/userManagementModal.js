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
    async show(options = {}) {
        console.log('👥 Opening user management modal', options);
        if (options.initialTab) {
            this.activeTab = options.initialTab;
        }
        this.createModal();
        this.renderActiveTab();

        if (options.openAddUser) {
            setTimeout(() => {
                this.toggleAddUserForm(true);
                if (options.initialUsername) {
                    const input = document.getElementById('newUserName');
                    if (input) {
                        input.value = options.initialUsername;
                        const firstNameInput = document.getElementById('newUserFirstName');
                        if (firstNameInput) firstNameInput.focus();
                    }
                }
            }, 60);
        }
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
                            <button onclick="userManagementModal.openExportModal()" class="btn btn-secondary btn-small">
                                📤 Export...
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
            <!-- Header with Title & Add User Toggle Button -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <h3 class="section-title" style="margin: 0;">📋 Existing Users</h3>
                    <span id="userCountBadge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 9999px; padding: 2px 8px; font-size: 0.75rem; font-weight: 600;">0</span>
                </div>
                <button type="button" id="toggleAddUserBtn" onclick="userManagementModal.toggleAddUserForm()" class="btn btn-success btn-small" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>➕</span> Add New User
                </button>
            </div>

            <!-- Add User Section (Initially Hidden) -->
            <div id="addUserSection" class="user-modal-section add-user-section" style="display: none; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <h3 class="section-title" style="margin: 0; font-size: 1.05rem;">➕ Add New User</h3>
                    <button type="button" class="user-modal-close" style="font-size: 1.2rem; padding: 2px 6px;" onclick="userManagementModal.toggleAddUserForm(false)">×</button>
                </div>
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
                    <button type="button" onclick="userManagementModal.toggleAddUserForm(false)" class="btn btn-secondary">Cancel</button>
                    <small class="section-description" style="margin: 0; margin-left: 0.5rem;">Only username is required. All other fields are optional.</small>
                </div>
            </div>

            <!-- Edit User Section (Initially Hidden) -->
            <div id="editUserSection" class="user-modal-section edit-user-section" style="display: none; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <h3 class="section-title" style="margin: 0; color: #f59e0b; font-size: 1.05rem;">✏️ Edit User</h3>
                    <button type="button" class="user-modal-close" style="font-size: 1.2rem; padding: 2px 6px;" onclick="userManagementModal.cancelUserEdit()">×</button>
                </div>
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

                    <!-- Password Management Sub-Section (Integrated into Edit User) -->
                    <div class="form-group" style="grid-column: 1 / -1; margin-top: 0.5rem; padding-top: 0.75rem; border-top: 1px solid rgba(255,255,255,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 600; font-size: 0.95rem; color: #f59e0b;">🔑 Password</span>
                                <span id="editUserPasswordStatus" style="font-size: 0.8rem; color: #9ca3af;"></span>
                            </div>
                            <button type="button" id="toggleEditPasswordBtn" class="btn btn-warning btn-small" onclick="userManagementModal.toggleEditPasswordForm()">
                                🔑 Edit Password
                            </button>
                        </div>
                        <div id="editUserPasswordContainer" style="display: none; margin-top: 0.75rem; background: rgba(0,0,0,0.25); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 8px; padding: 12px;">
                            <p class="section-description" style="margin-bottom: 0.5rem; font-size: 0.8rem;">
                                Enter a new password / PIN (min. 4 characters). Leave empty to remove password protection.
                            </p>
                            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                                <div style="flex: 1; min-width: 220px;">
                                    <input type="password" id="editUserPasswordInput" class="form-input" placeholder="New password or leave empty to clear">
                                </div>
                                <button type="button" class="btn btn-warning" onclick="userManagementModal.saveUserPasswordFromEdit()" style="white-space: nowrap;">
                                    🔑 Set / Clear Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                    <button onclick="userManagementModal.saveUserEdit()" class="btn btn-success btn-small">💾 Save User</button>
                    <button onclick="userManagementModal.cancelUserEdit()" class="btn btn-secondary btn-small">❌ Cancel</button>
                </div>
            </div>
            
            <!-- User List -->
            <div id="userList"></div>
        `;

        // Setup event listeners
        this._setupUserTabListeners();
        this.renderUserList();
    },

    // =================== GROUPS TAB ===================

    renderGroupsTab(container) {
        container.innerHTML = `
            <!-- Header with Title & Create Group Toggle Button -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <h3 class="section-title" style="margin: 0;">📋 Existing Groups</h3>
                    <span id="groupCountBadge" style="background: rgba(16, 185, 129, 0.15); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; padding: 2px 8px; font-size: 0.75rem; font-weight: 600;">0</span>
                </div>
                <button type="button" id="toggleAddGroupBtn" onclick="userManagementModal.toggleAddGroupForm()" class="btn btn-success btn-small" style="display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>➕</span> Create New Group
                </button>
            </div>

            <!-- Add Group Section (Initially Hidden) -->
            <div id="addGroupSection" class="user-modal-section add-user-section" style="display: none; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <h3 class="section-title" style="margin: 0; font-size: 1.05rem;">➕ Create New Group</h3>
                    <button type="button" class="user-modal-close" style="font-size: 1.2rem; padding: 2px 6px;" onclick="userManagementModal.toggleAddGroupForm(false)">×</button>
                </div>
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
                    <button type="button" onclick="userManagementModal.toggleAddGroupForm(false)" class="btn btn-secondary">Cancel</button>
                    <small class="section-description" style="margin: 0; margin-left: 0.5rem;">Only group name is required. All other fields are optional.</small>
                </div>
            </div>

            <!-- Edit Group Section (Initially Hidden) -->
            <div id="editGroupSection" class="user-modal-section edit-user-section" style="display: none; margin-bottom: 1.5rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                    <h3 class="section-title" style="margin: 0; color: #f59e0b; font-size: 1.05rem;">✏️ Edit Group</h3>
                    <button type="button" class="user-modal-close" style="font-size: 1.2rem; padding: 2px 6px;" onclick="userManagementModal.cancelGroupEdit()">×</button>
                </div>
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
            <div id="groupList"></div>
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

        // Password enter key in edit user password sub-section
        const passwordInput = document.getElementById('editUserPasswordInput') || document.getElementById('newPassword');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.saveUserPasswordFromEdit();
            });
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

    toggleAddUserForm(force = null) {
        const section = document.getElementById('addUserSection');
        const btn = document.getElementById('toggleAddUserBtn');
        if (!section) return;

        const willShow = force !== null ? force : (section.style.display === 'none' || !section.style.display);
        section.style.display = willShow ? 'block' : 'none';

        if (btn) {
            btn.innerHTML = willShow ? '<span>✕</span> Close Form' : '<span>➕</span> Add New User';
            btn.className = willShow ? 'btn btn-secondary btn-small' : 'btn btn-success btn-small';
        }

        if (willShow) {
            this.cancelUserEdit();
            setTimeout(() => document.getElementById('newUserName')?.focus(), 50);
        }
    },

    toggleAddGroupForm(force = null) {
        const section = document.getElementById('addGroupSection');
        const btn = document.getElementById('toggleAddGroupBtn');
        if (!section) return;

        const willShow = force !== null ? force : (section.style.display === 'none' || !section.style.display);
        section.style.display = willShow ? 'block' : 'none';

        if (btn) {
            btn.innerHTML = willShow ? '<span>✕</span> Close Form' : '<span>➕</span> Create New Group';
            btn.className = willShow ? 'btn btn-secondary btn-small' : 'btn btn-success btn-small';
        }

        if (willShow) {
            this.cancelGroupEdit();
            setTimeout(() => document.getElementById('newGroupName')?.focus(), 50);
        }
    },

    toggleEditPasswordForm() {
        const container = document.getElementById('editUserPasswordContainer');
        if (!container) return;
        const isHidden = container.style.display === 'none' || !container.style.display;
        container.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            const input = document.getElementById('editUserPasswordInput');
            if (input) {
                input.value = '';
                input.focus();
            }
        }
    },

    _updateEditPasswordUI(username) {
        const hasPassword = Boolean(this.isPasswordSystemEnabled() && window.secureStorage?.hasUserPassword?.(username));
        const statusEl = document.getElementById('editUserPasswordStatus');
        const toggleBtn = document.getElementById('toggleEditPasswordBtn');
        if (statusEl) {
            statusEl.innerHTML = hasPassword ?
                '<span style="color: #10b981; font-weight: 500;">🔒 Password is set</span>' :
                '<span style="color: #9ca3af; font-weight: 400;">🔓 No password configured</span>';
        }
        if (toggleBtn) {
            toggleBtn.innerHTML = hasPassword ? '🔑 Change Password' : '🔑 Set Password';
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

            this.lastCreatedUser = name;
            this.toggleAddUserForm(false);
            this.renderUserList();
            this.populatePasswordUserSelect();
            this.showSuccess(`User "${name}" added to group "${group}"`);
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

        // Close Add User form if open
        this.toggleAddUserForm(false);

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
                const hasOption = groupSelect.options ? Array.from(groupSelect.options).some(o => o.value === group) : false;
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
                const hasRoleOption = roleSelect.options ? Array.from(roleSelect.options).some(o => o.value === roleValue) : false;
                if (hasRoleOption) {
                    roleSelect.value = roleValue;
                } else if (roleValue) {
                    this._onRoleSelectChange('editUserRole');
                    const customRoleInput = document.getElementById('editUserRole_custom');
                    if (customRoleInput) customRoleInput.value = roleValue;
                }
            }

            // Update password status and UI for this user
            this._updateEditPasswordUI(username);

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

            // If a new password was entered in the edit password sub-form, update it as well
            const passwordInput = document.getElementById('editUserPasswordInput');
            if (passwordInput && passwordInput.value) {
                await this.setPassword(newName, passwordInput.value);
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
        const passwordContainer = document.getElementById('editUserPasswordContainer');
        if (passwordContainer) passwordContainer.style.display = 'none';
        const passwordInput = document.getElementById('editUserPasswordInput');
        if (passwordInput) passwordInput.value = '';
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

            this.toggleAddGroupForm(false);
            this.renderGroupList();
            this.showSuccess(`Group "${name}" created`);
        } catch (error) {
            console.error('Error creating group:', error);
            this.showError('Failed to create group: ' + error.message);
        }
    },

    startEditGroup(groupId) {
        const group = window.profileManager?.getGroupById(groupId);
        if (!group) return;

        // Close Add Group form if open
        this.toggleAddGroupForm(false);

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

        const countBadge = document.getElementById('userCountBadge');
        if (countBadge) countBadge.textContent = users.length;
        
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
                        <button type="button" onclick="userManagementModal.exportSingleUser('${user}')" class="btn btn-secondary btn-small" title="Export this user & templates">📤</button>
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

        const countBadge = document.getElementById('groupCountBadge');
        if (countBadge) countBadge.textContent = groups.length;

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
                        <button type="button" onclick="userManagementModal.exportSingleGroup('${group.name}')" class="btn btn-secondary btn-small" title="Export this group & templates">📤</button>
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

    async setPassword(targetUserOverride = null, passwordOverride = null) {
        const currentUser = window.userManager?.currentUser;
        const passwordInput = document.getElementById('editUserPasswordInput') || document.getElementById('newPassword');
        const userSelect = document.getElementById('passwordUser');

        let targetUser = targetUserOverride || this.editingUser;
        if (!targetUser) {
            if (currentUser === 'Admin') {
                targetUser = userSelect?.value;
                if (!targetUser) {
                    this.showError('Please select a user');
                    return;
                }
            } else {
                targetUser = currentUser;
            }
        }

        const password = passwordOverride !== null ? passwordOverride : (passwordInput ? passwordInput.value : '');

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
            if (passwordInput) passwordInput.value = '';
            if (userSelect) userSelect.value = '';
            if (this.editingUser === targetUser) {
                this._updateEditPasswordUI(targetUser);
            }
            this.renderUserList();
            this.populatePasswordUserSelect();
            this.showSuccess(`🔑 Password set for "${targetUser}"`);
        } catch (error) {
            this.showError('Failed to set password: ' + error.message);
        }
    },

    async saveUserPasswordFromEdit() {
        if (!this.editingUser) return;
        return this.setPassword(this.editingUser);
    },

    async _removeUserPassword(targetUser, passwordInput, userSelect) {
        try {
            if (window.secureStorage?.removeUserPassword) {
                await window.secureStorage.removeUserPassword(targetUser);
                if (passwordInput) passwordInput.value = '';
                if (userSelect) userSelect.value = '';
                if (this.editingUser === targetUser) {
                    this._updateEditPasswordUI(targetUser);
                }
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
            
            if (result && result.canceled) {
                console.log('ℹ️ Profile import cancelled by user');
                return;
            }

            if (result.success) {
                const stats = result.stats;
                let message = `Import complete! ${stats.groupsAdded} groups, ${stats.usersAdded} users added.`;
                if (stats.templatesImported > 0) {
                    message += ` (${stats.templatesImported} template${stats.templatesImported !== 1 ? 's' : ''} imported)`;
                }
                
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

    // =================== EXPORT MODAL & ACTIONS ===================

    exportSingleUser(username) {
        this.openExportModal({ scope: 'user', target: username });
    },

    exportSingleGroup(groupName) {
        this.openExportModal({ scope: 'group', target: groupName });
    },

    openExportModal(options = {}) {
        const existing = document.getElementById('ugmExportModal');
        if (existing) existing.remove();

        const allUsers = window.userManager?.users || [];
        const allGroups = window.profileManager ? window.profileManager.getAllGroups() : [];

        const initialScope = options.scope || 'all';
        const initialTarget = options.target || (initialScope === 'user' ? allUsers[0] : allGroups[0]?.name);

        const groupOptionsHtml = allGroups.map(g => `<option value="${g.name}" ${g.name === initialTarget ? 'selected' : ''}>${g.name}</option>`).join('');
        const userOptionsHtml = allUsers.map(u => `<option value="${u}" ${u === initialTarget ? 'selected' : ''}>${u}</option>`).join('');

        const modalHtml = `
            <div id="ugmExportModal" class="modal-overlay" style="display: flex; z-index: 10001; position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); align-items: center; justify-content: center;">
                <div class="modal-content" style="max-width: 520px; width: 92%; background: linear-gradient(135deg, #1e1e2e, #2a2a40); border: 1px solid rgba(255, 255, 255, 0.15); box-shadow: 0 20px 40px rgba(0,0,0,0.6); border-radius: 16px; color: #e0e0e0; padding: 2rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0; color: #a855f7; font-size: 1.3rem; display: flex; align-items: center; gap: 0.5rem;">
                            <span>📤</span> Export Profiles & Templates
                        </h3>
                        <button type="button" class="user-modal-close" onclick="userManagementModal.closeExportModal()" style="font-size: 1.3rem; padding: 2px 8px; cursor: pointer; background: transparent; border: none; color: #9ca3af;">×</button>
                    </div>

                    <!-- Scope Selection -->
                    <div style="margin-bottom: 1.25rem;">
                        <label class="form-label" style="font-weight: 600; margin-bottom: 0.6rem; display: block; color: #cbd5e1;">Export Scope:</label>
                        <div style="display: flex; flex-direction: column; gap: 0.65rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #e0e0e0;">
                                <input type="radio" name="ugmExportScope" value="all" ${initialScope === 'all' ? 'checked' : ''} onchange="userManagementModal.updateExportScopeUI()">
                                <span>🌐 <strong>All Profiles</strong> (all users & groups)</span>
                            </label>

                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #e0e0e0;">
                                <input type="radio" name="ugmExportScope" value="group" ${initialScope === 'group' ? 'checked' : ''} onchange="userManagementModal.updateExportScopeUI()">
                                <span>📁 <strong>Specific Group</strong> (group profile & members)</span>
                            </label>
                            <div id="ugmExportGroupContainer" style="margin-left: 1.75rem; display: ${initialScope === 'group' ? 'block' : 'none'};">
                                <select id="ugmExportGroupSelect" class="form-select" onchange="userManagementModal.updateExportSummary()" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white;">
                                    ${groupOptionsHtml}
                                </select>
                            </div>

                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; color: #e0e0e0;">
                                <input type="radio" name="ugmExportScope" value="user" ${initialScope === 'user' ? 'checked' : ''} onchange="userManagementModal.updateExportScopeUI()">
                                <span>👤 <strong>Specific User</strong> (profile, preferences & group)</span>
                            </label>
                            <div id="ugmExportUserContainer" style="margin-left: 1.75rem; display: ${initialScope === 'user' ? 'block' : 'none'};">
                                <select id="ugmExportUserSelect" class="form-select" onchange="userManagementModal.updateExportSummary()" style="width: 100%; padding: 0.5rem; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white;">
                                    ${userOptionsHtml}
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Format / Destination Selection -->
                    <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 1rem; margin-bottom: 1.25rem;">
                        <label class="form-label" style="font-weight: 600; margin-bottom: 0.6rem; display: block; color: #cbd5e1;">Export Format & Destination:</label>
                        <div style="display: flex; flex-direction: column; gap: 0.65rem; margin-bottom: 0.75rem;">
                            <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; color: #e0e0e0;">
                                <input type="radio" name="ugmExportMode" value="zip" checked onchange="userManagementModal.updateExportSummary()" style="margin-top: 0.2rem;">
                                <div>
                                    <span>📦 <strong>ZIP Package (.zip)</strong> (Empfohlen)</span>
                                    <small style="color: #9ca3af; display: block; font-size: 0.8rem;">Creates a portable <code>.zip</code> archive containing profile JSON files and a <code>templates/</code> subfolder. Opens natively in Windows Explorer & macOS.</small>
                                </div>
                            </label>
                            <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; color: #e0e0e0;">
                                <input type="radio" name="ugmExportMode" value="folder" onchange="userManagementModal.updateExportSummary()" style="margin-top: 0.2rem;">
                                <div>
                                    <span>📁 <strong>Export to Folder</strong></span>
                                    <small style="color: #9ca3af; display: block; font-size: 0.8rem;">Creates an export directory with separate JSON files (<code>metafold-profiles.json</code>, <code>users.json</code>, <code>groups.json</code>) and a <code>templates/</code> subfolder.</small>
                                </div>
                            </label>
                            <label style="display: flex; align-items: flex-start; gap: 0.5rem; cursor: pointer; color: #e0e0e0;">
                                <input type="radio" name="ugmExportMode" value="file" onchange="userManagementModal.updateExportSummary()" style="margin-top: 0.2rem;">
                                <div>
                                    <span>📄 <strong>Single JSON File</strong></span>
                                    <small style="color: #9ca3af; display: block; font-size: 0.8rem;">Saves all selected profiles, groups, and templates bundled together into a single <code>.json</code> file.</small>
                                </div>
                            </label>
                        </div>

                        <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 0.75rem;">
                            <label style="display: flex; align-items: center; gap: 0.6rem; cursor: pointer; color: #e0e0e0; font-weight: 500;">
                                <input type="checkbox" id="ugmExportIncludeTemplates" checked onchange="userManagementModal.updateExportSummary()">
                                <span>📑 Include associated templates</span>
                            </label>
                        </div>
                    </div>

                    <!-- Summary Box -->
                    <div id="ugmExportSummaryBox" style="background: rgba(168, 85, 247, 0.12); border: 1px solid rgba(168, 85, 247, 0.3); border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1.5rem; font-size: 0.85rem; color: #e9d5ff;">
                        <!-- Updated by JS -->
                    </div>

                    <!-- Footer Buttons -->
                    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                        <button type="button" onclick="userManagementModal.closeExportModal()" class="btn btn-secondary">Cancel</button>
                        <button type="button" id="ugmExecuteExportBtn" onclick="userManagementModal.executeExport()" class="btn btn-success" style="padding: 0.6rem 1.5rem; font-weight: 600;">
                            📦 Export ZIP Package
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.updateExportScopeUI();
    },

    closeExportModal() {
        const modal = document.getElementById('ugmExportModal');
        if (modal) modal.remove();
    },

    updateExportScopeUI() {
        const radios = document.querySelectorAll('input[name="ugmExportScope"]');
        let selectedScope = 'all';
        radios.forEach(r => { if (r.checked) selectedScope = r.value; });

        const groupContainer = document.getElementById('ugmExportGroupContainer');
        const userContainer = document.getElementById('ugmExportUserContainer');

        if (groupContainer) groupContainer.style.display = (selectedScope === 'group') ? 'block' : 'none';
        if (userContainer) userContainer.style.display = (selectedScope === 'user') ? 'block' : 'none';

        this.updateExportSummary();
    },

    async updateExportSummary() {
        const scopeRadios = document.querySelectorAll('input[name="ugmExportScope"]');
        let selectedScope = 'all';
        scopeRadios.forEach(r => { if (r.checked) selectedScope = r.value; });

        const modeRadios = document.querySelectorAll('input[name="ugmExportMode"]');
        let selectedMode = 'zip';
        modeRadios.forEach(r => { if (r.checked) selectedMode = r.value; });

        const groupSelect = document.getElementById('ugmExportGroupSelect');
        const userSelect = document.getElementById('ugmExportUserSelect');
        const includeTemplates = document.getElementById('ugmExportIncludeTemplates')?.checked || false;

        let targetName = null;
        if (selectedScope === 'group') targetName = groupSelect?.value;
        if (selectedScope === 'user') targetName = userSelect?.value;

        const scope = { type: selectedScope, name: targetName };
        const exportData = window.profileManager?.getExportData(scope) || { users: [], groups: [] };

        let templateCount = 0;
        if (includeTemplates && window.profileManager?.getTemplatesForScope) {
            try {
                const templates = await window.profileManager.getTemplatesForScope(scope);
                templateCount = Array.isArray(templates) ? templates.length : 0;
            } catch (e) {
                templateCount = 0;
            }
        }

        const summaryBox = document.getElementById('ugmExportSummaryBox');
        const executeBtn = document.getElementById('ugmExecuteExportBtn');

        if (summaryBox) {
            const escHtml = (s) => (typeof appUtils !== 'undefined' && appUtils.escapeHtml)
                ? appUtils.escapeHtml(s)
                : String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
            let details = '';
            if (selectedScope === 'user') {
                const grpName = exportData.groups[0]?.name || 'Default';
                details = `User: <strong>${escHtml(targetName || 'None')}</strong> (Group: <em>${escHtml(grpName)}</em>)`;
            } else if (selectedScope === 'group') {
                details = `Group: <strong>${escHtml(targetName || 'None')}</strong> (${exportData.users.length} member${exportData.users.length !== 1 ? 's' : ''})`;
            } else {
                details = `All Profiles: <strong>${exportData.users.length}</strong> user(s), <strong>${exportData.groups.length}</strong> group(s)`;
            }

            let formatDesc = '';
            if (selectedMode === 'zip') {
                formatDesc = `📦 ZIP Package (.zip Archiv mit Profilen & Templates)`;
            } else if (selectedMode === 'folder') {
                formatDesc = `📁 Export to Folder (Ordner mit separaten JSON-Dateien & Templates)`;
            } else {
                formatDesc = `📄 Single JSON Bundle (.json Datei mit eingebetteten Daten)`;
            }

            let templateText = includeTemplates
                ? `<div>📑 Associated templates: <strong>${templateCount}</strong></div>`
                : `<div>📄 Metadata only (no templates)</div>`;

            summaryBox.innerHTML = `
                <div style="margin-bottom: 0.35rem; font-weight: 600;">📊 Export Scope & Destination:</div>
                <div style="margin-bottom: 0.25rem;">${details}</div>
                <div style="margin-bottom: 0.25rem;">Format: <strong>${formatDesc}</strong></div>
                ${templateText}
            `;
        }

        if (executeBtn) {
            if (selectedMode === 'zip') {
                executeBtn.textContent = '📦 Export ZIP Package';
            } else if (selectedMode === 'folder') {
                executeBtn.textContent = '📁 Choose Folder & Export';
            } else {
                executeBtn.textContent = '📄 Save JSON File';
            }
        }
    },

    async executeExport() {
        const scopeRadios = document.querySelectorAll('input[name="ugmExportScope"]');
        let selectedScope = 'all';
        scopeRadios.forEach(r => { if (r.checked) selectedScope = r.value; });

        const modeRadios = document.querySelectorAll('input[name="ugmExportMode"]');
        let selectedMode = 'zip';
        modeRadios.forEach(r => { if (r.checked) selectedMode = r.value; });

        const groupSelect = document.getElementById('ugmExportGroupSelect');
        const userSelect = document.getElementById('ugmExportUserSelect');
        const includeTemplates = document.getElementById('ugmExportIncludeTemplates')?.checked || false;

        let targetName = null;
        if (selectedScope === 'group') targetName = groupSelect?.value;
        if (selectedScope === 'user') targetName = userSelect?.value;

        this.closeExportModal();

        try {
            const scope = { type: selectedScope, name: targetName };
            const result = await window.profileManager.exportProfiles(scope, selectedMode, includeTemplates);
            if (result && result.canceled) {
                return;
            }
            if (result && result.success) {
                const modeLabel = selectedMode === 'zip' ? 'ZIP Package' : selectedMode === 'folder' ? 'Folder' : 'JSON';
                this.showSuccess(`📤 Export completed successfully (${modeLabel})`);
            } else if (result && result.error) {
                this.showError('Export failed: ' + result.error);
            }
        } catch (error) {
            this.showError('Export failed: ' + error.message);
        }
    },

    exportProfiles() {
        this.openExportModal();
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

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '1.2rem';
        iconSpan.textContent = isError ? '⚠️' : isWarning ? '⚠️' : isSuccess ? '✅' : 'ℹ️';
        const msgSpan = document.createElement('span');
        msgSpan.textContent = message;
        wrapper.appendChild(iconSpan);
        wrapper.appendChild(msgSpan);
        messageDiv.appendChild(wrapper);

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