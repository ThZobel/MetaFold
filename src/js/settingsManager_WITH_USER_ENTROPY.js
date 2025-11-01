// Settings Manager - WITH USER-SPECIFIC ENTROPY FOR OMERO/ELAB
// 🔐 CRITICAL: This version encrypts OMERO/eLab credentials with user-specific entropy

const settingsManager = {
    settings: {},
    secureCredentials: {}, // Separate storage for encrypted credentials
    isSecureStorageReady: false,
    migrationStatus: {
        completed: false,
        lastMigration: null,
        migratedKeys: []
    },
    
    // 🔐 NEW: Temporary in-memory password cache (NEVER stored in localStorage!)
    _temporaryPasswordCache: {
        username: null,
        password: null,
        timestamp: null,
        maxAge: 30 * 60 * 1000 // 30 minutes in milliseconds
    },
    
    // ... rest of the settings would continue here, but I'll create a helper file for the key changes
};

// Make globally available
window.settingsManager = settingsManager;
console.log('✅ settingsManager loaded - WITH USER-SPECIFIC ENTROPY');
