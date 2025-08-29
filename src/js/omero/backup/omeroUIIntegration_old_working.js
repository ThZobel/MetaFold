// OMERO UI Integration Module - FIXED für Async Secure Settings
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
        console.log('🔬 OMERO UI Integration initialized (ASYNC SECURE SETTINGS FIXED)');
        return true;
    },
    
    // =================== ASYNC SETTINGS INTEGRATION ===================
    
    // Get OMERO settings from settingsManager - FIXED für Async Secure Storage
    async getSettings() {
        if (!window.settingsManager) {
            throw new Error('Settings manager not available');
        }
        
        // FIXED: Alle secure settings müssen async abgerufen werden
        return {
            enabled: await window.settingsManager.get('omero.enabled'),
            serverUrl: await window.settingsManager.get('omero.server_url'),
            username: await window.settingsManager.get('omero.username'), // Async decryption
            password: await window.settingsManager.get('omero.password'), // Async decryption
            autoSync: await window.settingsManager.get('omero.auto_sync'),
            defaultProjectId: await window.settingsManager.get('omero.default_project_id'),
            createDatasets: await window.settingsManager.get('omero.create_datasets'),
            verifySSL: await window.settingsManager.get('omero.verify_ssl'),
            sessionTimeout: await window.settingsManager.get('omero.session_timeout')
        };
    },
    
    // Check if OMERO is enabled and configured - ASYNC
    async isEnabled() {
        try {
            const settings = await this.getSettings();
            return settings.enabled && settings.serverUrl;
        } catch (error) {
            console.error('🔬 Error checking OMERO enabled status:', error);
            return false;
        }
    },
    
    // Check if we have authentication credentials - ASYNC
    async hasAuthCredentials() {
        try {
            const settings = await this.getSettings();
            return settings.username && settings.password;
        } catch (error) {
            console.error('🔬 Error checking OMERO credentials:', error);
            return false;
        }
    },
    
    // =================== CONNECTION MANAGEMENT ===================
    
    // FIXED: Enhanced connection test mit async settings
    async testConnection() {
        try {
            const settings = await this.getSettings(); // ASYNC Settings laden
            
            if (!settings.serverUrl) {
                this.updateConnectionStatus('error', 'OMERO server URL not configured');
                return { 
                    success: false, 
                    message: 'OMERO server URL not configured',
                    details: { needsConfiguration: true }
                };
            }
            
            console.log('🔬 === OMERO CONNECTION TEST (ASYNC SECURE SETTINGS FIXED) ===');
            console.log('🔬 Settings loaded:', {
                serverUrl: settings.serverUrl,
                hasUsername: !!settings.username,
                hasPassword: !!settings.password,
                username: settings.username ? `${settings.username.substring(0, 4)}***` : 'none'
            });
            
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
            
            // Step 3: Test connection
            console.log('🔬 Step 3: Testing OMERO connection via proxy...');
            const connectionResult = await window.omeroAPI.testConnectionEnhanced();
            
            if (!connectionResult.success) {
                this.updateConnectionStatus('error', `Connection test failed: ${connectionResult.message}`);
                return {
                    success: false,
                    message: `Proxy connection test failed: ${connectionResult.message}`,
                    details: connectionResult
                };
            }
            
            // Step 4: Try to establish session mit korrekten credentials
            let loginResult = null;
            let authMethod = 'none';
            
            this.updateConnectionStatus('testing', 'Establishing OMERO session...');
            
            // Strategy 1: Username/Password mit KORREKT entschlüsselten Credentials
            if (settings.username && settings.password) {
                console.log('🔬 Step 4a: Trying username/password authentication...');
                console.log('🔬 Decrypted username:', settings.username);
                console.log('🔬 Has password:', !!settings.password);
                
                try {
                    // FIXED: Übergebe entschlüsselte Strings, nicht Promises/Objects
                    loginResult = await window.omeroAuth.loginWithCredentials(
                        settings.username,  // Bereits entschlüsselter String
                        settings.password   // Bereits entschlüsselter String  
                    );
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
    
    // Initialize client with proxy URL - ASYNC
    async initializeClient() {
        const settings = await this.getSettings(); // ASYNC Settings laden
        
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
    
    // Get status for UI display - ASYNC
    async getStatus() {
        try {
            const settings = await this.getSettings();
            
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
            
            const hasCredentials = await this.hasAuthCredentials();
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
        } catch (error) {
            console.error('🔬 Error getting OMERO status:', error);
            return {
                status: 'error',
                message: `Status error: ${error.message}`,
                icon: '❌',
                color: '#dc2626'
            };
        }
    },
    
    // Update status display (called from HTML) - ASYNC
    async updateStatusDisplay() {
        try {
            const status = await this.getStatus();
            this.updateConnectionStatus(status.status, status.message, status.details || {});
        } catch (error) {
            console.error('🔬 Error updating status display:', error);
            this.updateConnectionStatus('error', `Status update failed: ${error.message}`);
        }
    },
    
    // =================== GROUP AND PROJECT DROPDOWNS ===================
    

    // Load groups for dropdown - OPTIMIERT mit Caching
    async loadGroupsForDropdown() {
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (!groupSelect || !window.omeroGroups) return;
        
        try {
            // ✅ SHOW LOADING STATE
            groupSelect.innerHTML = '<option value="">Loading groups...</option>';
            
            console.log('🔬 Loading OMERO groups (with caching)...');
            
            // ✅ USE CACHE-OPTIMIZED LOADING
            const groupData = await window.omeroGroups.getCurrentUserGroups();
            const groups = groupData.allGroups;
            
            // ✅ BUILD DROPDOWN OPTIONS
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
            
            // ✅ ADD CACHE MANAGEMENT OPTIONS
            groupSelect.innerHTML += '<option value="refresh">🔄 Refresh group list</option>';
            
            console.log('✅ Groups loaded:', groups.length);
            
            // ✅ SHOW CACHE STATUS IN DEBUG
            if (window.omeroGroups.getCacheStatus) {
                const cacheStatus = window.omeroGroups.getCacheStatus();
                console.log('🔬 Cache status:', cacheStatus);
            }
            
            // ✅ AUTO-LOAD PROJECTS FOR INITIALLY SELECTED GROUP
            const selectedGroupId = groupSelect.value;
            if (selectedGroupId && selectedGroupId !== 'refresh') {
                this.loadProjectsForGroupCached(selectedGroupId);
            }
            
        } catch (error) {
            console.error('❌ Error loading OMERO groups:', error);
            groupSelect.innerHTML = '<option value="">Error loading groups</option>';
            
            // Show error but still try to load all projects
            this.showGroupError('Could not load groups. Showing all projects.');
            this.loadProjectsForGroupCached('all');
        }
    },


    
    // Load projects for specific group - OPTIMIERT mit Caching
    async loadProjectsForGroupCached(groupId) {
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (!projectSelect || !window.omeroGroups) return;
        
        try {
            // ✅ SHOW LOADING STATE
            projectSelect.innerHTML = '<option value="">Loading projects...</option>';
            
            // ✅ NEUE LOGIK: Echte Filterung implementieren
            console.log('🔬 Loading projects for group:', groupId, '(REAL FILTERING)');
            
            let projects = [];
            
            // ✅ KORREKTUR: Spezifische Gruppe verwenden statt "all"
            if (groupId && groupId !== 'all' && groupId !== '' && groupId !== 'refresh') {
                // Echte gruppenspezifische Filterung
                console.log('🔬 Filtering projects for group:', groupId);
                
                if (window.omeroGroups.getProjectsForGroupCached) {
                    projects = await window.omeroGroups.getProjectsForGroupCached(groupId);
                } else if (window.omeroProjects && window.omeroProjects.getProjectsForGroupEnhanced) {
                    projects = await window.omeroProjects.getProjectsForGroupEnhanced(groupId);
                }
                
                console.log(`✅ Found ${projects.length} projects for group ${groupId} (instead of loading all 1708)`);
                
            } else {
                // Nur bei expliziter "all" Auswahl alle Projects laden
                console.log('🔬 Loading ALL projects (group = "all")');
                
                if (window.omeroGroups.getProjectsForGroupCached) {
                    projects = await window.omeroGroups.getProjectsForGroupCached('all');
                } else if (window.omeroProjects && window.omeroProjects.getProjectsForGroupEnhanced) {
                    projects = await window.omeroProjects.getProjectsForGroupEnhanced('all');
                }
                
                console.log(`✅ Loaded ${projects.length} projects from all groups`);
            }
            
            // ✅ BUILD PROJECT OPTIONS mit "Select" Option
            projectSelect.innerHTML = '<option value="">-- Select project or create standalone dataset --</option>';
            
            if (projects.length === 0) {
                if (groupId && groupId !== 'all') {
                    projectSelect.innerHTML += '<option value="" disabled>No projects in this group</option>';
                } else {
                    projectSelect.innerHTML += '<option value="" disabled>No projects available</option>';
                }
            } else {
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    
                    let displayText = project.name;
                    // Nur bei "all" die Gruppe anzeigen
                    if (groupId === 'all' && project.groupName) {
                        displayText += ` (Group: ${project.groupName})`;
                    }
                    displayText += ` (ID: ${project.id})`;
                    
                    option.textContent = displayText;
                    if (project.description) {
                        option.title = project.description;
                    }
                    projectSelect.appendChild(option);
                });
            }
            
            // ✅ ADD REFRESH OPTION
            projectSelect.innerHTML += '<option value="refresh">🔄 Refresh project list</option>';
            
            // ✅ UPDATE GROUP STATUS
            this.updateGroupStatus(groupId);
            
        } catch (error) {
            console.error('❌ Error loading projects for group:', error);
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            this.showGroupError('Could not load projects for selected group.');
        }
    },

    // Alias for backward compatibility
    async loadProjectsForGroup(groupId) {
        return await this.loadProjectsForGroupCached(groupId);
    },

    // ✅ VERBESSERTE handleGroupSelection - löst echte Filterung aus
    handleGroupSelection() {
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (!groupSelect) return;
        
        const selectedGroupId = groupSelect.value;
        
        if (selectedGroupId === 'refresh') {
            // ✅ FORCE REFRESH WITH CACHE CLEARING
            console.log('🔬 Force refreshing groups...');
            if (window.omeroGroups.forceRefreshGroups) {
                window.omeroGroups.forceRefreshGroups().then(() => {
                    this.loadGroupsForDropdown();
                });
            } else {
                this.loadGroupsForDropdown();
            }
            
            // Reset selection after refresh
            setTimeout(() => {
                groupSelect.value = '';
            }, 100);
            
        } else {
            // ✅ KORREKTUR: Verwende echte Gruppen-ID statt "all"
            console.log('🔬 Group selected:', selectedGroupId);
            
            // Echte gruppenspezifische Filterung auslösen
            if (selectedGroupId && selectedGroupId !== '') {
                this.loadProjectsForGroupCached(selectedGroupId);
            } else {
                // Bei leerer Auswahl: Projects leeren
                const projectSelect = document.getElementById('omeroProjectSelect');
                if (projectSelect) {
                    projectSelect.innerHTML = '<option value="">-- Select a group first --</option>';
                }
            }
            
            // Update UI to show selected group
            this.updateGroupStatus(selectedGroupId);
        }
    },


    // Handle project selection - ERWEITERT für Cache-Management
    handleProjectSelection() {
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (!projectSelect) return;
        
        if (projectSelect.value === 'refresh') {
            // ✅ FORCE REFRESH PROJECTS FOR CURRENT GROUP
            const groupSelect = document.getElementById('omeroGroupSelect');
            const selectedGroupId = groupSelect?.value || 'all';
            
            console.log('🔬 Force refreshing projects for group:', selectedGroupId);
            
            if (window.omeroGroups.forceRefreshProjectsForGroup) {
                window.omeroGroups.forceRefreshProjectsForGroup(selectedGroupId).then((projects) => {
                    this.loadProjectsForGroupCached(selectedGroupId);
                });
            } else {
                this.loadProjectsForGroupCached(selectedGroupId);
            }
            
            // Reset project selection to default after refresh
            setTimeout(() => {
                if (projectSelect.querySelector('option[value=""]')) {
                    projectSelect.value = '';
                }
            }, 100);
        }
    },

    // Show cache status for debugging
    showCacheStatus() {
        if (!window.omeroGroups.getCacheStatus) return;
        
        const status = window.omeroGroups.getCacheStatus();
        console.log('🔬 === OMERO CACHE STATUS ===');
        console.log('Groups Cache:', status.groups);
        console.log('Projects Cache:', status.projects);
        console.log('Working Endpoint:', status.workingEndpoint);
        console.log('Cache Duration:', status.cacheDuration + 'ms');
        console.log('============================');
        
        return status;
    },
    
    // ✅ NEUE FUNKTION: updateGroupStatus - zeigt aktuellen Status
    updateGroupStatus(groupId) {
        const statusElement = document.getElementById('omeroGroupStatus');
        if (statusElement) {
            if (groupId && groupId !== '' && groupId !== 'all') {
                statusElement.textContent = `Selected group: ${groupId}`;
                statusElement.style.color = '#059669';
            } else if (groupId === 'all') {
                statusElement.textContent = 'Showing all groups';
                statusElement.style.color = '#6b7280';
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
    
    // Check if auto-sync is enabled - ASYNC
    async isAutoSyncEnabled() {
        try {
            const settings = await this.getSettings();
            return settings.enabled && settings.autoSync;
        } catch (error) {
            console.error('🔬 Error checking auto-sync status:', error);
            return false;
        }
    },
    
    // Update OMERO options visibility based on settings and template type - ASYNC
    async updateOptionsVisibility() {
        const omeroOption = document.getElementById('omeroOption');
        const omeroAutoInfo = document.getElementById('omeroAutoInfo');
        const omeroManualOption = document.getElementById('omeroManualOption');
        
        if (!omeroOption || !omeroAutoInfo || !omeroManualOption) return;
        
        try {
            const settings = await this.getSettings();
            const enabled = settings.enabled;
            const autoSync = settings.autoSync;
            const isExperimentMode = window.templateTypeManager?.isExperimentMode() || false;
            
            if (enabled && isExperimentMode) {
                omeroOption.style.display = 'block';
                
                // Update status automatically
                await this.updateStatusDisplay();
                
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
        } catch (error) {
            console.error('🔬 Error updating OMERO options visibility:', error);
            omeroOption.style.display = 'none';
        }
    },
    
    // =================== DATASET CREATION INTEGRATION ===================
    
    // Create dataset for MetaFold project (delegates to omeroDatasetCreation) - ASYNC
    async createDatasetForProject(projectName, metadata = null, options = {}) {
        const enabled = await this.isEnabled();
        if (!enabled) {
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
    
    // Ensure logged in (uses omeroAuth) - ASYNC
    async ensureLoggedIn() {
        const settings = await this.getSettings();
        
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
            
            // Method 1: Username/Password mit korrekt entschlüsselten Credentials
            if (settings.username && settings.password) {
                try {
                    console.log('🔬 Attempting username/password login...');
                    console.log('🔬 Using decrypted credentials:', {
                        username: settings.username.substring(0, 4) + '***',
                        hasPassword: !!settings.password
                    });
                    
                    loginResult = await window.omeroAuth.loginWithCredentials(
                        settings.username,  // Bereits entschlüsselter String
                        settings.password   // Bereits entschlüsselter String
                    );
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
    },

    // Enhanced initialization with cache warming
    async initWithCacheWarming() {
        console.log('🔬 Initializing OMERO UI Integration with cache warming...');
        
        try {
            // Initialize base functionality
            await this.init();
            
            // Warm up cache by loading groups in background
            if (window.omeroGroups && window.omeroGroups.getGroups) {
                console.log('🔬 Warming up groups cache...');
                window.omeroGroups.getGroups().then(() => {
                    console.log('✅ Groups cache warmed up');
                }).catch((error) => {
                    console.log('⚠️ Cache warming failed (non-critical):', error.message);
                });
            }
            
            console.log('✅ OMERO UI Integration initialized with caching');
        } catch (error) {
            console.error('❌ Error initializing OMERO UI Integration:', error);
        }
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

console.log('✅ OMERO UI Integration loaded (ASYNC SECURE SETTINGS FIXED)');