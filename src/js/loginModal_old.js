// Login Modal (Enhanced with better user experience + App Startup Fix)

// Remove existing loginModal if already defined
if (window.loginModal) {
    console.log('🔧 Removing existing loginModal');
    delete window.loginModal;
}

const loginModal = {
    modal: null,
    usernameInput: null,
    userSuggestions: null,
    onConfirm: null,
    onCancel: null,

    show() {
        console.log('🔧 loginModal.show() called');
        return new Promise((resolve, reject) => {
            this.createModal();
            this.setupEventListeners();
            this.loadSuggestions();
            
            this.onConfirm = resolve;
            this.onCancel = reject;
            
            console.log('✅ Login modal displayed');
        });
    },

    createModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('loginModal');
        if (existingModal) {
            existingModal.remove();
        }

        // IMPROVED: Get last user for pre-filling
        const lastUser = this.getLastUser();
        const hasLastUser = lastUser && lastUser.username && lastUser.username !== 'User';
        
        // IMPROVED: Context-aware messaging for app startup
        const welcomeMessage = hasLastUser 
            ? `Welcome back! Continue as <strong>${lastUser.username}</strong> or select a different user:`
            : 'Enter your name to get started:';

        const modalHTML = `
            <div id="loginModal" style="
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
                    max-width: 450px;
                    width: 90%;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: #e0e0e0;
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                        <h2 style="margin: 0; color: #7c3aed; font-size: 1.8rem;">🚀 Welcome to MetaFold</h2>
                        <button onclick="loginModal.showUserManagement()" style="
                            background: linear-gradient(45deg, #059669, #10b981);
                            color: white;
                            border: none;
                            padding: 0.5rem 1rem;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 0.9rem;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                        " onmouseover="this.style.transform='translateY(-2px)'" 
                           onmouseout="this.style.transform='translateY(0)'">
                            👥 Manage Users
                        </button>
                    </div>
                    <p style="margin: 0 0 2rem 0; color: #9ca3af; text-align: center; font-size: 1.1rem;">
                        ${welcomeMessage}
                    </p>
                    
                    ${hasLastUser ? `
                    <!-- IMPROVED: Quick Continue with Last User -->
                    <div style="margin-bottom: 2rem; padding: 1rem; background: rgba(124, 58, 237, 0.1); border-radius: 12px; border: 1px solid rgba(124, 58, 237, 0.3);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: #a855f7; font-weight: 600; font-size: 1.1rem;">${lastUser.username}</div>
                                <div style="color: #9ca3af; font-size: 0.9rem;">${lastUser.groupname || 'Default'}</div>
                                <div style="color: #6b7280; font-size: 0.8rem; margin-top: 2px;">Last used: ${this.formatLastUsed(lastUser.timestamp)}</div>
                            </div>
                            <button onclick="loginModal.continueWithLastUser()" style="
                                background: linear-gradient(45deg, #059669, #10b981);
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 10px;
                                cursor: pointer;
                                font-size: 1rem;
                                font-weight: 600;
                                transition: all 0.3s ease;
                                box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
                            " onmouseover="this.style.transform='translateY(-2px)'"
                               onmouseout="this.style.transform='translateY(0)'">
                                ✅ Continue
                            </button>
                        </div>
                    </div>
                    ` : ''}
                    
                    <div style="margin-bottom: 2rem;">
                        <label style="display: block; margin-bottom: 0.75rem; font-weight: 600; color: #a855f7; font-size: 1rem;">
                            👤 ${hasLastUser ? 'Or select different user:' : 'Your Name:'}
                        </label>
                        <div style="position: relative;">
                            <input type="text" id="usernameInput" placeholder="${hasLastUser ? 'Enter different name or select from history' : 'e.g. Dr. Jane Smith'}" 
                                   autocomplete="off" style="
                                width: 100%;
                                padding: 1rem;
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 8px;
                                font-size: 1rem;
                                box-sizing: border-box;
                                background: rgba(255, 255, 255, 0.05);
                                color: #e0e0e0;
                                transition: all 0.3s ease;
                            " onfocus="this.style.borderColor='#7c3aed'; this.style.boxShadow='0 0 0 2px rgba(124, 58, 237, 0.2)'"
                               onblur="this.style.borderColor='rgba(255, 255, 255, 0.2)'; this.style.boxShadow='none'">
                            <div id="userSuggestions" style="
                                position: absolute;
                                top: 100%;
                                left: 0;
                                right: 0;
                                background: linear-gradient(135deg, #2a2a40, #1e1e2e);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                border-radius: 8px;
                                box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                                display: none;
                                z-index: 1000;
                                max-height: 200px;
                                overflow-y: auto;
                                margin-top: 4px;
                            "></div>
                        </div>
                        <small style="color: #9ca3af; margin-top: 0.75rem; display: block; font-size: 0.9rem;">
                            💡 Groups can be assigned in user management
                        </small>
                    </div>
                    
                    <div style="text-align: center;">
                        <button id="loginConfirm" style="
                            background: linear-gradient(45deg, #7c3aed, #a855f7);
                            color: white;
                            border: none;
                            padding: 1rem 2.5rem;
                            border-radius: 12px;
                            font-size: 1.1rem;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
                            min-width: 160px;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 25px rgba(124, 58, 237, 0.4)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(124, 58, 237, 0.3)'">
                            🚀 Let's Go!
                        </button>
                    </div>
                    
                    <div style="margin-top: 1.5rem; text-align: center;">
                        <small style="color: #6b7280; font-size: 0.85rem;">
                            Your data stays local in your browser 🔒
                        </small>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('loginModal');
        this.usernameInput = document.getElementById('usernameInput');
        this.userSuggestions = document.getElementById('userSuggestions');
    },

    setupEventListeners() {
        // Auto-complete for username
        this.usernameInput.addEventListener('input', (e) => {
            this.showUserSuggestions(e.target.value);
        });

        // Hide suggestions when clicking outside or losing focus
        // Use a longer delay and check if we're clicking on a suggestion
        this.usernameInput.addEventListener('blur', (e) => {
            // Check if the related target is within our suggestions
            const suggestionsContainer = this.userSuggestions;
            const relatedTarget = e.relatedTarget;
            
            setTimeout(() => {
                // Don't hide if we clicked on a suggestion
                if (suggestionsContainer && 
                    (!relatedTarget || !suggestionsContainer.contains(relatedTarget))) {
                    suggestionsContainer.style.display = 'none';
                }
            }, 300); // Increased delay
        });

        // Show suggestions on focus if there's text
        this.usernameInput.addEventListener('focus', () => {
            if (this.usernameInput.value.trim()) {
                this.showUserSuggestions(this.usernameInput.value);
            }
        });

        // Confirm button
        const confirmBtn = document.getElementById('loginConfirm');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.handleConfirm();
            });
        }

        // Enter key
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleConfirm();
            }
        });

        // Escape key to cancel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal) {
                this.handleCancel();
            }
        });

        // Focus on input field with slight delay
        setTimeout(() => {
            if (this.usernameInput) {
                this.usernameInput.focus();
                this.usernameInput.select();
            }
        }, 150);
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
            
            // Set the username immediately
            if (this.usernameInput) {
                this.usernameInput.value = user;
            }
            
            // Hide suggestions with a slight delay to ensure click is processed
            setTimeout(() => {
                if (this.userSuggestions) {
                    this.userSuggestions.style.display = 'none';
                }
            }, 50);
            
            // Focus back to input
            setTimeout(() => {
                if (this.usernameInput) {
                    this.usernameInput.focus();
                }
            }, 100);
            
            // Optional: Auto-submit if user clicks suggestion
            // Uncomment next line for immediate login on suggestion click:
            // this.handleConfirm();
        });
    },

    renderUserSuggestions(container, suggestions, onClick) {
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = suggestions
            .map((user, index) => {
                const group = window.userManager?.getUserGroup(user) || 'Default';
                const color = window.userManager?.generateUserColor(user) || '#7c3aed';
                const initials = window.userManager?.getUserInitials(user) || '??';
                
                return `<div class="suggestion-item" data-user="${user}" data-index="${index}" style="
                    padding: 0.75rem;
                    cursor: pointer;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    transition: all 0.2s ease;
                    user-select: none;
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

        // Add click handlers using proper event delegation with multiple event types
        container.querySelectorAll('.suggestion-item').forEach((item, index) => {
            const username = item.getAttribute('data-user');
            
            // Add hover effects
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(124, 58, 237, 0.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            
            // Add multiple event handlers for reliability
            const handleSelection = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                console.log('User suggestion selected:', username);
                
                // Hide suggestions immediately
                container.style.display = 'none';
                
                // Call the callback
                onClick(username);
            };
            
            // Multiple event types for maximum compatibility
            item.addEventListener('click', handleSelection, true);
            item.addEventListener('mousedown', handleSelection, true);
            item.addEventListener('touchstart', handleSelection, true);
        });

        // Also add a global click handler on the container itself
        container.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.suggestion-item');
            if (suggestionItem) {
                const username = suggestionItem.getAttribute('data-user');
                if (username) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Container click - User selected:', username);
                    container.style.display = 'none';
                    onClick(username);
                }
            }
        }, true);
    },

    showUserManagement() {
        // Close login modal temporarily
        this.modal.style.display = 'none';
        
        // Show user management
        if (window.userManagementModal) {
            window.userManagementModal.show();
            
            // Re-show login modal when user management closes
            const originalClose = window.userManagementModal.close;
            window.userManagementModal.close = () => {
                originalClose.call(window.userManagementModal);
                this.modal.style.display = 'flex';
                this.loadSuggestions(); // Refresh suggestions
                this.usernameInput.focus();
            };
        } else {
            console.warn('User management modal not available');
            this.modal.style.display = 'flex';
        }
    },

    // IMPROVED: Continue with last user (quick option)
    continueWithLastUser() {
        const lastUser = this.getLastUser();
        if (lastUser && lastUser.username && lastUser.username !== 'User') {
            console.log('✅ User selected continue with last user:', lastUser.username);
            this.close();
            this.onConfirm({ 
                username: lastUser.username, 
                groupname: lastUser.groupname || 'Default',
                isContinuation: true 
            });
        } else {
            this.showError('No valid last user found');
        }
    },

    // IMPROVED: Get last user helper
    getLastUser() {
        try {
            const stored = localStorage.getItem('metafold_last_user');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Could not load last user:', error);
            return null;
        }
    },

    // IMPROVED: Format last used timestamp
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

    handleConfirm() {
        const username = this.usernameInput.value.trim();

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

        // Use mapped group if available, otherwise default
        const groupname = window.userManager?.getUserGroup(username) || 'Default';

        console.log(`✅ Login confirmed: "${username}" in group: "${groupname}"`);
        this.close();
        this.onConfirm({ username, groupname });
    },

    handleCancel() {
        console.log('❌ Login cancelled');
        this.close();
        this.onCancel(new Error('Login cancelled'));
    },

    showError(message) {
        let errorDiv = this.modal.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
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
            this.modal.querySelector('div > div').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            if (errorDiv.style.display !== 'none') {
                errorDiv.style.display = 'none';
            }
        }, 4000);
    },

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
            this.usernameInput = null;
            this.userSuggestions = null;
        }
    }
};

window.loginModal = loginModal;
console.log('✅ loginModal loaded (Enhanced user experience + App Startup Fix)');