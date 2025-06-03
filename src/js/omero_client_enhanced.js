// OMERO REST API Client - Enhanced with Private Group Login Support

const omeroClient = {
    session: null,
    baseUrl: null,
    
    // Initialize client with server URL
    init(serverUrl, options = {}) {
        this.baseUrl = this.formatUrl(serverUrl);
        this.options = {
            verifySSL: true,
            sessionTimeout: 600000, // 10 minutes
            ...options
        };
        
        console.log('🔬 OMERO Client initialized (Enhanced Private Groups):', this.baseUrl);
        return this;
    },
    
    // Format server URL
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
    
    // Debug session state
    debugSession() {
        console.log('🔬 === SESSION DEBUG ===');
        console.log('🔬 Current URL:', window.location.href);
        console.log('🔬 Protocol:', window.location.protocol);
        console.log('🔬 Base URL:', this.baseUrl);
        console.log('🔬 Document cookies:', document.cookie || 'NONE');
        console.log('🔬 Session object:', this.session);
        console.log('🔬 ======================');
    },
    
    // =================== PRIVATE GROUP AUTHENTICATION ===================
    
    // Get CSRF Token (works for both public and private)
    async getCSRFToken() {
        if (!this.baseUrl) {
            throw new Error('OMERO client not initialized');
        }
        
        console.log('🔬 Getting CSRF token from:', `${this.baseUrl}api/v0/token/`);
        this.debugSession();
        
        try {
            const response = await fetch(`${this.baseUrl}api/v0/token/`, {
                method: 'GET',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            console.log('🔬 Token response status:', response.status);
            console.log('🔬 Token response headers:', [...response.headers.entries()]);
            
            if (!response.ok) {
                throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('🔬 CSRF Token response data:', data);
            console.log('🔬 Cookies after token request:', document.cookie || 'NONE');
            
            return data.data;
        } catch (error) {
            console.error('❌ Error getting CSRF token:', error);
            throw error;
        }
    },
    
    // Private Group Login with Username/Password
    async loginWithCredentials(username, password) {
        console.log('🔬 === PRIVATE GROUP LOGIN (Credentials) ===');
        console.log('🔬 Username:', username);
        console.log('🔬 Attempting login for private group access...');
        
        try {
            // Step 1: Get CSRF token to establish session
            console.log('🔬 Step 1: Getting CSRF token...');
            const csrfToken = await this.getCSRFToken();
            
            if (!csrfToken) {
                throw new Error('Failed to obtain CSRF token');
            }
            
            console.log('🔬 CSRF Token obtained:', csrfToken.substring(0, 10) + '...');
            
            // Step 2: Attempt login via OMERO.web login endpoint
            console.log('🔬 Step 2: Attempting login...');
            
            const loginData = {
                username: username,
                password: password,
                server: 1, // Usually server ID 1
                noredirect: 1 // Prevent redirect for API usage
            };
            
            const loginResponse = await fetch(`${this.baseUrl}webclient/login/`, {
                method: 'POST',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken,
                    'Referer': `${this.baseUrl}webclient/login/`,
                    'Accept': 'application/json, text/html, */*'
                },
                body: new URLSearchParams(loginData)
            });
            
            console.log('🔬 Login response status:', loginResponse.status);
            console.log('🔬 Login response headers:', [...loginResponse.headers.entries()]);
            
            // Check for successful login
            if (loginResponse.ok) {
                const responseText = await loginResponse.text();
                console.log('🔬 Login response preview:', responseText.substring(0, 200) + '...');
                
                // Check cookies after login
                const cookiesAfterLogin = document.cookie;
                console.log('🔬 Cookies after login:', cookiesAfterLogin);
                
                // Look for session cookie
                const hasSessionId = cookiesAfterLogin.includes('sessionid=');
                
                if (hasSessionId) {
                    console.log('✅ Session cookie found - login appears successful');
                    
                    // Step 3: Test API access with new session
                    console.log('🔬 Step 3: Testing authenticated API access...');
                    
                    try {
                        const apiTestResponse = await fetch(`${this.baseUrl}api/v0/m/projects/`, {
                            method: 'GET',
                            credentials: 'include',
                            mode: 'cors',
                            headers: {
                                'Accept': 'application/json',
                                'X-CSRFToken': csrfToken,
                                'Cache-Control': 'no-cache'
                            }
                        });
                        
                        if (apiTestResponse.ok) {
                            const projectsData = await apiTestResponse.json();
                            console.log('✅ Authenticated API access successful');
                            console.log('🔬 Projects accessible:', Array.isArray(projectsData.data) ? projectsData.data.length : 'unknown');
                            
                            // Create authenticated session
                            this.session = {
                                csrfToken: csrfToken,
                                loginTime: Date.now(),
                                username: username,
                                userId: 'authenticated_user',
                                serverUrl: this.baseUrl,
                                loginMethod: 'Username/Password Authentication',
                                isAuthenticated: true,
                                hasApiAccess: true,
                                projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 0,
                                sessionCookies: this.extractSessionCookies()
                            };
                            
                            console.log('✅ Private Group session established successfully!');
                            console.log('🔬 Session:', this.session);
                            
                            return {
                                success: true,
                                session: this.session,
                                user: { 
                                    userId: 'authenticated_user',
                                    username: username,
                                    groupName: 'private'
                                },
                                loginMethod: 'Username/Password Authentication',
                                isAuthenticated: true,
                                projectCount: this.session.projectCount
                            };
                            
                        } else {
                            const errorText = await apiTestResponse.text();
                            console.warn('❌ Authenticated API access failed:', apiTestResponse.status, errorText);
                            throw new Error(`Authenticated API access failed: ${apiTestResponse.status} - ${errorText}`);
                        }
                        
                    } catch (apiError) {
                        console.error('❌ API test failed after login:', apiError);
                        throw new Error(`API access failed after login: ${apiError.message}`);
                    }
                    
                } else {
                    console.warn('❌ No session cookie found after login attempt');
                    throw new Error('Login failed - no session established');
                }
                
            } else {
                const errorText = await loginResponse.text();
                console.error('❌ Login request failed:', loginResponse.status, errorText);
                
                // Try to extract error message
                let errorMessage = 'Login failed';
                if (errorText.includes('Please correct the error')) {
                    errorMessage = 'Invalid username or password';
                } else if (errorText.includes('account is not active')) {
                    errorMessage = 'Account is not active';
                } else if (loginResponse.status === 403) {
                    errorMessage = 'Access forbidden - check credentials';
                }
                
                throw new Error(`${errorMessage}: ${loginResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Private Group login failed:', error);
            this.session = null;
            this.debugSession();
            throw error;
        }
    },
    
    // Enhanced login with session cookie support
    async loginWithSessionCookies(sessionId, csrfToken) {
        console.log('🔬 === LOGIN WITH SESSION COOKIES ===');
        console.log('🔬 Using provided session cookies...');
        
        try {
            // Set cookies manually
            document.cookie = `sessionid=${sessionId}; path=/; SameSite=Lax`;
            document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=Lax`;
            
            console.log('🔬 Cookies set:', document.cookie);
            
            // Test API access with provided cookies
            const apiTestResponse = await fetch(`${this.baseUrl}api/v0/m/projects/`, {
                method: 'GET',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (apiTestResponse.ok) {
                const projectsData = await apiTestResponse.json();
                console.log('✅ Session cookie authentication successful');
                
                this.session = {
                    csrfToken: csrfToken,
                    loginTime: Date.now(),
                    username: 'session_user',
                    userId: 'session_authenticated_user',
                    serverUrl: this.baseUrl,
                    loginMethod: 'Session Cookie Authentication',
                    isAuthenticated: true,
                    hasApiAccess: true,
                    projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 0,
                    sessionCookies: { sessionId, csrfToken }
                };
                
                return {
                    success: true,
                    session: this.session,
                    loginMethod: 'Session Cookie Authentication',
                    projectCount: this.session.projectCount
                };
                
            } else {
                throw new Error(`Session cookie authentication failed: ${apiTestResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Session cookie login failed:', error);
            this.session = null;
            throw error;
        }
    },
    
    // Main login method with fallback strategies
    async login(username, password) {
        console.log('🔬 === OMERO LOGIN (Enhanced) ===');
        console.log('🔬 Username:', username || 'not provided');
        
        // Strategy 1: Try session cookie recovery first
        try {
            console.log('🔬 Strategy 1: Attempting session cookie recovery...');
            await this.establishSessionFromCookies();
            console.log('✅ Session recovered from existing cookies');
            return {
                success: true,
                session: this.session,
                loginMethod: 'Cookie Recovery'
            };
        } catch (cookieError) {
            console.log('🔬 Cookie recovery failed:', cookieError.message);
        }
        
        // Strategy 2: Username/Password login
        if (username && password) {
            console.log('🔬 Strategy 2: Username/Password login...');
            return await this.loginWithCredentials(username, password);
        }
        
        // Strategy 3: Public group fallback
        console.log('🔬 Strategy 3: Public group fallback...');
        return await this.loginPublicGroup();
    },
    
    // Public group login (original implementation)
    async loginPublicGroup() {
        console.log('🔬 === PUBLIC GROUP SESSION ESTABLISHMENT ===');
        
        try {
            const csrfToken = await this.getCSRFToken();
            
            // Test API access without login (public group feature)
            const projectsResponse = await fetch(`${this.baseUrl}api/v0/m/projects/`, {
                method: 'GET',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRFToken': csrfToken,
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (projectsResponse.ok) {
                const projectsData = await projectsResponse.json();
                
                this.session = {
                    csrfToken: csrfToken,
                    loginTime: Date.now(),
                    username: 'public_user',
                    userId: 'public_group_user',
                    serverUrl: this.baseUrl,
                    loginMethod: 'Public Group Direct Access',
                    isPublicGroup: true,
                    hasApiAccess: true,
                    projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 0
                };
                
                console.log('✅ Public Group session established successfully!');
                
                return {
                    success: true,
                    session: this.session,
                    loginMethod: 'Public Group Direct Access',
                    isPublicGroup: true,
                    projectCount: this.session.projectCount
                };
                
            } else {
                throw new Error(`Public API access failed: ${projectsResponse.status}`);
            }
            
        } catch (error) {
            console.error('❌ Public Group session establishment failed:', error);
            throw error;
        }
    },
    
    // Extract session cookies from document.cookie
    extractSessionCookies() {
        const cookies = {};
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name === 'sessionid' || name === 'csrftoken') {
                cookies[name] = value;
            }
        });
        return cookies;
    },
    
    // Try to use existing session cookies
    async establishSessionFromCookies() {
        console.log('🔬 === Trying to establish session from existing cookies ===');
        
        const cookies = document.cookie;
        if (!cookies || (!cookies.includes('csrftoken') && !cookies.includes('sessionid'))) {
            throw new Error('No relevant cookies found');
        }
        
        console.log('🔬 Found cookies:', cookies);
        
        // Extract CSRF token from cookies
        let csrfToken = null;
        const csrfMatch = cookies.match(/csrftoken=([^;]+)/);
        if (csrfMatch) {
            csrfToken = csrfMatch[1];
            console.log('🔬 Extracted CSRF token from cookies:', csrfToken.substring(0, 10) + '...');
        }
        
        if (!csrfToken) {
            throw new Error('No CSRF token in cookies');
        }
        
        // Test API access with existing cookies
        const projectsResponse = await fetch(`${this.baseUrl}api/v0/m/projects/`, {
            method: 'GET',
            credentials: 'include',
            mode: 'cors',
            headers: {
                'Accept': 'application/json',
                'X-CSRFToken': csrfToken,
                'Cache-Control': 'no-cache'
            }
        });
        
        if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json();
            
            // Create session from cookies
            this.session = {
                csrfToken: csrfToken,
                loginTime: Date.now(),
                username: 'cookie_user',
                userId: 'cookie_session_user',
                serverUrl: this.baseUrl,
                loginMethod: 'Cookie Session Recovery',
                isAuthenticated: true,
                hasApiAccess: true,
                projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 0,
                sessionCookies: this.extractSessionCookies()
            };
            
            console.log('✅ Session established from cookies!');
            return this.session;
        } else {
            throw new Error(`API test failed: ${projectsResponse.status}`);
        }
    },
    
    // =================== SESSION VALIDATION ===================
    
    isSessionValid() {
        if (!this.session) return false;
        
        const sessionAge = Date.now() - this.session.loginTime;
        return sessionAge < this.options.sessionTimeout;
    },
    
    // Ensure valid session
    async ensureSession(username, password) {
        if (!this.isSessionValid()) {
            await this.login(username, password);
        }
        return this.session;
    },
    
    // Logout (enhanced)
    async logout() {
        if (this.session) {
            // Try to logout via OMERO.web if authenticated
            if (this.session.isAuthenticated && this.session.csrfToken) {
                try {
                    await fetch(`${this.baseUrl}webclient/logout/`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'X-CSRFToken': this.session.csrfToken
                        }
                    });
                    console.log('🔬 OMERO logout request sent');
                } catch (error) {
                    console.warn('🔬 Logout request failed:', error);
                }
            }
            
            this.session = null;
            console.log('🔬 Session cleared');
        }
    },
    
    // =================== API REQUESTS ===================
    
    // Generic API request with session handling
    async apiRequest(endpoint, options = {}) {
        if (!this.session) {
            throw new Error('No active OMERO session');
        }
        
        const url = `${this.baseUrl}${endpoint}`;
        const requestOptions = {
            headers: {
                'X-CSRFToken': this.session.csrfToken,
                'Accept': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            mode: 'cors',
            ...options
        };
        
        // Add Content-Type for POST/PATCH requests
        if (options.method && ['POST', 'PATCH', 'PUT'].includes(options.method.toUpperCase())) {
            requestOptions.headers['Content-Type'] = 'application/json';
        }
        
        try {
            console.log(`🔬 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const result = await response.json();
            console.log(`✅ API request successful: ${endpoint}`);
            
            return result;
        } catch (error) {
            console.error(`❌ OMERO API request failed [${endpoint}]:`, error);
            throw error;
        }
    },
    
    // =================== PROJECTS ===================
    
    // Get all projects
    async getProjects() {
        const response = await this.apiRequest('api/v0/m/projects/');
        return response.data || [];
    },
    
    // Create project
    async createProject(name, description = '') {
        const projectData = {
            name: name,
            description: description
        };
        
        const response = await this.apiRequest('api/v0/m/projects/', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
        
        return response.data;
    },
    
    // =================== DATASETS ===================
    
    // Get all datasets
    async getDatasets() {
        const response = await this.apiRequest('api/v0/m/datasets/');
        return response.data || [];
    },
    
    // Create dataset
    async createDataset(name, description = '') {
        const datasetData = {
            name: name,
            description: description
        };
        
        const response = await this.apiRequest('api/v0/m/datasets/', {
            method: 'POST',
            body: JSON.stringify(datasetData)
        });
        
        return response.data;
    },
    
    // Link dataset to project
    async linkDatasetToProject(datasetId, projectId) {
        const linkData = {
            parent: {
                '@type': 'http://www.openmicroscopy.org/Schemas/OME/2016-06#Project',
                '@id': projectId
            },
            child: {
                '@type': 'http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset',
                '@id': datasetId
            }
        };
        
        const response = await this.apiRequest('api/v0/m/projectdatasetlinks/', {
            method: 'POST',
            body: JSON.stringify(linkData)
        });
        
        return response.data;
    },
    
    // =================== UTILITY METHODS ===================
    
    // Test connection without login
    async testConnection() {
        try {
            const token = await this.getCSRFToken();
            return {
                success: true,
                message: 'Successfully connected to OMERO server',
                hasToken: !!token
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },
    
    // Enhanced connection test with multiple strategies
    async testConnectionEnhanced() {
        try {
            console.log('🔬 Starting enhanced connection test...');
            
            // Test 1: Basic connectivity
            const basicTest = await this.testConnection();
            if (!basicTest.success) {
                return basicTest;
            }
            
            // Test 2: Try different login strategies
            const strategies = [];
            
            // Strategy: Cookie recovery
            try {
                await this.establishSessionFromCookies();
                strategies.push({
                    name: 'Cookie Recovery',
                    success: true,
                    projects: this.session?.projectCount || 0
                });
            } catch (error) {
                strategies.push({
                    name: 'Cookie Recovery',
                    success: false,
                    error: error.message
                });
            }
            
            // Strategy: Public group
            try {
                await this.loginPublicGroup();
                strategies.push({
                    name: 'Public Group',
                    success: true,
                    projects: this.session?.projectCount || 0
                });
            } catch (error) {
                strategies.push({
                    name: 'Public Group',
                    success: false,
                    error: error.message
                });
            }
            
            const workingStrategies = strategies.filter(s => s.success);
            
            return {
                success: workingStrategies.length > 0,
                message: `Enhanced test complete - ${workingStrategies.length} working strategies`,
                strategies: strategies,
                bestStrategy: workingStrategies[0] || null,
                hasPrivateAccess: this.session?.isAuthenticated || false,
                hasPublicAccess: this.session?.isPublicGroup || false
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Enhanced test failed: ${error.message}`
            };
        }
    },
    
    // Get webclient URL for object
    getWebclientUrl(objectType, objectId) {
        return `${this.baseUrl}webclient/?show=${objectType}-${objectId}`;
    }
};

// Make globally available
window.omeroClient = omeroClient;
console.log('✅ OMERO Client loaded (Enhanced Private Group Support)');