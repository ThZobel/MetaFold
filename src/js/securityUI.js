// Security UI Component - Manages encryption status display and user interactions

const securityUI = {
    isInitialized: false,

    // =================== INITIALIZATION ===================

    init() {
        if (this.isInitialized) return;
        
        console.log('🔐 Initializing Security UI...');
        this.isInitialized = true;
        
        // Add security status to settings modal when it's opened
        this.observeSettingsModal();
        
        console.log('✅ Security UI initialized');
    },

    // Observe settings modal opening to inject security status
    observeSettingsModal() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const modal = document.getElementById('settingsModal');
                    if (modal && modal.style.display === 'block') {
                        // Settings modal opened, inject security status
                        setTimeout(() => this.injectSecurityStatus(), 100);
                    }
                }
            });
        });

        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            observer.observe(settingsModal, { attributes: true, attributeFilter: ['style'] });
        }
    },

    // =================== SECURITY STATUS INJECTION ===================

    injectSecurityStatus() {
        // Check if already injected
        if (document.getElementById('securityStatusSection')) {
            this.updateSecurityStatus();
            return;
        }

        // Find the General Settings tab content
        const generalSettings = document.getElementById('generalSettings');
        if (!generalSettings) {
            console.warn('🔐 General settings not found, cannot inject security status');
            return;
        }

        // Create security status section
        const securitySection = this.createSecurityStatusSection();
        
        // Insert at the top of general settings (after user management)
        const userMgmtGroup = generalSettings.querySelector('.form-group');
        if (userMgmtGroup) {
            generalSettings.insertBefore(securitySection, userMgmtGroup.nextSibling);
        } else {
            generalSettings.appendChild(securitySection);
        }

        // Update with current status
        this.updateSecurityStatus();
    },

    createSecurityStatusSection() {
        const section = document.createElement('div');
        section.id = 'securityStatusSection';
        section.className = 'form-group';
        section.style.cssText = `
            border: 2px solid #374151;
            border-radius: 12px;
            padding: 16px;
            margin: 20px 0;
            background: linear-gradient(135deg, rgba(17, 24, 39, 0.8), rgba(31, 41, 55, 0.8));
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;

        section.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <span id="securityStatusIcon" style="font-size: 24px;">🔐</span>
                <div>
                    <h3 style="margin: 0; color: #f9fafb; font-size: 18px;">Security Status</h3>
                    <p id="securityStatusText" style="margin: 4px 0 0 0; color: #9ca3af; font-size: 14px;">
                        Checking encryption status...
                    </p>
                </div>
            </div>
            
            <div id="securityDetails" style="
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 12px;
                margin: 12px 0;
                border-left: 4px solid #10b981;
            ">
                <div id="securityDetailsContent"></div>
            </div>
            
            <div id="securityActions" style="
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 12px;
            "></div>
        `;

        return section;
    },

    // =================== STATUS UPDATES ===================

    async updateSecurityStatus() {
        if (!window.settingsManager) {
            return;
        }

        const statusIcon = document.getElementById('securityStatusIcon');
        const statusText = document.getElementById('securityStatusText');
        const detailsContent = document.getElementById('securityDetailsContent');
        const actionsDiv = document.getElementById('securityActions');

        if (!statusIcon || !statusText || !detailsContent || !actionsDiv) {
            return;
        }

        try {
            const securityStatus = window.settingsManager.getSecurityStatus();
            
            // Update main status
            this.updateMainStatus(statusIcon, statusText, securityStatus);
            
            // Update details
            this.updateSecurityDetails(detailsContent, securityStatus);
            
            // Update actions
            this.updateSecurityActions(actionsDiv, securityStatus);
            
        } catch (error) {
            console.error('🔐 Error updating security status:', error);
            statusText.textContent = 'Error checking security status';
            statusIcon.textContent = '❌';
        }
    },

    updateMainStatus(statusIcon, statusText, securityStatus) {
        if (!securityStatus.available) {
            statusIcon.textContent = '⚠️';
            statusText.textContent = 'Secure storage not available - credentials stored in plaintext';
            statusText.style.color = '#fbbf24';
            return;
        }

        switch (securityStatus.status) {
            case 'secure':
                statusIcon.textContent = '🔒';
                statusText.textContent = `All credentials encrypted using ${securityStatus.method}`;
                statusText.style.color = '#10b981';
                break;
                
            case 'needs_migration':
                statusIcon.textContent = '🔄';
                statusText.textContent = `${securityStatus.plaintextCredentials} credential(s) need encryption`;
                statusText.style.color = '#f59e0b';
                break;
                
            default:
                statusIcon.textContent = '❓';
                statusText.textContent = 'Security status unknown';
                statusText.style.color = '#6b7280';
        }
    },

    updateSecurityDetails(detailsContent, securityStatus) {
        const capabilities = securityStatus.capabilities || {};
        
        let html = '<div style="font-size: 13px; color: #d1d5db;">';
        
        // Encryption method
        html += `<div style="margin-bottom: 8px;">`;
        html += `<strong>🔐 Encryption Method:</strong> ${this.getMethodDisplayName(securityStatus.method)}`;
        html += `</div>`;
        
        // Credential status
        html += `<div style="margin-bottom: 8px;">`;
        html += `<strong>📊 Credentials:</strong> `;
        html += `${securityStatus.encryptedCredentials} encrypted, `;
        html += `${securityStatus.plaintextCredentials} plaintext`;
        html += `</div>`;
        
        // Available capabilities
        html += `<div style="margin-bottom: 8px;">`;
        html += `<strong>🛡️ Available Security:</strong>`;
        html += `<div style="margin-left: 16px; margin-top: 4px;">`;
        html += `<div>${capabilities.electronSafeStorage ? '✅' : '❌'} OS Keychain (${this.getOSKeychainName()})</div>`;
        html += `<div>${capabilities.browserCrypto ? '✅' : '❌'} Browser Encryption (AES-256)</div>`;
        html += `<div>${capabilities.fallbackBase64 ? '✅' : '❌'} Base64 + Salt (Fallback)</div>`;
        html += `</div>`;
        html += `</div>`;
        
        // Migration status
        if (securityStatus.migrationCompleted) {
            html += `<div style="color: #10b981;">`;
            html += `✅ Migration completed`;
            html += `</div>`;
        } else if (securityStatus.plaintextCredentials > 0) {
            html += `<div style="color: #f59e0b;">`;
            html += `⚠️ Migration needed for ${securityStatus.plaintextCredentials} credential(s)`;
            html += `</div>`;
        }
        
        html += '</div>';
        detailsContent.innerHTML = html;
    },

    updateSecurityActions(actionsDiv, securityStatus) {
        actionsDiv.innerHTML = '';
        
        // Migration action
        if (securityStatus.plaintextCredentials > 0) {
            const migrateBtn = this.createActionButton(
                '🔄 Encrypt Credentials',
                'Encrypt plaintext credentials for better security',
                'primary',
                () => this.performMigration()
            );
            actionsDiv.appendChild(migrateBtn);
        }
        
        // Security test action
        const testBtn = this.createActionButton(
            '🧪 Test Security',
            'Test encryption and decryption functionality',
            'secondary',
            () => this.testSecurity()
        );
        actionsDiv.appendChild(testBtn);
        
        // Advanced actions for encrypted credentials
        if (securityStatus.encryptedCredentials > 0) {
            const viewBtn = this.createActionButton(
                '👁️ View Details',
                'Show detailed security information',
                'secondary',
                () => this.showDetailedStatus()
            );
            actionsDiv.appendChild(viewBtn);
            
            const resetBtn = this.createActionButton(
                '🔄 Reset Security',
                'Reset all encryption (for troubleshooting)',
                'danger',
                () => this.resetSecurity()
            );
            actionsDiv.appendChild(resetBtn);
        }
    },

    createActionButton(text, title, type = 'secondary', onClick = null) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = text;
        button.title = title;
        button.className = `btn btn-${type}`;
        button.style.cssText = `
            font-size: 12px;
            padding: 6px 12px;
            margin: 2px;
            border-radius: 6px;
            white-space: nowrap;
        `;
        
        if (onClick) {
            button.addEventListener('click', onClick);
        }
        
        return button;
    },

    // =================== ACTION HANDLERS ===================

    async performMigration() {
        if (!window.settingsManager) {
            alert('Settings manager not available');
            return;
        }

        const confirmed = confirm(
            'Encrypt plaintext credentials?\n\n' +
            'This will use the best available encryption method to secure your passwords and API keys. ' +
            'This operation is irreversible but you can reset security settings if needed.'
        );

        if (confirmed) {
            try {
                await window.settingsManager.forceMigration();
                setTimeout(() => this.updateSecurityStatus(), 1000);
            } catch (error) {
                alert(`Migration failed: ${error.message}`);
            }
        }
    },

    async testSecurity() {
        if (!window.secureStorage) {
            alert('Secure storage not available');
            return;
        }

        try {
            const testData = 'test-credential-' + Date.now();
            const testKey = 'security-test';
            
            // Test encryption
            const encrypted = await window.secureStorage.encryptData(testData, { test: true });
            if (!encrypted.success) {
                throw new Error('Encryption test failed');
            }
            
            // Test decryption
            const decrypted = await window.secureStorage.decryptData(
                encrypted.encrypted, 
                encrypted.method, 
                encrypted.metadata
            );
            
            if (!decrypted.success || decrypted.decrypted !== testData) {
                throw new Error('Decryption test failed');
            }
            
            alert(
                `✅ Security Test Passed!\n\n` +
                `Method: ${encrypted.method}\n` +
                `Test data: "${testData}"\n` +
                `Encrypted: ${encrypted.encrypted.substring(0, 50)}...\n` +
                `Decrypted: "${decrypted.decrypted}"\n\n` +
                `Your encryption is working correctly.`
            );
            
        } catch (error) {
            alert(`❌ Security Test Failed!\n\nError: ${error.message}`);
        }
    },

    async showDetailedStatus() {
        if (!window.settingsManager) {
            alert('Settings manager not available');
            return;
        }

        try {
            const status = window.settingsManager.getSecurityStatus();
            const storageStatus = window.secureStorage?.getStatus() || {};
            
            let details = '🔐 Detailed Security Status\n\n';
            
            details += `📊 Overview:\n`;
            details += `- Secure Storage: ${status.available ? 'Available' : 'Not Available'}\n`;
            details += `- Best Method: ${status.method}\n`;
            details += `- Encrypted Credentials: ${status.encryptedCredentials}\n`;
            details += `- Plaintext Credentials: ${status.plaintextCredentials}\n`;
            details += `- Migration Status: ${status.migrationCompleted ? 'Completed' : 'Pending'}\n\n`;
            
            details += `🛡️ Available Methods:\n`;
            details += `- OS Keychain: ${status.capabilities?.electronSafeStorage ? 'Yes' : 'No'}\n`;
            details += `- Browser Crypto: ${status.capabilities?.browserCrypto ? 'Yes' : 'No'}\n`;
            details += `- Fallback Base64: ${status.capabilities?.fallbackBase64 ? 'Yes' : 'No'}\n\n`;
            
            if (window.settingsManager.migrationStatus.lastMigration) {
                details += `📅 Last Migration: ${new Date(window.settingsManager.migrationStatus.lastMigration).toLocaleString()}\n`;
                details += `📝 Migrated Keys: ${window.settingsManager.migrationStatus.migratedKeys.length}\n`;
            }
            
            alert(details);
            
        } catch (error) {
            alert(`Error getting detailed status: ${error.message}`);
        }
    },

    async resetSecurity() {
        if (!window.settingsManager) {
            alert('Settings manager not available');
            return;
        }

        const confirmed = confirm(
            '⚠️ Reset All Security Settings?\n\n' +
            'This will:\n' +
            '• Remove all encrypted credentials\n' +
            '• Convert them back to plaintext\n' +
            '• Reset migration status\n\n' +
            'This action cannot be undone. Continue?'
        );

        if (confirmed) {
            try {
                await window.settingsManager.resetSecurity();
                setTimeout(() => this.updateSecurityStatus(), 1000);
            } catch (error) {
                alert(`Security reset failed: ${error.message}`);
            }
        }
    },

    // =================== UTILITY METHODS ===================

    getMethodDisplayName(method) {
        const names = {
            'electronSafeStorage': 'OS Keychain (Most Secure)',
            'browserCrypto': 'Browser AES-256 (Secure)',
            'fallbackBase64': 'Base64 + Salt (Basic)',
            'plaintext': 'Plaintext (Not Secure)'
        };
        return names[method] || method;
    },

    getOSKeychainName() {
        if (typeof window !== 'undefined' && window.electronAPI) {
            switch (window.electronAPI.platform) {
                case 'darwin': return 'macOS Keychain';
                case 'win32': return 'Windows Credential Manager';
                default: return 'Linux Secret Service';
            }
        }
        return 'OS Keychain';
    },

    // Show security notification
    showSecurityNotification(message, type = 'info', duration = 5000) {
        let notification = document.getElementById('securityNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'securityNotification';
            notification.style.cssText = `
                position: fixed;
                top: 100px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10002;
                font-weight: 500;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 400px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        const styles = {
            'info': { bg: '#1e3a8a', color: '#dbeafe', border: '#3b82f6' },
            'success': { bg: '#065f46', color: '#d1fae5', border: '#10b981' },
            'warning': { bg: '#92400e', color: '#fef3c7', border: '#f59e0b' },
            'error': { bg: '#b91c1c', color: '#fee2e2', border: '#ef4444' }
        };

        const style = styles[type] || styles.info;
        notification.style.background = style.bg;
        notification.style.color = style.color;
        notification.style.border = `1px solid ${style.border}`;
        notification.textContent = message;

        // Animate in
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Animate out
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }, duration);
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        securityUI.init();
    });
} else {
    securityUI.init();
}

// Make globally available
window.securityUI = securityUI;

console.log('✅ Security UI Component loaded');