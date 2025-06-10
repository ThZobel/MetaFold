// Secure Integration Module - Coordinates all security components
// This module ensures proper initialization order and handles integration

const secureIntegration = {
    isInitialized: false,
    initializationSteps: [
        'secureStorage',
        'settingsManager', 
        'securityUI',
        'legacyMigration'
    ],
    completedSteps: [],
    
    // =================== INITIALIZATION COORDINATOR ===================

    async init() {
        if (this.isInitialized) {
            console.log('🔐 Secure integration already initialized');
            return;
        }

        console.log('🚀 Starting secure integration initialization...');
        
        try {
            // Step 1: Initialize secure storage
            await this.initializeSecureStorage();
            
            // Step 2: Initialize settings manager with security
            await this.initializeSecureSettings();
            
            // Step 3: Initialize security UI
            await this.initializeSecurityUI();
            
            // Step 4: Perform legacy migration if needed
            await this.performLegacyMigration();
            
            // Step 5: Setup event listeners
            this.setupEventListeners();
            
            this.isInitialized = true;
            console.log('✅ Secure integration initialization completed');
            
            // Show initialization status
            this.showInitializationStatus();
            
        } catch (error) {
            console.error('❌ Secure integration initialization failed:', error);
            this.handleInitializationError(error);
        }
    },

    async initializeSecureStorage() {
        console.log('🔐 Step 1: Initializing secure storage...');
        
        if (!window.secureStorage) {
            throw new Error('secureStorage module not loaded');
        }
        
        await window.secureStorage.init();
        this.completedSteps.push('secureStorage');
        
        const status = window.secureStorage.getStatus();
        console.log(`✅ Secure storage initialized with method: ${status.bestMethod}`);
    },

    async initializeSecureSettings() {
        console.log('🔐 Step 2: Initializing secure settings...');
        
        if (!window.settingsManager) {
            throw new Error('settingsManager module not loaded');
        }
        
        // Initialize settings manager with security support
        await window.settingsManager.init();
        this.completedSteps.push('settingsManager');
        
        const securityStatus = window.settingsManager.getSecurityStatus();
        console.log(`✅ Settings manager initialized - ${securityStatus.encryptedCredentials} encrypted credentials`);
    },

    async initializeSecurityUI() {
        console.log('🔐 Step 3: Initializing security UI...');
        
        if (!window.securityUI) {
            console.warn('⚠️ securityUI module not loaded, UI features will be limited');
            return;
        }
        
        window.securityUI.init();
        this.completedSteps.push('securityUI');
        
        console.log('✅ Security UI initialized');
    },

    async performLegacyMigration() {
        console.log('🔐 Step 4: Checking for legacy migration...');
        
        // Check for old plaintext settings that need migration
        const legacySettings = this.detectLegacySettings();
        
        if (legacySettings.length > 0) {
            console.log(`🔄 Found ${legacySettings.length} legacy settings requiring migration`);
            
            const shouldMigrate = window.settingsManager.get('security.auto_migrate');
            if (shouldMigrate) {
                await this.migrateLegacySettings(legacySettings);
            } else {
                this.promptLegacyMigration(legacySettings);
            }
        } else {
            console.log('✅ No legacy migration required');
        }
        
        this.completedSteps.push('legacyMigration');
    },

    // =================== LEGACY MIGRATION LOGIC ===================

    detectLegacySettings() {
        const legacyKeys = [
            'elabftw.api_key',
            'omero.password',
            'omero.username'
        ];
        
        const foundLegacy = [];
        
        legacyKeys.forEach(key => {
            const value = window.settingsManager.settings[key];
            if (value && typeof value === 'string' && value.trim() !== '') {
                foundLegacy.push({
                    key: key,
                    value: value,
                    type: this.getCredentialType(key)
                });
            }
        });
        
        return foundLegacy;
    },

    getCredentialType(key) {
        if (key.includes('password')) return 'password';
        if (key.includes('api_key')) return 'api_key';
        if (key.includes('username')) return 'username';
        return 'credential';
    },

    async migrateLegacySettings(legacySettings) {
        console.log('🔄 Performing automatic legacy migration...');
        
        let successCount = 0;
        let failureCount = 0;
        
        for (const setting of legacySettings) {
            try {
                await window.settingsManager.setSecureCredential(setting.key, setting.value);
                
                // Remove from plaintext settings
                delete window.settingsManager.settings[setting.key];
                
                successCount++;
                console.log(`✅ Migrated: ${setting.key.replace(/password|key/gi, '***')}`);
                
            } catch (error) {
                failureCount++;
                console.error(`❌ Migration failed for ${setting.key}:`, error);
            }
        }
        
        // Save updated settings
        window.settingsManager.saveSettings();
        await window.settingsManager.saveSecureCredentials();
        
        console.log(`🔄 Legacy migration completed: ${successCount} success, ${failureCount} failures`);
        
        if (successCount > 0) {
            this.showMigrationSuccess(successCount, failureCount);
        }
    },

    promptLegacyMigration(legacySettings) {
        const credentialTypes = [...new Set(legacySettings.map(s => s.type))];
        const message = `
MetaFold Security Enhancement

Found ${legacySettings.length} unencrypted credential(s):
${credentialTypes.map(type => `• ${type.replace('_', ' ')}`).join('\n')}

Encrypt these credentials for better security?

✅ Recommended: Uses the best available encryption method
⚠️ Current: Stored in plaintext (less secure)
        `.trim();
        
        if (confirm(message)) {
            this.migrateLegacySettings(legacySettings);
        } else {
            console.log('🔄 User declined legacy migration');
            this.showMigrationDeclined();
        }
    },

    // =================== EVENT LISTENERS ===================

    setupEventListeners() {
        // Listen for settings changes to update security status
        if (window.settingsManager) {
            const originalSet = window.settingsManager.set.bind(window.settingsManager);
            window.settingsManager.set = async function(key, value) {
                const result = await originalSet(key, value);
                
                // Update security UI if sensitive setting changed
                if (window.settingsManager.sensitiveKeys.includes(key) && window.securityUI) {
                    setTimeout(() => window.securityUI.updateSecurityStatus(), 500);
                }
                
                return result;
            };
        }
        
        // Listen for settings modal opening
        document.addEventListener('click', (event) => {
            if (event.target && event.target.onclick && 
                event.target.onclick.toString().includes('showSettingsModal')) {
                // Settings modal will open, update security status after a delay
                setTimeout(() => {
                    if (window.securityUI) {
                        window.securityUI.updateSecurityStatus();
                    }
                }, 200);
            }
        });
        
        console.log('✅ Security event listeners setup completed');
    },

    // =================== STATUS AND FEEDBACK ===================

    showInitializationStatus() {
        const securityStatus = window.settingsManager?.getSecurityStatus();
        
        if (!securityStatus) {
            return;
        }
        
        if (securityStatus.available && securityStatus.status === 'secure') {
            console.log('🔒 Security Status: All credentials encrypted and secure');
        } else if (securityStatus.plaintextCredentials > 0) {
            console.log(`⚠️ Security Status: ${securityStatus.plaintextCredentials} credential(s) need encryption`);
        } else {
            console.log('🔐 Security Status: Ready for secure credential storage');
        }
    },

    showMigrationSuccess(successCount, failureCount) {
        const message = failureCount > 0 
            ? `🔐 Migration completed: ${successCount} credentials encrypted, ${failureCount} failed`
            : `🔐 Migration successful: ${successCount} credentials encrypted`;
            
        if (window.securityUI) {
            window.securityUI.showSecurityNotification(message, 'success', 8000);
        }
    },

    showMigrationDeclined() {
        if (window.securityUI) {
            window.securityUI.showSecurityNotification(
                '⚠️ Credentials remain in plaintext. You can encrypt them later in Settings.',
                'warning',
                10000
            );
        }
    },

    handleInitializationError(error) {
        console.error('❌ Security initialization failed:', error);
        
        // Try to show user-friendly error
        if (window.securityUI) {
            window.securityUI.showSecurityNotification(
                `🔐 Security initialization failed: ${error.message}`,
                'error',
                10000
            );
        }
        
        // Fallback to basic security (no encryption)
        this.initializeFallbackMode();
    },

    initializeFallbackMode() {
        console.log('🔐 Initializing fallback mode (no encryption)...');
        
        // Ensure basic functionality without security features
        if (window.settingsManager && !this.completedSteps.includes('settingsManager')) {
            // Initialize settings manager without security
            window.settingsManager.isSecureStorageReady = false;
            window.settingsManager.loadSettings();
            window.settingsManager.applyInitialSettings();
        }
    },

    // =================== DIAGNOSTIC METHODS ===================

    async runDiagnostics() {
        console.log('🔍 Running security diagnostics...');
        
        const results = {
            timestamp: new Date().toISOString(),
            secureStorage: null,
            settingsManager: null,
            securityUI: null,
            overall: 'unknown'
        };
        
        // Test secure storage
        if (window.secureStorage) {
            try {
                const status = window.secureStorage.getStatus();
                const testResult = await this.testEncryption();
                
                results.secureStorage = {
                    available: status.initialized,
                    method: status.bestMethod,
                    capabilities: status.capabilities,
                    encryptionTest: testResult
                };
            } catch (error) {
                results.secureStorage = { error: error.message };
            }
        }
        
        // Test settings manager
        if (window.settingsManager) {
            try {
                const securityStatus = window.settingsManager.getSecurityStatus();
                results.settingsManager = securityStatus;
            } catch (error) {
                results.settingsManager = { error: error.message };
            }
        }
        
        // Test security UI
        results.securityUI = {
            available: !!window.securityUI,
            initialized: window.securityUI?.isInitialized || false
        };
        
        // Overall assessment
        if (results.secureStorage?.available && results.settingsManager?.available) {
            results.overall = 'excellent';
        } else if (results.settingsManager?.available) {
            results.overall = 'good';
        } else {
            results.overall = 'basic';
        }
        
        console.log('🔍 Diagnostics completed:', results);
        return results;
    },

    async testEncryption() {
        if (!window.secureStorage) {
            return { success: false, error: 'Secure storage not available' };
        }
        
        try {
            const testData = 'diagnostic-test-' + Date.now();
            
            const encrypted = await window.secureStorage.encryptData(testData);
            if (!encrypted.success) {
                return { success: false, error: 'Encryption failed' };
            }
            
            const decrypted = await window.secureStorage.decryptData(
                encrypted.encrypted, 
                encrypted.method
            );
            
            if (!decrypted.success || decrypted.decrypted !== testData) {
                return { success: false, error: 'Decryption failed or data mismatch' };
            }
            
            return { 
                success: true, 
                method: encrypted.method,
                dataSize: encrypted.encrypted.length
            };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    },

    // =================== PUBLIC API ===================

    getStatus() {
        return {
            initialized: this.isInitialized,
            completedSteps: this.completedSteps,
            totalSteps: this.initializationSteps.length,
            secureStorageReady: !!window.secureStorage?.isInitialized,
            settingsSecure: window.settingsManager?.isSecureStorageReady || false
        };
    },

    async reinitialize() {
        console.log('🔄 Reinitializing secure integration...');
        
        this.isInitialized = false;
        this.completedSteps = [];
        
        await this.init();
    }
};

// Auto-initialize when all dependencies are ready
function initializeWhenReady() {
    // Check if all required modules are loaded
    const requiredModules = ['secureStorage', 'settingsManager'];
    const missingModules = requiredModules.filter(module => !window[module]);
    
    if (missingModules.length > 0) {
        console.log(`🔐 Waiting for modules: ${missingModules.join(', ')}`);
        setTimeout(initializeWhenReady, 100);
        return;
    }
    
    // All modules loaded, initialize
    secureIntegration.init();
}

// Start initialization check
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhenReady);
} else {
    initializeWhenReady();
}

// Make globally available
window.secureIntegration = secureIntegration;

console.log('✅ Secure Integration Module loaded - Coordinator ready');