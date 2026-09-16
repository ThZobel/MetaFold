// Login Modal - Refactored for Component Loading

// Remove existing loginModal if already defined
if (window.loginModal) {
    console.log('🔧 Removing existing loginModal');
    delete window.loginModal;
}

const loginModal = {
    modal: null,
    usernameInput: null,
    passwordInput: null,
    userSuggestions: null,
    onConfirm: null,
    onCancel: null,
    passwordRequired: false,
    escapeHandler: null,

    async show(requirePassword = false) {
        console.log('🔧 loginModal.show() called with password support:', requirePassword);
        this.passwordRequired = requirePassword; // Store password requirement

        return new Promise(async (resolve, reject) => {
            try {
                await this.createModal();
                this.setupEventListeners();
                this.loadSuggestions();
                this.updateUI();

                this.onConfirm = resolve;
                this.onCancel = reject;

                console.log('✅ Login modal displayed with password support');
            } catch (error) {
                console.error('❌ Failed to show login modal:', error);
                reject(error);
            }
        });
    },

    async createModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('loginModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create container
        let container = document.getElementById('login-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'login-modal-container';
            // EXPLICITLY HIDE CONTAINER INITIALLY
            container.style.display = 'none';
            document.body.appendChild(container);
        }

        // Load component
        if (window.componentLoader) {
            await window.componentLoader.load('login-modal-container', 'components/modals/login-modal.html');
        } else {
            console.error('❌ componentLoader not available');
            throw new Error('componentLoader not available');
        }

        // Get references
        this.modal = document.getElementById('loginModal');
        this.usernameInput = document.getElementById('usernameInput');
        this.passwordInput = document.getElementById('passwordInput');
        this.userSuggestions = document.getElementById('userSuggestions');

        // Ensure modal is visible and container is shown
        if (this.modal) {
            // Show container first
            if (container) container.style.display = 'block';
            this.modal.style.display = 'flex';
        }
    },

    updateUI() {
        // Get last user for pre-filling
        const lastUser = this.getLastUser();
        const hasLastUser = lastUser && lastUser.username && lastUser.username !== 'User';

        // Context-aware messaging
        const welcomeMessage = document.getElementById('welcomeMessage');
        const usernameLabel = document.getElementById('usernameLabel');
        const usernameInput = document.getElementById('usernameInput');
        const loginLockIcon = document.getElementById('loginLockIcon');

        if (welcomeMessage) {
            welcomeMessage.innerHTML = hasLastUser
                ? `Welcome back! Continue as <strong>${lastUser.username}</strong> or select a different user:`
                : 'Enter your details to get started:';
        }

        if (usernameLabel) {
            usernameLabel.textContent = hasLastUser ? '👤 Or select different user:' : '👤 Your Name:';
        }

        if (usernameInput) {
            usernameInput.placeholder = hasLastUser ? 'Enter different name or select from history' : 'e.g. Dr. Jane Smith';
        }

        if (loginLockIcon) {
            if (this.passwordRequired) {
                loginLockIcon.classList.remove('hidden');
            } else {
                loginLockIcon.classList.add('hidden');
            }
        }

        // Password Section Visibility
        const passwordSection = document.getElementById('passwordSection');
        if (passwordSection) {
            if (this.passwordRequired) {
                passwordSection.classList.remove('hidden');
            } else {
                passwordSection.classList.add('hidden');
            }
        }

        // Login Button Text
        const loginBtn = document.getElementById('loginConfirm');
        if (loginBtn) {
            loginBtn.textContent = this.passwordRequired ? '🔓 Login' : '🚀 Let\'s Go!';
        }

        // Security Message
        const securityMessage = document.getElementById('securityMessage');
        if (securityMessage) {
            securityMessage.textContent = this.passwordRequired
                ? 'Passwords are securely encrypted 🔐'
                : 'Your data stays local in your browser 🔒';
        }

        // Last User Section Logic
        const lastUserSection = document.getElementById('lastUserSection');
        if (lastUserSection) {
            if (this.passwordRequired || !hasLastUser) {
                lastUserSection.classList.add('hidden');
                lastUserSection.innerHTML = '';
            } else {
                // Check if last user has a password
                const lastUserHasPassword = window.secureStorage &&
                    window.secureStorage.hasUserPassword &&
                    window.secureStorage.hasUserPassword(lastUser.username);

                lastUserSection.classList.remove('hidden');

                // Apply classes based on password requirement
                lastUserSection.className = 'last-user-section ' + (lastUserHasPassword ? 'password-required' : 'no-password');

                lastUserSection.innerHTML = `
                    <div class="last-user-content">
                        <div>
                            <div class="last-user-name">${lastUser.username} ${lastUserHasPassword ? '🔐' : ''}</div>
                            <div class="last-user-group">${lastUser.groupname || 'Default'}</div>
                            <div class="last-user-time">Last used: ${this.formatLastUsed(lastUser.timestamp)}</div>
                        </div>
                        <button onclick="loginModal.continueWithLastUser()" class="continue-btn">
                            ✅ Continue
                        </button>
                    </div>
                `;
            }
        }
    },

    setupEventListeners() {
        if (!this.usernameInput) return;

        // Auto-complete for username
        this.usernameInput.addEventListener('input', (e) => {
            this.showUserSuggestions(e.target.value);
        });

        // Hide suggestions when clicking outside or losing focus
        this.usernameInput.addEventListener('blur', (e) => {
            const suggestionsContainer = this.userSuggestions;
            const relatedTarget = e.relatedTarget;

            setTimeout(() => {
                if (suggestionsContainer &&
                    (!relatedTarget || !suggestionsContainer.contains(relatedTarget))) {
                    suggestionsContainer.style.display = 'none';
                }
            }, 300);
        });

        // Show suggestions on focus if there's text
        this.usernameInput.addEventListener('focus', () => {
            if (this.usernameInput.value.trim()) {
                this.showUserSuggestions(this.usernameInput.value);
            }
        });

        // Password Input Event Handlers
        if (this.passwordInput) {
            // Enter key for Password
            this.passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleConfirm();
                }
            });

            // Password Toggle Button
            const passwordToggle = document.getElementById('passwordToggle');
            if (passwordToggle) {
                passwordToggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.togglePasswordVisibility();
                    // Refocus password input
                    setTimeout(() => {
                        if (this.passwordInput) {
                            this.passwordInput.focus();
                        }
                    }, 10);
                });
            }
        }

        // Confirm button
        const confirmBtn = document.getElementById('loginConfirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.handleConfirm();
            });
        }

        // Enter key for Username
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (this.passwordInput && this.passwordRequired) {
                    // Focus on Password field
                    this.passwordInput.focus();
                } else {
                    this.handleConfirm();
                }
            }
        });

        // Global Escape Key
        const escapeHandler = (e) => {
            if (e.key === 'Escape' && this.modal) {
                this.handleCancel();
            }
        };
        document.addEventListener('keydown', escapeHandler);
        this.escapeHandler = escapeHandler;

        // Initial Focus
        // Initial Focus with Enhanced Reliability
        const focusInput = () => {
            // Ensure modal and input are actually visible
            if (this.modal && this.modal.offsetParent !== null &&
                this.usernameInput && this.usernameInput.offsetParent !== null) {
                try {
                    this.usernameInput.focus();
                    if (this.usernameInput.value) {
                        this.usernameInput.select();
                    }
                } catch (e) { console.warn('Focus attempt failed', e); }
            }
        };

        // Attempt focus immediately and with delays to account for animations/rendering
        focusInput();
        setTimeout(focusInput, 100);
        setTimeout(focusInput, 300);
        setTimeout(focusInput, 500);
    },

    loadSuggestions() {
        // Set placeholder based on existing users
        const users = window.userManager?.users || [];

        if (users.length > 0) {
            this.usernameInput.placeholder = `e.g. ${users[0]} or enter new name`;
        } else {
            this.usernameInput.placeholder = 'e.g. Dr. Jane Smith';
        }
    },

    showUserSuggestions(query) {
        if (!query || query.length < 1) {
            this.userSuggestions.style.display = 'none';
            return;
        }

        const users = window.userManager?.users || [];

        const suggestions = users
            .filter(user => user.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);

        this.renderUserSuggestions(this.userSuggestions, suggestions, (user) => {
            console.log('🔄 User selected from suggestions:', user);

            if (this.usernameInput) {
                this.usernameInput.value = user;
            }

            setTimeout(() => {
                if (this.userSuggestions) {
                    this.userSuggestions.style.display = 'none';
                }
            }, 50);

            setTimeout(() => {
                if (this.usernameInput) {
                    this.usernameInput.focus();
                }
            }, 100);
        });
    },

    renderUserSuggestions(container, suggestions, onClick) {
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = suggestions
            .map((user, index) => {
                const group = this.getUserGroupFromStorage(user);
                const color = window.userManager?.generateUserColor(user) || '#7c3aed';
                const initials = window.userManager?.getUserInitials(user) || '??';

                return `<div class="suggestion-item" data-user="${user}" data-index="${index}">
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
                        margin-right: 0.75rem;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                        pointer-events: none;
                    ">${initials}</div>
                    <div style="pointer-events: none;">
                        <div style="font-weight: 600; color: #e0e0e0;">${user}</div>
                        <div style="color: #9ca3af; font-size: 0.85rem;">${group}</div>
                    </div>
                </div>`;
            })
            .join('');

        container.style.display = 'block';

        // Add click handlers
        container.querySelectorAll('.suggestion-item').forEach((item) => {
            const username = item.getAttribute('data-user');

            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(124, 58, 237, 0.1)';
            });

            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });

            const handleSelection = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                console.log('User suggestion selected:', username);
                container.style.display = 'none';
                onClick(username);
            };

            item.addEventListener('click', handleSelection, true);
            item.addEventListener('mousedown', handleSelection, true);
            item.addEventListener('touchstart', handleSelection, true);
        });

        // Container click handler
        container.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                const username = suggestionItem.getAttribute('data-user');
                if (username) {
                    e.preventDefault();
                    e.stopPropagation();
                    container.style.display = 'none';
                    onClick(username);
                }
            }
        }, true);
    },

    showUserManagement() {
        if (!this.modal) {
            console.warn('⚠️ Login modal not available');
            return;
        }

        this.modal.style.display = 'none';

        if (window.userManagementModal) {
            window.userManagementModal.show();

            const originalClose = window.userManagementModal.close;
            window.userManagementModal.close = () => {
                if (originalClose && typeof originalClose === 'function') {
                    originalClose.call(window.userManagementModal);
                }

                if (this.modal) {
                    this.modal.style.display = 'flex';
                    this.loadSuggestions();
                    if (this.usernameInput) {
                        this.usernameInput.focus();
                    }
                }
            };
        } else {
            console.warn('User management modal not available');
            if (this.modal) {
                this.modal.style.display = 'flex';
            }
        }
    },

    async continueWithLastUser() {
        const lastUser = this.getLastUser();
        if (!lastUser || !lastUser.username || lastUser.username === 'User') {
            this.showError('No valid last user found');
            return;
        }

        const actualGroup = this.getUserGroupFromStorage(lastUser.username) || lastUser.groupname || 'Default';
        console.log(`🔄 Continue attempt for user: ${lastUser.username} (${actualGroup})`);

        const hasPassword = window.secureStorage?.hasUserPassword?.(lastUser.username);

        if (hasPassword) {
            console.log(`🔐 User ${lastUser.username} has password - requesting verification`);

            try {
                const passwordResponse = await this.promptForPassword(lastUser.username);
                if (!passwordResponse) {
                    console.log('❌ Continue cancelled - no password provided');
                    return;
                }

                // Handle Switch User request
                if (typeof passwordResponse === 'object' && passwordResponse.action === 'switch_user') {
                    console.log('🔄 Switch user requested - closing prompt');
                    return; // Just return to let user interact with main modal
                }

                const password = passwordResponse;

                const isValid = await window.secureStorage.verifyUserPassword(lastUser.username, password);
                if (!isValid) {
                    this.showError('Invalid password. Continue cancelled.');
                    return;
                }

                console.log(`✅ Password verified for continue: ${lastUser.username}`);

                if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                    window.settingsManager.setUserPasswordForEntropy(lastUser.username, password);
                }

            } catch (error) {
                console.error('❌ Password verification failed:', error);
                this.showError('Password verification failed. Please try again.');
                return;
            }
        } else {
            console.log('🔓 No password required for user:', lastUser.username);
        }

        console.log(`✅ Continue with last user: ${lastUser.username}`);
        this.close();
        this.onConfirm({
            username: lastUser.username,
            groupname: actualGroup,
            isContinuation: true,
            passwordVerified: hasPassword
        });
    },

    promptForPassword(username) {
        return new Promise((resolve) => {
            const promptHTML = `
                <div id="loginPasswordPrompt" style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center;
                    z-index: 10003; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    backdrop-filter: blur(5px);
                ">
                    <div style="
                        background: linear-gradient(135deg, #1e1e2e, #2a2a40); padding: 2.5rem;
                        border-radius: 16px; max-width: 450px; width: 90%;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.6); border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #e0e0e0;
                    ">
                        <h3 style="margin: 0 0 1.5rem 0; color: #7c3aed; text-align: center; font-size: 1.5rem;">
                            🔐 Password Required
                        </h3>
                        <p style="margin: 0 0 2rem 0; color: #9ca3af; text-align: center; font-size: 1.1rem;">
                            Enter password for <strong style="color: #a855f7;">${username}</strong>:
                        </p>
                        <div style="position: relative; margin-bottom: 2rem;">
                            <input type="password" id="loginPasswordInput" placeholder="Enter your password" style="
                                width: 100%; padding: 1rem; border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 12px; font-size: 1.1rem; box-sizing: border-box;
                                background: rgba(255, 255, 255, 0.05); color: #e0e0e0; font-family: inherit;
                                outline: none; transition: border-color 0.3s ease;
                            ">
                            <button type="button" id="passwordToggleLogin" style="
                                position: absolute; right: 1rem; top: 50%; transform: translateY(-50%);
                                background: none; border: none; color: #9ca3af; cursor: pointer;
                                font-size: 1.2rem; padding: 0; outline: none; transition: color 0.3s ease;
                            " onclick="loginModal.togglePasswordVisibilityInPrompt()">👁️</button>
                        </div>
                        <div style="display: flex; gap: 1rem;">
                            <button id="loginPasswordSwitchUser" style="
                                background: linear-gradient(45deg, #3b82f6, #60a5fa); color: white;
                                border: none; padding: 1rem; border-radius: 12px; cursor: pointer; font-weight: 600;
                            ">🔄 Switch User</button>
                            <button id="loginPasswordCancel" style="
                                flex: 2; background: linear-gradient(45deg, #6b7280, #9ca3af); color: white;
                                border: none; padding: 1rem; border-radius: 12px; cursor: pointer; font-weight: 600;
                            ">❌ Cancel</button>
                            <button id="loginPasswordContinue" style="
                                flex: 2; background: linear-gradient(45deg, #7c3aed, #a855f7); color: white;
                                border: none; padding: 1rem; border-radius: 12px; cursor: pointer; font-weight: 600;
                            ">🔓 Continue</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', promptHTML);

            setTimeout(() => {
                const input = document.getElementById('loginPasswordInput');
                if (input) {
                    input.focus();
                    input.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            const pwd = input.value;
                            document.getElementById('loginPasswordPrompt').remove();
                            resolve(pwd);
                        }
                    });
                }

                const switchBtn = document.getElementById('loginPasswordSwitchUser');
                if (switchBtn) {
                    switchBtn.addEventListener('click', () => {
                        document.getElementById('loginPasswordPrompt').remove();
                        resolve({ action: 'switch_user' });
                    });
                }

                const cancelBtn = document.getElementById('loginPasswordCancel');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        document.getElementById('loginPasswordPrompt').remove();
                        resolve(null);
                    });
                }

                const continueBtn = document.getElementById('loginPasswordContinue');
                if (continueBtn) {
                    continueBtn.addEventListener('click', () => {
                        const pwd = document.getElementById('loginPasswordInput').value;
                        document.getElementById('loginPasswordPrompt').remove();
                        resolve(pwd);
                    });
                }
            }, 100);
        });
    },

    togglePasswordVisibilityInPrompt() {
        const passwordInput = document.getElementById('loginPasswordInput');
        const toggleButton = document.getElementById('passwordToggleLogin');

        if (!passwordInput || !toggleButton) return;

        const cursorPosition = passwordInput.selectionStart;

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleButton.textContent = '👁️';
        }

        setTimeout(() => {
            passwordInput.setSelectionRange(cursorPosition, cursorPosition);
            passwordInput.focus();
        }, 10);
    },

    getUserGroupFromStorage(username) {
        try {
            const mapping = JSON.parse(localStorage.getItem('metafold_user_group_mapping') || '{}');
            return mapping[username] || 'Default';
        } catch (error) {
            return 'Default';
        }
    },

    getLastUser() {
        try {
            const stored = localStorage.getItem('metafold_last_user');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            return null;
        }
    },

    formatLastUsed(timestamp) {
        if (!timestamp) return 'Unknown';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffHours = Math.floor((now - date) / (1000 * 60 * 60));

            if (diffHours < 1) return 'Just now';
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            const diffDays = Math.floor(diffHours / 24);
            if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            return date.toLocaleDateString();
        } catch (error) {
            return 'Unknown';
        }
    },

    async handleConfirm() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput ? this.passwordInput.value : '';

        if (!username) {
            this.showError('Please enter your name to continue.');
            this.usernameInput.focus();
            return;
        }

        if (username.length < 2) {
            this.showError('Name must be at least 2 characters long.');
            this.usernameInput.focus();
            return;
        }

        try {
            this.setLoadingState(true);
            console.log(`🔍 Checking if user "${username}" has password protection...`);

            const userHasPassword = window.secureStorage?.hasUserPassword &&
                window.secureStorage.hasUserPassword(username);

            if (userHasPassword) {
                if (!this.passwordInput || !password) {
                    this.setLoadingState(false);
                    const modalResponse = await this.promptForPassword(username);
                    if (!modalResponse) return;

                    if (typeof modalResponse === 'object' && modalResponse.action === 'switch_user') {
                        return; // Just cancel
                    }

                    const modalPassword = modalResponse;

                    const isValidModal = await window.secureStorage.verifyUserPassword(username, modalPassword);
                    if (!isValidModal) {
                        this.showError('Invalid password. Please try again.');
                        return;
                    }

                    if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                        window.settingsManager.setUserPasswordForEntropy(username, modalPassword);
                    }
                } else {
                    if (!password) {
                        this.setLoadingState(false);
                        this.showError('Password is required for this user.');
                        if (this.passwordInput) this.passwordInput.focus();
                        return;
                    }

                    const isValidField = await window.secureStorage.verifyUserPassword(username, password);
                    if (!isValidField) {
                        this.setLoadingState(false);
                        this.showError('Invalid password.');
                        if (this.passwordInput) {
                            this.passwordInput.value = '';
                            this.passwordInput.focus();
                        }
                        return;
                    }

                    if (window.settingsManager && window.settingsManager.setUserPasswordForEntropy) {
                        window.settingsManager.setUserPasswordForEntropy(username, password);
                    }
                }
            }

            const groupname = this.getUserGroupFromStorage(username);
            console.log(`✅ Login confirmed: "${username}" in group: "${groupname}"`);

            this.close();

            // Wait a small tick before confirming to ensure UI is clean
            setTimeout(() => {
                if (this.onConfirm) {
                    this.onConfirm({
                        username,
                        groupname,
                        passwordVerified: userHasPassword
                    });
                }
            }, 50);

        } catch (error) {
            console.error('❌ Login confirmation failed:', error);
            this.setLoadingState(false);
            this.showError('Login failed: ' + error.message);
        }
    },

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('passwordInput');
        const toggleButton = document.getElementById('passwordToggle');

        if (!passwordInput || !toggleButton) return;

        const cursorPosition = passwordInput.selectionStart;

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleButton.textContent = '🙈';
        } else {
            passwordInput.type = 'password';
            toggleButton.textContent = '👁️';
        }

        setTimeout(() => {
            passwordInput.setSelectionRange(cursorPosition, cursorPosition);
            passwordInput.focus();
        }, 10);
    },

    setLoadingState(loading) {
        const button = document.getElementById('loginConfirm');
        if (!button) return;

        if (loading) {
            button.disabled = true;
            button.style.opacity = '0.7';
            button.innerHTML = '⏳ Verifying...';
            button.style.cursor = 'not-allowed';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            button.innerHTML = this.passwordRequired ? '🔓 Login' : '🚀 Let\'s Go!';
            button.style.cursor = 'pointer';
        }
    },

    handleCancel() {
        console.log('❌ Login cancelled');
        this.close();
        if (this.onCancel) this.onCancel(new Error('Login cancelled'));
    },

    showError(message) {
        if (!this.modal) return;

        let errorDiv = this.modal.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            // Use inline styles for now as this is dynamic
            errorDiv.style.cssText = `
                background: linear-gradient(45deg, #dc2626, #ef4444);
                color: white;
                padding: 0.75rem;
                border-radius: 8px;
                margin: 1rem 0;
                border: 1px solid rgba(239, 68, 68, 0.3);
                text-align: center;
                font-weight: 500;
                box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
            `;
            const contentDiv = this.modal.querySelector('.modal-content');
            if (contentDiv) contentDiv.appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        setTimeout(() => {
            if (errorDiv.style.display !== 'none') {
                errorDiv.style.display = 'none';
            }
        }, 4000);
    },

    close() {
        if (this.escapeHandler) {
            document.removeEventListener('keydown', this.escapeHandler);
            this.escapeHandler = null;
        }

        if (this.modal) {
            this.modal.style.display = 'none'; // OLD: display none first to avoid flicker

            // Remove the container cleanup from here to prevent race conditions during reloading
            // Let the caller handle cleanup or reuse

            this.modal = null;
            this.usernameInput = null;
            this.passwordInput = null;
            this.userSuggestions = null;
        }

        console.log('✅ Login modal closed and cleaned up');
    },

    debugPasswordStatus() {
        console.log('🐛 === PASSWORD DEBUG SESSION ===');
        console.log('🐛 secureStorage available:', !!window.secureStorage);
        const testUser = 'Thomas';
        if (window.secureStorage && window.secureStorage.hasUserPassword) {
            const hasPassword = window.secureStorage.hasUserPassword(testUser);
            console.log(`🐛 ${testUser} hasPassword (direct):`, hasPassword);
        }
        console.log('🐛 === END DEBUG SESSION ===');
    }
};

window.loginModal = loginModal;

window.checkPasswordCache = function () {
    const currentUser = window.userManager?.getCurrentUser();
    const hasCachedPassword = !!window.settingsManager?.getUserPasswordForEntropy?.(currentUser);
    const hasStoredPassword = window.secureStorage?.hasUserPassword?.(currentUser);

    console.log('🔐 Password Cache Status:', { currentUser, hasStoredPassword, hasCachedPassword });

    return { currentUser, hasStoredPassword, hasCachedPassword };
};

console.log('✅ loginModal loaded (Refactored for Component Loading)');