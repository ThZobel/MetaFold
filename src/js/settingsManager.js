// Settings Manager for MetaFold - handles elabFTW integration and other settings

const settingsManager = {
    settings: {},
    defaultSettings: {
        elabftw: {
            enabled: false,
            server_url: '',
            api_key: '',
            default_category: '',
            auto_sync: false
        },
        general: {
            default_project_path: '',
            auto_open_created_folders: true,
            theme: 'auto'
        }
    },

    // Initialize settings
    init() {
        this.loadSettings();
        this.setupEventListeners();
    },

    // Load settings from storage
    loadSettings() {
        try {
            const stored = localStorage.getItem('metafold_settings');
            if (stored) {
                this.settings = { ...this.defaultSettings, ...JSON.parse(stored) };
            } else {
                this.settings = { ...this.defaultSettings };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = { ...this.defaultSettings };
        }
    },

    // Save settings to storage
    saveSettings() {
        try {
            localStorage.setItem('metafold_settings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    // Get setting value
    get(path) {
        const keys = path.split('.');
        let current = this.settings;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return null;
            }
        }
        return current;
    },

    // Set setting value
    set(path, value) {
        const keys = path.split('.');
        let current = this.settings;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
        this.saveSettings();
    },

    // Test elabFTW connection
    async testElabFTWConnection() {
        const serverUrl = this.get('elabftw.server_url');
        const apiKey = this.get('elabftw.api_key');

        if (!serverUrl || !apiKey) {
            return { success: false, message: 'Server URL and API Key are required' };
        }

        // Ensure server URL has correct format
        let formattedUrl = serverUrl.trim();
        if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
            formattedUrl = 'https://' + formattedUrl;
        }
        if (!formattedUrl.endsWith('/')) {
            formattedUrl += '/';
        }

        try {
            // Test connection by getting server info
            const response = await fetch(`${formattedUrl}api/v2/info`, {
                method: 'GET',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return { 
                    success: true, 
                    message: `Connected to elabFTW server successfully!`,
                    serverInfo: data
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

    // Create experiment in elabFTW
    async createElabFTWExperiment(projectName, metadata, structure) {
        if (!this.get('elabftw.enabled')) {
            return { success: false, message: 'elabFTW integration is disabled' };
        }

        const serverUrl = this.getFormattedElabFTWUrl();
        const apiKey = this.get('elabftw.api_key');

        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW server URL and API Key not configured' };
        }

        try {
            // Step 1: Create experiment first
            const experimentData = {
                title: projectName,
                body: this.generateExperimentBody(metadata, structure)
            };

            // Add category if configured
            const defaultCategory = this.get('elabftw.default_category');
            if (defaultCategory && defaultCategory.trim()) {
                experimentData.category_id = parseInt(defaultCategory);
            }

            console.log('Creating elabFTW experiment with data:', experimentData);

            // Create experiment
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
                
                // Step 2: Update experiment with metadata if available
                if (metadata && Object.keys(metadata).length > 0 && experimentId) {
                    const metadataResult = await this.updateExperimentWithMetadata(serverUrl, apiKey, experimentId, metadata);
                    if (!metadataResult) {
                        console.warn('Failed to update experiment with metadata, but experiment was created');
                    }
                }
                
                return {
                    success: true,
                    message: 'Experiment created in elabFTW successfully!',
                    experimentId: experimentId,
                    url: `${serverUrl}experiments.php?mode=view&id=${experimentId}`
                };
            } else {
                const errorText = await response.text();
                console.error('elabFTW API Error:', response.status, errorText);
                return {
                    success: false,
                    message: `Failed to create experiment: ${response.status} ${response.statusText}`,
                    details: errorText
                };
            }
        } catch (error) {
            console.error('elabFTW Connection Error:', error);
            return {
                success: false,
                message: `Error creating experiment: ${error.message}`
            };
        }
    },

    // Update existing experiment with metadata - FIXED
    async updateExistingElabFTWExperiment(experimentId, metadata) {
        if (!this.get('elabftw.enabled')) {
            return { success: false, message: 'elabFTW integration is disabled' };
        }

        const serverUrl = this.getFormattedElabFTWUrl();
        const apiKey = this.get('elabftw.api_key');

        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW server URL and API Key not configured' };
        }

        try {
            // Convert metadata to elabFTW format and create JSON string
            const elabftwFields = this.convertMetadataToElabFTW(metadata);
            const metadataString = JSON.stringify({
                elabftw: {
                    display_main_text: true
                },
                extra_fields: elabftwFields
            });

            console.log('Updating existing experiment with metadata string:', metadataString);

            // FIXED: Use correct API format with metadata as JSON string
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
                console.log('✅ Metadata successfully merged into experiment');
                return {
                    success: true,
                    message: `Experiment ${experimentId} updated successfully!`,
                    experimentId: experimentId,
                    url: `${serverUrl}experiments.php?mode=view&id=${experimentId}`
                };
            } else {
                const errorText = await response.text();
                console.error('❌ Failed to update experiment metadata:', response.status, errorText);
                return {
                    success: false,
                    message: `Failed to update experiment: ${response.status} ${response.statusText}`,
                    details: errorText
                };
            }
        } catch (error) {
            console.error('❌ Error updating experiment:', error);
            return {
                success: false,
                message: `Error updating experiment: ${error.message}`
            };
        }
    },

    // Update experiment with metadata using PATCH - FIXED
    async updateExperimentWithMetadata(serverUrl, apiKey, experimentId, metadata) {
        try {
            const elabftwFields = this.convertMetadataToElabFTW(metadata);
            const metadataString = JSON.stringify({
                elabftw: {
                    display_main_text: true
                },
                extra_fields: elabftwFields
            });

            console.log('Updating experiment with metadata string:', metadataString);

            // FIXED: Use correct API format with metadata as JSON string
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

            if (fieldInfo.type === 'dropdown' && fieldInfo.options) {
                elabField.options = fieldInfo.options.map(opt => String(opt));
            }

            if (fieldInfo.type === 'number') {
                if (fieldInfo.min !== undefined) elabField.min = fieldInfo.min;
                if (fieldInfo.max !== undefined) elabField.max = fieldInfo.max;
            }

            elabftwFields[fieldInfo.label || key] = elabField;
        });

        return elabftwFields;
    },

    // Map field types to elabFTW format
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
        if (type === 'checkbox') {
            return (value === true || value === 'true' || value === 'on') ? 'on' : '';
        }
        if (type === 'number') {
            return String(value !== undefined && value !== null && value !== '' ? value : 0);
        }
        return String(value || '');
    },

    // Generate experiment body text
    generateExperimentBody(metadata, structure) {
        let body = '<h2>🧪 Experiment Details</h2>\n\n';
        
        // Add creation info
        const now = new Date();
        body += `<p><strong>Created:</strong> ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}</p>\n\n`;
        
        // Add metadata as HTML table
        if (metadata && Object.keys(metadata).length > 0) {
            body += '<h3>📊 Metadata</h3>\n<dl style="background: #f8f9fa; padding: 15px; border-radius: 8px;">\n';
            
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                if (fieldInfo.type !== 'group') {
                    const label = fieldInfo.label || key;
                    let value = fieldInfo.value || '<em>Not specified</em>';
                    
                    if (fieldInfo.type === 'checkbox') {
                        value = (value === true || value === 'true' || value === 'on') ? '✅ Yes' : '❌ No';
                    } else if (fieldInfo.type === 'date' && value !== '<em>Not specified</em>') {
                        try {
                            const dateObj = new Date(value);
                            value = dateObj.toLocaleDateString();
                        } catch (e) {
                            // Keep original value if date parsing fails
                        }
                    }
                    
                    body += `<dt><strong>${label}:</strong></dt>\n<dd style="margin-left: 20px; margin-bottom: 10px;">${value}</dd>\n`;
                }
            });
            
            body += '</dl>\n\n';
        }

        // Add structure if available
        if (structure && structure.trim()) {
            body += '<h3>📁 Project Structure</h3>\n<pre style="background: #f1f5f9; padding: 15px; border-radius: 8px; overflow-x: auto;"><code>' + 
                    structure.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>\n\n';
        }

        // Add template sections
        body += '<h3>📝 Methodology</h3>\n<p><em>Describe your experimental methodology, procedures, and protocols here...</em></p>\n\n';
        body += '<h3>📈 Results</h3>\n<p><em>Document your findings, observations, and results here...</em></p>\n\n';
        body += '<h3>💭 Notes</h3>\n<p><em>Add any additional notes, observations, or important information here...</em></p>\n\n';
        
        // Add footer
        body += '<hr>\n<p><small><em>This experiment was created automatically by MetaFold.</em></small></p>';
        
        return body;
    },

    // Show settings modal
    showSettings() {
        const modal = document.getElementById('settingsModal');
        if (!modal) {
            this.createSettingsModal();
        }
        
        this.populateSettingsForm();
        document.getElementById('settingsModal').style.display = 'block';
    },

    // Create settings modal
    createSettingsModal() {
        const modalHtml = `
            <div id="settingsModal" class="modal">
                <div class="modal-content" style="width: 600px; max-width: 90vw;">
                    <span class="close" onclick="settingsManager.closeSettings()">&times;</span>
                    <h2>⚙️ MetaFold Settings</h2>
                    
                    <div class="settings-tabs">
                        <button class="settings-tab active" onclick="settingsManager.switchTab('elabftw')">🧪 elabFTW Integration</button>
                        <button class="settings-tab" onclick="settingsManager.switchTab('general')">🔧 General</button>
                    </div>

                    <div id="elabftwTab" class="settings-tab-content active">
                        <h3>elabFTW Integration</h3>
                        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">
                            Connect MetaFold to your elabFTW server to automatically create experiments from your templates.
                        </p>
                        
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="elabftwEnabled"> Enable elabFTW Integration
                            </label>
                            <small style="margin-left: 24px; color: #6b7280; display: block;">
                                <strong>When enabled:</strong> Shows elabFTW options in Project Setup and enables automatic syncing
                                <br><strong>When disabled:</strong> Completely hides all elabFTW functionality
                            </small>
                        </div>

                        <div class="form-group">
                            <label for="elabftwServer">elabFTW Server URL:</label>
                            <input type="url" id="elabftwServer" placeholder="https://your-elabftw-server.com">
                            <small>Enter the full URL to your elabFTW instance (e.g., https://elab.university.edu)</small>
                        </div>

                        <div class="form-group">
                            <label for="elabftwApiKey">API Key:</label>
                            <input type="password" id="elabftwApiKey" placeholder="Your elabFTW API key">
                            <small>Create an API key in elabFTW: User Panel → API Keys → Create new key</small>
                        </div>

                        <div class="form-group">
                            <label for="elabftwCategory">Default Experiment Category ID (optional):</label>
                            <input type="text" id="elabftwCategory" placeholder="e.g., 1">
                            <small>The numeric ID of the default experiment category in elabFTW (found in Admin panel)</small>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="elabftwAutoSync"> Automatically sync experiments to elabFTW
                            </label>
                            <small>When enabled, experiments will be automatically created in elabFTW when you create projects</small>
                        </div>

                        <div class="form-group">
                            <button class="btn btn-secondary" onclick="settingsManager.testConnection()" id="testConnectionBtn">
                                🔍 Test Connection
                            </button>
                            <div id="connectionStatus" style="margin-top: 10px;"></div>
                        </div>
                    </div>

                    <div id="generalTab" class="settings-tab-content">
                        <h3>General Settings</h3>
                        
                        <div class="form-group">
                            <label for="defaultProjectPath">Default Project Path:</label>
                            <input type="text" id="defaultProjectPath" placeholder="C:\\Projects">
                            <small>Default directory where new projects will be created</small>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="autoOpenFolders"> Automatically open created project folders
                            </label>
                            <small>Opens the project folder in your file manager after creation</small>
                        </div>

                        <div class="form-group">
                            <label for="theme">Theme:</label>
                            <select id="theme">
                                <option value="auto">Auto (Follow System)</option>
                                <option value="light">Light</option>
                                <option value="dark">Dark</option>
                            </select>
                            <small>Choose your preferred interface theme</small>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        <button class="btn btn-secondary" onclick="settingsManager.closeSettings()">Cancel</button>
                        <button class="btn" onclick="settingsManager.saveSettingsForm()">💾 Save Settings</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    // Switch settings tab
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.settings-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabName + 'Tab').classList.add('active');
        event.target.classList.add('active');
    },

    // Populate settings form
    populateSettingsForm() {
        // elabFTW settings
        document.getElementById('elabftwEnabled').checked = this.get('elabftw.enabled') || false;
        document.getElementById('elabftwServer').value = this.get('elabftw.server_url') || '';
        document.getElementById('elabftwApiKey').value = this.get('elabftw.api_key') || '';
        document.getElementById('elabftwCategory').value = this.get('elabftw.default_category') || '';
        document.getElementById('elabftwAutoSync').checked = this.get('elabftw.auto_sync') || false;

        // General settings  
        document.getElementById('defaultProjectPath').value = this.get('general.default_project_path') || '';
        document.getElementById('autoOpenFolders').checked = this.get('general.auto_open_created_folders') !== false;
        document.getElementById('theme').value = this.get('general.theme') || 'auto';
    },

    // Save settings from form
    saveSettingsForm() {
        // elabFTW settings
        this.set('elabftw.enabled', document.getElementById('elabftwEnabled').checked);
        this.set('elabftw.server_url', document.getElementById('elabftwServer').value.trim());
        this.set('elabftw.api_key', document.getElementById('elabftwApiKey').value.trim());
        this.set('elabftw.default_category', document.getElementById('elabftwCategory').value.trim());
        this.set('elabftw.auto_sync', document.getElementById('elabftwAutoSync').checked);

        // General settings
        this.set('general.default_project_path', document.getElementById('defaultProjectPath').value.trim());
        this.set('general.auto_open_created_folders', document.getElementById('autoOpenFolders').checked);
        this.set('general.theme', document.getElementById('theme').value);

        this.closeSettings();
        this.showSaveMessage('⚙️ Settings saved successfully!');
    },

    // Test elabFTW connection
    async testConnection() {
        const statusEl = document.getElementById('connectionStatus');
        const testBtn = document.getElementById('testConnectionBtn');
        
        statusEl.innerHTML = '<span style="color: #6b7280;">🔄 Testing connection...</span>';
        testBtn.disabled = true;
        testBtn.textContent = '🔄 Testing...';

        // Temporarily save current form values for testing
        const tempServerUrl = document.getElementById('elabftwServer').value.trim();
        const tempApiKey = document.getElementById('elabftwApiKey').value.trim();
        
        const originalServerUrl = this.get('elabftw.server_url');
        const originalApiKey = this.get('elabftw.api_key');
        
        this.set('elabftw.server_url', tempServerUrl);
        this.set('elabftw.api_key', tempApiKey);

        try {
            const result = await this.testElabFTWConnection();

            if (result.success) {
                statusEl.innerHTML = `<span style="color: #10b981;">✅ ${result.message}</span>`;
                if (result.serverInfo) {
                    statusEl.innerHTML += `<br><small style="color: #6b7280;">Server version: ${result.serverInfo.elabftw_version || 'Unknown'}</small>`;
                }
            } else {
                statusEl.innerHTML = `<span style="color: #ef4444;">❌ ${result.message}</span>`;
            }
        } catch (error) {
            statusEl.innerHTML = `<span style="color: #ef4444;">❌ Unexpected error: ${error.message}</span>`;
        }

        // Restore original values
        this.set('elabftw.server_url', originalServerUrl || '');
        this.set('elabftw.api_key', originalApiKey || '');

        testBtn.disabled = false;
        testBtn.textContent = '🔍 Test Connection';
    },

    // Close settings modal
    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Show save message
    showSaveMessage(message) {
        let saveMessage = document.getElementById('settingsSaveMessage');
        if (!saveMessage) {
            saveMessage = document.createElement('div');
            saveMessage.id = 'settingsSaveMessage';
            saveMessage.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 500;
                animation: slideInRight 0.3s ease-out;
            `;
            document.body.appendChild(saveMessage);
        }
        
        saveMessage.textContent = message;
        saveMessage.style.display = 'block';
        
        setTimeout(() => {
            saveMessage.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 300);
        }, 3000);
    },

    // Setup event listeners
    setupEventListeners() {
        // Add settings button to main UI if not exists
        if (!document.getElementById('settingsButton')) {
            const headerButtons = document.querySelector('.sidebar .header');
            if (headerButtons) {
                const settingsBtn = document.createElement('button');
                settingsBtn.id = 'settingsButton';
                settingsBtn.className = 'btn btn-secondary';
                settingsBtn.innerHTML = '⚙️ Settings';
                settingsBtn.onclick = () => this.showSettings();
                settingsBtn.style.cssText = 'margin-top: 10px; width: 100%;';
                headerButtons.appendChild(settingsBtn);
            }
        }

        // Add CSS animations if not exist
        if (!document.getElementById('settingsAnimations')) {
            const style = document.createElement('style');
            style.id = 'settingsAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
};

// Make globally available
window.settingsManager = settingsManager;