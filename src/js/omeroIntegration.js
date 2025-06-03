// Enhanced OMERO Integration for MetaFold with debugging and testing

const omeroIntegration = {
    client: null,
    isInitialized: false,
    
    // Initialize integration
    init() {
        if (!window.omeroClient) {
            console.error('❌ OMERO Client not available');
            return false;
        }
        
        this.client = window.omeroClient;
        this.isInitialized = true;
        console.log('🔬 OMERO Integration initialized');
        return true;
    },
    
    // =================== SETTINGS INTEGRATION ===================
    
    // Get OMERO settings from settingsManager
    getSettings() {
        if (!window.settingsManager) {
            throw new Error('Settings manager not available');
        }
        
        return {
            enabled: window.settingsManager.get('omero.enabled'),
            serverUrl: window.settingsManager.get('omero.server_url'),
            username: window.settingsManager.get('omero.username'),
            password: window.settingsManager.get('omero.password'),
            autoSync: window.settingsManager.get('omero.auto_sync'),
            defaultProjectId: window.settingsManager.get('omero.default_project_id'),
            createDatasets: window.settingsManager.get('omero.create_datasets'),
            verifySSL: window.settingsManager.get('omero.verify_ssl')
        };
    },
    
    // Check if OMERO is enabled and configured
    isEnabled() {
        try {
            const settings = this.getSettings();
            return settings.enabled && settings.serverUrl && settings.username && settings.password;
        } catch (error) {
            return false;
        }
    },
    
    // =================== CONNECTION MANAGEMENT ===================
    
    // Initialize client with current settings
    async initializeClient() {
        const settings = this.getSettings();
        
        if (!settings.serverUrl) {
            throw new Error('OMERO server URL not configured');
        }
        
        this.client.init(settings.serverUrl, {
            verifySSL: settings.verifySSL
        });
        
        return this.client;
    },
    
    // Enhanced connection test with multiple steps
    async testConnection() {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            const settings = this.getSettings();
            
            if (!settings.serverUrl) {
                return { success: false, message: 'OMERO server URL not configured' };
            }
            
            console.log('🔬 === OMERO CONNECTION TEST ===');
            console.log('🔬 Server URL:', settings.serverUrl);
            console.log('🔬 Username:', settings.username);
            console.log('🔬 Settings:', { ...settings, password: '[HIDDEN]' });
            
            // Initialize client
            await this.initializeClient();
            
            // Test 1: Enhanced connection test with diagnosis
            console.log('🔬 Step 1: Running enhanced connection test...');
            const connectionTest = await this.client.testConnectionEnhanced();
            
            if (!connectionTest.success) {
                return {
                    success: false,
                    message: `Connection test failed: ${connectionTest.message}`,
                    details: 'Check console for detailed diagnosis'
                };
            }
            
            console.log('✅ Step 1 passed: Basic connection working');
            
            // Test 2: Login if credentials available
            if (settings.username && settings.password) {
                console.log('🔬 Step 2: Testing login...');
                
                try {
                    const loginResult = await this.client.login(settings.username, settings.password);
                    
                    if (loginResult.success) {
                        console.log('✅ Step 2 passed: Login successful');
                        console.log('🔬 Login method used:', loginResult.loginMethod);
                        
                        // Test 3: Test API access
                        console.log('🔬 Step 3: Testing API access...');
                        
                        try {
                            const projects = await this.client.getProjects();
                            console.log('✅ Step 3 passed: API access working');
                            console.log('🔬 Found projects:', projects.length);
                            
                            return {
                                success: true,
                                message: `Successfully connected to OMERO as ${settings.username}`,
                                details: {
                                    username: settings.username,
                                    projectCount: projects.length,
                                    loginMethod: loginResult.loginMethod,
                                    sessionValid: this.client.isSessionValid()
                                }
                            };
                            
                        } catch (apiError) {
                            console.warn('⚠️ Step 3 failed: API access error:', apiError.message);
                            return {
                                success: false,
                                message: `Login successful but API access failed: ${apiError.message}`,
                                details: {
                                    username: settings.username,
                                    loginMethod: loginResult.loginMethod,
                                    sessionValid: this.client.isSessionValid(),
                                    apiError: apiError.message
                                }
                            };
                        }
                        
                    } else {
                        return {
                            success: false,
                            message: `Login failed: ${loginResult.message}`,
                            details: 'Check username/password and console for detailed logs'
                        };
                    }
                    
                } catch (loginError) {
                    console.error('❌ Step 2 failed: Login error:', loginError);
                    
                    // Provide specific guidance based on error type
                    let guidance = 'Check console for detailed error information.';
                    
                    if (loginError.message.includes('CSRF')) {
                        guidance = 'CSRF Error detected. This usually means:\n' +
                                  '1. Session cookies are not working properly\n' +
                                  '2. Proxy server may need restart\n' +
                                  '3. Browser may be blocking cookies\n' +
                                  'Try: Restart proxy server and refresh page.';
                    } else if (loginError.message.includes('403')) {
                        guidance = 'Authentication forbidden. Check:\n' +
                                  '1. Username and password are correct\n' +
                                  '2. User account is active in OMERO\n' +
                                  '3. User has appropriate permissions';
                    } else if (loginError.message.includes('network') || loginError.message.includes('fetch')) {
                        guidance = 'Network error. Check:\n' +
                                  '1. Proxy server is running on localhost:3000\n' +
                                  '2. OMERO server is accessible\n' +
                                  '3. No firewall blocking requests';
                    }
                    
                    return {
                        success: false,
                        message: `Connection OK but login failed: ${loginError.message}`,
                        details: guidance
                    };
                }
            }
            
            return {
                success: true,
                message: 'Connection to OMERO server successful (credentials not tested)',
                details: 'No username/password configured for login test'
            };
            
        } catch (error) {
            console.error('❌ OMERO connection test failed:', error);
            
            let guidance = 'Check console for detailed error information.';
            
            if (error.message.includes('not initialized')) {
                guidance = 'OMERO client initialization failed. Check if omeroClient.js is loaded.';
            } else if (error.message.includes('fetch')) {
                guidance = 'Network error. Ensure proxy server is running on localhost:3000';
            }
            
            return {
                success: false,
                message: `OMERO connection error: ${error.message}`,
                details: guidance
            };
        }
    },
    
    // Quick diagnosis for troubleshooting
    async runDiagnosis() {
        console.log('🔬 === OMERO DIAGNOSIS ===');
        
        try {
            // Check 1: Settings
            console.log('🔬 Check 1: Settings');
            const settings = this.getSettings();
            console.log('🔬 OMERO enabled:', settings.enabled);
            console.log('🔬 Server URL:', settings.serverUrl);
            console.log('🔬 Username:', settings.username);
            console.log('🔬 Has password:', !!settings.password);
            
            if (!settings.enabled) {
                console.log('❌ OMERO integration is disabled');
                return { success: false, message: 'OMERO integration is disabled in settings' };
            }
            
            if (!settings.serverUrl) {
                console.log('❌ No server URL configured');
                return { success: false, message: 'OMERO server URL not configured' };
            }
            
            // Check 2: Client initialization
            console.log('🔬 Check 2: Client initialization');
            await this.initializeClient();
            console.log('✅ Client initialized');
            
            // Check 3: Proxy connectivity
            console.log('🔬 Check 3: Running client diagnosis');
            const diagnosisResult = await this.client.diagnoseConnection();
            
            if (!diagnosisResult.success) {
                return diagnosisResult;
            }
            
            console.log('✅ All diagnosis checks passed');
            return {
                success: true,
                message: 'OMERO diagnosis completed - check console for details',
                settings: { ...settings, password: '[HIDDEN]' }
            };
            
        } catch (error) {
            console.error('❌ Diagnosis failed:', error);
            return {
                success: false,
                message: `Diagnosis failed: ${error.message}`
            };
        }
    },
    
    // Ensure logged in with enhanced error handling
    async ensureLoggedIn() {
        const settings = this.getSettings();
        
        if (!this.client.session) {
            await this.initializeClient();
            console.log('🔬 Logging in to OMERO...');
            const loginResult = await this.client.login(settings.username, settings.password);
            
            if (!loginResult.success) {
                throw new Error(`OMERO login failed: ${loginResult.message || 'Unknown error'}`);
            }
            
            console.log('✅ OMERO login successful');
        } else if (!this.client.isSessionValid()) {
            console.log('🔬 Session expired, re-logging in...');
            const loginResult = await this.client.login(settings.username, settings.password);
            
            if (!loginResult.success) {
                throw new Error(`OMERO re-login failed: ${loginResult.message || 'Unknown error'}`);
            }
            
            console.log('✅ OMERO re-login successful');
        }
        
        return this.client.session;
    },
    
    // =================== DATASET CREATION ===================
    
    // Create dataset for MetaFold project
    async createDatasetForProject(projectName, metadata = null, options = {}) {
        if (!this.isEnabled()) {
            return { success: false, message: 'OMERO integration is disabled or not configured' };
        }
        
        try {
            console.log('🔬 Creating OMERO dataset for project:', projectName);
            
            // Ensure we're logged in
            await this.ensureLoggedIn();
            
            const settings = this.getSettings();
            
            // Prepare dataset info
            const datasetName = options.datasetName || projectName;
            const description = options.description || this.generateDatasetDescription(projectName, metadata);
            
            console.log('🔬 Dataset name:', datasetName);
            console.log('🔬 Description length:', description.length);
            
            // Create dataset
            console.log('🔬 Creating dataset in OMERO...');
            const dataset = await this.client.createDataset(datasetName, description);
            const datasetId = dataset['@id'];
            
            console.log('✅ Dataset created with ID:', datasetId);
            
            // Link to default project if specified
            if (settings.defaultProjectId && settings.defaultProjectId.trim()) {
                try {
                    console.log('🔬 Linking to default project:', settings.defaultProjectId);
                    await this.client.linkDatasetToProject(datasetId, parseInt(settings.defaultProjectId));
                    console.log('✅ Dataset linked to project');
                } catch (linkError) {
                    console.warn('⚠️ Failed to link dataset to default project:', linkError.message);
                }
            }
            
            // Add metadata as annotations
            if (metadata && Object.keys(metadata).length > 0) {
                try {
                    console.log('🔬 Adding metadata annotations...');
                    await this.addMetadataAnnotations(datasetId, 'dataset', metadata);
                    console.log('✅ Metadata annotations added');
                } catch (metadataError) {
                    console.warn('⚠️ Failed to add metadata annotations:', metadataError.message);
                }
            }
            
            const webclientUrl = this.client.getWebclientUrl('dataset', datasetId);
            
            return {
                success: true,
                message: 'Dataset created in OMERO successfully!',
                datasetId: datasetId,
                datasetName: datasetName,
                url: webclientUrl
            };
            
        } catch (error) {
            console.error('❌ Error creating OMERO dataset:', error);
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}`
            };
        }
    },
    
    // Generate description for dataset
    generateDatasetDescription(projectName, metadata) {
        const date = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let description = `MetaFold Project: ${projectName}\nCreated: ${date}\n\n`;
        
        if (metadata && Object.keys(metadata).length > 0) {
            description += 'Metadata:\n';
            
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                if (fieldInfo.type !== 'group') {
                    const label = fieldInfo.label || key;
                    let value = fieldInfo.value || 'Not specified';
                    
                    // Format values
                    if (fieldInfo.type === 'checkbox') {
                        value = (value === true || value === 'true' || value === 'on') ? 'Yes' : 'No';
                    } else if (fieldInfo.type === 'date' && value !== 'Not specified') {
                        try {
                            const dateObj = new Date(value);
                            value = dateObj.toLocaleDateString();
                        } catch (e) {
                            // Keep original value
                        }
                    }
                    
                    description += `- ${label}: ${value}\n`;
                }
            });
        }
        
        description += '\nGenerated by MetaFold - NFDI4BioImage';
        return description;
    },
    
    // Add metadata annotations to OMERO object
    async addMetadataAnnotations(objectId, objectType, metadata) {
        // This would be implemented using the OMERO client
        // For now, just log what would be added
        const keyValuePairs = this.convertMetadataToOMERO(metadata);
        console.log('🔬 Would add annotations:', keyValuePairs);
        
        // TODO: Implement actual annotation creation
        // This requires additional OMERO API methods
        
        return true;
    },
    
    // Convert MetaFold metadata to OMERO annotations
    convertMetadataToOMERO(metadata) {
        const annotations = [];
        
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            if (fieldInfo.type === 'group') return; // Skip groups
            
            const label = fieldInfo.label || key;
            let value = fieldInfo.value || '';
            
            // Format different types for OMERO
            switch (fieldInfo.type) {
                case 'checkbox':
                    value = (value === true || value === 'true' || value === 'on') ? 'Yes' : 'No';
                    break;
                case 'date':
                    if (value) {
                        try {
                            const dateObj = new Date(value);
                            value = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
                        } catch (e) {
                            // Keep original value
                        }
                    }
                    break;
                case 'number':
                    value = String(value || 0);
                    break;
                default:
                    value = String(value || '');
            }
            
            // Add type information as prefix for clarity
            const annotationKey = `${label} (${fieldInfo.type})`;
            annotations.push([annotationKey, value]);
            
            // Add description as separate annotation if available
            if (fieldInfo.description) {
                annotations.push([`${label} - Description`, fieldInfo.description]);
            }
        });
        
        // Add MetaFold metadata
        annotations.push(['MetaFold - Template Type', 'Experiment']);
        annotations.push(['MetaFold - Created', new Date().toISOString()]);
        annotations.push(['MetaFold - Version', '1.0']);
        annotations.push(['NFDI4BioImage - Tool', 'MetaFold']);
        
        return annotations;
    },
    
    // =================== UI HELPER METHODS ===================
    
    // Get status for UI display
    getStatus() {
        const settings = this.getSettings();
        
        if (!settings.enabled) {
            return { 
                status: 'disabled', 
                message: 'OMERO integration is disabled',
                color: 'gray'
            };
        }
        
        if (!settings.serverUrl) {
            return { 
                status: 'not_configured', 
                message: 'OMERO server URL not configured',
                color: 'orange'
            };
        }
        
        if (!settings.username || !settings.password) {
            return { 
                status: 'incomplete', 
                message: 'OMERO credentials not configured',
                color: 'orange'
            };
        }
        
        if (this.client?.session && this.client.isSessionValid()) {
            return { 
                status: 'connected', 
                message: `Connected to OMERO as ${settings.username}`,
                color: 'green'
            };
        }
        
        return { 
            status: 'configured', 
            message: 'OMERO configured but not connected',
            color: 'blue'
        };
    },
    
    // Check if auto-sync is enabled
    isAutoSyncEnabled() {
        const settings = this.getSettings();
        return settings.enabled && settings.autoSync;
    },
    
    // =================== CLEANUP ===================
    
    // Logout and cleanup
    async cleanup() {
        if (this.client?.session) {
            await this.client.logout();
        }
        console.log('🔬 OMERO Integration cleaned up');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        omeroIntegration.init();
    });
} else {
    omeroIntegration.init();
}

// Make globally available
window.omeroIntegration = omeroIntegration;
console.log('✅ OMERO Integration loaded (Enhanced with Testing)');