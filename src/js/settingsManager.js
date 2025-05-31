// Settings Manager (Fixed with complete elabFTW integration)

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
        'elabftw.verify_ssl': true
    },

    // Initialize settings manager
    init() {
        console.log('🔧 Initializing settingsManager...');
        this.loadSettings();
        console.log('✅ settingsManager initialized');
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
        } catch (error) {
            console.warn('Error loading settings, using defaults:', error);
            this.settings = { ...this.defaultSettings };
        }
    },

    // Save settings to localStorage
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
    get(key) {
        return this.settings[key] !== undefined ? this.settings[key] : this.defaultSettings[key];
    },

    // Set setting value
    set(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        
        // Handle special settings that need immediate action
        this.handleSettingChange(key, value);
    },

    // Handle setting changes that need immediate action
    handleSettingChange(key, value) {
        switch (key) {
            case 'general.user_management_enabled':
                console.log('🔧 User management toggle changed:', value);
                // No immediate action needed - will take effect on next app start
                break;
                
            case 'general.theme':
                this.applyTheme(value);
                break;
                
            case 'elabftw.enabled':
                // Update elabFTW UI visibility
                if (window.updateElabFTWOptions) {
                    window.updateElabFTWOptions();
                }
                break;
                
            case 'elabftw.auto_sync':
                // Update elabFTW UI state
                if (window.updateElabFTWOptions) {
                    window.updateElabFTWOptions();
                }
                break;
        }
    },

    // Apply theme (if implemented)
    applyTheme(theme) {
        // Theme switching could be implemented here
        console.log('Theme changed to:', theme);
    },

    // Reset to defaults
    reset() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
    },

    // Get all settings
    getAll() {
        return { ...this.settings };
    },

    // Import settings from JSON
    import(settingsJson) {
        try {
            const imported = JSON.parse(settingsJson);
            this.settings = { ...this.defaultSettings, ...imported };
            this.saveSettings();
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    },

    // Export settings to JSON
    export() {
        return JSON.stringify(this.settings, null, 2);
    },

    // Check if user management is enabled
    isUserManagementEnabled() {
        return this.get('general.user_management_enabled') === true;
    },

    // Test elabFTW connection
    async testElabFTWConnection() {
        const serverUrl = this.get('elabftw.server_url');
        const apiKey = this.get('elabftw.api_key');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'Server URL and API key are required' };
        }

        try {
            const response = await fetch(`${serverUrl}/api/v2/users/me`, {
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

    // Create elabFTW experiment
    async createElabFTWExperiment(projectName, metadata, structure = '') {
        const serverUrl = this.get('elabftw.server_url');
        const apiKey = this.get('elabftw.api_key');
        const categoryId = this.get('elabftw.default_category');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW not configured' };
        }

        try {
            // Convert metadata to elabFTW format
            const elabftwData = this.convertToElabFTWFormat(metadata);
            
            // Create experiment body
            const experimentBody = this.generateExperimentBody(projectName, metadata, structure);
            
            const experimentData = {
                title: projectName,
                category: categoryId,
                body: experimentBody,
                ...elabftwData
            };

            console.log('Creating elabFTW experiment:', experimentData);

            const response = await fetch(`${serverUrl}/api/v2/experiments`, {
                method: 'POST',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(experimentData)
            });

            if (response.ok) {
                const result = await response.json();
                const experimentUrl = `${serverUrl}/experiments.php?mode=view&id=${result.id}`;
                
                return {
                    success: true,
                    message: `Experiment created in elabFTW (ID: ${result.id})`,
                    id: result.id,
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
                message: `Error creating elabFTW experiment: ${error.message}`
            };
        }
    },

    // Update existing elabFTW experiment
    async updateExistingElabFTWExperiment(experimentId, metadata) {
        const serverUrl = this.get('elabftw.server_url');
        const apiKey = this.get('elabftw.api_key');
        
        if (!serverUrl || !apiKey) {
            return { success: false, message: 'elabFTW not configured' };
        }

        try {
            // Convert metadata to elabFTW format
            const elabftwData = this.convertToElabFTWFormat(metadata);
            
            console.log('Updating elabFTW experiment:', experimentId, elabftwData);

            const response = await fetch(`${serverUrl}/api/v2/experiments/${experimentId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(elabftwData)
            });

            if (response.ok) {
                const experimentUrl = `${serverUrl}/experiments.php?mode=view&id=${experimentId}`;
                
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

    // Convert metadata to elabFTW format
    convertToElabFTWFormat(metadata) {
        const elabftwData = {
            extra_fields: {},
            elabftw: {
                display_main_text: true
            }
        };
        
        const groups = new Map();
        let groupIdCounter = 1;
        let positionCounter = 1;
        
        // First pass: identify groups
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            if (fieldInfo.type === 'group') {
                const groupId = groupIdCounter++;
                groups.set(key, {
                    id: groupId,
                    name: fieldInfo.label || key
                });
            }
        });
        
        // Add groups to elabftw.extra_fields_groups
        if (groups.size > 0) {
            elabftwData.elabftw.extra_fields_groups = [];
            groups.forEach(group => {
                elabftwData.elabftw.extra_fields_groups.push(group);
            });
        }
        
        // Second pass: convert fields
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            // Skip group headers
            if (fieldInfo.type === 'group') {
                return;
            }
            
            let safeValue = fieldInfo.value;
            
            const elabField = {
                type: this.mapFieldTypeToElabFTW(fieldInfo.type)
            };
            
            // Adjust value by type
            switch (fieldInfo.type) {
                case 'checkbox':
                    elabField.value = (safeValue === true || safeValue === 'true' || safeValue === 'on') ? "on" : "";
                    break;
                case 'number':
                    elabField.value = String(safeValue !== undefined && safeValue !== null && safeValue !== '' ? safeValue : 0);
                    break;
                default:
                    elabField.value = String(safeValue || '');
            }
            
            if (positionCounter > 1) {
                elabField.position = positionCounter;
            }
            positionCounter++;
            
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
            
            // Assign to group (if field belongs to a group)
            if (key.includes('.')) {
                const parts = key.split('.');
                const possibleGroupKey = parts[0] + '_group';
                
                if (groups.has(possibleGroupKey)) {
                    elabField.group_id = groups.get(possibleGroupKey).id;
                }
            }
            
            const fieldKey = fieldInfo.label || key;
            elabftwData.extra_fields[fieldKey] = elabField;
        });
        
        return elabftwData;
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

    // Generate experiment body for elabFTW
    generateExperimentBody(projectName, metadata, structure = '') {
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        let body = `<h1>${projectName}</h1>\n\n`;
        body += `<p><strong>Created:</strong> ${date}</p>\n\n`;
        
        // Add metadata summary
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
        
        // Add folder structure if present
        if (structure && structure.trim() !== '') {
            body += `<h2>Project Structure</h2>\n<pre>${structure}</pre>\n\n`;
        }
        
        // Add sections for documentation
        body += `<h2>Description</h2>\n<p><em>Add your project description here...</em></p>\n\n`;
        body += `<h2>Methodology</h2>\n<p><em>Describe your methodology here...</em></p>\n\n`;
        body += `<h2>Results</h2>\n<p><em>Document your results here...</em></p>\n\n`;
        body += `<h2>Notes</h2>\n<p><em>Add any additional notes here...</em></p>\n`;
        
        return body;
    }
};

window.settingsManager = settingsManager;
console.log('✅ settingsManager loaded (Fixed with complete elabFTW integration)');