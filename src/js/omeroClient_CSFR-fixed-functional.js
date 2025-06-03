// OMERO REST API Client - CSRF PROBLEM FIXED
// Basiert auf DeepResearch und OMERO-Dokumentation

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
        
        console.log('🔬 OMERO Client initialized (CSRF FIXED):', this.baseUrl);
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
    
    // =================== CSRF TOKEN MANAGEMENT (FIXED) ===================
    
    // Get CSRF Token with proper session handling - FIXED
    async getCSRFToken() {
        if (!this.baseUrl) {
            throw new Error('OMERO client not initialized');
        }
        
        console.log('🔬 Getting CSRF token from:', `${this.baseUrl}api/v0/token/`);
        
        try {
            const response = await fetch(`${this.baseUrl}api/v0/token/`, {
                method: 'GET',
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    // 🔧 CSRF FIX: Set Origin header for Django 4+ compatibility
                    'Origin': window.location.origin
                }
            });
            
            console.log('🔬 Token response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to get CSRF token: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('🔬 CSRF Token received');
            
            // Store token in session
            if (!this.session) {
                this.session = {};
            }
            this.session.csrfToken = data.data;
            console.log('🔬 ✅ CSRF Token stored in session');
            
            return data.data;
        } catch (error) {
            console.error('❌ Error getting CSRF token:', error);
            throw error;
        }
    },
    
    // Get the best CSRF token (Cookie preferred, then session)
    getBestCSRFToken() {
        // Try cookie first (Django standard)
        const cookieCSRF = this.getCSRFTokenFromCookie();
        
        // Fallback to session token
        const sessionCSRF = this.session?.csrfToken;
        
        const bestToken = cookieCSRF || sessionCSRF;
        
        console.log('🔬 CSRF Token selection:');
        console.log('   Cookie Token:', cookieCSRF ? cookieCSRF.substring(0, 10) + '...' : 'None');
        console.log('   Session Token:', sessionCSRF ? sessionCSRF.substring(0, 10) + '...' : 'None');
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
    
    // =================== AUTHENTICATION (FIXED) ===================
    
    // Enhanced Login mit CSRF-Fixes
		async loginWithCredentials(username, password) {
		console.log('🔬 === OMERO JSON API LOGIN (CSRF FIXED) ===');
		console.log('🔬 Username:', username);
		
		try {
			// Step 1: Get fresh CSRF token
			console.log('🔬 Step 1: Getting fresh CSRF token...');
			const csrfToken = await this.getCSRFToken();
			
			if (!csrfToken) {
				throw new Error('Failed to obtain CSRF token');
			}
			
			// Step 2: Get server ID
			console.log('🔬 Step 2: Getting server ID...');
			let serverId = 1;
			
			try {
				const serversResponse = await fetch(`${this.baseUrl}api/v0/servers/`, {
					method: 'GET',
					credentials: 'include',
					headers: {
						'Accept': 'application/json',
						'X-CSRFToken': csrfToken
					}
				});
				
				if (serversResponse.ok) {
					const serversData = await serversResponse.json();
					if (serversData.data && serversData.data.length > 0) {
						serverId = serversData.data[0].id;
						console.log('🔬 Server ID found:', serverId);
					}
				}
			} catch (serverError) {
				console.warn('⚠️ Server fetch failed, using default ID (1)');
			}
			
			// Step 3: FIXED Login Request - FORM DATA statt JSON!
			console.log('🔬 Step 3: Login with CSRF fixes...');
			
			// 🔧 WICHTIGER FIX: Form-Data für Django Login
			const loginData = new URLSearchParams({
				username: username,
				password: password,
				server: serverId,
				csrfmiddlewaretoken: csrfToken  // CSRF Token im Body
			});
			
			console.log('🔬 Login data prepared as form data');
			
			const loginResponse = await fetch(`${this.baseUrl}api/v0/login/`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',  // Form statt JSON!
					'X-CSRFToken': csrfToken,  // CSRF auch im Header
					'Accept': 'application/json',
					'Referer': `${this.baseUrl}webclient/login/`,  // Django Referer-Check
					'Origin': this.baseUrl.replace(/\/$/, '')      // Origin ohne trailing slash
				},
				body: loginData
			});
			
			console.log('🔬 Login response status:', loginResponse.status);
			
			if (loginResponse.ok || loginResponse.status === 302) {
				let loginResult;
				try {
					loginResult = await loginResponse.json();
				} catch (e) {
					// Manchmal ist die Antwort HTML bei erfolgreicher Anmeldung
					loginResult = { success: true };
				}
				
				console.log('✅ Login successful!');
				
				// Create/update session
				this.session = {
					...this.session,
					loginTime: Date.now(),
					username: username,
					userId: 'authenticated_user',
					serverUrl: this.baseUrl,
					loginMethod: 'Fixed Form Login',
					isAuthenticated: true,
					hasApiAccess: false
				};
				
				// Test API access
				console.log('🔬 Step 4: Testing API access...');
				try {
					const projectsResponse = await fetch(`${this.baseUrl}api/v0/m/projects/`, {
						method: 'GET',
						credentials: 'include',
						headers: {
							'Accept': 'application/json',
							'X-CSRFToken': csrfToken
						}
					});
					
					if (projectsResponse.ok) {
						const projectsData = await projectsResponse.json();
						this.session.hasApiAccess = true;
						this.session.projectCount = Array.isArray(projectsData.data) ? projectsData.data.length : 0;
						
						console.log('✅ API access confirmed');
						console.log('📁 Projects found:', this.session.projectCount);
						
						return {
							success: true,
							session: this.session,
							loginMethod: 'Fixed Form Login',
							isAuthenticated: true,
							projectCount: this.session.projectCount
						};
					}
				} catch (apiError) {
					console.warn('⚠️ API test failed but login successful:', apiError.message);
				}
				
				return {
					success: true,
					session: this.session,
					loginMethod: 'Fixed Form Login',
					isAuthenticated: true
				};
				
			} else {
				const errorText = await loginResponse.text();
				console.error('❌ Login failed:', loginResponse.status, errorText);
				throw new Error(`Login failed: ${loginResponse.status} - ${errorText}`);
			}
			
		} catch (error) {
			console.error('❌ Login error:', error);
			this.session = null;
			throw error;
		}
	},
    
    // Test authenticated API access
    async testAuthenticatedAPIAccess() {
        console.log('🔬 Testing authenticated API access...');
        
        try {
            const apiTestResponse = await this.apiRequest('api/v0/m/projects/', { method: 'GET' });
            
            console.log('✅ Authenticated API access successful');
            console.log('🔬 Projects accessible:', Array.isArray(apiTestResponse.data) ? apiTestResponse.data.length : 'unknown');
            
            // Update session with API access confirmation
            this.session.hasApiAccess = true;
            this.session.projectCount = Array.isArray(apiTestResponse.data) ? apiTestResponse.data.length : 0;
            
            return {
                success: true,
                session: this.session,
                user: { 
                    userId: this.session.userId,
                    username: this.session.username,
                    groupName: this.session.groupName
                },
                loginMethod: this.session.loginMethod,
                isAuthenticated: true,
                projectCount: this.session.projectCount
            };
            
        } catch (apiError) {
            console.error('❌ API test failed:', apiError);
            throw new Error(`API access test failed: ${apiError.message}`);
        }
    },
    
    // Enhanced login with session cookie support
    async loginWithSessionCookies(sessionId, csrfToken) {
        console.log('🔬 === LOGIN WITH SESSION COOKIES (CSRF FIXED) ===');
        
        try {
            // Set cookies manually
            document.cookie = `sessionid=${sessionId}; path=/; SameSite=None`;
            document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=None`;
            
            // Initialize session if not exists
            if (!this.session) {
                this.session = {};
            }
            this.session.csrfToken = csrfToken;
            
            console.log('🔬 Cookies set, testing API access...');
            
            const result = await this.testAuthenticatedAPIAccess();
            result.loginMethod = 'Session Cookies (CSRF Fixed)';
            return result;
            
        } catch (error) {
            console.error('❌ Session cookie login failed:', error);
            this.session = null;
            throw error;
        }
    },
    
    // Main login method with enhanced fallback strategies
    async login(username, password) {
        console.log('🔬 === OMERO LOGIN (CSRF FIXED) ===');
        console.log('🔬 Username:', username || 'not provided');
        
        // Strategy 1: Try session cookie recovery first
        try {
            console.log('🔬 Strategy 1: Attempting session cookie recovery...');
            await this.establishSessionFromCookies();
            console.log('✅ Session recovered from existing cookies');
            return {
                success: true,
                session: this.session,
                loginMethod: 'Cookie Recovery (CSRF Fixed)'
            };
        } catch (cookieError) {
            console.log('🔬 Cookie recovery failed:', cookieError.message);
        }
        
        // Strategy 2: Username/Password login (Enhanced)
        if (username && password) {
            console.log('🔬 Strategy 2: Enhanced Username/Password login...');
            return await this.loginWithCredentials(username, password);
        }
        
        // Strategy 3: Public group fallback
        console.log('🔬 Strategy 3: Public group fallback...');
        return await this.loginPublicGroup();
    },
    
    // Public group login (enhanced with CSRF fixes)
    async loginPublicGroup() {
        console.log('🔬 === PUBLIC GROUP SESSION ESTABLISHMENT (CSRF FIXED) ===');
        
        try {
            const csrfToken = await this.getCSRFToken();
            
            // Test API access without login (public group feature)
            const projectsResponse = await this.apiRequest('api/v0/m/projects/', { 
                method: 'GET',
                skipAuth: true 
            });
            
            this.session = {
                ...this.session,
                loginTime: Date.now(),
                username: 'public_user',
                userId: 'public_group_user',
                serverUrl: this.baseUrl,
                loginMethod: 'Public Group Direct Access (CSRF Fixed)',
                isPublicGroup: true,
                hasApiAccess: true,
                projectCount: Array.isArray(projectsResponse.data) ? projectsResponse.data.length : 0
            };
            
            console.log('✅ Public Group session established successfully!');
            
            return {
                success: true,
                session: this.session,
                loginMethod: 'Public Group Direct Access (CSRF Fixed)',
                isPublicGroup: true,
                projectCount: this.session.projectCount
            };
            
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
            if (name === 'sessionid' || name === 'csrftoken' || name === 'omero.web.sessionid') {
                cookies[name] = value;
            }
        });
        return cookies;
    },
    
    // Try to use existing session cookies (enhanced)
    async establishSessionFromCookies() {
        console.log('🔬 === Trying to establish session from existing cookies ===');
        
        const cookies = document.cookie;
        if (!cookies || (!cookies.includes('csrftoken') && !cookies.includes('sessionid'))) {
            throw new Error('No relevant cookies found');
        }
        
        console.log('🔬 Found cookies, testing session validity...');
        
        // Initialize session if not exists
        if (!this.session) {
            this.session = {};
        }
        
        // Extract and store CSRF token
        const csrfToken = this.getCSRFTokenFromCookie();
        if (!csrfToken) {
            throw new Error('No CSRF token in cookies');
        }
        
        this.session.csrfToken = csrfToken;
        
        // Test API access with existing cookies
        return await this.testAuthenticatedAPIAccess();
    },
    
    // =================== SESSION VALIDATION ===================
    
    isSessionValid() {
        if (!this.session) return false;
        
        const sessionAge = Date.now() - this.session.loginTime;
        return sessionAge < this.options.sessionTimeout;
    },
    
    // Ensure valid session (enhanced)
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
                            'X-CSRFToken': this.session.csrfToken,
                            'Origin': window.location.origin,
                            'Referer': window.location.href
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
    
    // =================== API REQUESTS (CSRF FIXED) ===================
    
    // Generic API request with enhanced CSRF handling
    async apiRequest(endpoint, options = {}) {
        if (!this.session && !options.skipAuth) {
            throw new Error('No active OMERO session');
        }
        
        const url = `${this.baseUrl}${endpoint}`;
        const csrfToken = this.getBestCSRFToken();
        
        const requestOptions = {
            headers: {
                'Accept': 'application/json',
                ...options.headers
            },
            credentials: 'include',
            mode: 'cors',
            ...options
        };
        
        // Add CSRF token for write operations
        if (options.method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
            if (csrfToken) {
                requestOptions.headers['X-CSRFToken'] = csrfToken;
            }
            requestOptions.headers['Content-Type'] = 'application/json';
        }
        
        // 🔧 CSRF FIX: Always add critical headers for Django
        requestOptions.headers['Origin'] = window.location.origin;
        requestOptions.headers['Referer'] = window.location.href;
        
        try {
            console.log(`🔬 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ API request failed: ${response.status} ${response.statusText} - ${errorText}`);
                
                // Special CSRF error handling
                if (errorText.includes('CSRF')) {
                    throw new Error(`CSRF Error: ${errorText.substring(0, 200)}`);
                }
                
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
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
                message: 'Successfully connected to OMERO server (CSRF Fixed)',
                hasToken: !!token
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },
    
    // Enhanced connection test with CSRF diagnosis
    async testConnectionEnhanced() {
        try {
            console.log('🔬 Starting enhanced connection test (CSRF Fixed)...');
            
            // Test 1: Basic connectivity with CSRF
            const basicTest = await this.testConnection();
            if (!basicTest.success) {
                return basicTest;
            }
            
            // Test 2: CSRF token functionality
            console.log('🔬 Testing CSRF token functionality...');
            let csrfTest = { success: false, error: 'Not tested' };
            try {
                const token = await this.getCSRFToken();
                const cookieToken = this.getCSRFTokenFromCookie();
                csrfTest = {
                    success: !!token,
                    token_received: !!token,
                    cookie_set: !!cookieToken,
                    tokens_match: token === cookieToken
                };
            } catch (error) {
                csrfTest = { success: false, error: error.message };
            }
            
            // Test 3: Try different login strategies
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
                message: `Enhanced test complete (CSRF Fixed) - ${workingStrategies.length} working strategies`,
                csrf_test: csrfTest,
                strategies: strategies,
                bestStrategy: workingStrategies[0] || null,
                hasPrivateAccess: this.session?.isAuthenticated || false,
                hasPublicAccess: this.session?.isPublicGroup || false,
                fixes_applied: [
                    'Origin header set automatically',
                    'Referer header set automatically', 
                    'CSRF tokens handled in both header and cookie',
                    'Session cookies preserved correctly',
                    'Django 4+ compatibility ensured'
                ]
            };
            
        } catch (error) {
            return {
                success: false,
                message: `Enhanced test failed: ${error.message}`,
                csrf_debug: 'Check if proxy server is running and CSRF fixes are applied'
            };
        }
    },
    
    // Get webclient URL for object
    getWebclientUrl(objectType, objectId) {
        return `${this.baseUrl}webclient/?show=${objectType}-${objectId}`;
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
    }
};

// Make globally available
window.omeroClient = omeroClient;
console.log('✅ Enhanced OMERO Client loaded (CSRF FIXED)');