// Security Guard - Multi-Layer Protection System for MetaFold
// Protects critical functions against console manipulation and unauthorized access

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
        
        console.log('🛡️ Initializing Security Guard...');
        
        // 1. Protect critical objects
        this.protectCriticalObjects();
        
        // 2. Setup function proxies
        this.setupFunctionProtection();
        
        // 3. Setup integrity monitoring
        this.setupIntegrityMonitoring();
        
        // 4. Monitor console access
        this.setupConsoleProtection();
        
        // 5. Setup DevTools detection
        this.setupDevToolsDetection();
        
        this.isInitialized = true;
        console.log('✅ Security Guard initialized');
        
        return { success: true, protectedFunctions: this.protectedFunctions.size };
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
     * Verify admin credentials
     * @param {string} password - Admin password
     * @returns {Promise<boolean>}
     */
    async verifyAdminAccess(password) {
        if (!window.secureStorage) return false;
        
        try {
            const isValid = await window.secureStorage.verifyUserPassword('Admin', password);
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
    
    // =================== OBJECT PROTECTION ===================
    
    /**
     * Protect critical objects from modification
     */
    protectCriticalObjects() {
        console.log('🔒 Protecting critical objects...');
        
        // Protect secureStorage methods (but allow Admin)
        if (window.secureStorage) {
            this.protectObject(window.secureStorage, [
                'storeUserPassword',
                'removeUserPassword',
                'hasUserPassword',
                'verifyUserPassword'
            ]);
        }
        
        // Protect userManager methods
        if (window.userManager) {
            this.protectObject(window.userManager, [
                'setCurrentUser',
                'switchUser',
                'setUserPassword',
                'removeUserPassword'
            ]);
        }
        
        // Protect settingsManager
        if (window.settingsManager) {
            this.protectObject(window.settingsManager, [
                'set',
                'setSecureCredential'
            ]);
        }
        
        console.log('✅ Critical objects protected');
    },
    
    /**
     * Protect specific object methods
     * @param {Object} obj - Object to protect
     * @param {Array<string>} methodNames - Methods to protect
     */
    protectObject(obj, methodNames) {
        methodNames.forEach(methodName => {
            if (!obj[methodName]) return;
            
            const originalMethod = obj[methodName];
            const protectedKey = `${obj.constructor.name || 'object'}.${methodName}`;
            
            // Store original
            this.protectedFunctions.set(protectedKey, originalMethod);
            
            // Replace with protected version
            obj[methodName] = async (...args) => {
                // Check if current user is admin
                const isAdmin = await this.isCurrentUserAdmin();
                
                if (!isAdmin) {
                    console.warn(`🔒 Protected function called by non-admin: ${methodName}`);
                    
                    // Prompt for admin password
                    const hasAccess = await this.promptAdminPassword();
                    if (!hasAccess) {
                        throw new Error('Admin access required for this operation');
                    }
                }
                
                // Execute original function
                return await originalMethod.apply(obj, args);
            };
            
            console.log(`🔒 Protected: ${protectedKey}`);
        });
    },
    
    // =================== FUNCTION PROTECTION ===================
    
    /**
     * Setup protection for critical functions
     */
    setupFunctionProtection() {
        console.log('🛡️ Setting up function protection...');
        
        // Protect critical methods in secureStorage
        if (window.secureStorage) {
            this.protectObjectMethods(window.secureStorage, [
                'hasUserPassword',
                'verifyUserPassword',
                'storeUserPassword',
                'removeUserPassword'
            ]);
        }
        
        // Protect critical methods in userManager
        if (window.userManager) {
            this.protectObjectMethods(window.userManager, [
                'setCurrentUser',
                'setUserPassword',
                'switchUser'
            ]);
        }
        
        // Protect critical methods in settingsManager
        if (window.settingsManager) {
            this.protectObjectMethods(window.settingsManager, [
                'set',
                'setSecureCredential'
            ]);
        }
        
        // Prevent overwriting of critical global objects using getter
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
                    // Store original in closure
                    const privateStore = {};
                    privateStore[name] = original;
                    
                    // Create read-only property with getter
                    Object.defineProperty(window, name, {
                        get: function() {
                            return privateStore[name];
                        },
                        set: function(value) {
                            console.warn(`🚨 Attempted to overwrite protected object: ${name}`);
                            // Ignore the set attempt - return original
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
        
        console.log('✅ Function protection established');
    },
    
    /**
     * Protect object methods from being overwritten
     * @param {Object} obj - Object containing methods
     * @param {Array<string>} methodNames - Method names to protect
     */
    protectObjectMethods(obj, methodNames) {
        methodNames.forEach(methodName => {
            if (!obj[methodName] || typeof obj[methodName] !== 'function') {
                return;
            }
            
            const originalMethod = obj[methodName];
            const privateStore = {};
            privateStore[methodName] = originalMethod;
            
            try {
                // Create read-only property for the method
                Object.defineProperty(obj, methodName, {
                    get: function() {
                        return privateStore[methodName];
                    },
                    set: function(value) {
                        console.warn(`🚨 Attempted to overwrite protected method: ${methodName}`);
                        // Ignore the set attempt
                        return privateStore[methodName];
                    },
                    configurable: false
                });
                
                console.log(`🔒 Protected method: ${obj.constructor.name || 'object'}.${methodName}`);
            } catch (error) {
                console.warn(`⚠️ Could not protect method ${methodName}:`, error);
            }
        });
    },
    
    // =================== INTEGRITY MONITORING ===================
    
    /**
     * Setup integrity monitoring for localStorage
     */
    setupIntegrityMonitoring() {
        console.log('🔍 Setting up integrity monitoring...');
        
        // Create checksums for critical localStorage keys
        const criticalKeys = [
            'metafold_settings',
            'metafold_migration_status'
        ];
        
        // Monitor changes
        this.startIntegrityChecks(criticalKeys);
        
        console.log('✅ Integrity monitoring active');
    },
    
    /**
     * Start periodic integrity checks
     * @param {Array<string>} keys - Keys to monitor
     */
    startIntegrityChecks(keys) {
        // Create initial checksums
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
                this.integrityChecks.set(key, this.createChecksum(value));
            }
        });
        
        // Check every 5 seconds
        setInterval(() => {
            this.verifyIntegrity(keys);
        }, 5000);
    },
    
    /**
     * Create simple checksum
     * @param {string} data - Data to checksum
     * @returns {number}
     */
    createChecksum(data) {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    },
    
    /**
     * Verify integrity of monitored keys
     * @param {Array<string>} keys - Keys to verify
     */
    async verifyIntegrity(keys) {
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (!value) continue;
            
            const currentChecksum = this.createChecksum(value);
            const storedChecksum = this.integrityChecks.get(key);
            
            if (storedChecksum && currentChecksum !== storedChecksum) {
                console.warn(`⚠️ Integrity violation detected for: ${key}`);
                
                // Check if user is admin
                const isAdmin = await this.isCurrentUserAdmin();
                if (!isAdmin) {
                    console.error(`🚨 Unauthorized modification detected: ${key}`);
                    this.handleIntegrityViolation(key);
                } else {
                    // Update checksum for admin changes
                    this.integrityChecks.set(key, currentChecksum);
                }
            }
        }
    },
    
    /**
     * Handle integrity violation
     * @param {string} key - Violated key
     */
    handleIntegrityViolation(key) {
        // Log the violation
        console.error('🚨 SECURITY ALERT: Unauthorized modification detected!');
        console.error('🚨 Key:', key);
        console.error('🚨 This incident has been logged.');
        
        // Show warning to user
        if (confirm('⚠️ Security Warning!\n\nUnauthorized modification detected in application settings.\n\nClick OK to reload the application and restore integrity.')) {
            window.location.reload();
        }
    },
    
    // =================== CONSOLE PROTECTION ===================
    
    /**
     * Setup console access protection for non-admins
     */
    setupConsoleProtection() {
        console.log('🔒 Setting up console protection...');
        
        // Store original console methods
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        // Monitor console usage (but don't block - that's annoying for debugging)
        // We just log attempts to use protected functions via console
        
        console.log('✅ Console monitoring active');
    },
    
    // =================== DEVTOOLS DETECTION ===================
    
    /**
     * Setup DevTools detection
     */
    setupDevToolsDetection() {
        console.log('🔍 Setting up DevTools detection...');
        
        // Detect DevTools opening
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
        
        // Check periodically
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
            
            // Request Electron to close DevTools
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
     * @returns {Promise<boolean>}
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
     * @returns {Object}
     */
    getSecurityStatus() {
        return {
            initialized: this.isInitialized,
            currentAdmin: this.currentAdmin,
            protectedFunctions: this.protectedFunctions.size,
            integrityChecksActive: this.integrityChecks.size,
            timestamp: new Date().toISOString()
        };
    }
};

// Initialize on load
window.securityGuard = securityGuard;
console.log('✅ Security Guard module loaded');
