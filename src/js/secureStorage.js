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
                console.log('🔐 Electron decryption result:', {
                    hasValue: !!result.value,
                    valueLength: result.value?.length || 0,
                    valuePreview: result.value ? result.value.substring(0, 10) + '***' : 'EMPTY'
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
