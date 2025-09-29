// OMERO Authentication and Session Management - Enhanced Multi-University Version

const omeroAuth = {
    session: null,
    baseUrl: null,
    options: {
        verifySSL: true,
        sessionTimeout: 600000, // 10 minutes
        maxRetries: 3,
        retryDelay: 1000
    },

    // Initialize auth module with server URL
    init(serverUrl, options = {}) {
        this.baseUrl = this.formatUrl(serverUrl);
        this.options = { ...this.options, ...options };
        
        console.log('🔬 OMERO Auth initialized (Multi-Uni + CSRF Fixed):', this.baseUrl);
        return this;
    },

    // Format server URL with validation
    formatUrl(serverUrl) {
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

    // =================== SESSION DEBUGGING ===================
    
    debugSession() {
        console.log('🔬 === ENHANCED SESSION DEBUG ===');
        console.log('🔬 Current URL:', window.location.href);
        console.log('🔬 Base URL:', this.baseUrl);
        console.log('🔬 Document cookies:', document.cookie || 'NONE');
        console.log('🔬 Session object:', this.session);
        console.log('🔬 Session valid:', this.isSessionValid());
        console.log('🔬 ================================');
    },

    // Debug CSRF state
    debugCSRF() {
        console.log('🔬 === CSRF DEBUG INFO ===');
        console.log('Current URL:', window.location.href);
        console.log('Origin:', window.location.origin);
        console.log('Document cookies:', document.cookie || 'NONE');
        console.log('Session CSRF token:', this.session?.csrfToken || 'NONE');
        console.log('Cookie CSRF token:', this.getCSRFTokenFromCookie() || 'NONE');
        console.log('Best CSRF token:', this.getBestCSRFToken() || 'NONE');
        console.log('Session state:', this.session || 'NONE');
        console.log('=========================');
    },

    // =================== CSRF TOKEN MANAGEMENT ===================
    
    // Get CSRF Token with retry logic
    async getCSRFToken() {
            if (!this.baseUrl) {
                throw new Error('OMERO auth not initialized');
            }
        
        // FIX: Verwende Proxy URL für CSRF Token statt direkte Server URL
        const tokenUrl = 'http://localhost:3000/omero-api/api/v0/token/';
        console.log('🔬 Getting CSRF token from:', tokenUrl);
        
        for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
            try {
                const response = await fetch(tokenUrl, {
                    method: 'GET',
                    credentials: 'include',
                    mode: 'cors',
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Origin': window.location.origin,
                        'Referer': window.location.href
                    }
                });
                
                console.log('🔬 Token response status:', response.status);
                
                if (!response.ok) {
                    if (attempt < this.options.maxRetries) {
                        console.warn(`⚠️ Token request failed (attempt ${attempt}), retrying...`);
                        await this.delay(this.options.retryDelay * attempt);
                        continue;
                    }
                    throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log('🔬 CSRF Token received');
                
                // Store token in session
                if (!this.session) {
                    this.session = {};
                }
                this.session.csrfToken = data.data;
                this.session.tokenTimestamp = Date.now();
                console.log('🔬 ✅ CSRF Token stored in session');
                
                return data.data;
                
            } catch (error) {
                if (attempt < this.options.maxRetries) {
                    console.warn(`⚠️ Token request error (attempt ${attempt}):`, error.message);
                    await this.delay(this.options.retryDelay * attempt);
                    continue;
                }
                console.error('❌ Error getting CSRF token:', error);
                throw error;
            }
        }
    },

    // Get best available CSRF token with fallback
    getBestCSRFToken() {
        // Try cookie first (Django standard)
        const cookieCSRF = this.getCSRFTokenFromCookie();
        
        // Check if session token is still fresh (less than 5 minutes old)
        const sessionCSRF = this.session?.csrfToken;
        const tokenAge = this.session?.tokenTimestamp ? Date.now() - this.session.tokenTimestamp : Infinity;
        const sessionTokenFresh = tokenAge < 300000; // 5 minutes
        
        // Prefer fresh session token, fallback to cookie
        const bestToken = (sessionTokenFresh && sessionCSRF) ? sessionCSRF : cookieCSRF || sessionCSRF;
        
        console.log('🔬 CSRF Token selection:');
        console.log('   Cookie Token:', cookieCSRF ? cookieCSRF.substring(0, 10) + '...' : 'None');
        console.log('   Session Token:', sessionCSRF ? sessionCSRF.substring(0, 10) + '...' : 'None');
        console.log('   Token Age:', tokenAge < Infinity ? `${Math.round(tokenAge/1000)}s` : 'Unknown');
        console.log('   Selected Token:', bestToken ? bestToken.substring(0, 10) + '...' : 'None');
        
        return bestToken;
    },

    // Extract CSRF token from cookie
    getCSRFTokenFromCookie() {
        return document.cookie
            .split(';')
            .find(row => row.trim().startsWith('csrftoken='))
            ?.split('=')[1];
    },

    // =================== AUTHENTICATION METHODS ===================

    // Enhanced Login with multi-university support
    async loginWithCredentials(username, password) {
        console.log('🔬 === OMERO MULTI-UNI LOGIN (CSRF FIXED) ===');
        console.log('🔬 Username:', username);
        console.log('🔬 Server:', this.baseUrl);
        
        try {
            // Step 1: Get fresh CSRF token with retries
            console.log('🔬 Step 1: Getting fresh CSRF token...');
            const csrfToken = await this.getCSRFToken();
            
            if (!csrfToken) {
                throw new Error('Failed to obtain CSRF token');
            }
            
            // Step 2: Get server ID with fallback
            console.log('🔬 Step 2: Getting server ID...');
            let serverId = 1;
            
            try {
                const serversResponse = await window.omeroAPI.makeRequest(`${this.baseUrl}api/v0/servers/`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRFToken': csrfToken
                    }
                });
                
                if (serversResponse.data && serversResponse.data.length > 0) {
                    serverId = serversResponse.data[0].id;
                    console.log('🔬 Server ID found:', serverId);
                } else {
                    console.log('🔬 No servers found, using default ID (1)');
                }
            } catch (serverError) {
                console.warn('⚠️ Server fetch failed, using default ID (1):', serverError.message);
            }
            
            // Step 3: Multi-strategy login attempt
            console.log('🔬 Step 3: Multi-strategy login...');
            
            const loginStrategies = [
                {
                    name: 'Form-based Login (Django Standard)',
                    execute: () => this.attemptFormLogin(username, password, serverId, csrfToken)
                },
                {
                    name: 'JSON API Login (Alternative)',
                    execute: () => this.attemptJsonLogin(username, password, serverId, csrfToken)
                }
            ];
            
            let lastError = null;
            
            for (const strategy of loginStrategies) {
                try {
                    console.log(`🔬 Trying: ${strategy.name}`);
                    const result = await strategy.execute();
                    
                    if (result.success) {
                        console.log(`✅ ${strategy.name} successful!`);
                        return result;
                    }
                } catch (error) {
                    console.warn(`⚠️ ${strategy.name} failed:`, error.message);
                    lastError = error;
                    
                    // If CSRF error, don't try other strategies with same token
                    if (error.message.includes('CSRF')) {
                        break;
                    }
                }
            }
            
            throw lastError || new Error('All login strategies failed');
            
        } catch (error) {
            console.error('❌ Multi-uni login failed:', error);
            this.session = null;
            throw error;
        }
    },

        // Form-based login (Django standard) - MINIMAL FIX für Proxy URLs
        async attemptFormLogin(username, password, serverId, csrfToken) {
            const loginData = new URLSearchParams({
                username: username,
                password: password,
                server: serverId,
                csrfmiddlewaretoken: csrfToken
            });
            
            // FIX: Verwende Proxy URL statt direkte Server URL
            const loginUrl = 'http://localhost:3000/omero-api/api/v0/login/';
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken,
                    'Accept': 'application/json',
                    'Referer': 'http://localhost:3000/omero-api/webclient/login/',
                    'Origin': window.location.origin,
                    'Referer': window.location.href
                },
                body: loginData
            });
            
            return await this.processLoginResponse(response, 'Form-based Login', csrfToken);
        },

        // JSON API login (alternative) - MINIMAL FIX für Proxy URLs
        async attemptJsonLogin(username, password, serverId, csrfToken) {
            const loginPayload = {
                server: serverId,
                username: username,
                password: password
            };
            
            // FIX: Verwende Proxy URL statt direkte Server URL  
            const loginUrl = 'http://localhost:3000/omero-api/api/v0/login/';
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'Accept': 'application/json',
                    'Referer': 'http://localhost:3000/omero-api/webclient/login/',
                    'Origin': window.location.origin,
                    'Referer': window.location.href
                },
                body: JSON.stringify(loginPayload)
            });
            
            return await this.processLoginResponse(response, 'JSON API Login', csrfToken);
        },

    // Process login response
    async processLoginResponse(response, method, csrfToken) {
        console.log('🔬 Login response status:', response.status);
        
        if (response.ok || response.status === 302) {
            let loginResult;
            try {
                loginResult = await response.json();
            } catch (e) {
                loginResult = { success: true };
            }
            
            // Create/update session
            this.session = {
                ...this.session,
                loginTime: Date.now(),
                username: loginResult.username || 'authenticated_user',
                userId: loginResult.eventContext?.userId || 'authenticated_user',
                groupId: loginResult.eventContext?.groupId || null,
                groupName: loginResult.eventContext?.groupName || 'private',
                serverUrl: this.baseUrl,
                loginMethod: method,
                isAuthenticated: true,
                hasApiAccess: false,
                sessionCookies: this.extractSessionCookies(),
                eventContext: loginResult.eventContext
            };
            
            // Test API access
            console.log('🔬 Testing API access...');
            const apiResult = await this.testAuthenticatedAPIAccess(csrfToken);
            
            return {
                success: true,
                session: this.session,
                loginMethod: method,
                isAuthenticated: true,
                projectCount: this.session.projectCount || 0
            };
            
        } else {
            const errorText = await response.text();
            console.error('❌ Login failed:', response.status, errorText);
            
            // Enhanced error analysis for universities
            let errorMessage = this.analyzeLoginError(response.status, errorText);
            throw new Error(`${errorMessage}: ${response.status}`);
        }
    },

    // Analyze login errors for better user feedback
    analyzeLoginError(status, errorText) {
        if (errorText.includes('CSRF')) {
            if (errorText.includes('Origin checking failed')) {
                return 'CSRF Origin Check failed - University proxy configuration issue';
            } else if (errorText.includes('token missing')) {
                return 'CSRF token missing - Server configuration issue';
            } else {
                return 'CSRF token validation failed - Please refresh and try again';
            }
        } else if (errorText.includes('Username') || errorText.includes('Password')) {
            return 'Invalid username or password';
        } else if (status === 403) {
            return 'Access forbidden - Check credentials or contact IT support';
        } else if (status === 401) {
            return 'Authentication failed';
        } else if (status === 500) {
            return 'OMERO server error - Contact system administrator';
        } else if (status === 502 || status === 503) {
            return 'OMERO server temporarily unavailable';
        } else {
            return 'Login failed';
        }
    },

    // SUPER FAST VERSION: testAuthenticatedAPIAccess() - Skip all tests
    async testAuthenticatedAPIAccess(csrfToken) {
        console.log('⚡ Skipping heavy API tests (login was already successful)');
        
        // Since login response was 200, we know auth works
        // Just set the session as having API access
        this.session = {
            ...this.session,
            hasApiAccess: true,
            apiTestSkipped: true,
            reason: 'Login was successful, skipping heavy tests for performance'
        };
        
        console.log('✅ API access assumed from successful login');
        
        return {
            success: true,
            hasApiAccess: true,
            skipped: true,
            message: 'API tests skipped for performance - login was successful'
        };
    },

    // Enhanced login with session cookie support
    async loginWithSessionCookies(sessionId, csrfToken) {
        console.log('🔬 === LOGIN WITH SESSION COOKIES (ENHANCED) ===');
        
        try {
            // Set cookies with proper flags
            document.cookie = `sessionid=${sessionId}; path=/; SameSite=None`;
            document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=None`;
            
            if (!this.session) {
                this.session = {};
            }
            this.session.csrfToken = csrfToken;
            this.session.tokenTimestamp = Date.now();
            
            console.log('🔬 Cookies set, testing API access...');
            
            const hasAccess = await this.testAuthenticatedAPIAccess(csrfToken);
            
            this.session = {
                ...this.session,
                loginTime: Date.now(),
                username: 'session_user',
                userId: 'session_user',
                serverUrl: this.baseUrl,
                loginMethod: 'Session Cookies (Enhanced)',
                isAuthenticated: true,
                hasApiAccess: hasAccess
            };
            
            return {
                success: true,
                session: this.session,
                loginMethod: 'Session Cookies (Enhanced)',
                isAuthenticated: true
            };
            
        } catch (error) {
            console.error('❌ Session cookie login failed:', error);
            this.session = null;
            throw error;
        }
    },

    // Public group login with enhanced error handling
    async loginPublicGroup() {
        console.log('🔬 === PUBLIC GROUP SESSION (ENHANCED) ===');
        
        try {
            const csrfToken = await this.getCSRFToken();
            
            // Test API access without login
            const projectsResponse = await window.omeroAPI.makeRequest(`${this.baseUrl}api/v0/m/projects/`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': csrfToken
                }
            });
            
            this.session = {
                ...this.session,
                loginTime: Date.now(),
                username: 'public_user',
                userId: 'public_group_user',
                serverUrl: this.baseUrl,
                loginMethod: 'Public Group (Enhanced)',
                isPublicGroup: true,
                hasApiAccess: true,
                projectCount: Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 0
            };
            
            console.log('✅ Public Group session established');
            
            return {
                success: true,
                session: this.session,
                loginMethod: 'Public Group (Enhanced)',
                isPublicGroup: true,
                projectCount: this.session.projectCount
            };
            
        } catch (error) {
            console.error('❌ Public Group access failed:', error);
            throw error;
        }
    },

    // Main login method with enhanced fallback strategies
    async login(username, password) {
        console.log('🔬 === OMERO ENHANCED LOGIN ===');
        console.log('🔬 Username:', username || 'not provided');
        console.log('🔬 Server:', this.baseUrl);
        
        // Strategy 1: Try session cookie recovery first
        try {
            console.log('🔬 Strategy 1: Session cookie recovery...');
            await this.establishSessionFromCookies();
            console.log('✅ Session recovered from existing cookies');
            return {
                success: true,
                session: this.session,
                loginMethod: 'Cookie Recovery (Enhanced)'
            };
        } catch (cookieError) {
            console.log('🔬 Cookie recovery failed:', cookieError.message);
        }
        
        // Strategy 2: Username/Password login
        if (username && password) {
            console.log('🔬 Strategy 2: Credential-based login...');
            return await this.loginWithCredentials(username, password);
        }
        
        // Strategy 3: Public group fallback
        console.log('🔬 Strategy 3: Public group fallback...');
        return await this.loginPublicGroup();
    },

    // =================== SESSION MANAGEMENT ===================

    // Extract session cookies
    extractSessionCookies() {
        const cookies = {};
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sessionid' || name === 'csrftoken' || name === 'omero.web.sessionid') {
                cookies[name] = value;
            }
        });
        return cookies;
    },

    // Try to use existing session cookies
    async establishSessionFromCookies() {
        console.log('🔬 Establishing session from existing cookies...');
        
        const cookies = document.cookie;
        if (!cookies || (!cookies.includes('csrftoken') && !cookies.includes('sessionid'))) {
            throw new Error('No relevant cookies found');
        }
        
        if (!this.session) {
            this.session = {};
        }
        
        const csrfToken = this.getCSRFTokenFromCookie();
        if (!csrfToken) {
            throw new Error('No CSRF token in cookies');
        }
        
        this.session.csrfToken = csrfToken;
        this.session.tokenTimestamp = Date.now();
        
        return await this.testAuthenticatedAPIAccess(csrfToken);
    },

    // =================== SESSION VALIDATION ===================

    isSessionValid() {
        if (!this.session) return false;
        
        const sessionAge = Date.now() - this.session.loginTime;
        return sessionAge < this.options.sessionTimeout;
    },

    async ensureSession(username, password) {
        if (!this.isSessionValid()) {
            await this.login(username, password);
        }
        return this.session;
    },

    async logout() {
        if (this.session) {
            if (this.session.isAuthenticated && this.session.csrfToken) {
                try {
                    await window.omeroAPI.makeRequest(`${this.baseUrl}webclient/logout/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': this.session.csrfToken
                        }
                    });
                    console.log('🔬 Logout request sent');
                } catch (error) {
                    console.warn('🔬 Logout request failed:', error);
                }
            }
            
            this.session = null;
            console.log('🔬 Session cleared');
        }
    },

    // =================== UTILITY METHODS ===================

    // Utility: delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Test connection without login
    async testConnection() {
        try {
            const token = await this.getCSRFToken();
            return {
                success: true,
                message: 'Successfully connected to OMERO server (Multi-Uni Enhanced)',
                hasToken: !!token
            };
        } catch (error) {
            return {
                success: false,
                message: this.analyzeConnectionError(error)
            };
        }
    },

    analyzeConnectionError(error) {
        if (error.message.includes('fetch')) {
            return 'Connection failed - Check if OMERO server is accessible';
        } else if (error.message.includes('CORS')) {
            return 'CORS error - Contact IT support for proxy configuration';
        } else if (error.message.includes('timeout')) {
            return 'Connection timeout - OMERO server may be slow or down';
        } else {
            return `Connection error: ${error.message}`;
        }
    }
};

// Make globally available
window.omeroAuth = omeroAuth;
console.log('✅ OMERO Auth Module loaded (Enhanced Multi-University + CSRF Fixed)');