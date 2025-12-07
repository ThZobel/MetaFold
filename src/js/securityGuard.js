// Security Guard - Multi-Layer Protection System for MetaFold
// ✅ FIXED: Context-aware protection - distinguishes between admin-only and user-allowed operations

const securityGuard = {
    isInitialized: false,
    currentAdmin: null,
    protectedFunctions: new Map(),
    integrityChecks: new Map(),
    
    // =================== INITIALIZATION ===================
    
    async init() {
        if (this.isInitialized) {
            console.log('🔒 Security Guard already initialized');
            return;
        }
        
        console.log('🛡️ Initializing Security Guard (Context-Aware Version)...');
        
        // 1. Setup function proxies with context awareness
        this.setupContextAwareProtection();
        
        // 2. Setup integrity monitoring
        this.setupIntegrityMonitoring();
        
        // 3. Setup DevTools detection
        this.setupDevToolsDetection();
        
        this.isInitialized = true;
        console.log('✅ Security Guard initialized (Context-Aware)');
        
        return { success: true, mode: 'context-aware' };
    },
    
    // =================== ADMIN VERIFICATION ===================
    
    /**
     * Check if current user is MetaFold Admin
     * @returns {boolean}
     */
    async isCurrentUserAdmin() {
        if (!window.userManager) return false;
        
        const currentUser = window.userManager.getCurrentUser();
        return currentUser === 'Admin';
    },
    
    /**
     * Get current user
     * @returns {string|null}
     */
    getCurrentUser() {
        if (!window.userManager) return null;
        return window.userManager.getCurrentUser();
    },
    
    /**
     * Verify admin credentials
     * @param {string} password - Admin password
     * @returns {Promise<boolean>}
     */
    async verifyAdminAccess(password) {
        if (!window.secureStorage) return false;
        
        try {
            // Use original function to avoid recursion
            const originalVerify = this.protectedFunctions.get('verifyUserPassword') || 
                                   window.secureStorage.verifyUserPassword;
            
            const isValid = await originalVerify.call(window.secureStorage, 'Admin', password);
            if (isValid) {
                this.currentAdmin = 'Admin';
                console.log('🔓 Admin access granted');
            }
            return isValid;
        } catch (error) {
            console.error('🔒 Admin verification failed:', error);
            return false;
        }
    },
    
    /**
     * Prompt for admin password
     * @returns {Promise<boolean>}
     */
    async promptAdminPassword() {
        return new Promise((resolve) => {
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(10px);
            `;
            
            modal.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #1e1e2e, #2a2a40);
                    padding: 2.5rem;
                    border-radius: 16px;
                    max-width: 450px;
                    width: 90%;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.8);
                    border: 2px solid #dc2626;
                ">
                    <h3 style="margin: 0 0 1rem 0; color: #dc2626; text-align: center; font-size: 1.5rem;">
                        🛡️ Admin Access Required
                    </h3>
                    <p style="margin: 0 0 2rem 0; color: #e0e0e0; text-align: center;">
                        This action requires administrator privileges.<br>
                        Enter the <strong style="color: #dc2626;">Admin password</strong> to continue:
                    </p>
                    <input type="password" id="adminPasswordInput" placeholder="Admin password" style="
                        width: 100%;
                        padding: 0.75rem;
                        border: 2px solid #dc2626;
                        border-radius: 8px;
                        background: rgba(0,0,0,0.3);
                        color: white;
                        font-size: 1rem;
                        box-sizing: border-box;
                    ">
                    <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                        <button id="adminCancelBtn" style="
                            flex: 1;
                            padding: 0.75rem;
                            border: none;
                            border-radius: 8px;
                            background: #4b5563;
                            color: white;
                            font-size: 1rem;
                            cursor: pointer;
                        ">Cancel</button>
                        <button id="adminConfirmBtn" style="
                            flex: 1;
                            padding: 0.75rem;
                            border: none;
                            border-radius: 8px;
                            background: linear-gradient(135deg, #dc2626, #ef4444);
                            color: white;
                            font-size: 1rem;
                            cursor: pointer;
                            font-weight: bold;
                        ">Verify</button>
                    </div>
                    <div id="adminError" style="
                        display: none;
                        margin-top: 1rem;
                        padding: 0.75rem;
                        background: rgba(220, 38, 38, 0.2);
                        border: 1px solid #dc2626;
                        border-radius: 8px;
                        color: #fca5a5;
                        text-align: center;
                    "></div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            const input = document.getElementById('adminPasswordInput');
            const confirmBtn = document.getElementById('adminConfirmBtn');
            const cancelBtn = document.getElementById('adminCancelBtn');
            const errorDiv = document.getElementById('adminError');
            
            input.focus();
            
            const cleanup = () => {
                modal.remove();
            };
            
            const verify = async () => {
                const password = input.value;
                if (!password) {
                    errorDiv.textContent = 'Please enter a password';
                    errorDiv.style.display = 'block';
                    return;
                }
                
                const isValid = await this.verifyAdminAccess(password);
                if (isValid) {
                    cleanup();
                    resolve(true);
                } else {
                    errorDiv.textContent = 'Invalid admin password';
                    errorDiv.style.display = 'block';
                    input.value = '';
                    input.focus();
                }
            };
            
            confirmBtn.addEventListener('click', verify);
            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(false);
            });
            
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') verify();
            });
        });
    },
    
    // =================== CONTEXT-AWARE PROTECTION ===================
    
    /**
     * Setup context-aware function protection
     * Only protects operations that modify OTHER users' data
     */
    setupContextAwareProtection() {
        console.log('🛡️ Setting up context-aware protection...');
        
        // Protect secureStorage methods with context
        if (window.secureStorage) {
            this.protectSecureStorageMethods();
        }
        
        // DO NOT protect userManager.switchUser - everyone can switch!
        // DO NOT protect settingsManager.set - users can change their own settings!
        
        // Prevent overwriting of critical global objects
        this.protectGlobalObjects();
        
        console.log('✅ Context-aware protection established');
    },
    
    /**
     * Protect secureStorage methods with context awareness
     */
    protectSecureStorageMethods() {
        const storage = window.secureStorage;
        
        // Store originals
        const originalStorePassword = storage.storeUserPassword;
        const originalRemovePassword = storage.removeUserPassword;
        
        this.protectedFunctions.set('storeUserPassword', originalStorePassword);
        this.protectedFunctions.set('removeUserPassword', originalRemovePassword);
        
        // ✅ storeUserPassword - Only protect if changing OTHER user's password
        storage.storeUserPassword = async (username, password) => {
            const currentUser = this.getCurrentUser();
            
            // Allow users to change their OWN password
            if (currentUser === username) {
                console.log(`✅ User ${username} changing own password - allowed`);
                return await originalStorePassword.call(storage, username, password);
            }
            
            // Require admin for OTHER users
            console.warn(`🔒 Attempt to change password for OTHER user: ${username} by ${currentUser}`);
            const isAdmin = await this.isCurrentUserAdmin();
            
            if (!isAdmin) {
                const hasAccess = await this.promptAdminPassword();
                if (!hasAccess) {
                    throw new Error('Admin access required to change other user passwords');
                }
            }
            
            return await originalStorePassword.call(storage, username, password);
        };
        
        // ✅ removeUserPassword - Only protect if removing OTHER user's password
        storage.removeUserPassword = async (username) => {
            const currentUser = this.getCurrentUser();
            
            // Allow users to remove their OWN password
            if (currentUser === username) {
                console.log(`✅ User ${username} removing own password - allowed`);
                return originalRemovePassword.call(storage, username);
            }
            
            // Require admin for OTHER users
            console.warn(`🔒 Attempt to remove password for OTHER user: ${username} by ${currentUser}`);
            const isAdmin = await this.isCurrentUserAdmin();
            
            if (!isAdmin) {
                const hasAccess = await this.promptAdminPassword();
                if (!hasAccess) {
                    throw new Error('Admin access required to remove other user passwords');
                }
            }
            
            return originalRemovePassword.call(storage, username);
        };
        
        console.log('🔒 Protected: secureStorage password methods (context-aware)');
    },
    
    /**
     * Protect global objects from being overwritten
     */
    protectGlobalObjects() {
        const criticalGlobals = [
            'secureStorage',
            'userManager',
            'settingsManager',
            'securityGuard'
        ];
        
        criticalGlobals.forEach(name => {
            if (window[name]) {
                const original = window[name];
                try {
                    const privateStore = {};
                    privateStore[name] = original;
                    
                    Object.defineProperty(window, name, {
                        get: function() {
                            return privateStore[name];
                        },
                        set: function(value) {
                            console.warn(`🚨 Attempted to overwrite protected object: ${name}`);
                            return privateStore[name];
                        },
                        configurable: false
                    });
                    
                    console.log(`🔒 Protected global object: ${name}`);
                } catch (error) {
                    console.warn(`⚠️ Could not protect ${name}:`, error);
                }
            }
        });
    },
    
    // =================== INTEGRITY MONITORING ===================
    
    /**
     * Setup integrity monitoring for localStorage
     * ✅ DISABLED: Continuous monitoring not needed for MetaFold
     */
    setupIntegrityMonitoring() {
        console.log('🔍 Integrity monitoring DISABLED by configuration');
        console.log('ℹ️ Continuous monitoring not needed for MetaFold use case');
        
        // ✅ FIX: Keine kontinuierliche Überwachung mehr
        // Die Überwachung ist für MetaFold nicht notwendig, da:
        // 1. Settings sich legitim bei User-Wechsel ändern
        // 2. Der physische Zugang zum Computer relevanter ist
        // 3. Die Passwort-Verschlüsselung ausreichend Sicherheit bietet
        
        // Leere Map für Compatibility (falls Code darauf zugreift)
        this.integrityChecks = new Map();
        
        console.log('✅ Integrity monitoring: OFF (manual security checks only)');
    },
    
    /**
     * ✅ NEW: Manual integrity check (on-demand)
     */
    async performManualIntegrityCheck() {
        console.log('🔍 Performing manual integrity check...');
        
        const criticalKeys = [
            'metafold_migration_status',
            'metafold_user_management_enabled'
        ];
        
        const issues = [];
        
        for (const key of criticalKeys) {
            const value = localStorage.getItem(key);
            if (!value) {
                issues.push({
                    key: key,
                    issue: 'Missing from localStorage',
                    severity: 'warning'
                });
            }
        }
        
        if (issues.length === 0) {
            console.log('✅ Manual integrity check: No issues found');
            return { success: true, issues: [] };
        } else {
            console.warn('⚠️ Manual integrity check found issues:', issues);
            return { success: false, issues: issues };
        }
    },
    
    /**
     * Start periodic integrity checks
     * @param {Array<string>} keys - Keys to monitor
     */
    startIntegrityChecks(keys) {
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                this.integrityChecks.set(key, this.createChecksum(value));
            }
        });
        
        setInterval(() => {
            this.verifyIntegrity(keys);
        }, 5000);
    },
    
    /**
     * Create simple checksum
     */
    createChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash;
    },
    
    /**
     * Verify integrity of monitored keys
     */
    async verifyIntegrity(keys) {
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (!value) continue;
            
            const currentChecksum = this.createChecksum(value);
            const storedChecksum = this.integrityChecks.get(key);
            
            if (storedChecksum && currentChecksum !== storedChecksum) {
                console.warn(`⚠️ Integrity violation detected for: ${key}`);
                
                const isAdmin = await this.isCurrentUserAdmin();
                if (!isAdmin) {
                    console.error(`🚨 Unauthorized modification detected: ${key}`);
                    this.handleIntegrityViolation(key);
                } else {
                    this.integrityChecks.set(key, currentChecksum);
                }
            }
        }
    },
    
    /**
     * Handle integrity violation
     */
    handleIntegrityViolation(key) {
        console.error('🚨 SECURITY ALERT: Unauthorized modification detected!');
        console.error('🚨 Key:', key);
        
        if (confirm('⚠️ Security Warning!\n\nUnauthorized modification detected.\n\nClick OK to reload the application.')) {
            window.location.reload();
        }
    },
    
    // =================== DEVTOOLS DETECTION ===================
    
    /**
     * Setup DevTools detection
     */
    setupDevToolsDetection() {
        console.log('🔍 Setting up DevTools detection...');
        
        let devtoolsOpen = false;
        const threshold = 160;
        
        const detectDevTools = () => {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;
            const devtoolsDetected = widthThreshold || heightThreshold;
            
            if (devtoolsDetected && !devtoolsOpen) {
                devtoolsOpen = true;
                this.handleDevToolsOpen();
            } else if (!devtoolsDetected && devtoolsOpen) {
                devtoolsOpen = false;
            }
        };
        
        setInterval(detectDevTools, 1000);
        
        console.log('✅ DevTools detection active');
    },
    
    /**
     * Handle DevTools being opened
     */
    async handleDevToolsOpen() {
        console.log('🔍 DevTools opened');
        
        const isAdmin = await this.isCurrentUserAdmin();
        
        if (!isAdmin) {
            console.warn('⚠️ DevTools opened by non-admin user');
            
            if (window.electronAPI && window.electronAPI.invoke) {
                try {
                    await window.electronAPI.invoke('close-devtools');
                    console.log('🔒 DevTools closed by security guard');
                } catch (error) {
                    console.error('Failed to close DevTools:', error);
                }
            }
        }
    },
    
    // =================== PUBLIC API ===================
    
    /**
     * Enable DevTools for current session (Admin only)
     */
    async enableDevTools() {
        const hasAccess = await this.promptAdminPassword();
        if (!hasAccess) {
            throw new Error('Admin access required to enable DevTools');
        }
        
        if (window.electronAPI && window.electronAPI.invoke) {
            try {
                await window.electronAPI.invoke('open-devtools');
                console.log('🔓 DevTools enabled by Admin');
                return true;
            } catch (error) {
                console.error('Failed to enable DevTools:', error);
                return false;
            }
        }
        
        return false;
    },
    
    /**
     * Get security status
     */
    getSecurityStatus() {
        return {
            initialized: this.isInitialized,
            mode: 'context-aware',
            currentUser: this.getCurrentUser(),
            currentAdmin: this.currentAdmin,
            protectedFunctions: this.protectedFunctions.size,
            integrityChecksActive: this.integrityChecks.size,
            timestamp: new Date().toISOString()
        };
    }
};

// Initialize on load
window.securityGuard = securityGuard;
console.log('✅ Security Guard module loaded (Context-Aware Version)');
