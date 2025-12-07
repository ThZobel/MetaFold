// App with userManager - FIXED for async settingsManager

const app = {
    initialized: false,

    async init() {
        if (this.initialized) return;

        console.log('🚀 Starting MetaFold with user-specific settings...');

        try {
            // Check what modules are available
            console.log('=== AVAILABLE MODULES ===');
            const modules = ['storage', 'userManager', 'templateManager', 'settingsManager'];

            modules.forEach(module => {
                if (window[module]) {
                    console.log(`✅ ${module}: Available`);
                } else {
                    console.log(`❌ ${module}: Missing`);
                }
            });

            // STEP 1: Initialize settingsManager with user-specific support
            if (window.settingsManager) {
                console.log('🔧 Initializing settingsManager with user-specific support...');

                // Check if new user-specific function is available
                if (typeof window.settingsManager.initUserSpecific === 'function') {
                    await window.settingsManager.initUserSpecific();
                    console.log('✅ settingsManager initialized with user-specific support');
                } else {
                    // Fallback to original init
                    console.warn('⚠️ User-specific settings not available - using standard init');
                    await window.settingsManager.init();
                    console.log('✅ settingsManager initialized (fallback)');
                }

                // FIX: Ensure user management is enabled by default if not set
                try {
                    const userMgmt = await window.settingsManager.get('general.user_management_enabled');
                    if (userMgmt === undefined || userMgmt === null) {
                        console.log('🔧 Forcing user management enabled by default (was undefined)');
                        await window.settingsManager.set('general.user_management_enabled', true);
                    }
                } catch (e) {
                    console.warn('⚠️ Could not check/set user management default:', e);
                }
            }

            // ✅ NEW STEP 1.5: Auto-create Admin account if password system is enabled
            console.log('🔐 Checking Admin account status...');

            // Check if password system is enabled
            let passwordSystemEnabled = false;
            try {
                if (window.settingsManager?.settings) {
                    passwordSystemEnabled = window.settingsManager.settings['security.password_system_enabled'] === true;
                }
            } catch (error) {
                console.warn('⚠️ Could not check password system status:', error);
            }

            console.log('🔐 Password system enabled:', passwordSystemEnabled);

            // If password system is enabled, ensure Admin exists
            // =================== PHASE 1: SECURE STORAGE ===================
            if (passwordSystemEnabled) {
                console.log('🔐 Password system active - ensuring Admin account exists...');

                // Wait for secureStorage to be available
                let secureStorageAttempts = 0;
                while (!window.secureStorage && secureStorageAttempts < 10) {
                    console.log(`🔐 Waiting for secureStorage... (attempt ${secureStorageAttempts + 1}/10)`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    secureStorageAttempts++;
                }

                if (window.secureStorage) {
                    // Initialize secureStorage if needed
                    if (!window.secureStorage.isInitialized) {
                        try {
                            await window.secureStorage.init();
                            console.log('✅ secureStorage initialized');

                            // ⚠️ WICHTIG: Security Guard NICHT hier initialisieren!
                            // Es wird später initialisiert, NACH userManager

                        } catch (error) {
                            console.warn('⚠️ secureStorage init failed:', error);
                        }
                    }

                    // Check if Admin exists
                    const adminExists = window.secureStorage.hasUserPassword('Admin');
                    console.log('🔐 Admin account exists:', adminExists);

                    if (!adminExists) {
                        console.log('🔐 Creating Admin account...');
                        try {
                            const result = await window.secureStorage.initializeAdminAccount();

                            if (result.created) {
                                console.log('✅ Admin account created with default password');

                                // Show notification to user
                                const notificationDiv = document.createElement('div');
                                notificationDiv.style.cssText = `
                                    position: fixed;
                                    top: 20px;
                                    right: 20px;
                                    background: linear-gradient(135deg, #f59e0b, #d97706);
                                    color: white;
                                    padding: 1.5rem;
                                    border-radius: 12px;
                                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                                    max-width: 400px;
                                    z-index: 10001;
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                `;

                                notificationDiv.innerHTML = `
                                    <div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">
                                        🔐 Admin Account Created
                                    </div>
                                    <div style="font-size: 0.9rem; line-height: 1.5;">
                                        <strong>Username:</strong> Admin<br>
                                        <strong>Password:</strong> admin<br>
                                        <br>
                                        <strong>⚠️ IMPORTANT:</strong> Please change the admin password immediately in User Management!
                                    </div>
                                    <button onclick="this.parentElement.remove()" style="
                                        margin-top: 1rem;
                                        background: rgba(255,255,255,0.2);
                                        color: white;
                                        border: none;
                                        padding: 0.5rem 1rem;
                                        border-radius: 6px;
                                        cursor: pointer;
                                        font-weight: 600;
                                    ">OK, Got it!</button>
                                `;

                                document.body.appendChild(notificationDiv);

                                // Auto-remove after 15 seconds
                                setTimeout(() => {
                                    if (notificationDiv.parentElement) {
                                        notificationDiv.remove();
                                    }
                                }, 15000);
                            } else {
                                console.log('ℹ️ Admin account already existed');
                            }
                        } catch (error) {
                            console.error('❌ Failed to create Admin account:', error);
                        }
                    } else {
                        console.log('✅ Admin account already exists');
                    }
                } else {
                    console.warn('⚠️ secureStorage not available - cannot create Admin account');
                }
            } else {
                console.log('ℹ️ Password system disabled - no Admin account needed');
            }

            // =================== PHASE 2: USER MANAGER ===================
            if (window.userManager) {
                console.log('🔧 Initializing userManager...');

                let userInfo;

                // Check if new settings-aware function is available
                if (typeof window.userManager.initWithSettingsSupport === 'function') {
                    userInfo = await window.userManager.initWithSettingsSupport();
                    console.log('✅ User initialized with settings support:', userInfo);
                } else {
                    // Fallback to original init
                    console.warn('⚠️ User-settings integration not available - using standard init');
                    userInfo = await window.userManager.init();
                    console.log('✅ User initialized (fallback):', userInfo);
                }

                // =================== PHASE 3: SECURITY GUARD (AFTER userManager!) ===================
                // CRITICAL: Security Guard needs userManager to be initialized first!
                if (window.securityGuard && passwordSystemEnabled) {
                    console.log('🛡️ Initializing Security Guard...');
                    try {
                        await window.securityGuard.init();
                        console.log('✅ Security Guard initialized');

                        // Notify Electron about current user (for DevTools control)
                        if (window.electronAPI && window.electronAPI.invoke && userInfo) {
                            try {
                                await window.electronAPI.invoke('check-admin-user', userInfo.username);
                                console.log('✅ Electron notified about current user:', userInfo.username);
                            } catch (error) {
                                console.warn('⚠️ Failed to notify Electron:', error);
                            }
                        }

                    } catch (error) {
                        console.error('❌ Security Guard initialization failed:', error);
                    }
                } else {
                    if (!window.securityGuard) {
                        console.warn('⚠️ Security Guard not available');
                    }
                    if (!passwordSystemEnabled) {
                        console.log('ℹ️ Security Guard skipped (password system disabled)');
                    }
                }

                // =================== PHASE 4: ADMIN PASSWORD MANAGER ===================
                // CRITICAL: After Security Guard, check if Admin needs password change
                if (window.adminPasswordManager && passwordSystemEnabled && userInfo) {
                    console.log('🔐 Checking Admin Password Manager...');

                    // Only check if current user is Admin
                    if (userInfo.username === 'Admin') {
                        try {
                            // Small delay to ensure everything is ready
                            setTimeout(async () => {
                                try {
                                    const changed = await window.adminPasswordManager.init();
                                    if (changed) {
                                        console.log('✅ Admin password change completed');
                                    }
                                } catch (error) {
                                    console.error('❌ Admin Password Manager failed:', error);
                                }
                            }, 1000); // 1 second delay
                        } catch (error) {
                            console.error('❌ Admin Password Manager setup failed:', error);
                        }
                    } else {
                        console.log('ℹ️ Current user is not Admin, skipping password check');
                    }
                } else {
                    if (!window.adminPasswordManager) {
                        console.warn('⚠️ Admin Password Manager not available');
                    }
                    if (!passwordSystemEnabled) {
                        console.log('ℹ️ Admin Password Manager skipped (password system disabled)');
                    }
                }
            }

            // STEP 3: Initialize other available modules
            this.initializeAvailableModules();

            // STEP 4: Setup event listeners
            this.setupEventListeners();

            this.initialized = true;
            console.log('✅ MetaFold started successfully with user-specific settings!');

            // Show current user info
            if (window.userManager && window.userManager.isInitialized) {
                this.showSuccess(`App started! User: ${window.userManager.currentUser} (${window.userManager.currentGroup})`);
            } else {
                this.showSuccess('App started!');
            }

            // Remove startup blocker
            const blocker = document.getElementById('startupBlocker');
            if (blocker) {
                blocker.style.opacity = '0';
                setTimeout(() => blocker.remove(), 500);
            }

        } catch (error) {
            console.error('❌ Error starting app:', error);
            this.showError('Error starting the application: ' + error.message);

            // Remove blocker even on error so user can see error message
            const blocker = document.getElementById('startupBlocker');
            if (blocker) blocker.remove();
        }
    },

    async initializeAvailableModules() {
        console.log('🔧 Initializing available modules...');

        // *** NEU: Initialize storage FIRST ***
        if (window.storage && typeof window.storage.initFileStorage === 'function') {
            try {
                console.log('📂 Initializing file storage...');
                await window.storage.initFileStorage();
                console.log('✅ storage initialized');
            } catch (error) {
                console.error('❌ Error initializing storage:', error);
            }
        }

        // Initialize template type manager first (if available)
        if (window.templateTypeManager && typeof window.templateTypeManager.init === 'function') {
            try {
                window.templateTypeManager.init();
                console.log('✅ templateTypeManager initialized');
            } catch (error) {
                console.error('❌ Error initializing templateTypeManager:', error);
            }
        }

        // Initialize template manager (now NACH storage initialization)
        if (window.templateManager && typeof window.templateManager.init === 'function') {
            try {
                // Template manager kann jetzt file storage verwenden
                await window.templateManager.init();
                console.log('✅ templateManager initialized');
            } catch (error) {
                console.error('❌ Error initializing templateManager:', error);
            }
        }

        // Initialize project manager if available
        if (window.projectManager && typeof window.projectManager.init === 'function') {
            try {
                window.projectManager.init();
                console.log('✅ projectManager initialized');
            } catch (error) {
                console.error('❌ Error initializing projectManager:', error);
            }
        }

        // Initialize metadata editor if available
        if (window.metadataEditor && typeof window.metadataEditor.init === 'function') {
            try {
                window.metadataEditor.init();
                console.log('✅ metadataEditor initialized');
            } catch (error) {
                console.error('❌ Error initializing metadataEditor:', error);
            }
        }

        // Initialize experiment form if available
        if (window.experimentForm && typeof window.experimentForm.init === 'function') {
            try {
                window.experimentForm.init();
                console.log('✅ experimentForm initialized');
            } catch (error) {
                console.error('❌ Error initializing experimentForm:', error);
            }
        }

        // Initialize enhanced actions if available
        if (window.enhancedActions && typeof window.enhancedActions.init === 'function') {
            try {
                window.enhancedActions.init();
                console.log('✅ enhancedActions initialized');
            } catch (error) {
                console.error('❌ Error initializing enhancedActions:', error);
            }
        }
    },

    setupEventListeners() {
        // ❌ REMOVED: Close modal on click outside - Modal should only close via explicit button clicks
        // This prevents accidental closing when dragging text selection outside the modal
        // window.onclick = (event) => {
        //     const modal = document.getElementById('templateModal');
        //     if (event.target === modal && window.templateModal) {
        //         window.templateModal.close();
        //     }
        // };

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && window.templateModal) {
                window.templateModal.close();
            }

            if (event.ctrlKey && event.key === 'n' && window.templateModal) {
                event.preventDefault();
                window.templateModal.show();
            }
        });

        console.log('✅ Event listeners set up (modal backdrop-click disabled)');
    },

    showSuccess(message) {
        console.log('✅ Success:', message);
        this.showMessage(message, 'success');
    },

    showError(message) {
        console.error('❌ Error:', message);
        this.showMessage(message, 'error');
    },

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        const isError = type === 'error';

        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? '#fee' : '#efe'};
            color: ${isError ? '#c33' : '#363'};
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid ${isError ? '#fcc' : '#cfc'};
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;

        messageDiv.innerHTML = `
            <strong>${isError ? '⚠️' : '✅'} ${isError ? 'Error' : 'Success'}</strong><br>
            ${message}
            <br><br>
            <button onclick="this.parentElement.remove()" style="background: ${isError ? '#c33' : '#363'}; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;">
                Close
            </button>
        `;

        document.body.appendChild(messageDiv);

        // Auto-remove after time
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, isError ? 15000 : 5000);
    },

    // DEBUG FUNCTION: Check user management status
    async debugUserManagement() {
        console.log('🐛 DEBUG: Checking user management status...');

        if (!window.userManager) {
            console.log('❌ userManager not available');
            return;
        }

        if (!window.settingsManager) {
            console.log('❌ settingsManager not available');
            return;
        }

        try {
            const status = await window.userManager.debugStatus();
            console.table(status);

            alert(`User Management Debug:
            
Enabled: ${status.userManagementEnabled}
Current User: ${status.currentUser.username}
Current Group: ${status.currentUser.groupname}
Initialized: ${status.currentUser.isInitialized}
Settings Manager: ${status.hasSettingsManager}`);

        } catch (error) {
            console.error('Debug failed:', error);
            alert('Debug failed: ' + error.message);
        }
    }
};

// Make debug function globally available for testing
window.debugUserManagement = () => app.debugUserManagement();

// Wait until DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, starting app in 200ms...');
        setTimeout(() => app.init(), 200);
    });
} else {
    console.log('DOM already loaded, starting app in 200ms...');
    setTimeout(() => app.init(), 200);
};

// =================== PHASE 5.2: APP LIFECYCLE INTEGRATION ===================
// Handles app-closing events and user-changed events for OMERO session cleanup

(function initializeAppLifecycleHandlers() {
    console.log('🔄 Initializing app lifecycle handlers (Phase 5.2)...');

    /**
     * Handle app-closing event from main process
     * Logs out from OMERO and clears session password
     */
    if (window.electronAPI && window.electronAPI.onAppClosing) {
        window.electronAPI.onAppClosing(async () => {
            console.log('🔴 App closing event received - cleaning up OMERO session...');

            try {
                // Logout from OMERO if session is active
                if (window.omeroAuth && typeof window.omeroAuth.hasActiveSession === 'function') {
                    if (window.omeroAuth.hasActiveSession()) {
                        console.log('🔬 Active OMERO session detected - logging out...');
                        await window.omeroAuth.logout();
                        console.log('✅ OMERO logout completed');
                    } else {
                        console.log('ℹ️ No active OMERO session to logout from');
                    }
                }

                // Clear session password if prompt is available
                if (window.omeroPasswordPrompt && typeof window.omeroPasswordPrompt.clearSession === 'function') {
                    window.omeroPasswordPrompt.clearSession();
                    console.log('🔐 Session password cleared');
                }

                console.log('✅ App closing cleanup completed successfully');

            } catch (error) {
                console.error('❌ Error during app closing cleanup:', error);
                // Don't block app closing even if cleanup fails
            }
        });

        console.log('✅ App-closing event listener registered');
    } else {
        console.warn('⚠️ electronAPI.onAppClosing not available - app lifecycle handling disabled');
    }

    /**
     * Handle user-changed event
     * Logs out from OMERO when user switches
     */
    if (window.userManager && typeof window.userManager.on === 'function') {
        window.userManager.on('user-changed', async (newUser) => {
            console.log('👤 User changed event - cleaning up OMERO session...');
            console.log('👤 New user:', newUser?.username || 'Unknown');

            try {
                // Logout from OMERO if session is active
                if (window.omeroAuth && typeof window.omeroAuth.hasActiveSession === 'function') {
                    if (window.omeroAuth.hasActiveSession()) {
                        console.log('🔬 Active OMERO session detected - logging out...');
                        await window.omeroAuth.logout();
                        console.log('✅ OMERO logout completed for user change');
                    }
                }

                // Clear session password
                if (window.omeroPasswordPrompt && typeof window.omeroPasswordPrompt.clearSession === 'function') {
                    window.omeroPasswordPrompt.clearSession();
                    console.log('🔐 Session password cleared for user change');
                }

                console.log('✅ User change cleanup completed successfully');

            } catch (error) {
                console.error('❌ Error during user change cleanup:', error);
                // Don't block user switching even if cleanup fails
            }
        });

        console.log('✅ User-changed event listener registered');
    } else {
        console.warn('⚠️ userManager.on not available - user change handling disabled');
    }

    // Alternative: Listen for user-changed via custom events if userManager doesn't support .on()
    if (!window.userManager || typeof window.userManager.on !== 'function') {
        document.addEventListener('metafold:user-changed', async (event) => {
            console.log('👤 User changed event (custom) - cleaning up OMERO session...');
            console.log('👤 New user:', event.detail?.username || 'Unknown');

            try {
                if (window.omeroAuth?.hasActiveSession?.()) {
                    await window.omeroAuth.logout();
                }

                if (window.omeroPasswordPrompt?.clearSession) {
                    window.omeroPasswordPrompt.clearSession();
                }

                console.log('✅ User change cleanup completed (custom event)');
            } catch (error) {
                console.error('❌ Error during user change cleanup (custom event):', error);
            }
        });

        console.log('✅ Custom user-changed event listener registered as fallback');
    }

    console.log('🎉 App lifecycle handlers initialized successfully');
})();

// Export for debugging purposes
if (typeof window !== 'undefined') {
    window.__metafoldLifecycleHandlers = {
        version: '1.0',
        initialized: true,
        timestamp: new Date().toISOString()
    };
}

// Expose app globally
window.app = app;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOMContentLoaded - Initializing App...');
    if (window.app && window.app.init) {
        window.app.init();
    } else {
        console.error('❌ App object not found! Cannot initialize.');
    }
});

