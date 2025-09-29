// =================== PASSWORD SYSTEM INITIALIZER ===================
// Neue Datei: js/passwordSystemInitializer.js
// Oder als Funktionen zu app.js hinzufügen

const passwordSystemInitializer = {
    initialized: false,
    initializationPromise: null,

    /**
     * Main initialization function for password system
     * Call this instead of individual component initializations
     */
    async initialize() {
        // Prevent multiple simultaneous initializations
        if (this.initializationPromise) {
            return await this.initializationPromise;
        }

        this.initializationPromise = this.performInitialization();
        return await this.initializationPromise;
    },

    /**
     * Perform the actual initialization sequence
     */
    async performInitialization() {
        try {
            console.log('🔐 Starting Password System Initialization...');
            console.log('================================================');

            // Phase 1: Check Prerequisites
            const prerequisites = await this.checkPrerequisites();
            if (!prerequisites.success) {
                throw new Error('Prerequisites not met: ' + prerequisites.error);
            }

            // Phase 2: Initialize Core Components
            await this.initializeCoreComponents();

            // Phase 3: Initialize Password System
            await this.initializePasswordSystem();

            // Phase 4: Initialize User Management
            const userInfo = await this.initializeUserManagement();

            // Phase 5: Post-initialization setup
            await this.postInitializationSetup();

            console.log('✅ Password System Initialization Complete');
            console.log('Current User:', userInfo);
            
            this.initialized = true;
            return {
                success: true,
                userInfo: userInfo,
                passwordSystemEnabled: await this.isPasswordSystemEnabled()
            };

        } catch (error) {
            console.error('❌ Password System Initialization Failed:', error);
            
            // Try fallback initialization without password system
            return await this.fallbackInitialization(error);
        }
    },

    /**
     * Check if all required components are available
     */
    async checkPrerequisites() {
        console.log('🔧 Checking prerequisites...');
        
        const required = {
            'secureStorage': window.secureStorage,
            'userManager': window.userManager, 
            'loginModal': window.loginModal,
            'settingsManager': window.settingsManager
        };

        const missing = [];
        for (const [name, component] of Object.entries(required)) {
            if (!component) {
                missing.push(name);
            }
        }

        if (missing.length > 0) {
            return {
                success: false,
                error: `Missing components: ${missing.join(', ')}`
            };
        }

        // Check browser capabilities
        const browserCheck = this.checkBrowserCapabilities();
        if (!browserCheck.success) {
            console.warn('⚠️ Browser capabilities limited:', browserCheck.warning);
        }

        console.log('✅ Prerequisites check passed');
        return { success: true };
    },

    /**
     * Check browser capabilities for security features
     */
    checkBrowserCapabilities() {
        const capabilities = {
            localStorage: typeof Storage !== 'undefined',
            crypto: !!(window.crypto && window.crypto.subtle),
            secureContext: window.isSecureContext || window.location.protocol === 'https:'
        };

        const warnings = [];
        if (!capabilities.localStorage) warnings.push('LocalStorage not available');
        if (!capabilities.crypto) warnings.push('Crypto API not available');
        if (!capabilities.secureContext) warnings.push('Not running in secure context');

        return {
            success: warnings.length === 0,
            warning: warnings.join(', '),
            capabilities: capabilities
        };
    },

    /**
     * Initialize core components in correct order
     */
    async initializeCoreComponents() {
        console.log('🔧 Initializing core components...');

        // 1. Initialize secure storage first (required for password system)
        if (window.secureStorage && !window.secureStorage.isInitialized) {
            console.log('🔐 Initializing secure storage...');
            await window.secureStorage.init();
            console.log('✅ Secure storage initialized');
        }

        // 2. Initialize settings manager with password support
        if (window.settingsManager) {
            console.log('⚙️ Initializing settings manager...');
            
            if (window.settingsManager.initWithPasswordSupport) {
                await window.settingsManager.initWithPasswordSupport();
            } else if (window.settingsManager.init) {
                await window.settingsManager.init();
                console.log('⚠️ Using fallback settings initialization (no password support)');
            }
            
            console.log('✅ Settings manager initialized');
        }

        // 3. Wait for DOM if needed
        if (document.readyState === 'loading') {
            console.log('⏳ Waiting for DOM...');
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
            console.log('✅ DOM ready');
        }
    },

    /**
     * Initialize password system components
     */
    async initializePasswordSystem() {
        console.log('🔐 Initializing password system...');

        // Check if password system should be enabled
        const shouldEnable = await this.shouldEnablePasswordSystem();
        console.log('🔐 Password system should be enabled:', shouldEnable);

        if (shouldEnable) {
            try {
                // Initialize admin account if needed
                if (window.secureStorage.initializeAdminAccount) {
                    const adminResult = await window.secureStorage.initializeAdminAccount();
                    if (adminResult.created) {
                        console.log('👑 Admin account created with default password');
                        
                        // Show admin password warning
                        this.showAdminPasswordWarning(adminResult.defaultPassword);
                    }
                }

                console.log('✅ Password system initialized');
            } catch (error) {
                console.error('⚠️ Password system initialization had issues:', error);
                // Continue with limited functionality
            }
        } else {
            console.log('ℹ️ Password system disabled');
        }
    },

    /**
     * Determine if password system should be enabled
     */
    async shouldEnablePasswordSystem() {
        try {
            if (!window.settingsManager) return false;
            
            // Check settings
            const enabled = await window.settingsManager.get('security.password_system_enabled');
            
            // Check if this is first run
            const isFirstRun = !localStorage.getItem('metafold_password_system_user_choice');
            
            // Default to enabled on first run, respect user choice otherwise
            return enabled !== false && (isFirstRun || enabled === true);
        } catch (error) {
            console.warn('Could not determine password system preference:', error);
            return true; // Default to enabled
        }
    },

    /**
     * Initialize user management with password support
     */
    async initializeUserManagement() {
        console.log('👥 Initializing user management...');

        if (!window.userManager) {
            throw new Error('User manager not available');
        }

        let userInfo;
        
        try {
            // Use password-enabled initialization if available
            if (window.userManager.initWithPasswordSupport) {
                userInfo = await window.userManager.initWithPasswordSupport();
            } else if (window.userManager.initWithSettingsSupport) {
                userInfo = await window.userManager.initWithSettingsSupport();
            } else {
                userInfo = await window.userManager.init();
            }
            
            console.log('✅ User management initialized:', userInfo);
            return userInfo;
            
        } catch (error) {
            console.error('❌ User management initialization failed:', error);
            throw error;
        }
    },

    /**
     * Post-initialization setup and validation
     */
    async postInitializationSetup() {
        console.log('🔧 Post-initialization setup...');

        try {
            // Validate password system if enabled
            if (await this.isPasswordSystemEnabled()) {
                const validation = await this.validatePasswordSystemSetup();
                if (!validation.valid) {
                    console.warn('⚠️ Password system validation issues:', validation.issues);
                }
            }

            // Set up auto-logout if configured
            await this.setupAutoLogout();

            // Dispatch initialization complete event
            window.dispatchEvent(new CustomEvent('passwordSystemInitialized', {
                detail: {
                    success: true,
                    timestamp: new Date().toISOString()
                }
            }));

            console.log('✅ Post-initialization setup complete');

        } catch (error) {
            console.error('⚠️ Post-initialization setup had issues:', error);
            // Don't throw - continue with app startup
        }
    },

    /**
     * Validate password system setup
     */
    async validatePasswordSystemSetup() {
        const issues = [];

        try {
            // Check admin account
            if (!window.secureStorage?.hasUserPassword('Admin')) {
                issues.push('Admin account not found or has no password');
            }

            // Check settings validation
            if (window.settingsManager?.validatePasswordSystemSettings) {
                const settingsValidation = window.settingsManager.validatePasswordSystemSettings();
                if (!settingsValidation.valid) {
                    issues.push(...settingsValidation.issues);
                }
            }

            return {
                valid: issues.length === 0,
                issues: issues
            };

        } catch (error) {
            issues.push('Validation check failed: ' + error.message);
            return { valid: false, issues: issues };
        }
    },

    /**
     * Setup auto-logout if configured
     */
    async setupAutoLogout() {
        try {
            if (!window.settingsManager) return;

            const autoLogoutMinutes = await window.settingsManager.get('security.auto_logout_minutes');
            
            if (autoLogoutMinutes > 0) {
                console.log(`🔐 Setting up auto-logout: ${autoLogoutMinutes} minutes`);
                
                // Implement auto-logout timer
                this.setupAutoLogoutTimer(autoLogoutMinutes);
            }
        } catch (error) {
            console.warn('Could not setup auto-logout:', error);
        }
    },

    /**
     * Setup auto-logout timer
     */
    setupAutoLogoutTimer(minutes) {
        const milliseconds = minutes * 60 * 1000;
        
        // Clear existing timer
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
        }

        // Set new timer
        this.autoLogoutTimer = setTimeout(() => {
            console.log('⏰ Auto-logout triggered');
            this.performAutoLogout();
        }, milliseconds);
    },

    /**
     * Perform auto-logout
     */
    async performAutoLogout() {
        try {
            // Show warning
            const proceed = confirm(
                'Your session has expired due to inactivity.\n\n' +
                'Click OK to login again, or Cancel to continue without logging out.'
            );

            if (proceed) {
                // Logout from OMERO if connected
                if (window.omeroUIIntegration?.logout) {
                    await window.omeroUIIntegration.logout();
                }

                // Reload page to restart login process
                window.location.reload();
            }
        } catch (error) {
            console.error('Auto-logout failed:', error);
        }
    },

    /**
     * Fallback initialization without password system
     */
    async fallbackInitialization(originalError) {
        console.log('🔄 Attempting fallback initialization without password system...');

        try {
            // Disable password system
            if (window.settingsManager?.set) {
                await window.settingsManager.set('security.password_system_enabled', false);
            }

            // Initialize user manager in simple mode
            let userInfo = { username: 'User', groupname: 'Default' };
            if (window.userManager?.init) {
                userInfo = await window.userManager.init();
            }

            console.log('⚠️ Fallback initialization completed');
            return {
                success: true,
                userInfo: userInfo,
                passwordSystemEnabled: false,
                fallback: true,
                originalError: originalError.message
            };

        } catch (fallbackError) {
            console.error('❌ Fallback initialization also failed:', fallbackError);
            throw new Error(`Both primary and fallback initialization failed. Primary: ${originalError.message}, Fallback: ${fallbackError.message}`);
        }
    },

    /**
     * Check if password system is currently enabled
     */
    async isPasswordSystemEnabled() {
        try {
            return await window.userManager?.isPasswordSystemEnabled() || false;
        } catch (error) {
            return false;
        }
    },

    /**
     * Show admin password warning
     */
    showAdminPasswordWarning(defaultPassword) {
        const message = `
🔐 Admin Account Created!

Username: Admin
Password: ${defaultPassword}

⚠️ IMPORTANT: Please change the admin password immediately after first login for security!

The password can be changed through User Management.
        `;

        // Show in console
        console.warn(message);

        // Show modal if available
        setTimeout(() => {
            if (window.confirm) {
                const changeNow = confirm(message + '\n\nOpen User Management now to change password?');
                if (changeNow && window.userManagementModal) {
                    if (window.userManagementModal.showWithPasswordSupport) {
                        window.userManagementModal.showWithPasswordSupport();
                    } else {
                        window.userManagementModal.show();
                    }
                }
            }
        }, 2000);
    },

    /**
     * Get initialization status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            initializationInProgress: !!this.initializationPromise,
            passwordSystemEnabled: this.isPasswordSystemEnabled()
        };
    },

    /**
     * Reset initialization state (for testing)
     */
    reset() {
        this.initialized = false;
        this.initializationPromise = null;
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
            this.autoLogoutTimer = null;
        }
    }
};

// Make globally available
window.passwordSystemInitializer = passwordSystemInitializer;

// Auto-initialize if document is ready, otherwise wait for DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        passwordSystemInitializer.initialize();
    });
} else {
    // Initialize immediately if DOM is already loaded
    passwordSystemInitializer.initialize();
}

console.log('✅ Password System Initializer loaded and ready');