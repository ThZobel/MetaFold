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

    /**
    * Enhanced OMERO Connection Test mit automatischem Proxy-Start
    * Diese Funktion startet automatisch den Node.js Proxy, falls nötig
    */
    async testConnection() {
        try {
            console.log('🔬 Starting enhanced OMERO connection test...');

            // Update UI to show we're starting
            this.updateConnectionStatus('testing', 'Preparing OMERO connection...');

            // Step 1: Ensure proxy is running
            console.log('📋 Step 1: Ensuring OMERO proxy is running...');
            const proxyResult = await this.ensureProxyIsRunning();

            if (!proxyResult.success) {
                console.error('❌ Failed to start OMERO proxy:', proxyResult.message);
                this.updateConnectionStatus('error', `Proxy startup failed: ${proxyResult.message}`);
                return {
                    success: false,
                    message: `Failed to start OMERO proxy: ${proxyResult.message}`,
                    details: {
                        step: 'proxy_startup',
                        error: proxyResult.message,
                        guidance: 'Check if port 3000 is available or try restarting MetaFold'
                    }
                };
            }

            console.log('✅ OMERO proxy is running:', proxyResult.proxyUrl);
            this.updateConnectionStatus('testing', 'OMERO proxy started, testing connection...');

            // Step 2: Initialize client with proxy
            console.log('📋 Step 2: Initializing OMERO client...');
            await this.initializeClient();

            // Step 3: Test authentication
            console.log('📋 Step 3: Testing OMERO authentication...');
            const authResult = await this.performAuthenticationTest();

            if (authResult.success) {
                console.log('✅ OMERO connection test successful!');
                this.updateConnectionStatus('connected', 'OMERO connection successful!');

                return {
                    success: true,
                    message: 'OMERO connection established successfully',
                    details: {
                        proxyUrl: proxyResult.proxyUrl,
                        omeroServer: authResult.serverInfo?.server_url || 'Unknown',
                        userId: authResult.userInfo?.id || 'Unknown',
                        userName: authResult.userInfo?.omeName || 'Unknown'
                    }
                };
            } else {
                console.error('❌ OMERO authentication failed:', authResult.message);
                this.updateConnectionStatus('error', `Authentication failed: ${authResult.message}`);

                return {
                    success: false,
                    message: `OMERO authentication failed: ${authResult.message}`,
                    details: {
                        step: 'authentication',
                        error: authResult.message,
                        guidance: authResult.guidance || 'Check your OMERO credentials in settings'
                    }
                };
            }

        } catch (error) {
            console.error('❌ OMERO connection test failed:', error);

            let guidance = 'Check console for detailed error information';
            if (error.message.includes('Proxy server not running')) {
                guidance = 'OMERO proxy failed to start. Check if port 3000 is available.';
            } else if (error.message.includes('not initialized')) {
                guidance = 'OMERO client initialization failed. Try refreshing the page.';
            } else if (error.message.includes('fetch')) {
                guidance = 'Network error. Check your internet connection and OMERO server availability.';
            }

            this.updateConnectionStatus('error', `Connection error: ${error.message}`);

            return {
                success: false,
                message: `OMERO connection error: ${error.message}`,
                details: { error: error.message, guidance: guidance }
            };
        }
    },

    /**
    * Ensure OMERO Proxy is Running
    * Smart proxy startup mit aktuellen Settings
    */
    async ensureProxyIsRunning() {
        try {
            console.log('🔍 Checking OMERO proxy status...');

            // Method 1: Try using Electron API if available
            if (window.electronAPI && window.electronAPI.ensureOMEROProxyRunning) {
                console.log('📱 Using Electron API for proxy management');

                // Get current OMERO settings for proxy
                const settings = await this.getSettings();
                const proxySettings = {
                    serverUrl: settings.serverUrl || 'https://omero-imaging.uni-muenster.de',
                    proxyPort: settings.proxyPort || 3000,
                    autoStart: true
                };

                console.log('⚙️ Starting proxy with settings:', proxySettings);
                const result = await window.electronAPI.ensureOMEROProxyRunning(proxySettings);

                if (result.success) {
                    console.log('✅ OMERO proxy is running via Electron API');
                    return {
                        success: true,
                        proxyUrl: result.proxyUrl,
                        port: result.port,
                        method: 'electron_builtin',
                        wasAlreadyRunning: result.wasAlreadyRunning
                    };
                } else {
                    console.warn('⚠️ Electron proxy startup failed, trying fallback methods...');
                }
            }

            // Method 2: Check if external Python proxy is running
            console.log('🔍 Checking for external Python proxy...');
            const externalProxyResult = await this.checkExternalProxy();

            if (externalProxyResult.running) {
                console.log('✅ External Python proxy detected and running');
                return {
                    success: true,
                    proxyUrl: externalProxyResult.proxyUrl,
                    port: externalProxyResult.port,
                    method: 'external_python',
                    wasAlreadyRunning: true
                };
            }

            // Method 3: No proxy available
            console.error('❌ No OMERO proxy available');
            return {
                success: false,
                message: 'No OMERO proxy server available. Neither built-in nor external proxy is running.',
                suggestions: [
                    'If using MetaFold desktop app: Restart the application',
                    'If using browser: Start the Python proxy with: python omero_proxy.py',
                    'Check if port 3000 is available and not blocked by firewall'
                ]
            };

        } catch (error) {
            console.error('❌ Error ensuring OMERO proxy is running:', error);
            return {
                success: false,
                message: `Failed to start OMERO proxy: ${error.message}`,
                error: error.message
            };
        }
    },

    /**
     * Check External Python Proxy
     * Erweiterte Prüfung für externe Python Proxys mit besserer Fehlerbehandlung
     */
    async checkExternalProxy() {
        try {
            console.log('🔍 Checking external Python proxy on localhost:3000...');

            // Try multiple endpoints to be thorough
            const endpoints = [
                'http://localhost:3000/proxy-status',
                'http://localhost:3000/omero-api/',
                'http://localhost:3000/'
            ];

            for (const endpoint of endpoints) {
                try {
                    console.log(`🔗 Testing endpoint: ${endpoint}`);

                    const response = await fetch(endpoint, {
                        method: 'GET',
                        mode: 'cors',
                        timeout: 3000 // 3 second timeout
                    });

                    if (response.ok) {
                        console.log(`✅ External proxy responding on: ${endpoint}`);

                        // Try to get detailed status if available
                        let proxyInfo = { type: 'external_python' };
                        if (endpoint.includes('proxy-status')) {
                            try {
                                proxyInfo = await response.json();
                            } catch (e) {
                                // Ignore JSON parse errors
                            }
                        }

                        return {
                            running: true,
                            proxyUrl: 'http://localhost:3000/omero-api',
                            port: 3000,
                            endpoint: endpoint,
                            proxyInfo: proxyInfo
                        };
                    }
                } catch (fetchError) {
                    console.log(`❌ Endpoint ${endpoint} failed:`, fetchError.message);
                    continue; // Try next endpoint
                }
            }

            console.log('❌ No external proxy detected on any endpoint');
            return {
                running: false,
                error: 'No external Python proxy detected on localhost:3000',
                testedEndpoints: endpoints
            };

        } catch (error) {
            console.error('❌ Error checking external proxy:', error);
            return {
                running: false,
                error: `Failed to check external proxy: ${error.message}`
            };
        }
    },

    /**
     * Perform OMERO Authentication Test - FIXED for Password Prompt Support
     * Tests OMERO authentication and triggers password prompt if "Don't save password" is enabled
     */
    async performAuthenticationTest() {
        try {
            console.log('🔐 Starting OMERO authentication test...');

            // Initialize OMERO client if not already done
            if (!window.omeroAPI || !window.omeroAPI.initialized) {
                console.log('🔧 OMERO API not initialized, initializing now...');
                await this.initializeClient();
            }

            // Get settings - FIXED: Username can be provided via prompt if not configured
            console.log('🔑 Getting OMERO settings with credentials...');
            const settings = await this.getSettings();

            // ✅ NEW: Username is optional - can be prompted
            // Password will always be prompted if "Don't save" is enabled
            const hasUsername = !!settings.username;

            console.log('🔑 Credentials validation:', {
                hasUsername: hasUsername,
                hasPassword: !!settings.password,
                serverUrl: settings.serverUrl
            });

            // ✅ FIXED: Use omeroAuth.login() which handles prompting for BOTH username and password
            // If username is not in settings, the prompt will ask for it
            // If password is not saved ("Don't save" enabled), the prompt will ask for it
            console.log('🔐 Testing OMERO login (will prompt for credentials if needed)...');
            const loginResult = await window.omeroAuth.login(
                settings.username || null // Pass null if no username - prompt will ask
                // Note: No password parameter - login() will get it via getPassword()
            );

            if (loginResult && loginResult.success) {
                console.log('✅ OMERO authentication successful');
                console.log('🎯 Login method used:', loginResult.loginMethod || 'credentials');

                // Get user and server info (if available)
                let userInfo = null;
                let serverInfo = null;

                try {
                    if (window.omeroAPI && window.omeroAPI.getCurrentUser) {
                        userInfo = await window.omeroAPI.getCurrentUser();
                        console.log('👤 User authenticated successfully');
                    }
                    if (window.omeroAPI && window.omeroAPI.getServerInfo) {
                        serverInfo = await window.omeroAPI.getServerInfo();
                        console.log('🔬 Server info retrieved:', serverInfo?.server_url || 'Unknown');
                    }
                } catch (infoError) {
                    console.warn('⚠️ Could not get user/server info:', infoError.message);
                    // Not critical, continue without info
                }

                return {
                    success: true,
                    message: 'OMERO authentication successful',
                    userInfo: userInfo,
                    serverInfo: serverInfo,
                    loginMethod: loginResult.loginMethod || 'credentials',
                    serverUrl: settings.serverUrl
                };
            } else {
                console.error('❌ OMERO authentication failed:', loginResult?.message || 'Unknown error');

                let guidance = 'Check your OMERO credentials in settings';
                const errorMessage = loginResult?.message || '';

                if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
                    guidance = 'Invalid username or password. Check your OMERO credentials in settings.';
                } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
                    guidance = 'OMERO server error. Try again later or contact your OMERO administrator.';
                } else if (errorMessage.includes('csrf') || errorMessage.includes('CSRF')) {
                    guidance = 'CSRF token issue. Try refreshing the page and logging in again.';
                } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
                    guidance = 'Network timeout. Check your internet connection and try again.';
                } else if (errorMessage.includes('proxy')) {
                    guidance = 'Proxy connection issue. The proxy is running but OMERO server may be unreachable.';
                } else if (errorMessage.includes('Password required') || errorMessage.includes('Cancelled')) {
                    guidance = 'Password was required but not provided. Please enter your password when prompted.';
                }

                return {
                    success: false,
                    message: loginResult?.message || 'OMERO authentication failed',
                    guidance: guidance,
                    serverUrl: settings.serverUrl
                };
            }

        } catch (error) {
            console.error('❌ Authentication test error:', error);

            let guidance = 'Check console for detailed error information';
            if (error.message.includes('username not configured')) {
                guidance = 'Configure your OMERO username in settings';
            } else if (error.message.includes('proxy')) {
                guidance = 'OMERO proxy connection issue. Try restarting MetaFold.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                guidance = 'Network error. Check your internet connection.';
            } else if (error.message.includes('settings')) {
                guidance = 'Settings loading error. Try refreshing the page.';
            } else if (error.message.includes('Cancelled')) {
                guidance = 'Login was cancelled. Please try again and enter your password.';
            }

            return {
                success: false,
                message: `Authentication test failed: ${error.message}`,
                guidance: guidance
            };
        }
    },

    /**
     * Get Proxy URL - Enhanced version with smart detection
     * Erkennt automatisch ob Electron oder External Proxy verwendet wird
     */
    getProxyUrl() {
        // Method 1: Try to get URL from Electron API if available
        if (window.electronAPI && window.electronAPI.getOMEROProxyURL) {
            return window.electronAPI.getOMEROProxyURL().then(url => {
                if (url) {
                    console.log('🔗 Using Electron built-in proxy URL:', url);
                    return url;
                } else {
                    console.log('🔗 Electron proxy not running, falling back to external proxy');
                    return 'http://localhost:3000/omero-api';
                }
            }).catch(() => {
                console.log('🔗 Electron API failed, using fallback proxy URL');
                return 'http://localhost:3000/omero-api';
            });
        }

        // Method 2: Fallback to standard external proxy URL
        console.log('🔗 Using standard external proxy URL');
        return Promise.resolve('http://localhost:3000/omero-api');
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

    // Initialize client with proxy URL - SERVER-URL FIX
    async initializeClient() {
        console.log('🔧 Initializing OMERO client (Enhanced Version)...');

        try {
            // NEW: Get current proxy URL dynamically
            let proxyUrl;
            try {
                proxyUrl = await this.getProxyUrl();
                console.log('🔗 Using proxy URL for client initialization:', proxyUrl);
            } catch (error) {
                console.warn('⚠️ Failed to get proxy URL, using default:', error);
                proxyUrl = 'http://localhost:3000/omero-api';
            }

            // Get settings (original logic)
            const settings = await this.getSettings();

            if (!settings.serverUrl) {
                throw new Error('OMERO server URL not configured in settings');
            }

            console.log('⚙️ OMERO Settings:', {
                serverUrl: settings.serverUrl,
                hasUsername: !!settings.username,
                hasPassword: !!settings.password,
                proxyUrl: proxyUrl
            });

            // Enhanced proxy check with retry logic (NEW)
            const maxRetries = 3;
            let proxyRunning = false;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                console.log(`🔍 Checking proxy availability (attempt ${attempt}/${maxRetries})...`);

                try {
                    const response = await fetch(`${proxyUrl.replace('/omero-api', '')}/proxy-status`, {
                        method: 'GET',
                        mode: 'cors',
                        timeout: 2000
                    });

                    if (response.ok) {
                        proxyRunning = true;
                        const proxyStatus = await response.json();
                        console.log('✅ Proxy is running and responding:', proxyStatus.proxy_running ? 'Yes' : 'No');
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Proxy check attempt ${attempt} failed:`, error.message);
                    if (attempt < maxRetries) {
                        console.log('⏳ Waiting 1 second before retry...');
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }

            if (!proxyRunning) {
                throw new Error(`Proxy server not running after ${maxRetries} attempts. ` +
                    'Please ensure the OMERO proxy is started.');
            }

            // FIX: Initialize OMERO Auth mit der echten Server-URL, nicht der Proxy-URL
            console.log('🔧 Initializing OMERO authentication system...');
            console.log('🔗 Using proxy URL:', proxyUrl);
            console.log('🔬 Target OMERO server:', settings.serverUrl);

            // KORRIGIERT: Auth mit der echten OMERO-Server URL initialisieren
            window.omeroAuth.init(settings.serverUrl, {
                verifySSL: settings.verifySSL || false,
                proxyUrl: proxyUrl  // Proxy-URL als separate Option
            });

            // Set proxy URL for API calls (new property)
            if (window.omeroAPI) {
                window.omeroAPI.proxyUrl = proxyUrl;

                // Ensure OMERO API is initialized
                if (window.omeroAPI.init && !window.omeroAPI.initialized) {
                    console.log('🔬 Initializing OMERO API module...');
                    window.omeroAPI.init();
                }
            }

            console.log('✅ OMERO client initialized successfully');
            console.log('✅ Server URL correctly set to:', settings.serverUrl);
            console.log('✅ Proxy URL set to:', proxyUrl);

            return window.omeroAuth;

        } catch (error) {
            console.error('❌ Failed to initialize OMERO client:', error);
            throw new Error(`OMERO client initialization failed: ${error.message}`);
        }
    },

    // =================== VISUAL STATUS UPDATES ===================

    // Update connection status with visual feedback
    updateConnectionStatus(status, message, details = {}) {
        // Update status icon and text (existing code)
        const statusIcon = document.getElementById('omeroStatusIcon');
        const statusText = document.getElementById('omeroStatusText');

        if (statusText) {
            // Update text color based on status
            switch (status) {
                case 'testing':
                    if (statusIcon) statusIcon.textContent = '🔄';
                    statusText.textContent = message;
                    statusText.style.color = '#0369a1';
                    break;
                case 'connected':
                    if (statusIcon) statusIcon.textContent = details.isAuthenticated ? '🔐' : '🌐';
                    statusText.textContent = message;
                    statusText.style.color = '#059669';

                    // NEW: Show logout button when connected
                    this.showLogoutButton();
                    break;
                case 'error':
                    if (statusIcon) statusIcon.textContent = '❌';
                    statusText.textContent = message;
                    statusText.style.color = '#dc2626';
                    break;
                case 'disabled':
                    if (statusIcon) statusIcon.textContent = '⚫';
                    statusText.textContent = 'OMERO: Disabled';
                    statusText.style.color = '#6b7280';
                    break;
                case 'disconnected':
                    if (statusIcon) statusIcon.textContent = '⚪';
                    statusText.textContent = message || 'Disconnected from OMERO';
                    statusText.style.color = '#6b7280';

                    // NEW: Hide logout button when disconnected
                    const logoutButton = document.getElementById('omeroLogoutButton');
                    const viewerLogoutButton = document.getElementById('omeroLogoutBtn_viewer');

                    if (logoutButton) {
                        logoutButton.style.display = 'none';
                    }
                    if (viewerLogoutButton) {
                        viewerLogoutButton.style.display = 'none';
                    }
                    break;
                default:
                    statusIcon.textContent = '❓';
                    statusText.textContent = message || 'OMERO: Unknown status';
                    statusText.style.color = '#6b7280';
            }
        }

        // NEW: Also update the connect button state
        this.updateConnectButtonState(status, details);
    },

    // Update connect button state and logout button visibility
    updateConnectButtonState(status, details = {}) {
        const connectButton = document.getElementById('omeroConnectButton');
        const connectIcon = document.getElementById('omeroConnectIcon');
        const connectText = document.getElementById('omeroConnectText');
        const logoutButton = document.getElementById('omeroLogoutButton');
        const viewerLogoutButton = document.getElementById('omeroLogoutBtn_viewer');

        if (!connectButton || !connectIcon || !connectText) return;

        switch (status) {
            case 'connected':
                // Green connected state
                connectButton.style.background = 'linear-gradient(45deg, #059669, #047857)';
                connectButton.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)';
                connectIcon.textContent = '✅';
                connectText.textContent = 'Connected';
                connectButton.disabled = false;

                // Show logout button
                if (logoutButton) {
                    logoutButton.style.display = 'inline-block';
                }
                if (viewerLogoutButton) {
                    viewerLogoutButton.style.display = 'inline-block';
                }
                break;

            case 'testing':
                // Testing state
                connectButton.style.background = 'linear-gradient(45deg, #6b7280, #4b5563)';
                connectIcon.textContent = '⏳';
                connectText.textContent = 'Connecting...';
                connectButton.disabled = true;

                // Hide logout button during testing
                if (logoutButton) {
                    logoutButton.style.display = 'none';
                }
                if (viewerLogoutButton) {
                    viewerLogoutButton.style.display = 'none';
                }
                break;

            case 'error':
                // Error state (temporary)
                connectButton.style.background = 'linear-gradient(45deg, #dc2626, #b91c1c)';
                connectButton.style.boxShadow = '0 2px 4px rgba(220, 38, 38, 0.3)';
                connectIcon.textContent = '❌';
                connectText.textContent = 'Connection Failed';
                connectButton.disabled = false;

                // Hide logout button on error
                if (logoutButton) {
                    logoutButton.style.display = 'none';
                }
                if (viewerLogoutButton) {
                    viewerLogoutButton.style.display = 'none';
                }

                // Auto-reset to default after 3 seconds
                setTimeout(() => {
                    this.updateConnectButtonState('default');
                }, 3000);
                break;

            case 'disconnected':
            case 'default':
            default:
                // Default orange state
                connectButton.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
                connectButton.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)';
                connectIcon.textContent = '🔗';
                connectText.textContent = 'Connect to OMERO';
                connectButton.disabled = false;

                // Hide logout button in default state
                if (logoutButton) {
                    logoutButton.style.display = 'none';
                }
                if (viewerLogoutButton) {
                    viewerLogoutButton.style.display = 'none';
                }
                break;
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

    // ===OMERO Logout =====
    /**
     * Ultra simple OMERO logout - no server requests, just local cleanup
     * Based on console tests: server logout fails with 404, local cleanup always works
     */
    async logout() {
        console.log('🔬 OMERO logout...');

        // Check if session exists
        if (!window.omeroAuth?.session) {
            console.log('ℹ️ No active session');
            this.resetUIAfterLogout();
            return { success: true, message: 'No active session' };
        }

        // Simple local cleanup (always works based on tests)
        window.omeroAuth.session = null;

        // Clear caches (optional)
        if (window.omeroGroups?.clearCache) window.omeroGroups.clearCache();
        if (window.omeroProjects?.clearCache) window.omeroProjects.clearCache();

        // Reset UI
        this.resetUIAfterLogout();

        console.log('✅ OMERO logout successful');
        return { success: true, message: 'Logged out successfully' };
    },

    /**
     * Reset UI to logged out state
     */
    resetUIAfterLogout() {
        // Update status
        this.updateStatusDisplay('disconnected', 'Logged out from OMERO');

        // Reset connect button to original state
        const connectButton = document.getElementById('omeroConnectButton');
        const connectIcon = document.getElementById('omeroConnectIcon');
        const connectText = document.getElementById('omeroConnectText');

        if (connectButton) {
            connectButton.style.background = 'linear-gradient(45deg, #f59e0b, #d97706)';
            connectButton.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)';
            connectButton.disabled = false;
        }

        if (connectIcon) connectIcon.textContent = '🔗';
        if (connectText) connectText.textContent = 'Connect to OMERO';

        // Hide the minimal logout button
        const logoutButton = document.getElementById('omeroLogoutButton');
        if (logoutButton) {
            logoutButton.style.display = 'none';
        }

        // Clear dropdowns
        const groupSelect = document.getElementById('omeroGroupSelect');
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (groupSelect) groupSelect.innerHTML = '<option value="">Select Group...</option>';
        if (projectSelect) projectSelect.innerHTML = '<option value="">Select Project...</option>';

        // Update status text to original state
        const statusText = document.getElementById('omeroStatusText');
        if (statusText) {
            statusText.textContent = 'Not connected';
            statusText.style.color = '#6b7280';
            statusText.style.fontStyle = 'italic';
            statusText.style.fontWeight = 'normal';
        }

        // === RESET METADATA VIEWER UI ===
        const viewerConnectBtn = document.getElementById('omeroConnectBtn_viewer');
        const viewerStatusText = document.getElementById('omeroConnectionStatus_viewer');
        const viewerLogoutBtn = document.getElementById('omeroLogoutBtn_viewer');
        const viewerGroupSelection = document.getElementById('omeroGroupSelection_viewer');
        const viewerProjectSelection = document.getElementById('omeroProjectSelection_viewer');
        const viewerGroupSelect = document.getElementById('omeroGroupSelect_viewer');
        const viewerProjectSelect = document.getElementById('omeroProjectSelect_viewer');
        const viewerCheckbox = document.getElementById('sendToOMERO_viewer');

        if (viewerConnectBtn) {
            viewerConnectBtn.innerHTML = '🔗 Connect to OMERO';
            viewerConnectBtn.style.background = '';
            viewerConnectBtn.disabled = false;
        }

        if (viewerStatusText) {
            viewerStatusText.textContent = 'Not connected';
            viewerStatusText.style.color = '#9ca3af';
        }

        if (viewerLogoutBtn) {
            viewerLogoutBtn.style.display = 'none';
        }

        if (viewerGroupSelection) viewerGroupSelection.style.display = 'none';
        if (viewerProjectSelection) viewerProjectSelection.style.display = 'none';

        if (viewerGroupSelect) viewerGroupSelect.innerHTML = '<option value="">Connect to OMERO first</option>';
        if (viewerProjectSelect) viewerProjectSelect.innerHTML = '<option value="">Select group first</option>';

        // Uncheck the checkbox if it was checked, as we are no longer connected
        if (viewerCheckbox && viewerCheckbox.checked) {
            viewerCheckbox.checked = false;
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

    /**
     * Get the current proxy URL
     * Used by omeroAuth.js to get the dynamic proxy URL
     */
    async getProxyUrl() {
        // First try to check if we have a running proxy info cached
        if (this._cachedProxyUrl) {
            return this._cachedProxyUrl;
        }

        // Check Electron API
        if (window.electronAPI && window.electronAPI.getOMEROProxyStatus) {
            try {
                const status = await window.electronAPI.getOMEROProxyStatus();
                if (status.success && status.running) {
                    this._cachedProxyUrl = `http://localhost:${status.port}/omero-api`;
                    return this._cachedProxyUrl;
                }
            } catch (e) {
                // Ignore
            }
        }

        // Default fallback
        return 'http://localhost:3000/omero-api';
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

            try {
                // Use omeroAuth.login() which handles all strategies including prompts
                // Pass username if available, otherwise null (will prompt)
                // Pass password if available, otherwise null (will prompt)

                const username = settings.username || null;
                const password = settings.password || null;

                console.log('🔬 Calling omeroAuth.login()...');
                const loginResult = await window.omeroAuth.login(username, password);

                if (!loginResult || !loginResult.success) {
                    throw new Error('Login failed');
                }

                console.log('✅ OMERO login successful via ensureLoggedIn');

            } catch (error) {
                console.error('❌ Login failed in ensureLoggedIn:', error);
                throw new Error(`OMERO login failed: ${error.message}`);
            }
        }
    },

    /**
     * Show logout button in Discover Projects tab
     */
    showLogoutButton() {
        const logoutButton = document.getElementById('omeroLogoutButton');
        const viewerLogoutButton = document.getElementById('omeroLogoutBtn_viewer');

        if (logoutButton) {
            logoutButton.style.display = 'inline-block';
        }

        if (viewerLogoutButton) {
            viewerLogoutButton.style.display = 'inline-block';
        }

        if (logoutButton || viewerLogoutButton) {
            console.log('✅ OMERO logout button(s) shown');
        } else {
            console.warn('⚠️ OMERO logout button not found in DOM');
        }
    },

    /**
     * Update visibility of all logout buttons based on session state
     */
    updateLogoutButtonVisibility() {
        const isConnected = window.omeroAuth && window.omeroAuth.isSessionValid();
        const logoutButton = document.getElementById('omeroLogoutButton');
        const viewerLogoutButton = document.getElementById('omeroLogoutBtn_viewer');

        const displayStyle = isConnected ? 'inline-block' : 'none';

        if (logoutButton) logoutButton.style.display = displayStyle;
        if (viewerLogoutButton) viewerLogoutButton.style.display = displayStyle;
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

// MINIMAL: Global function called from HTML
window.handleOMEROGroupSelection = function () {
    // Check if "Send to OMERO" is checked and "All Groups" is selected
    const sendToOMERO = document.getElementById('sendToOMERO');
    const groupSelect = document.getElementById('omeroGroupSelect');

    // Warning removed as per user request - validation happens during project creation
    // if (sendToOMERO && sendToOMERO.checked && groupSelect && groupSelect.value === 'all') {
    //     // Show warning immediately
    //     if (window.projectManager && typeof window.projectManager.showOMEROGroupWarning === 'function') {
    //         window.projectManager.showOMEROGroupWarning(
    //             'Cannot create OMERO datasets in "All Groups"',
    //             'Please select a specific group where you have dataset creation permissions.'
    //         );
    //     }
    // } else {
    //     // Hide warning if valid selection
    //     if (window.projectManager && typeof window.projectManager.hideOMEROGroupWarning === 'function') {
    //         window.projectManager.hideOMEROGroupWarning();
    //     }
    // }

    // Ensure warning is hidden to be safe
    if (window.projectManager && typeof window.projectManager.hideOMEROGroupWarning === 'function') {
        window.projectManager.hideOMEROGroupWarning();
    }

    // Call the original handler
    if (window.omeroUIIntegration && typeof window.omeroUIIntegration.handleGroupSelection === 'function') {
        window.omeroUIIntegration.handleGroupSelection();
    }
};


console.log('✅ OMERO UI Integration loaded (ASYNC SECURE SETTINGS FIXED)');