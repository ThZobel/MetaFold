// Secure Storage Module - Multi-Layer Encryption
// Provides secure storage for sensitive credentials (passwords, API keys)

const secureStorage = {
    isInitialized: false,
    capabilities: {
        electronSafeStorage: false,
        browserCrypto: false,
        fallbackBase64: true
    },
    encryptionKey: null,

    // =================== INITIALIZATION ===================

    async init() {
        if (this.isInitialized) {
            return this.capabilities;
        }

        console.log('🔐 Initializing Secure Storage...');

        // Check Electron safeStorage capability
        try {
            if (window.electronAPI) {
                this.capabilities.electronSafeStorage = await window.electronAPI.invoke('secure-storage-available');
                console.log('🔐 Electron safeStorage:', this.capabilities.electronSafeStorage ? '✅ Available' : '❌ Not available');
            }
        } catch (error) {
            console.warn('🔐 Electron safeStorage check failed:', error.message);
        }

        // Check Browser Crypto API capability
        try {
            if (window.crypto && window.crypto.subtle) {
                this.capabilities.browserCrypto = true;
                console.log('🔐 Browser Crypto API: ✅ Available');
                
                // Generate or load encryption key
                await this.initializeBrowserCrypto();
            } else {
                console.log('🔐 Browser Crypto API: ❌ Not available');
            }
        } catch (error) {
            console.warn('🔐 Browser Crypto API check failed:', error.message);
        }

        this.isInitialized = true;
        
        const method = this.getBestEncryptionMethod();
        console.log(`🔐 Secure Storage initialized with method: ${method}`);
        
        // ✅ AUTO-INIT ADMIN ACCOUNT
        console.log('🔍 Checking if Admin account needs to be created...');

        // Check if password system is enabled
        let passwordSystemEnabled = false;
        try {
            if (window.settingsManager?.settings) {
                passwordSystemEnabled = window.settingsManager.settings['security.password_system_enabled'] === true;
            }
        } catch (error) {
            console.warn('⚠️ Could not check password system status:', error);
        }

        if (passwordSystemEnabled) {
            console.log('🔍 Password system active - checking Admin account...');
            
            const adminExists = this.hasUserPassword('Admin');
            if (!adminExists) {
                console.log('🔍 Auto-creating Admin account...');
                
                const result = await this.initializeAdminAccount();
                if (result.created) {
                    console.log('✅ Admin account auto-created on init');
                    
                    // Optional: Show notification
                    if (typeof window.app?.showSuccess === 'function') {
                        window.app.showSuccess('Admin account created! Username: Admin, Password: admin');
                    }
                }
            } else {
                console.log('✅ Admin account already exists');
            }
        } else {
            console.log('ℹ️ Password system disabled - no Admin needed');
        }
        
        return this.capabilities;
    },

    // Initialize browser-side encryption key
    async initializeBrowserCrypto() {
        try {
            // Try to load existing key from localStorage
            const storedKey = localStorage.getItem('metafold_encryption_key');
            
            if (storedKey) {
                // Import existing key
                const keyData = JSON.parse(storedKey);
                this.encryptionKey = await window.crypto.subtle.importKey(
                    'jwk',
                    keyData,
                    { name: 'AES-GCM' },
                    false,
                    ['encrypt', 'decrypt']
                );
                console.log('🔐 Loaded existing browser encryption key');
            } else {
                // Generate new key
                this.encryptionKey = await window.crypto.subtle.generateKey(
                    { name: 'AES-GCM', length: 256 },
                    true,
                    ['encrypt', 'decrypt']
                );
                
                // Export and store key
                const exportedKey = await window.crypto.subtle.exportKey('jwk', this.encryptionKey);
                localStorage.setItem('metafold_encryption_key', JSON.stringify(exportedKey));
                console.log('🔐 Generated new browser encryption key');
            }
        } catch (error) {
            console.error('🔐 Browser crypto initialization failed:', error);
            this.capabilities.browserCrypto = false;
        }
    },

    // =================== ENCRYPTION METHODS ===================

    // Get best available encryption method
    getBestEncryptionMethod() {
        if (this.capabilities.electronSafeStorage) {
            return 'electronSafeStorage';
        } else if (this.capabilities.browserCrypto) {
            return 'browserCrypto';
        } else {
            return 'fallbackBase64';
        }
    },

    // Encrypt data using best available method
    async encryptData(plaintext, metadata = {}) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!plaintext || plaintext.trim() === '') {
            return {
                success: true,
                encrypted: '',
                method: 'empty',
                metadata: metadata
            };
        }

        const method = this.getBestEncryptionMethod();
        console.log(`🔐 Encrypting data using: ${method}`);

        try {
            switch (method) {
                case 'electronSafeStorage':
                    return await this.encryptWithElectron(plaintext, metadata);
                    
                case 'browserCrypto':
                    return await this.encryptWithBrowserCrypto(plaintext, metadata);
                    
                case 'fallbackBase64':
                    return await this.encryptWithFallback(plaintext, metadata);
                    
                default:
                    throw new Error(`Unknown encryption method: ${method}`);
            }
        } catch (error) {
            console.error(`🔐 Encryption failed with ${method}:`, error);
            
            // Try fallback method
            if (method !== 'fallbackBase64') {
                console.log('🔐 Attempting fallback encryption...');
                return await this.encryptWithFallback(plaintext, metadata);
            } else {
                throw error;
            }
        }
    },

    // Decrypt data using specified method
    async decryptData(encryptedData, method, metadata = {}) {
        if (!this.isInitialized) {
            await this.init();
        }

        if (!encryptedData || encryptedData.trim() === '') {
            return {
                success: true,
                decrypted: '',
                method: method || 'empty',
                metadata: metadata
            };
        }

        console.log(`🔐 Decrypting data using: ${method}`);

        try {
            switch (method) {
                case 'electronSafeStorage':
                    return await this.decryptWithElectron(encryptedData, metadata);
                    
                case 'browserCrypto':
                    return await this.decryptWithBrowserCrypto(encryptedData, metadata);
                    
                case 'fallbackBase64':
                    return await this.decryptWithFallback(encryptedData, metadata);
                    
                default:
                    // Try to auto-detect method
                    return await this.autoDetectAndDecrypt(encryptedData, metadata);
            }
        } catch (error) {
            console.error(`🔐 Decryption failed with ${method}:`, error);
            
            // Return original data as fallback
            return {
                success: false,
                decrypted: encryptedData,
                method: method || 'failed',
                error: error.message,
                metadata: metadata
            };
        }
    },

    // =================== ELECTRON SAFESTORAGE METHODS ===================

    async encryptWithElectron(plaintext, metadata) {
        try {
            // FIXED: Use consistent method parameter
            const result = await window.electronAPI.invoke('store-secure-credential', 'temp', plaintext, metadata);
            
            if (result.success) {
                console.log('🔐 Electron encryption result:', {
                    method: result.method,
                    encryptedLength: result.stored?.length || 0,
                    timestamp: result.timestamp
                });
                
                return {
                    success: true,
                    encrypted: result.stored,
                    method: 'electronSafeStorage',
                    timestamp: result.timestamp,
                    metadata: metadata
                };
            } else {
                throw new Error(result.error || 'Electron encryption failed');
            }
        } catch (error) {
            console.error('🔐 Electron encryption error:', error);
            throw error;
        }
    },

    async decryptWithElectron(encryptedData, metadata) {
            try {
                // FIXED: Use 'safeStorage' to match main.js expectation
                const result = await window.electronAPI.invoke('retrieve-secure-credential', encryptedData, 'safeStorage');
                
                if (result.success) {
                    // SICHERHEITS-FIX: Keine sensiblen Daten im Log
                    console.log('🔐 Electron decryption result:', {
                        hasValue: !!result.value,
                        valueLength: result.value?.length || 0,
                        // ENTFERNT: valuePreview - keine Passwort-Fragmente im Log
                        decryptionMethod: 'electronSafeStorage'
                    });
                    
                    return {
                        success: true,
                        decrypted: result.value,
                        method: 'electronSafeStorage',
                        timestamp: result.timestamp,
                        metadata: result.metadata || metadata
                    };
                } else {
                    throw new Error(result.error || 'Electron decryption failed');
                }
            } catch (error) {
                console.error('🔐 Electron decryption error:', error);
                throw error;
            }
        },

    // =================== BROWSER CRYPTO METHODS ===================

    async encryptWithBrowserCrypto(plaintext, metadata) {
        if (!this.capabilities.browserCrypto || !this.encryptionKey) {
            throw new Error('Browser crypto not available');
        }

        try {
            // Generate random IV
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt data
            const encodedData = new TextEncoder().encode(plaintext);
            const encryptedBuffer = await window.crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                this.encryptionKey,
                encodedData
            );
            
            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);
            
            // Convert to base64
            const base64 = btoa(String.fromCharCode(...combined));
            
            return {
                success: true,
                encrypted: base64,
                method: 'browserCrypto',
                timestamp: new Date().toISOString(),
                metadata: metadata
            };
            
        } catch (error) {
            console.error('🔐 Browser crypto encryption error:', error);
            throw error;
        }
    },

    async decryptWithBrowserCrypto(encryptedData, metadata) {
        if (!this.capabilities.browserCrypto || !this.encryptionKey) {
            throw new Error('Browser crypto not available');
        }

        try {
            // Convert from base64
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encryptedBuffer = combined.slice(12);
            
            // Decrypt data
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                this.encryptionKey,
                encryptedBuffer
            );
            
            const decrypted = new TextDecoder().decode(decryptedBuffer);
            
            return {
                success: true,
                decrypted: decrypted,
                method: 'browserCrypto',
                metadata: metadata
            };
            
        } catch (error) {
            console.error('🔐 Browser crypto decryption error:', error);
            throw error;
        }
    },

    // =================== FALLBACK BASE64 METHODS ===================

    async encryptWithFallback(plaintext, metadata) {
        try {
            // Generate salt
            const saltResult = window.electronAPI ? 
                await window.electronAPI.invoke('generate-salt') :
                { success: true, salt: this.generateClientSalt() };
                
            const salt = saltResult.success ? saltResult.salt : this.generateClientSalt();
            
            // Simple obfuscation with salt
            const obfuscated = this.simpleObfuscate(plaintext, salt);
            const encoded = btoa(JSON.stringify({ data: obfuscated, salt: salt }));
            
            return {
                success: true,
                encrypted: encoded,
                method: 'fallbackBase64',
                timestamp: new Date().toISOString(),
                metadata: metadata
            };
            
        } catch (error) {
            console.error('🔐 Fallback encryption error:', error);
            throw error;
        }
    },

    async decryptWithFallback(encryptedData, metadata) {
        try {
            const decoded = JSON.parse(atob(encryptedData));
            const decrypted = this.simpleDeobfuscate(decoded.data, decoded.salt);
            
            return {
                success: true,
                decrypted: decrypted,
                method: 'fallbackBase64',
                metadata: metadata
            };
            
        } catch (error) {
            console.error('🔐 Fallback decryption error:', error);
            throw error;
        }
    },

    // Simple client-side salt generation
    generateClientSalt() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Simple obfuscation (better than plaintext, not cryptographically secure)
    simpleObfuscate(text, salt) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            const saltChar = salt.charCodeAt(i % salt.length);
            result += String.fromCharCode(char ^ saltChar);
        }
        return btoa(result);
    },

    simpleDeobfuscate(obfuscated, salt) {
        const decoded = atob(obfuscated);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            const char = decoded.charCodeAt(i);
            const saltChar = salt.charCodeAt(i % salt.length);
            result += String.fromCharCode(char ^ saltChar);
        }
        return result;
    },

    // =================== AUTO-DETECTION ===================

    async autoDetectAndDecrypt(encryptedData, metadata) {
        const methods = ['electronSafeStorage', 'browserCrypto', 'fallbackBase64'];
        
        for (const method of methods) {
            try {
                const result = await this.decryptData(encryptedData, method, metadata);
                if (result.success && result.decrypted) {
                    console.log(`🔐 Auto-detected encryption method: ${method}`);
                    return result;
                }
            } catch (error) {
                // Continue to next method
                console.log(`🔐 Auto-detection failed for ${method}:`, error.message);
            }
        }
        
        // If all methods fail, return as plaintext (might be unencrypted legacy data)
        console.warn('🔐 Auto-detection failed, returning as plaintext');
        return {
            success: true,
            decrypted: encryptedData,
            method: 'plaintext',
            metadata: metadata
        };
    },

    // =================== PASSWORD MANAGEMENT ===================

    /**
     * Hash a password using browser-native crypto (PBKDF2)
     * @param {string} password - Plain text password
     * @param {string} salt - Optional salt (generates one if not provided)
     * @returns {Promise<Object>} - { hash, salt, method }
     */
    async hashPassword(password, salt = null) {
        if (!password || password.trim() === '') {
            throw new Error('Password cannot be empty');
        }

        try {
            // Generate salt if not provided
            if (!salt) {
                salt = this.generatePasswordSalt();
            }

            // Check if browser crypto is available
            if (this.capabilities.browserCrypto && window.crypto && window.crypto.subtle) {
                const hash = await this.hashPasswordWithCrypto(password, salt);
                return {
                    hash: hash,
                    salt: salt,
                    method: 'PBKDF2-SHA256',
                    timestamp: new Date().toISOString()
                };
            } else {
                // Fallback to simple hash
                const hash = this.hashPasswordFallback(password, salt);
                return {
                    hash: hash,
                    salt: salt,
                    method: 'fallback-hash',
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('🔐 Password hashing failed:', error);
            throw error;
        }
    },

    /**
     * Verify a password against a stored hash
     * @param {string} password - Plain text password to verify
     * @param {Object} storedHash - { hash, salt, method } from storage
     * @returns {Promise<boolean>} - True if password matches
     */
    async verifyPassword(password, storedHash) {
        if (!password || !storedHash || !storedHash.hash || !storedHash.salt) {
            return false;
        }

        try {
            // Re-hash the password with the stored salt
            const newHash = await this.hashPassword(password, storedHash.salt);
            
            // Compare hashes
            const isMatch = newHash.hash === storedHash.hash;
            
            console.log('🔐 Password verification result:', isMatch ? 'MATCH' : 'NO MATCH');
            return isMatch;
        } catch (error) {
            console.error('🔐 Password verification failed:', error);
            return false;
        }
    },

    /**
     * Generate a cryptographically secure salt for password hashing
     * @returns {string} - Base64 encoded salt
     */
    generatePasswordSalt() {
        try {
            if (window.crypto && window.crypto.getRandomValues) {
                const saltArray = new Uint8Array(32); // 256-bit salt
                window.crypto.getRandomValues(saltArray);
                return btoa(String.fromCharCode(...saltArray));
            } else {
                // Fallback: pseudo-random salt
                return this.generateClientSalt() + Date.now().toString(36);
            }
        } catch (error) {
            console.warn('🔐 Secure salt generation failed, using fallback:', error);
            return this.generateClientSalt() + Date.now().toString(36);
        }
    },

    /**
     * Hash password using PBKDF2 with browser crypto
     * @param {string} password - Plain text password
     * @param {string} salt - Base64 encoded salt
     * @returns {Promise<string>} - Base64 encoded hash
     */
    async hashPasswordWithCrypto(password, salt) {
        try {
            // Convert inputs to arrays
            const encoder = new TextEncoder();
            const passwordData = encoder.encode(password);
            const saltData = new Uint8Array(atob(salt).split('').map(char => char.charCodeAt(0)));

            // Import password as key material
            const keyMaterial = await window.crypto.subtle.importKey(
                'raw',
                passwordData,
                'PBKDF2',
                false,
                ['deriveBits']
            );

            // Derive key using PBKDF2
            const derivedKey = await window.crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: saltData,
                    iterations: 100000, // 100k iterations for security
                    hash: 'SHA-256'
                },
                keyMaterial,
                256 // 256-bit output
            );

            // Convert to base64
            const hashArray = new Uint8Array(derivedKey);
            return btoa(String.fromCharCode(...hashArray));
        } catch (error) {
            console.error('🔐 Crypto password hashing failed:', error);
            throw error;
        }
    },

    /**
     * Fallback password hashing for environments without crypto API
     * @param {string} password - Plain text password
     * @param {string} salt - Salt string
     * @returns {string} - Hash string
     */
    hashPasswordFallback(password, salt) {
        // Simple but better than plaintext - multiple rounds of XOR + transformation
        let hash = password + salt;
        
        for (let round = 0; round < 1000; round++) {
            let newHash = '';
            for (let i = 0; i < hash.length; i++) {
                const char = hash.charCodeAt(i);
                const saltChar = salt.charCodeAt(i % salt.length);
                const combined = (char + saltChar + round) % 256;
                newHash += String.fromCharCode(combined);
            }
            hash = btoa(newHash);
        }
        
        return hash;
    },

    // =================== USER PASSWORD STORAGE ===================

    /**
     * Store a user's password (hashed)
     * @param {string} username - Username
     * @param {string} password - Plain text password
     * @returns {Promise<Object>} - Storage result
     */
    async storeUserPassword(username, password) {
        if (!username || !password) {
            throw new Error('Username and password are required');
        }

        try {
            console.log(`🔐 Storing password for user: ${username}`);
            
            // Hash the password
            const hashedPassword = await this.hashPassword(password);
            
            // Store the hash securely
            const storageKey = `user_password_${username}`;
            const encrypted = await this.encryptData(JSON.stringify(hashedPassword), {
                type: 'user_password',
                username: username,
                createdAt: new Date().toISOString()
            });

            if (encrypted.success) {
                // Store in localStorage with encryption metadata
                localStorage.setItem(storageKey, JSON.stringify({
                    encrypted: encrypted.encrypted,
                    method: encrypted.method,
                    metadata: encrypted.metadata
                }));

                console.log('✅ User password stored successfully');
                return { success: true };
            } else {
                throw new Error('Failed to encrypt password');
            }
        } catch (error) {
            console.error('🔐 Store user password failed:', error);
            throw error;
        }
    },

    /**
     * Verify a user's password
     * @param {string} username - Username
     * @param {string} password - Plain text password to verify
     * @returns {Promise<boolean>} - True if password is correct
     */
    async verifyUserPassword(username, password) {
        if (!username || !password) {
            return false;
        }

        try {
            console.log(`🔐 Verifying password for user: ${username}`);
            
            // Retrieve stored password hash
            const storageKey = `user_password_${username}`;
            const storedData = localStorage.getItem(storageKey);
            
            if (!storedData) {
                console.log('🔐 No password found for user');
                return false;
            }

            const encryptedData = JSON.parse(storedData);
            
            // Decrypt the stored hash
            const decrypted = await this.decryptData(
                encryptedData.encrypted,
                encryptedData.method,
                encryptedData.metadata
            );

            if (!decrypted.success) {
                console.error('🔐 Failed to decrypt stored password');
                return false;
            }

            const storedHash = JSON.parse(decrypted.decrypted);
            
            // Verify the password
            return await this.verifyPassword(password, storedHash);
            
        } catch (error) {
            console.error('🔐 User password verification failed:', error);
            return false;
        }
    },

    /**
     * Check if a user has a password set
     * @param {string} username - Username
     * @returns {boolean} - True if user has a password
     */
    hasUserPassword(username) {
        if (!username) return false;
        
        const storageKey = `user_password_${username}`;
        return localStorage.getItem(storageKey) !== null;
    },

    /**
     * Remove a user's password
     * @param {string} username - Username
     * @returns {boolean} - True if removed
     */
    removeUserPassword(username) {
        if (!username) return false;
        
        try {
            const storageKey = `user_password_${username}`;
            localStorage.removeItem(storageKey);
            console.log(`🔐 Password removed for user: ${username}`);
            return true;
        } catch (error) {
            console.error('🔐 Failed to remove user password:', error);
            return false;
        }
    },

    /**
     * Get password status for debugging
     * @returns {Object} - Password system status
     */
    getPasswordSystemStatus() {
        const users = window.userManager?.users || [];
        const passwordStatus = {};
        
        users.forEach(username => {
            passwordStatus[username] = this.hasUserPassword(username);
        });
        
        return {
            initialized: this.isInitialized,
            capabilities: this.capabilities,
            encryptionMethod: this.getBestEncryptionMethod(),
            usersWithPasswords: passwordStatus,
            totalUsers: users.length,
            usersWithPasswordsCount: Object.values(passwordStatus).filter(Boolean).length
        };
    },

    // =================== ADMIN ACCOUNT MANAGEMENT ===================

    /**
     * Initialize default admin account
     * @returns {Promise<Object>} - Initialization result
     */
    async initializeAdminAccount() {
        const adminUsername = 'Admin';
        const defaultPassword = 'admin';
        
        try {
            // Check if admin already exists
            if (this.hasUserPassword(adminUsername)) {
                console.log('🔐 Admin account already exists');
                return { success: true, existed: true };
            }

            // Create admin password
            await this.storeUserPassword(adminUsername, defaultPassword);
            
            // Add admin to user list if not exists
            if (window.userManager && window.userManager.users) {
                if (!window.userManager.users.includes(adminUsername)) {
                    window.userManager.addUserToHistory(adminUsername, 'Admin');
                }
            }
            
            console.log('✅ Admin account created with default password');
            return { 
                success: true, 
                created: true, 
                username: adminUsername, 
                defaultPassword: defaultPassword 
            };
            
        } catch (error) {
            console.error('🔐 Admin account initialization failed:', error);
            throw error;
        }
    },

    /**
     * Reset a user's password (admin function)
     * @param {string} adminUsername - Admin username for verification
     * @param {string} adminPassword - Admin password for verification  
     * @param {string} targetUsername - User whose password to reset
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} - Reset result
     */
    async resetUserPassword(adminUsername, adminPassword, targetUsername, newPassword) {
        try {
            console.log(`🔐 Admin password reset requested for: ${targetUsername}`);
            
            // Verify admin credentials
            const isAdminValid = await this.verifyUserPassword(adminUsername, adminPassword);
            if (!isAdminValid) {
                throw new Error('Invalid admin credentials');
            }
            
            // Check if admin has admin privileges (is 'Admin' user)
            if (adminUsername !== 'Admin') {
                throw new Error('Only Admin user can reset passwords');
            }
            
            // Set new password for target user
            await this.storeUserPassword(targetUsername, newPassword);
            
            console.log(`✅ Password reset successful for user: ${targetUsername}`);
            return { success: true };
            
        } catch (error) {
            console.error('🔐 Password reset failed:', error);
            throw error;
        }
    },

    // =================== MIGRATION UTILITIES ===================

    // Migrate plaintext settings to encrypted
    async migrateSettings(plaintextSettings) {
        const sensitiveKeys = [
            'elabftw.api_key',
            'omero.password',
            'omero.username' // Also encrypt username for additional security
        ];

        const migratedSettings = { ...plaintextSettings };
        const migrationLog = [];

        for (const key of sensitiveKeys) {
            const value = plaintextSettings[key];
            
            if (value && typeof value === 'string' && value.trim() !== '') {
                try {
                    const encrypted = await this.encryptData(value, { 
                        originalKey: key,
                        migratedAt: new Date().toISOString()
                    });
                    
                    if (encrypted.success) {
                        migratedSettings[key] = {
                            encrypted: encrypted.encrypted,
                            method: encrypted.method,
                            timestamp: encrypted.timestamp,
                            metadata: encrypted.metadata
                        };
                        
                        migrationLog.push({
                            key: key.replace(/password|key/gi, '***'),
                            method: encrypted.method,
                            success: true
                        });
                        
                        console.log(`🔐 Migrated setting: ${key.replace(/password|key/gi, '***')}`);
                    }
                } catch (error) {
                    console.error(`🔐 Migration failed for ${key}:`, error);
                    migrationLog.push({
                        key: key.replace(/password|key/gi, '***'),
                        success: false,
                        error: error.message
                    });
                }
            }
        }

        return {
            success: true,
            migratedSettings: migratedSettings,
            migrationLog: migrationLog
        };
    },

    // =================== CONVENIENCE METHODS ===================

    // Store credential with automatic encryption
    async storeCredential(key, value, metadata = {}) {
        try {
            const result = await this.encryptData(value, { 
                ...metadata, 
                key: key,
                storedAt: new Date().toISOString()
            });
            
            if (result.success) {
                console.log(`🔐 Stored credential: ${key.replace(/password|key/gi, '***')}`);
                return {
                    encrypted: result.encrypted,
                    method: result.method,
                    timestamp: result.timestamp,
                    metadata: result.metadata
                };
            } else {
                throw new Error('Encryption failed');
            }
        } catch (error) {
            console.error(`🔐 Store credential failed for ${key}:`, error);
            throw error;
        }
    },

    // Retrieve credential with automatic decryption
    async retrieveCredential(encryptedCredential) {
        try {
            if (!encryptedCredential || typeof encryptedCredential !== 'object') {
                return '';
            }

            const result = await this.decryptData(
                encryptedCredential.encrypted,
                encryptedCredential.method,
                encryptedCredential.metadata
            );
            
            if (result.success) {
                return result.decrypted;
            } else {
                console.warn('🔐 Credential decryption failed, returning empty');
                return '';
            }
        } catch (error) {
            console.error('🔐 Retrieve credential failed:', error);
            return '';
        }
    },

    // Check if data is encrypted format
    isEncryptedFormat(data) {
        return data && 
               typeof data === 'object' && 
               data.encrypted !== undefined && 
               data.method !== undefined;
    },

    // Get encryption status
    getStatus() {
        return {
            initialized: this.isInitialized,
            capabilities: this.capabilities,
            bestMethod: this.getBestEncryptionMethod(),
            hasEncryptionKey: !!this.encryptionKey
        };
    }
};

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        secureStorage.init();
    });
} else {
    secureStorage.init();
}

// Make globally available
window.secureStorage = secureStorage;

console.log('✅ Secure Storage Module loaded - Multi-Layer Encryption Ready');
