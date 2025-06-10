// OMERO UI Integration Module - FIXED Settings Access
// Handles all UI interactions, dropdowns, status updates, and visual feedback

const omeroUIIntegration = {
    isInitialized: false,
    
    // Initialize UI Integration
    init() {
        if (!window.omeroAuth || !window.omeroAPI) {
            console.error('❌ OMERO UI Integration requires omeroAuth and omeroAPI modules');
            return false;
        }
        
        this.isInitialized = true;
        console.log('🔬 OMERO UI Integration initialized (FIXED Settings Access)');
        return true;
    },
    
    // =================== SETTINGS INTEGRATION ===================
    
    // Get OMERO settings from settingsManager - FIXED
    getSettings() {
        if (!window.settingsManager) {
            throw new Error('Settings manager not available');
        }
        
        // FIXED: Use individual get() calls instead of non-existent getSettings()
        return {
            enabled: window.settingsManager.get('omero.enabled'),
            serverUrl: window.settingsManager.get('omero.server_url'),
            username: window.settingsManager.get('omero.username'),
            password: window.settingsManager.get('omero.password'),
            autoSync: window.settingsManager.get('omero.auto_sync'),
            defaultProjectId: window.settingsManager.get('omero.default_project_id'),
            createDatasets: window.settingsManager.get('omero.create_datasets'),
            verifySSL: window.settingsManager.get('omero.verify_ssl'),
            sessionTimeout: window.settingsManager.get('omero.session_timeout')
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
        return settings.username && settings.password;
    },
    
    // =================== CONNECTION MANAGEMENT ===================
    
    // FIXED: Enhanced connection test with UI feedback
    async testConnection() {
        try {
            const settings = this.getSettings();
            
            if (!settings.serverUrl) {
                this.updateConnectionStatus('error', 'OMERO server URL not configured');
                return { 
                    success: false, 
                    message: 'OMERO server URL not configured',
                    details: { needsConfiguration: true }
                };
            }
            
            console.log('🔬 === OMERO CONNECTION TEST (UI INTEGRATION FIXED) ===');
            
            // Update UI immediately to show testing state
            this.updateConnectionStatus('testing', 'Testing OMERO connection...');
            
            // Step 1: Check proxy server
            console.log('🔬 Step 1: Checking proxy server...');
            const proxyCheck = await this.checkProxyServer();
            if (!proxyCheck.running) {
                this.updateConnectionStatus('error', `Proxy server not running: ${proxyCheck.error}`);
                return {
                    success: false,
                    message: `Proxy server not running: ${proxyCheck.error}`,
                    details: { 
                        proxyError: true, 
                        recommendation: 'Please start omero_proxy.py on localhost:3000' 
                    }
                };
            }
            
            // Step 2: Initialize client
            console.log('🔬 Step 2: Initializing client via proxy...');
            await this.initializeClient();
            
            // Step 3: Test connection using FIXED function call
            console.log('🔬 Step 3: Testing OMERO connection via proxy...');
            
            // FIXED: Use testConnectionEnhanced from omeroAPI instead of omeroAuth
            const connectionResult = await window.omeroAPI.testConnectionEnhanced();
            
            if (!connectionResult.success) {
                this.updateConnectionStatus('error', `Connection test failed: ${connectionResult.message}`);
                return {
                    success: false,
                    message: `Proxy connection test failed: ${connectionResult.message}`,
                    details: connectionResult
                };
            }
            
            // Step 4: Try to establish session
            let loginResult = null;
            let authMethod = 'none';
            
            this.updateConnectionStatus('testing', 'Establishing OMERO session...');
            
            // Strategy 1: Username/Password
            if (settings.username && settings.password) {
                console.log('🔬 Step 4a: Trying username/password authentication...');
                try {
                    loginResult = await window.omeroAuth.loginWithCredentials(settings.username, settings.password);
                    authMethod = 'Username/Password';
                    console.log('✅ Username/password authentication successful');
                } catch (credError) {
                    console.warn('⚠️ Username/password authentication failed:', credError.message);
                }
            }
            
            // Strategy 2: Public group fallback
            if (!loginResult) {
                console.log('🔬 Step 4b: Trying public group access...');
                try {
                    loginResult = await window.omeroAuth.loginPublicGroup();
                    authMethod = 'Public Group';
                    console.log('✅ Public group access successful');
                } catch (publicError) {
                    console.warn('⚠️ Public group access failed:', publicError.message);
                }
            }
            
            // Update visual status based on results
            if (loginResult && loginResult.success) {
                const statusMessage = `Connected via ${authMethod} (${loginResult.projectCount || 0} projects)`;
                this.updateConnectionStatus('connected', statusMessage, {
                    authMethod: authMethod,
                    projectCount: loginResult.projectCount || 0,
                    isAuthenticated: loginResult.session?.isAuthenticated || false,
                    isPublicGroup: loginResult.isPublicGroup || false
                });
                
                return {
                    success: true,
                    message: `Successfully connected via proxy to ${settings.serverUrl} using ${loginResult.loginMethod}`,
                    details: {
                        proxyUrl: this.getProxyUrl(),
                        targetServer: settings.serverUrl,
                        loginMethod: loginResult.loginMethod,
                        authMethod: authMethod,
                        projectCount: loginResult.projectCount || 0,
                        isAuthenticated: loginResult.session?.isAuthenticated || false,
                        isPublicGroup: loginResult.isPublicGroup || false,
                        sessionValid: window.omeroAuth.isSessionValid()
                    }
                };
            } else {
                this.updateConnectionStatus('error', 'All authentication strategies failed');
                return {
                    success: false,
                    message: 'All authentication strategies failed via proxy',
                    details: {
                        proxyUrl: this.getProxyUrl(),
                        targetServer: settings.serverUrl,
                        connectionTest: connectionResult,
                        triedStrategies: ['username-password', 'public-group'],
                        recommendation: 'Check credentials or verify public group access'
                    }
                };
            }
            
        } catch (error) {
            console.error('❌ OMERO connection test failed:', error);
            
            let guidance = 'Check console for detailed error information.';
            if (error.message.includes('Proxy server not running')) {
                guidance = 'Start the proxy server with: python omero_proxy.py';
            } else if (error.message.includes('not initialized')) {
                guidance = 'OMERO client initialization failed. Check if omeroAuth.js is loaded.';
            } else if (error.message.includes('fetch')) {
                guidance = 'Network error. Ensure proxy server is running on localhost:3000';
            }
            
            this.updateConnectionStatus('error', `Connection error: ${error.message}`);
            
            return {
                success: false,
                message: `OMERO connection error: ${error.message}`,
                details: { error: error.message, guidance: guidance }
            };
        }
    },
    
    // Get proxy URL for OMERO server access
    getProxyUrl() {
        return 'http://localhost:3000/omero-api';
    },
    
    // Check if proxy server is running
    async checkProxyServer() {
        try {
            const response = await fetch('http://localhost:3000/proxy-status', {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const status = await response.json();
                console.log('🔬 Proxy server status:', status);
                return {
                    running: true,
                    status: status
                };
            } else {
                return {
                    running: false,
                    error: `Proxy server responded with status ${response.status}`
                };
            }
        } catch (error) {
            return {
                running: false,
                error: `Cannot connect to proxy server: ${error.message}`
            };
        }
    },
    
    // Initialize client with proxy URL
    async initializeClient() {
        const settings = this.getSettings();
        
        if (!settings.serverUrl) {
            throw new Error('OMERO server URL not configured in settings');
        }
        
        // Check proxy server first
        const proxyCheck = await this.checkProxyServer();
        if (!proxyCheck.running) {
            throw new Error(`Proxy server not running: ${proxyCheck.error}. Please start omero_proxy.py`);
        }
        
        // Initialize client with PROXY URL
        const proxyUrl = this.getProxyUrl();
        console.log('🔬 Initializing OMERO client via proxy:', proxyUrl);
        console.log('🔬 Target OMERO server (via proxy):', settings.serverUrl);
        
        window.omeroAuth.init(proxyUrl, {
            verifySSL: settings.verifySSL
        });
        
        return window.omeroAuth;
    },
    
    // =================== VISUAL STATUS UPDATES ===================
    
    // Update connection status with visual feedback
    updateConnectionStatus(status, message, details = {}) {
        // Update status icon and text
        const statusIcon = document.getElementById('omeroStatusIcon');
        const statusText = document.getElementById('omeroStatusText');
        
        if (statusIcon && statusText) {
            switch (status) {
                case 'testing':
                    statusIcon.textContent = '🔄';
                    statusText.textContent = message;
                    statusText.style.color = '#0369a1';
                    break;
                case 'connected':
                    statusIcon.textContent = details.isAuthenticated ? '🔐' : '🌐';
                    statusText.textContent = message;
                    statusText.style.color = '#059669';
                    break;
                case 'error':
                    statusIcon.textContent = '❌';
                    statusText.textContent = message;
                    statusText.style.color = '#dc2626';
                    break;
                case 'disabled':
                    statusIcon.textContent = '⚫';
                    statusText.textContent = 'OMERO: Disabled';
                    statusText.style.color = '#6b7280';
                    break;
                default:
                    statusIcon.textContent = '❓';
                    statusText.textContent = message || 'OMERO: Unknown status';
                    statusText.style.color = '#6b7280';
            }
        }
    },
    
    // Get status for UI display
    getStatus() {
        const settings = this.getSettings();
        
        if (!settings.enabled) {
            return { 
                status: 'disabled', 
                message: 'OMERO integration is disabled',
                icon: '⚫',
                color: '#6b7280'
            };
        }
        
        if (!settings.serverUrl) {
            return { 
                status: 'not_configured', 
                message: 'OMERO server URL not configured',
                icon: '⚠️',
                color: '#f59e0b'
            };
        }
        
        const hasCredentials = this.hasAuthCredentials();
        if (!hasCredentials) {
            return { 
                status: 'incomplete', 
                message: 'OMERO credentials not configured',
                icon: '❓',
                color: '#f59e0b'
            };
        }
        
        if (window.omeroAuth?.session && window.omeroAuth.isSessionValid()) {
            const session = window.omeroAuth.session;
            const authType = session.isAuthenticated ? 'authenticated' : 'public';
            const icon = session.isAuthenticated ? '🔐' : '🌐';
            
            return { 
                status: 'connected', 
                message: `Connected to OMERO (${authType}) via proxy using ${session.loginMethod}`,
                icon: icon,
                color: session.isAuthenticated ? '#059669' : '#0369a1',
                details: {
                    isAuthenticated: session.isAuthenticated,
                    loginMethod: session.loginMethod,
                    proxyUrl: this.getProxyUrl(),
                    projectCount: session.projectCount || 0
                }
            };
        }
        
        return { 
            status: 'configured', 
            message: 'OMERO configured but not connected',
            icon: '🔬',
            color: '#0369a1'
        };
    },
    
    // Update status display (called from HTML)
    updateStatusDisplay() {
        const status = this.getStatus();
        this.updateConnectionStatus(status.status, status.message, status.details || {});
    },
    
    // =================== GROUP AND PROJECT DROPDOWNS ===================
    
    // Load groups for dropdown
    async loadGroupsForDropdown() {
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (!groupSelect || !window.omeroGroups) return;
        
        try {
            // Show loading
            groupSelect.innerHTML = '<option value="">Loading groups...</option>';
            
            console.log('🔬 Loading OMERO groups...');
            const groupData = await window.omeroGroups.getCurrentUserGroups();
            const groups = groupData.allGroups;
            
            // Clear and rebuild options
            groupSelect.innerHTML = '<option value="all">-- All Groups --</option>';
            
            // Add current group first (if available)
            if (groupData.currentGroupId) {
                const currentGroup = groups.find(g => g.id == groupData.currentGroupId);
                if (currentGroup) {
                    const option = document.createElement('option');
                    option.value = currentGroup.id;
                    option.textContent = `${currentGroup.name} (current)`;
                    option.selected = true;
                    groupSelect.appendChild(option);
                }
            }
            
            // Add other groups
            groups.forEach(group => {
                // Skip if already added as current
                if (group.id == groupData.currentGroupId) return;
                
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                if (group.description) {
                    option.title = group.description;
                }
                groupSelect.appendChild(option);
            });
            
            groupSelect.innerHTML += '<option value="refresh">🔄 Refresh group list</option>';
            
            console.log('✅ Groups loaded:', groups.length);
            
            // Auto-load projects for initially selected group
            const selectedGroupId = groupSelect.value;
            if (selectedGroupId && selectedGroupId !== 'refresh') {
                this.loadProjectsForGroup(selectedGroupId);
            }
            
        } catch (error) {
            console.error('❌ Error loading OMERO groups:', error);
            groupSelect.innerHTML = '<option value="">Error loading groups</option>';
            
            // Show error but still try to load all projects
            this.showGroupError('Could not load groups. Showing all projects.');
            this.loadProjectsForDropdown();
        }
    },
    
    // Load projects for specific group
    async loadProjectsForGroup(groupId) {
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (!projectSelect || !window.omeroProjects) return;
        
        try {
            projectSelect.innerHTML = '<option value="">Loading projects...</option>';
            
            console.log('🔬 Loading projects for group:', groupId);
            
            const projects = await window.omeroProjects.getProjectsForGroupEnhanced(groupId);
            
            projectSelect.innerHTML = '<option value="">-- Create standalone dataset --</option>';
            
            if (projects.length === 0) {
                projectSelect.innerHTML += '<option value="" disabled>No projects in this group</option>';
            } else {
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    
                    let displayText = project.name;
                    if (groupId === 'all' && project.groupName) {
                        displayText += ` (${project.groupName})`;
                    }
                    displayText += ` (ID: ${project.id})`;
                    
                    option.textContent = displayText;
                    if (project.description) {
                        option.title = project.description;
                    }
                    projectSelect.appendChild(option);
                });
            }
            
            projectSelect.innerHTML += '<option value="refresh">🔄 Refresh project list</option>';
            
            console.log('✅ Projects loaded for group:', projects.length);
            
        } catch (error) {
            console.error('❌ Error loading projects for group:', error);
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            this.showGroupError('Could not load projects for selected group.');
        }
    },
    
    // Handle group selection change
    handleGroupSelection() {
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (!groupSelect) return;
        
        const selectedGroupId = groupSelect.value;
        
        if (selectedGroupId === 'refresh') {
            // Refresh group list
            this.loadGroupsForDropdown();
        } else {
            // Load projects for selected group
            console.log('🔬 Group selected:', selectedGroupId);
            this.loadProjectsForGroup(selectedGroupId);
            
            // Update UI to show selected group
            this.updateGroupStatus(selectedGroupId);
        }
    },
    
    // Handle project selection
    handleProjectSelection() {
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (!projectSelect) return;
        
        if (projectSelect.value === 'refresh') {
            // Refresh project list for currently selected group
            const groupSelect = document.getElementById('omeroGroupSelect');
            const selectedGroupId = groupSelect?.value || 'all';
            
            console.log('🔬 Refreshing projects for group:', selectedGroupId);
            this.loadProjectsForGroup(selectedGroupId);
            
            // Reset project selection to default after refresh
            setTimeout(() => {
                if (projectSelect.querySelector('option[value=""]')) {
                    projectSelect.value = '';
                }
            }, 100);
        }
    },
    
    // Update group status display
    updateGroupStatus(groupId) {
        const statusElement = document.getElementById('omeroGroupStatus');
        if (statusElement) {
            if (groupId === 'all') {
                statusElement.textContent = 'Showing projects from all groups';
                statusElement.style.color = '#0369a1';
            } else if (groupId) {
                const groupSelect = document.getElementById('omeroGroupSelect');
                const selectedOption = groupSelect?.querySelector(`option[value="${groupId}"]`);
                const groupName = selectedOption?.textContent || 'Selected Group';
                
                statusElement.textContent = `Showing projects from: ${groupName}`;
                statusElement.style.color = '#059669';
            } else {
                statusElement.textContent = 'No group selected';
                statusElement.style.color = '#6b7280';
            }
        }
    },
    
    // Show group-related errors
    showGroupError(message) {
        const statusElement = document.getElementById('omeroGroupStatus');
        if (statusElement) {
            statusElement.textContent = `⚠️ ${message}`;
            statusElement.style.color = '#dc2626';
            
            // Auto-clear after 5 seconds
            setTimeout(() => {
                statusElement.textContent = '';
            }, 5000);
        }
    },
    
    // Load projects for dropdown (fallback)
    async loadProjectsForDropdown() {
        // Check if group selection is available
        const groupSelect = document.getElementById('omeroGroupSelect');
        
        if (groupSelect && groupSelect.value && groupSelect.value !== 'refresh') {
            // Use group-specific loading
            this.loadProjectsForGroup(groupSelect.value);
        } else {
            // Fallback to loading all projects
            this.loadProjectsForGroup('all');
        }
    },
    
    // =================== OPTIONS VISIBILITY MANAGEMENT ===================
    
    // Check if auto-sync is enabled
    isAutoSyncEnabled() {
        const settings = this.getSettings();
        return settings.enabled && settings.autoSync;
    },
    
    // Update OMERO options visibility based on settings and template type
    updateOptionsVisibility() {
        const omeroOption = document.getElementById('omeroOption');
        const omeroAutoInfo = document.getElementById('omeroAutoInfo');
        const omeroManualOption = document.getElementById('omeroManualOption');
        
        if (!omeroOption || !omeroAutoInfo || !omeroManualOption) return;
        
        const settings = this.getSettings();
        const enabled = settings.enabled;
        const autoSync = settings.autoSync;
        const isExperimentMode = window.templateTypeManager?.isExperimentMode() || false;
        
        if (enabled && isExperimentMode) {
            omeroOption.style.display = 'block';
            
            // Update status automatically
            this.updateStatusDisplay();
            
            if (autoSync) {
                omeroAutoInfo.style.display = 'block';
                omeroManualOption.style.display = 'none';
            } else {
                omeroAutoInfo.style.display = 'none';
                omeroManualOption.style.display = 'block';
            }
            
            // Load groups and projects if enabled
            this.loadGroupsForDropdown();
        } else {
            omeroOption.style.display = 'none';
        }
    },
    
    // =================== DATASET CREATION INTEGRATION ===================
    
    // Create dataset for MetaFold project (delegates to omeroDatasetCreation)
    async createDatasetForProject(projectName, metadata = null, options = {}) {
        if (!this.isEnabled()) {
            return { success: false, message: 'OMERO integration is disabled or not configured' };
        }
        
        if (!window.omeroDatasetCreation) {
            return { success: false, message: 'OMERO dataset creation module not available' };
        }
        
        try {
            console.log('🔬 omeroUIIntegration: Creating dataset for project:', projectName);
            console.log('🔬 omeroUIIntegration: Metadata fields:', metadata ? Object.keys(metadata).length : 0);
            console.log('🔬 omeroUIIntegration: Options:', options);
            
            // Ensure we're logged in first
            await this.ensureLoggedIn();
            
            // Delegate to dataset creation module
            const result = await window.omeroDatasetCreation.createDatasetForProject(projectName, metadata, options);
            
            console.log('🔬 omeroUIIntegration: Dataset creation result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ omeroUIIntegration: Error in createDatasetForProject:', error);
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}`
            };
        }
    },
    
    // Ensure logged in (uses omeroAuth)
    async ensureLoggedIn() {
        const settings = this.getSettings();
        
        if (!window.omeroAuth.session || !window.omeroAuth.isSessionValid()) {
            // Ensure proxy is running first
            const proxyCheck = await this.checkProxyServer();
            if (!proxyCheck.running) {
                throw new Error(`Proxy server not running: ${proxyCheck.error}. Please start omero_proxy.py`);
            }
            
            await this.initializeClient();
            console.log('🔬 Establishing OMERO session via proxy...');
            
            // Try multiple authentication methods
            let loginResult = null;
            const attempts = [];
            
            // Method 1: Username/Password
            if (settings.username && settings.password) {
                try {
                    console.log('🔬 Attempting username/password login...');
                    loginResult = await window.omeroAuth.loginWithCredentials(settings.username, settings.password);
                    attempts.push({ method: 'Username/Password', success: true });
                } catch (error) {
                    attempts.push({ method: 'Username/Password', success: false, error: error.message });
                }
            }
            
            // Method 2: Public group fallback
            if (!loginResult) {
                try {
                    console.log('🔬 Attempting public group access...');
                    loginResult = await window.omeroAuth.loginPublicGroup();
                    attempts.push({ method: 'Public Group', success: true });
                } catch (error) {
                    attempts.push({ method: 'Public Group', success: false, error: error.message });
                }
            }
            
            if (!loginResult || !loginResult.success) {
                const failedMethods = attempts.map(a => `${a.method}: ${a.success ? 'OK' : a.error}`).join('; ');
                throw new Error(`All OMERO login methods failed via proxy. Attempts: ${failedMethods}`);
            }
            
            console.log(`✅ OMERO login successful via proxy using ${loginResult.loginMethod}`);
        } else {
            console.log('✅ Using existing valid OMERO session');
        }
        
        return window.omeroAuth.session;
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        omeroUIIntegration.init();
    });
} else {
    omeroUIIntegration.init();
}

// Make globally available
window.omeroUIIntegration = omeroUIIntegration;

console.log('✅ OMERO UI Integration loaded (FIXED Settings Access)');