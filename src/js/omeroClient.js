// OMERO REST API Client - Public Group Bypass (No Login Required)

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
        
        console.log('🔬 OMERO Client initialized (Public Group Mode):', this.baseUrl);
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
    
    // =================== PUBLIC GROUP AUTHENTICATION ===================
    
    // Get CSRF Token
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
    
    // Public Group "Login" - Actually just establish session without authentication
    async login(username, password) {
        console.log('🔬 === PUBLIC GROUP SESSION ESTABLISHMENT ===');
        console.log('🔬 Username:', username);
        console.log('🔬 Note: Public group allows direct API access without login');
        
        try {
            // Step 1: Get CSRF token to establish session
            console.log('🔬 Step 1: Establishing session with CSRF token...');
            const csrfToken = await this.getCSRFToken();
            
            if (!csrfToken) {
                throw new Error('Failed to obtain CSRF token');
            }
            
            console.log('🔬 CSRF Token obtained:', csrfToken.substring(0, 10) + '...');
            console.log('🔬 Cookies after token:', document.cookie || 'NONE');
            
            // Step 2: Test API access without login (public group feature)
            console.log('🔬 Step 2: Testing public API access...');
            
            try {
                // Test projects endpoint - this should work in public group
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
                
                console.log('🔬 Projects API test:', projectsResponse.status, projectsResponse.statusText);
                
                if (projectsResponse.ok) {
                    const projectsData = await projectsResponse.json();
                    console.log('🔬 Projects data preview:', {
                        dataType: typeof projectsData.data,
                        projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 'unknown',
                        sampleProject: projectsData.data && projectsData.data[0] ? projectsData.data[0].Name : 'none'
                    });
                    
                    // Step 3: Create public session object
                    this.session = {
                        csrfToken: csrfToken,
                        loginTime: Date.now(),
                        username: username || 'public_user',
                        userId: 'public_group_user',
                        serverUrl: this.baseUrl,
                        loginMethod: 'Public Group Direct Access',
                        isPublicGroup: true,
                        hasApiAccess: true,
                        projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 0
                    };
                    
                    console.log('✅ Public Group session established successfully!');
                    console.log('🔬 Session:', this.session);
                    
                    return {
                        success: true,
                        session: this.session,
                        user: { 
                            userId: 'public_group_user',
                            username: username || 'public_user',
                            groupName: 'public'
                        },
                        loginMethod: 'Public Group Direct Access',
                        isPublicGroup: true,
                        projectCount: this.session.projectCount
                    };
                    
                } else {
                    const errorText = await projectsResponse.text();
                    console.warn('❌ Public API access failed:', projectsResponse.status, errorText);
                    throw new Error(`Public API access failed: ${projectsResponse.status} - ${errorText}`);
                }
                
            } catch (apiError) {
                console.error('❌ Public API test failed:', apiError);
                throw new Error(`Public group API access failed: ${apiError.message}`);
            }
            
        } catch (error) {
            console.error('❌ Public Group session establishment failed:', error);
            this.session = null;
            this.debugSession();
            throw error;
        }
    },
    
    // Alternative: Try to use existing session cookies
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
        try {
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
                    isPublicGroup: true,
                    hasApiAccess: true,
                    projectCount: Array.isArray(projectsData.data) ? projectsData.data.length : 0
                };
                
                console.log('✅ Session established from cookies!');
                return this.session;
            } else {
                throw new Error(`API test failed: ${projectsResponse.status}`);
            }
            
        } catch (error) {
            console.warn('❌ Cookie session recovery failed:', error);
            throw error;
        }
    },
    
    // Enhanced connection diagnosis
    async diagnoseConnection() {
        console.log('🔬 === PUBLIC GROUP CONNECTION DIAGNOSIS ===');
        
        try {
            // Test 1: Basic connectivity
            console.log('🔬 Test 1: Basic proxy connectivity...');
            const basicTest = await fetch(this.baseUrl, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-cache'
            });
            console.log('🔬 Basic connectivity:', basicTest.status, basicTest.statusText);
            
            // Test 2: Token endpoint
            console.log('🔬 Test 2: Token endpoint...');
            const tokenTest = await fetch(`${this.baseUrl}api/v0/token/`, {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
                cache: 'no-cache'
            });
            console.log('🔬 Token endpoint:', tokenTest.status, tokenTest.statusText);
            
            if (tokenTest.ok) {
                const tokenData = await tokenTest.json();
                console.log('🔬 Token data:', tokenData);
                console.log('🔬 Cookies after token:', document.cookie || 'NONE');
                
                // Test 3: Public API access
                console.log('🔬 Test 3: Public API access test...');
                const publicApiTests = [
                    'api/v0/m/projects/',
                    'api/v0/m/datasets/',
                    'api/v0/servers/'
                ];
                
                const apiResults = {};
                
                for (const endpoint of publicApiTests) {
                    try {
                        const response = await fetch(`${this.baseUrl}${endpoint}`, {
                            method: 'GET',
                            mode: 'cors',
                            credentials: 'include',
                            headers: {
                                'Accept': 'application/json',
                                'X-CSRFToken': tokenData.data
                            }
                        });
                        
                        apiResults[endpoint] = {
                            success: response.ok,
                            status: response.status,
                            statusText: response.statusText
                        };
                        
                        if (response.ok) {
                            const data = await response.json();
                            apiResults[endpoint].dataLength = Array.isArray(data.data) ? data.data.length : 'unknown';
                        }
                        
                    } catch (error) {
                        apiResults[endpoint] = {
                            success: false,
                            error: error.message
                        };
                    }
                }
                
                console.log('🔬 Public API test results:', apiResults);
                
                // Summary
                const workingApis = Object.entries(apiResults).filter(([key, result]) => result.success);
                const failingApis = Object.entries(apiResults).filter(([key, result]) => !result.success);
                
                console.log(`✅ Working APIs: ${workingApis.length}/${publicApiTests.length}`);
                console.log(`❌ Failing APIs: ${failingApis.length}/${publicApiTests.length}`);
                
                if (workingApis.length >= 2) {
                    console.log('🎉 Public Group mode appears to be working!');
                }
            }
            
            return {
                success: true,
                message: 'Public Group diagnosis complete - check console for details'
            };
            
        } catch (error) {
            console.error('❌ Public Group diagnosis failed:', error);
            return {
                success: false,
                message: `Diagnosis failed: ${error.message}`
            };
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
            // First try cookie recovery
            try {
                await this.establishSessionFromCookies();
                console.log('✅ Session recovered from cookies');
                return this.session;
            } catch (cookieError) {
                console.log('🔬 Cookie recovery failed, establishing new session');
                await this.login(username, password);
            }
        }
        return this.session;
    },
    
    // Logout (minimal for public group)
    async logout() {
        if (this.session) {
            this.session = null;
            console.log('🔬 Public Group session cleared');
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
                message: 'Successfully connected to OMERO server (Public Group)',
                hasToken: !!token
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    },
    
    // Enhanced connection test with diagnosis
    async testConnectionEnhanced() {
        try {
            console.log('🔬 Starting enhanced connection test for public group...');
            
            // Run diagnosis
            const diagnosisResult = await this.diagnoseConnection();
            
            if (!diagnosisResult.success) {
                return diagnosisResult;
            }
            
            // Test token endpoint
            const token = await this.getCSRFToken();
            
            return {
                success: true,
                message: 'Enhanced connection test successful (Public Group Mode)',
                hasToken: !!token,
                diagnosis: 'Check console for detailed diagnosis',
                publicGroupSupport: true
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
        const webBaseUrl = 'https://omero-imaging.uni-muenster.de';
        return `${webBaseUrl}/webclient/?show=${objectType}-${objectId}`;
    }
};

// Make globally available
window.omeroClient = omeroClient;
console.log('✅ OMERO Client loaded (Public Group Bypass Mode)');