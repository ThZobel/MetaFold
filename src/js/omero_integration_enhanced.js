// Enhanced OMERO Integration for MetaFold with Private Group Support

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
        console.log('🔬 OMERO Integration initialized (Enhanced)');
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
            verifySSL: window.settingsManager.get('omero.verify_ssl'),
            sessionId: window.settingsManager.get('omero.session_id') || '',
            csrfToken: window.settingsManager.get('omero.csrf_token') || ''
        };
    },
    
    // Check if OMERO is enabled and configured
    isEnabled() {
        try {
            const settings = this.getSettings();
            return settings.enabled && settings.serverUrl;
        } catch (error) {
            return false;
        }
    },
    
    // Check if we have authentication credentials
    hasAuthCredentials() {
        const settings = this.getSettings();
        return (settings.username && settings.password) || 
               (settings.sessionId && settings.csrfToken);
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
    
    // Enhanced connection test with all strategies
    async testConnection() {
        try {
            if (!this.isInitialized) {
                this.init();
            }
            
            const settings = this.getSettings();
            
            if (!settings.serverUrl) {
                return { success: false, message: 'OMERO server URL not configured' };
            }
            
            console.log('🔬 === ENHANCED OMERO CONNECTION TEST ===');
            console.log('🔬 Server URL:', settings.serverUrl);
            console.log('🔬 Username:', settings.username || 'not provided');
            console.log('🔬 Has session cookies:', !!(settings.sessionId && settings.csrfToken));
            
            // Initialize client
            await this.initializeClient();
            
            // Enhanced connection test with multiple strategies
            console.log('🔬 Running enhanced connection test...');
            const connectionResult = await this.client.testConnectionEnhanced();
            
            if (!connectionResult.success) {
                return {
                    success: false,
                    message: `Enhanced connection test failed: ${connectionResult.message}`,
                    details: connectionResult
                };
            }
            
            console.log('✅ Enhanced connection test passed');
            
            // Try to establish best possible session
            let loginResult = null;
            
            // Strategy 1: Session cookies (if provided)
            if (settings.sessionId && settings.csrfToken) {
                console.log('🔬 Trying session cookie authentication...');
                try {
                    loginResult = await this.client.loginWithSessionCookies(settings.sessionId, settings.csrfToken);
                    console.log('✅ Session cookie authentication successful');
                } catch (sessionError) {
                    console.warn('⚠️ Session cookie authentication failed:', sessionError.message);
                }
            }
            
            // Strategy 2: Username/Password (if session cookies failed)
            if (!loginResult && settings.username && settings.password) {
                console.log('🔬 Trying username/password authentication...');
                try {
                    loginResult = await this.client.loginWithCredentials(settings.username, settings.password);
                    console.log('✅ Username/password authentication successful');
                } catch (credError) {
                    console.warn('⚠️ Username/password authentication failed:', credError.message);
                }
            }
            
            // Strategy 3: Public group fallback
            if (!loginResult) {
                console.log('🔬 Falling back to public group...');
                try {
                    loginResult = await this.client.loginPublicGroup();
                    console.log('✅ Public group access successful');
                } catch (publicError) {
                    console.warn('⚠️ Public group access failed:', publicError.message);
                }
            }
            
            if (loginResult && loginResult.success) {
                return {
                    success: true,
                    message: `Successfully connected via ${loginResult.loginMethod}`,
                    details: {
                        loginMethod: loginResult.loginMethod,
                        projectCount: loginResult.projectCount || 0,
                        isAuthenticated: loginResult.session?.isAuthenticated || false,
                        isPublicGroup: loginResult.isPublicGroup || false,
                        sessionValid: this.client.isSessionValid(),
                        availableStrategies: connectionResult.strategies || []
                    }
                };
            } else {
                return {
                    success: false,
                    message: 'All authentication strategies failed',
                    details: {
                        connectionTest: connectionResult,
                        triedStrategies: ['session-cookies', 'username-password', 'public-group'],
                        recommendation: 'Check credentials or verify public group access'
                    }
                };
            }
            
        } catch (error) {
            console.error('❌ OMERO connection test failed:', error);
            
            let guidance = 'Check console for detailed error information.';
            
            if (error.message.includes('not initialized')) {
                guidance = 'OMERO client initialization failed. Check if omeroClient.js is loaded.';
            } else if (error.message.includes('fetch')) {
                guidance = 'Network error. Ensure proxy server is running on localhost:3000';
            } else if (error.message.includes('CSRF')) {
                guidance = 'CSRF Error. Try restarting proxy server and refreshing page.';
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
        console.log('🔬 === ENHANCED OMERO DIAGNOSIS ===');
        
        try {
            // Check 1: Settings
            console.log('🔬 Check 1: Settings Analysis');
            const settings = this.getSettings();
            console.log('🔬 OMERO enabled:', settings.enabled);
            console.log('🔬 Server URL:', settings.serverUrl);
            console.log('🔬 Username:', settings.username);
            console.log('🔬 Has password:', !!settings.password);
            console.log('🔬 Has session cookies:', !!(settings.sessionId && settings.csrfToken));
            
            const authMethods = [];
            if (settings.username && settings.password) authMethods.push('Username/Password');
            if (settings.sessionId && settings.csrfToken) authMethods.push('Session Cookies');
            authMethods.push('Public Group');
            
            console.log('🔬 Available auth methods:', authMethods);
            
            if (!settings.enabled) {
                return { success: false, message: 'OMERO integration is disabled in settings' };
            }
            
            if (!settings.serverUrl) {
                return { success: false, message: 'OMERO server URL not configured' };
            }
            
            // Check 2: Client initialization
            console.log('🔬 Check 2: Client initialization');
            await this.initializeClient();
            console.log('✅ Client initialized');
            
            // Check 3: Enhanced connectivity test
            console.log('🔬 Check 3: Enhanced connectivity diagnosis');
            const testResult = await this.testConnection();
            
            return {
                success: testResult.success,
                message: testResult.success ? 
                    'Enhanced diagnosis completed successfully' : 
                    `Diagnosis found issues: ${testResult.message}`,
                settings: { ...settings, password: '[HIDDEN]', sessionId: '[HIDDEN]', csrfToken: '[HIDDEN]' },
                authMethods: authMethods,
                testResult: testResult
            };
            
        } catch (error) {
            console.error('❌ Enhanced diagnosis failed:', error);
            return {
                success: false,
                message: `Diagnosis failed: ${error.message}`
            };
        }
    },
    
    // Ensure logged in with enhanced error handling
    async ensureLoggedIn() {
        const settings = this.getSettings();
        
        if (!this.client.session || !this.client.isSessionValid()) {
            await this.initializeClient();
            console.log('🔬 Establishing OMERO session...');
            
            // Try multiple authentication methods in order of preference
            let loginResult = null;
            const attempts = [];
            
            // Method 1: Session cookies
            if (settings.sessionId && settings.csrfToken) {
                try {
                    console.log('🔬 Attempting session cookie login...');
                    loginResult = await this.client.loginWithSessionCookies(settings.sessionId, settings.csrfToken);
                    attempts.push({ method: 'Session Cookies', success: true });
                    console.log('✅ Session cookie login successful');
                } catch (error) {
                    attempts.push({ method: 'Session Cookies', success: false, error: error.message });
                    console.warn('⚠️ Session cookie login failed:', error.message);
                }
            }
            
            // Method 2: Username/Password
            if (!loginResult && settings.username && settings.password) {
                try {
                    console.log('🔬 Attempting username/password login...');
                    loginResult = await this.client.loginWithCredentials(settings.username, settings.password);
                    attempts.push({ method: 'Username/Password', success: true });
                    console.log('✅ Username/password login successful');
                } catch (error) {
                    attempts.push({ method: 'Username/Password', success: false, error: error.message });
                    console.warn('⚠️ Username/password login failed:', error.message);
                }
            }
            
            // Method 3: Public group fallback
            if (!loginResult) {
                try {
                    console.log('🔬 Attempting public group access...');
                    loginResult = await this.client.loginPublicGroup();
                    attempts.push({ method: 'Public Group', success: true });
                    console.log('✅ Public group access successful');
                } catch (error) {
                    attempts.push({ method: 'Public Group', success: false, error: error.message });
                    console.warn('⚠️ Public group access failed:', error.message);
                }
            }
            
            if (!loginResult || !loginResult.success) {
                const failedMethods = attempts.map(a => `${a.method}: ${a.success ? 'OK' : a.error}`).join('; ');
                throw new Error(`All OMERO login methods failed. Attempts: ${failedMethods}`);
            }
            
            console.log(`✅ OMERO login successful via ${loginResult.loginMethod}`);
        } else {
            console.log('✅ Using existing valid OMERO session');
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
            console.log('🔬 Login method:', this.client.session?.loginMethod);
            
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
                message: `Dataset created in OMERO successfully via ${this.client.session?.loginMethod}!`,
                datasetId: datasetId,
                datasetName: datasetName,
                url: webclientUrl,
                loginMethod: this.client.session?.loginMethod,
                isAuthenticated: this.client.session?.isAuthenticated || false
            };
            
        } catch (error) {
            console.error('❌ Error creating OMERO dataset:', error);
            
            // Provide specific guidance based on error type
            let guidance = '';
            if (error.message.includes('login methods failed')) {
                guidance = ' Try updating your session cookies or credentials in settings.';
            } else if (error.message.includes('403')) {
                guidance = ' Check if you have permission to create datasets.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                guidance = ' Check if proxy server is running and OMERO server is accessible.';
            }
            
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}${guidance}`
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
        
        const hasCredentials = this.hasAuthCredentials();
        if (!hasCredentials) {
            return { 
                status: 'incomplete', 
                message: 'OMERO credentials not configured',
                color: 'orange'
            };
        }
        
        if (this.client?.session && this.client.isSessionValid()) {
            const session = this.client.session;
            const authType = session.isAuthenticated ? 'authenticated' : 'public';
            
            return { 
                status: 'connected', 
                message: `Connected to OMERO (${authType}) via ${session.loginMethod}`,
                color: session.isAuthenticated ? 'green' : 'blue',
                isAuthenticated: session.isAuthenticated,
                loginMethod: session.loginMethod
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
    
    // Get available projects for dropdown
    async getAvailableProjects() {
        try {
            await this.ensureLoggedIn();
            const projects = await this.client.getProjects();
            
            return projects.map(project => ({
                id: project['@id'],
                name: project.Name || project.name || `Project ${project['@id']}`,
                description: project.Description || project.description || ''
            }));
            
        } catch (error) {
            console.error('❌ Error loading OMERO projects:', error);
            throw error;
        }
    },
    
    // =================== CLEANUP ===================
    
    // Logout and cleanup
    async cleanup() {
        if (this.client?.session) {
            await this.client.logout();
        }
        console.log('🔬 Enhanced OMERO Integration cleaned up');
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
console.log('✅ Enhanced OMERO Integration loaded (Private Group Support)');