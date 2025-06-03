// Settings Manager (Simplified - delegates to integration modules)

const settingsManager = {
    settings: {},
    defaultSettings: {
        // General Settings
        'general.user_management_enabled': false,
        'general.theme': 'dark',
        'general.auto_save': true,
        'general.show_tips': true,
        
        // elabFTW Integration Settings
        'elabftw.enabled': false,
        'elabftw.server_url': '',
        'elabftw.api_key': '',
        'elabftw.auto_sync': false,
        'elabftw.default_category': 1,
        'elabftw.verify_ssl': true,
        
        // OMERO Integration Settings
        'omero.enabled': false,
        'omero.server_url': '',
        'omero.username': '',
        'omero.password': '', // Note: Store securely in production
        'omero.auto_sync': false,
        'omero.default_project_id': '',
        'omero.create_datasets': true,
        'omero.verify_ssl': true,
        'omero.session_timeout': 600000 // 10 minutes
    },

    // Initialize settings manager
    init() {
        console.log('🔧 Initializing settingsManager...');
        this.loadSettings();
        this.applyInitialSettings();
        console.log('✅ settingsManager initialized');
    },

    // Apply settings that need immediate effect
    applyInitialSettings() {
        const theme = this.get('general.theme');
        if (theme) {
            this.applyTheme(theme);
        }
    },

    // Load settings from localStorage
    loadSettings() {
        try {
            const stored = localStorage.getItem('metafold_settings');
            if (stored) {
                this.settings = { ...this.defaultSettings, ...JSON.parse(stored) };
            } else {
                this.settings = { ...this.defaultSettings };
            }
            console.log('📂 Settings loaded:', this.settings);
        } catch (error) {
            console.warn('Error loading settings, using defaults:', error);
            this.settings = { ...this.defaultSettings };
        }
    },

    // Save settings to localStorage
    saveSettings() {
        try {
            localStorage.setItem('metafold_settings', JSON.stringify(this.settings));
            console.log('💾 Settings saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    // Get setting value
    get(key) {
        const value = this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];
        return value;
    },

    // Set setting value
    set(key, value) {
        console.log(`📝 Set setting "${key}":`, key.includes('password') ? '[HIDDEN]' : value);
        this.settings[key] = value;
        const saved = this.saveSettings();
        
        if (saved) {
            this.handleSettingChange(key, value);
        }
        
        return saved;
    },

    // Handle setting changes that need immediate action
    handleSettingChange(key, value) {
        switch (key) {
            case 'general.user_management_enabled':
                this.handleUserManagementToggle(value);
                break;
                
            case 'general.theme':
                this.applyTheme(value);
                break;
                
            case 'elabftw.enabled':
            case 'elabftw.auto_sync':
                if (window.updateElabFTWOptions) {
                    window.updateElabFTWOptions();
                }
                break;
                
            case 'omero.enabled':
            case 'omero.auto_sync':
                if (window.updateOMEROOptions) {
                    window.updateOMEROOptions();
                }
                break;
        }
    },

    // Apply theme
    applyTheme(theme) {
        console.log('🎨 Theme changed to:', theme);
    },

    // Handle user management toggle
    handleUserManagementToggle(enabled) {
        console.log(`👥 User management ${enabled ? 'enabled' : 'disabled'}`);
        
        if (enabled) {
            this.showSettingsMessage(
                '👥 User Management enabled! Initializing login system...',
                'info'
            );
            
            localStorage.removeItem('metafold_last_user');
            
            setTimeout(async () => {
                if (window.userManager) {
                    console.log('🔄 Reinitializing userManager with User Management enabled...');
                    try {
                        window.userManager.isInitialized = false;
                        window.userManager.currentUser = null;
                        window.userManager.currentGroup = null;
                        
                        const userResult = await window.userManager.init();
                        console.log('✅ UserManager reinitialized:', userResult);
                        
                        if (window.templateManager && window.templateManager.init) {
                            window.templateManager.init();
                        }
                        
                        this.showSettingsMessage(
                            '✅ User Management activated successfully!',
                            'success'
                        );
                    } catch (error) {
                        console.warn('Failed to reinitialize userManager:', error);
                        this.showSettingsMessage(
                            '⚠️ User Management activation failed. Please restart the app.',
                            'warning'
                        );
                    }
                }
            }, 500);
            
        } else {
            this.showSettingsMessage(
                '📝 Simple mode enabled. Changes will take effect after restart.',
                'info'
            );
        }
    },

    // Show settings message
    showSettingsMessage(message, type = 'info') {
        let messageDiv = document.getElementById('settingsStatusMessage');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'settingsStatusMessage';
            messageDiv.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10001;
                font-weight: 500;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                max-width: 400px;
            `;
            document.body.appendChild(messageDiv);
        }
        
        const styles = {
            'info': { bg: '#dbeafe', color: '#1e40af', border: '#60a5fa' },
            'success': { bg: '#d1fae5', color: '#065f46', border: '#34d399' },
            'warning': { bg: '#fef3c7', color: '#92400e', border: '#fbbf24' },
            'error': { bg: '#fee2e2', color: '#b91c1c', border: '#f87171' }
        };
        
        const style = styles[type] || styles.info;
        messageDiv.style.background = style.bg;
        messageDiv.style.color = style.color;
        messageDiv.style.border = `1px solid ${style.border}`;
        
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, 5000);
    },

    // =================== INTEGRATION DELEGATES ===================

    // Test elabFTW connection - delegates to existing implementation
    async testElabFTWConnection() {
        const serverUrl = this.get('elabftw.server_url');
        const apiKey = this.get('elabftw.api_key');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'Server URL and API key are required' };
        }

        const formattedUrl = this.getFormattedElabFTWUrl();

        try {
            const response = await fetch(`${formattedUrl}api/v2/users/me`, {
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    message: `Connected successfully as ${data.fullname || 'Unknown User'}` 
                };
            } else {
                return { 
                    success: false, 
                    message: `Connection failed: ${response.status} ${response.statusText}` 
                };
            }
        } catch (error) {
            return { 
                success: false, 
                message: `Connection error: ${error.message}` 
            };
        }
    },

    // Test OMERO connection - delegates to omeroIntegration
    async testOMEROConnection() {
        if (!window.omeroIntegration) {
            return { success: false, message: 'OMERO integration module not available' };
        }
        
        try {
            return await window.omeroIntegration.testConnection();
        } catch (error) {
            return { 
                success: false, 
                message: `OMERO connection test failed: ${error.message}` 
            };
        }
    },

    // Create elabFTW experiment - delegates to existing implementation
    async createElabFTWExperiment(projectName, metadata, structure = '') {
        const serverUrl = this.getFormattedElabFTWUrl();
        const apiKey = this.get('elabftw.api_key');
        const categoryId = this.get('elabftw.default_category');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW not configured' };
        }

        try {
            const experimentData = {
                title: projectName,
                body: this.generateExperimentBody(projectName, metadata, structure)
            };

            if (categoryId && categoryId !== '') {
                experimentData.category_id = parseInt(categoryId);
            }

            const response = await fetch(`${serverUrl}api/v2/experiments`, {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experimentData)
            });

            if (response.ok || response.status === 201) {
                const location = response.headers.get('location');
                const experimentId = location ? location.split('/').pop() : null;
                
                if (metadata && Object.keys(metadata).length > 0 && experimentId) {
                    await this.updateExperimentWithMetadata(serverUrl, apiKey, experimentId, metadata);
                }
                
                return {
                    success: true,
                    message: 'Experiment created in elabFTW successfully!',
                    id: experimentId,
                    url: `${serverUrl}experiments.php?mode=view&id=${experimentId}`
                };
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    message: `elabFTW API error: ${response.status} - ${errorText}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Error creating elabFTW experiment: ${error.message}`
            };
        }
    },

    // Create OMERO dataset - delegates to omeroIntegration
    async createOMERODataset(projectName, metadata, options = {}) {
        if (!window.omeroIntegration) {
            return { success: false, message: 'OMERO integration module not available' };
        }
        
        try {
            return await window.omeroIntegration.createDatasetForProject(projectName, metadata, options);
        } catch (error) {
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}`
            };
        }
    },

    // Update existing elabFTW experiment
    async updateExistingElabFTWExperiment(experimentId, metadata) {
        const serverUrl = this.getFormattedElabFTWUrl();
        const apiKey = this.get('elabftw.api_key');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW not configured' };
        }

        try {
            const elabftwFields = this.convertMetadataToElabFTW(metadata);
            const metadataString = JSON.stringify({
                elabftw: {
                    display_main_text: true
                },
                extra_fields: elabftwFields
            });

            const updateData = {
                metadata: metadataString
            };

            const response = await fetch(`${serverUrl}api/v2/experiments/${experimentId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const experimentUrl = `${serverUrl}experiments.php?mode=view&id=${experimentId}`;
                
                return {
                    success: true,
                    message: `Experiment ${experimentId} updated in elabFTW`,
                    id: experimentId,
                    url: experimentUrl
                };
            } else {
                const errorText = await response.text();
                return {
                    success: false,
                    message: `elabFTW API error: ${response.status} - ${errorText}`
                };
            }
        } catch (error) {
            return {
                success: false,
                message: `Error updating elabFTW experiment: ${error.message}`
            };
        }
    },

    // =================== UTILITY METHODS ===================

    // Get formatted elabFTW URL
    getFormattedElabFTWUrl() {
        const serverUrl = this.get('elabftw.server_url');
        if (!serverUrl) return null;

        let formattedUrl = serverUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        if (!formattedUrl.endsWith('/')) {
            formattedUrl += '/';
        }
        return formattedUrl;
    },

    // Update experiment with metadata using PATCH
    async updateExperimentWithMetadata(serverUrl, apiKey, experimentId, metadata) {
        try {
            const elabftwFields = this.convertMetadataToElabFTW(metadata);
            const metadataString = JSON.stringify({
                elabftw: {
                    display_main_text: true
                },
                extra_fields: elabftwFields
            });

            const updateData = {
                metadata: metadataString
            };

            const response = await fetch(`${serverUrl}api/v2/experiments/${experimentId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                console.log('✅ Metadata successfully added to experiment');
                return true;
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to update experiment metadata:', response.status, errorText);
                return false;
            }
        } catch (error) {
            console.error('❌ Error updating experiment metadata:', error);
            return false;
        }
    },

    // Convert MetaFold metadata to elabFTW format
    convertMetadataToElabFTW(metadata) {
        const elabftwFields = {};
        
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            if (fieldInfo.type === 'group') return;

            const elabField = {
                type: this.mapFieldTypeToElabFTW(fieldInfo.type),
                value: this.formatValueForElabFTW(fieldInfo.value, fieldInfo.type)
            };

            if (fieldInfo.description) {
                elabField.description = fieldInfo.description;
            }

            if (fieldInfo.required) {
                elabField.required = true;
            }

            if (fieldInfo.type === 'textarea') {
                elabField.multiline = true;
            }

            if (fieldInfo.type === 'dropdown' && fieldInfo.options) {
                elabField.options = fieldInfo.options.map(opt => String(opt));
            }

            if (fieldInfo.type === 'number') {
                if (fieldInfo.min !== undefined) elabField.min = fieldInfo.min;
                if (fieldInfo.max !== undefined) elabField.max = fieldInfo.max;
            }

            const fieldKey = fieldInfo.label || key;
            elabftwFields[fieldKey] = elabField;
        });

        return elabftwFields;
    },

    // Map field types to elabFTW types
    mapFieldTypeToElabFTW(type) {
        const typeMap = {
            'text': 'text',
            'number': 'number',
            'date': 'date',
            'textarea': 'text',
            'dropdown': 'select',
            'checkbox': 'checkbox'
        };
        
        return typeMap[type] || 'text';
    },

    // Format values for elabFTW
    formatValueForElabFTW(value, type) {
        switch (type) {
            case 'checkbox':
                return (value === true || value === 'true' || value === 'on') ? "on" : "";
            case 'number':
                return String(value !== undefined && value !== null && value !== '' ? value : 0);
            case 'dropdown':
                return String(value || '');
            default:
                return String(value || '');
        }
    },

    // Generate experiment body for elabFTW
    generateExperimentBody(projectName, metadata, structure = '') {
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let body = `<h1>${projectName}</h1>\n\n`;
        body += `<p><strong>Created:</strong> ${date}</p>\n\n`;
        
        if (metadata && Object.keys(metadata).length > 0) {
            body += `<h2>Experiment Metadata</h2>\n<ul>\n`;
            
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                if (fieldInfo.type !== 'group') {
                    const value = fieldInfo.value || 'Not filled';
                    const label = fieldInfo.label || key;
                    
                    if (fieldInfo.type === 'checkbox') {
                        const checkValue = (value === true || value === 'true' || value === 'on') ? '✅ Yes' : '❌ No';
                        body += `<li><strong>${label}:</strong> ${checkValue}</li>\n`;
                    } else {
                        body += `<li><strong>${label}:</strong> ${value}</li>\n`;
                    }
                }
            });
            
            body += `</ul>\n\n`;
        }
        
        if (structure && structure.trim() !== '') {
            body += `<h2>Project Structure</h2>\n<pre>${structure}</pre>\n\n`;
        }
        
        body += `<h2>Description</h2>\n<p><em>Add your project description here...</em></p>\n\n`;
        body += `<h2>Methodology</h2>\n<p><em>Describe your methodology here...</em></p>\n\n`;
        body += `<h2>Results</h2>\n<p><em>Document your results here...</em></p>\n\n`;
        body += `<h2>Notes</h2>\n<p><em>Add any additional notes here...</em></p>\n`;
        
        return body;
    },

    // Reset to defaults
    reset() {
        console.log('🔄 Resetting settings to defaults...');
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
        this.applyInitialSettings();
    },

    // Export settings to JSON
    export() {
        return JSON.stringify(this.settings, null, 2);
    },

    // Import settings from JSON
    import(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = { ...this.defaultSettings, ...imported };
            const saved = this.saveSettings();
            
            if (saved) {
                this.applyInitialSettings();
            }
            
            return saved;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    },

    // Check if user management is enabled
    isUserManagementEnabled() {
        const enabled = this.get('general.user_management_enabled') === true;
        return enabled;
    }
};

window.settingsManager = settingsManager;
console.log('✅ settingsManager loaded (Simplified with module delegation)');