// Login Modal (English translation)

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

        const modalHTML = `
            <div id="loginModal" style="
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
                    max-width: 400px;
                    width: 90%;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                ">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h2 style="margin: 0; color: #007bff;">🚀 Welcome to MetaFold</h2>
                        <button onclick="loginModal.showUserManagement()" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 0.25rem 0.5rem;
                            border-radius: 3px;
                            cursor: pointer;
                            font-size: 0.8rem;
                        ">👥 Manage</button>
                    </div>
                    <p style="margin: 0 0 1.5rem 0; color: #666; text-align: center;">Enter your name:</p>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">👤 Your Name:</label>
                        <div style="position: relative;">
                            <input type="text" id="usernameInput" placeholder="e.g. John Doe" 
                                   autocomplete="off" style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                font-size: 1rem;
                                box-sizing: border-box;
                            ">
                            <div id="userSuggestions" style="
                                position: absolute;
                                top: 100%;
                                left: 0;
                                right: 0;
                                background: white;
                                border: 1px solid #ddd;
                                border-radius: 4px;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                display: none;
                                z-index: 1000;
                                max-height: 200px;
                                overflow-y: auto;
                            "></div>
                        </div>
                        <small style="color: #666; margin-top: 0.5rem; display: block;">
                            Groups can be assigned in user management.
                        </small>
                    </div>
                    
                    <div style="text-align: center;">
                        <button id="loginConfirm" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 0.75rem 2rem;
                            border-radius: 4px;
                            font-size: 1rem;
                            cursor: pointer;
                            transition: background 0.2s;
                        " onmouseover="this.style.background='#0056b3'" 
                           onmouseout="this.style.background='#007bff'">
                            🚀 Let's Go!
                        </button>
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

        // Confirm button
        document.getElementById('loginConfirm').addEventListener('click', () => {
            this.handleConfirm();
        });

        // Enter key
        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleConfirm();
        });

        // Focus on input field
        setTimeout(() => this.usernameInput.focus(), 100);
    },

    loadSuggestions() {
        // Set last used user if available
        const users = window.userManager?.users || [];
        
        if (users.length > 0) {
            this.usernameInput.placeholder = `e.g. ${users[0]}`;
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
            this.usernameInput.value = user;
            this.userSuggestions.style.display = 'none';
        });
    },

    renderUserSuggestions(container, suggestions, onClick) {
        if (suggestions.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = suggestions
            .map(user => {
                const group = window.userManager?.getUserGroup(user) || 'Default';
                const color = window.userManager?.generateUserColor(user) || '#666';
                const initials = window.userManager?.getUserInitials(user) || '??';
                
                return `<div style="
                    padding: 0.5rem;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    align-items: center;
                " onmouseover="this.style.background='#f0f0f0'"
                   onmouseout="this.style.background='white'">
                    <div style="
                        width: 24px;
                        height: 24px;
                        border-radius: 50%;
                        background: ${color};
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 0.7rem;
                        margin-right: 0.5rem;
                    ">${initials}</div>
                    <div>
                        <strong>${user}</strong>
                        <span style="color: #666; font-size: 0.9rem;"> (${group})</span>
                    </div>
                </div>`;
            })
            .join('');

        container.style.display = 'block';

        container.querySelectorAll('div').forEach((item, index) => {
            item.addEventListener('click', () => {
                onClick(suggestions[index]);
            });
        });
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
            };
        }
    },

    handleConfirm() {
        const username = this.usernameInput.value.trim();

        if (!username) {
            this.showError('Please enter your name.');
            return;
        }

        // Use mapped group if available, otherwise default
        const groupname = window.userManager?.getUserGroup(username) || 'Default';

        console.log(`✅ Login confirmed: "${username}" in group: "${groupname}"`);
        this.close();
        this.onConfirm({ username, groupname });
    },

    showError(message) {
        let errorDiv = this.modal.querySelector('.error-message');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.style.cssText = `
                background-color: #fee;
                color: #c33;
                padding: 0.5rem;
                border-radius: 4px;
                margin: 1rem 0;
                border: 1px solid #fcc;
            `;
            this.modal.querySelector('div > div').appendChild(errorDiv);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    },

    close() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
    }
};

window.loginModal = loginModal;
console.log('✅ loginModal loaded (English translation)');