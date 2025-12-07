/**
 * OMERO Password Prompt - Manual Password Input Modal
 * Handles temporary session-based password storage
 * 
 * @version 1.1.0
 * @date November 2025
 * @description Refactored to use componentLoader
 */

class OmeroPasswordPrompt {
    constructor() {
        this.sessionPassword = null;  // Nur im RAM, nicht in localStorage!
        this.sessionUsername = null;
        this.promptModal = null;
        this.resolvePrompt = null;
        this.rejectPrompt = null;
        this.isInitialized = false;
        this.initPromise = null;

        console.log('🔐 OMERO Password Prompt initialized');
    }

    /**
     * Initialize the modal (call this when DOM is ready)
     */
    async init() {
        if (this.isInitialized) {
            console.log('🔐 Password prompt already initialized');
            return;
        }

        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            try {
                await this.initModal();
                this.isInitialized = true;
                console.log('✅ OMERO Password Prompt ready');
            } catch (error) {
                console.error('❌ Error initializing password prompt:', error);
                this.initPromise = null; // Reset on failure
                throw error;
            }
        })();

        return this.initPromise;
    }

    /**
     * Create modal HTML structure using componentLoader
     */
    async initModal() {
        // Check if modal already exists
        if (document.getElementById('omero-password-modal')) {
            console.log('🔐 Password modal already exists in DOM');
            this.promptModal = document.getElementById('omero-password-modal');
            this.setupEventListeners();
            return;
        }

        // Create container
        let container = document.getElementById('omero-password-modal-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'omero-password-modal-container';
            document.body.appendChild(container);
        }

        // Load component
        if (window.componentLoader) {
            await window.componentLoader.load('omero-password-modal-container', 'components/modals/omero-password-modal.html');
        } else {
            console.error('❌ componentLoader not available');
            throw new Error('componentLoader not available');
        }

        this.promptModal = document.getElementById('omero-password-modal');

        // Setup event listeners
        this.setupEventListeners();

        console.log('✅ OMERO password modal created');
    }

    /**
     * Setup event listeners for the modal
     */
    setupEventListeners() {
        if (!this.promptModal) {
            console.warn('⚠️ Cannot setup event listeners - modal not found');
            return;
        }

        // Close button
        const closeBtn = this.promptModal.querySelector('.omero-password-modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.hide();
        }

        // Cancel button
        const cancelBtn = document.getElementById('omero-modal-cancel');
        if (cancelBtn) {
            cancelBtn.onclick = () => this.hide();
        }

        // Login button
        const loginBtn = document.getElementById('omero-modal-login');
        if (loginBtn) {
            loginBtn.onclick = () => this.handleLogin();
        }

        // Enter key in password field
        const passwordField = document.getElementById('omero-modal-password');
        if (passwordField) {
            passwordField.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            };
        }

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.promptModal) {
                this.hide();
            }
        });

        console.log('✅ Event listeners setup complete');
    }

    /**
     * Show password prompt with editable username
     * @returns {Promise<{username: string, password: string}|null>} Credentials or null if cancelled
     */
    async showWithUsernamePrompt() {
        if (!this.isInitialized) {
            console.warn('⚠️ Password prompt not initialized, initializing now...');
            await this.init();
        }

        return new Promise((resolve, reject) => {
            console.log('🔐 Showing credential prompt (username + password)');

            // Enable username editing
            const usernameField = document.getElementById('omero-modal-username');
            if (usernameField) {
                usernameField.readOnly = false;
                usernameField.value = '';
                usernameField.classList.remove('omero-readonly-input');
                usernameField.placeholder = 'Enter OMERO username...';
                // Focus on username field
                setTimeout(() => usernameField.focus(), 100);
            }

            this.sessionUsername = null;
            this.isUsernameEditable = true; // Flag to indicate we need to return username too

            // Update title
            const header = this.promptModal?.querySelector('.omero-password-modal-header h2');
            if (header) {
                header.textContent = '🔐 OMERO Login';
            }

            // Clear password input
            const passwordField = document.getElementById('omero-modal-password');
            if (passwordField) {
                passwordField.value = '';
            }

            // Hide error message
            const errorDiv = document.getElementById('omero-modal-error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }

            // Show modal
            if (this.promptModal) {
                this.promptModal.style.display = 'block';
            }

            // Store resolve/reject for later
            this.resolvePrompt = resolve;
            this.rejectPrompt = reject;
        });
    }

    /**
     * Show password prompt
     * @param {string} username - OMERO username
     * @param {string} reason - Why password is needed (e.g., "Upload", "Test Connection")
     * @returns {Promise<string|null>} Password or null if cancelled
     */
    async show(username, reason = 'Connection') {
        if (!this.isInitialized) {
            console.warn('⚠️ Password prompt not initialized, initializing now...');
            await this.init();
        }

        return new Promise((resolve, reject) => {
            console.log(`🔐 Showing password prompt for ${username} (${reason})`);

            // Set username and make readonly
            const usernameField = document.getElementById('omero-modal-username');
            if (usernameField) {
                usernameField.value = username;
                usernameField.readOnly = true;
                usernameField.classList.add('omero-readonly-input');
                usernameField.placeholder = '';
            }
            this.sessionUsername = username;
            this.isUsernameEditable = false;

            // Keep title simple - just "OMERO Login"
            const header = this.promptModal?.querySelector('.omero-password-modal-header h2');
            if (header) {
                header.textContent = '🔐 OMERO Login';
            }

            // Clear previous input
            const passwordField = document.getElementById('omero-modal-password');
            if (passwordField) {
                passwordField.value = '';
                // Focus on password field after modal is shown
                setTimeout(() => passwordField.focus(), 100);
            }

            // Hide error message
            const errorDiv = document.getElementById('omero-modal-error');
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }

            // Show modal
            if (this.promptModal) {
                this.promptModal.style.display = 'block';
            }

            // Store resolve/reject for later
            this.resolvePrompt = resolve;
            this.rejectPrompt = reject;
        });
    }

    /**
     * Hide the modal
     */
    hide() {
        console.log('🔐 Hiding password prompt');

        if (this.promptModal) {
            this.promptModal.style.display = 'none';
        }

        if (this.rejectPrompt) {
            this.rejectPrompt(new Error('Cancelled by user'));
            this.rejectPrompt = null;
        }

        this.resolvePrompt = null;
    }

    /**
     * Handle login button click
     */
    async handleLogin() {
        const passwordField = document.getElementById('omero-modal-password');
        const usernameField = document.getElementById('omero-modal-username');
        const rememberCheckbox = document.getElementById('omero-modal-remember-session');
        const errorDiv = document.getElementById('omero-modal-error');

        const password = passwordField ? passwordField.value : '';
        const username = usernameField ? usernameField.value.trim() : '';

        // Validation
        if (!password) {
            this.showError('Please enter a password');
            return;
        }

        if (this.isUsernameEditable && !username) {
            this.showError('Please enter a username');
            return;
        }

        // Save to session if checked
        if (rememberCheckbox && rememberCheckbox.checked) {
            this.sessionPassword = password;
            console.log('🔐 Password cached for session');
        }

        // Hide modal
        if (this.promptModal) {
            this.promptModal.style.display = 'none';
        }

        // Resolve promise
        if (this.resolvePrompt) {
            if (this.isUsernameEditable) {
                this.resolvePrompt({ username, password });
            } else {
                this.resolvePrompt(password);
            }
            this.resolvePrompt = null;
            this.rejectPrompt = null;
        }
    }

    /**
     * Show error message in modal
     */
    showError(message) {
        const errorDiv = document.getElementById('omero-modal-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';

            // Shake effect
            const content = this.promptModal.querySelector('.modal-content');
            if (content) {
                content.style.animation = 'none';
                content.offsetHeight; /* trigger reflow */
                content.style.animation = 'shake 0.5s';
            }
        }
    }

    /**
     * Get cached password if available
     */
    getSessionPassword() {
        return this.sessionPassword;
    }

    /**
     * Clear cached password
     */
    clearSession() {
        this.sessionPassword = null;
        console.log('🔐 Session password cleared');
    }
}

// Create global instance
window.omeroPasswordPrompt = new OmeroPasswordPrompt();
