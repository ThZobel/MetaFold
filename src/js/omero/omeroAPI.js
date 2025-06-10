// OMERO API - Basic Request Handling and Core API Functions

const omeroAPI = {
    initialized: false,

    // Initialize API module
    init() {
        this.initialized = true;
        console.log('🔬 OMERO API Module initialized');
        return this;
    },

    // =================== ENHANCED REQUEST HANDLING ===================

    // Enhanced request with retry logic and proper error handling
    async makeRequest(url, options = {}) {
        if (!window.omeroAuth || !window.omeroAuth.baseUrl) {
            throw new Error('OMERO auth not initialized');
        }

        const defaultOptions = {
            credentials: 'include',
            mode: 'cors',
            headers: {
                'Origin': window.location.origin,
                'Referer': window.location.href,
                ...options.headers
            },
            ...options
        };

        const maxRetries = window.omeroAuth.options?.maxRetries || 3;
        const retryDelay = window.omeroAuth.options?.retryDelay || 1000;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, defaultOptions);
                
                if (response.ok) {
                    return await response.json();
                } else {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
            } catch (error) {
                if (attempt < maxRetries && !error.message.includes('CSRF')) {
                    console.warn(`⚠️ Request failed (attempt ${attempt}), retrying...`);
                    await this.delay(retryDelay * attempt);
                    continue;
                }
                throw error;
            }
        }
    },

    // API request with authentication and CSRF handling
    async apiRequest(endpoint, options = {}) {
        if (!window.omeroAuth || (!window.omeroAuth.session && !options.skipAuth)) {
            throw new Error('No active OMERO session');
        }
        
        const url = `${window.omeroAuth.baseUrl}${endpoint}`;
        const csrfToken = window.omeroAuth.getBestCSRFToken();
        
        const requestOptions = {
            headers: {
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        if (options.method && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method.toUpperCase())) {
            if (csrfToken) {
                requestOptions.headers['X-CSRFToken'] = csrfToken;
            }
            requestOptions.headers['Content-Type'] = 'application/json';
        }
        
        return await this.makeRequest(url, requestOptions);
    },

    // =================== BASIC API ENDPOINTS ===================

    // Get server information
    async getServerInfo() {
        try {
            const response = await this.apiRequest('api/v0/servers/', {
                method: 'GET'
            });
            return response.data || [];
        } catch (error) {
            console.warn('Could not get server info:', error);
            return [];
        }
    },

    // Get current user information
    async getCurrentUser() {
        try {
            const userEndpoints = [
                'api/v0/m/experimenters/',
                'webclient/api/experimenters/',
                'webgateway/experimenter_list/'
            ];
            
            for (const endpoint of userEndpoints) {
                try {
                    const response = await this.apiRequest(endpoint);
                    console.log('🔬 User data from', endpoint, ':', !!response.data);
                    
                    if (response.data && response.data.length > 0) {
                        const currentUser = response.data.find(user => 
                            user.omeName === window.omeroAuth.session?.username || 
                            user.UserName === window.omeroAuth.session?.username
                        ) || response.data[0];
                        
                        return currentUser;
                    }
                } catch (error) {
                    console.log(`❌ User endpoint ${endpoint} failed:`, error.message);
                    continue;
                }
            }
            
            return null;
        } catch (error) {
            console.warn('Could not get current user:', error);
            return null;
        }
    },

    // =================== DATASET OPERATIONS ===================

    // Get all datasets
    async getDatasets() {
        const response = await this.apiRequest('api/v0/m/datasets/');
        return response.data || [];
    },

    // Create dataset
    async createDataset(name, description = '') {
        const datasetData = { name, description };
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

    // =================== ANNOTATION OPERATIONS ===================

    // Create Map Annotation
    async createMapAnnotation(mapPairs, namespace = 'NFDI4BioImage.MetaFold.ExperimentMetadata') {
        const annotationData = {
            '@type': 'http://www.openmicroscopy.org/Schemas/OME/2016-06#MapAnnotation',
            'mapValue': mapPairs.map(pair => ({
                '@type': 'http://www.openmicroscopy.org/Schemas/OME/2016-06#NamedValue',
                'name': pair.name,
                'value': pair.value
            })),
            'ns': namespace
        };

        // Try multiple annotation endpoints
        const annotationEndpoints = [
            'api/v0/m/annotations/',
            'webclient/api/annotations/',
            'api/v0/m/mapannotations/',
            'webgateway/annotation/',
            'webclient/api/mapannotations/'
        ];

        let response = null;
        let workingEndpoint = null;
        let lastError = null;

        for (const endpoint of annotationEndpoints) {
            try {
                console.log(`🔬 Testing annotation endpoint: ${endpoint}`);
                
                response = await this.apiRequest(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(annotationData)
                });

                if (response && (response.data || response['@id'] || response.id)) {
                    workingEndpoint = endpoint;
                    console.log(`✅ Working annotation endpoint: ${endpoint}`);
                    break;
                } else if (response && Array.isArray(response)) {
                    workingEndpoint = endpoint;
                    console.log(`✅ Working annotation endpoint (array): ${endpoint}`);
                    break;
                } else {
                    console.log(`⚠️ Empty response from ${endpoint}`);
                }
                
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                lastError = error;
                continue;
            }
        }

        if (!response || !workingEndpoint) {
            throw new Error(`All annotation endpoints failed. Last error: ${lastError?.message}`);
        }

        return {
            response: response,
            workingEndpoint: workingEndpoint
        };
    },

    // Link annotation to object
    async linkAnnotationToObject(annotationId, objectId, objectType) {
        if (!annotationId || !objectId) {
            throw new Error('Missing annotation ID or object ID for linking');
        }

        const linkData = {
            '@type': `http://www.openmicroscopy.org/Schemas/OME/2016-06#${objectType.charAt(0).toUpperCase() + objectType.slice(1)}AnnotationLink`,
            'parent': {
                '@type': `http://www.openmicroscopy.org/Schemas/OME/2016-06#${objectType.charAt(0).toUpperCase() + objectType.slice(1)}`,
                '@id': objectId
            },
            'child': {
                '@type': 'http://www.openmicroscopy.org/Schemas/OME/2016-06#MapAnnotation',
                '@id': annotationId
            }
        };

        console.log('🔬 Link data:', JSON.stringify(linkData, null, 2));

        try {
            const response = await this.apiRequest(`webclient/api/${objectType}annotationlinks/`, {
                method: 'POST',
                body: JSON.stringify(linkData)
            });

            console.log('✅ Linking successful via webclient API');
            return response;

        } catch (error) {
            console.warn('⚠️ Linking failed:', error.message);
            throw error;
        }
    },

    // =================== UTILITY METHODS ===================

    // Extract ID from API response
    extractIdFromResponse(response) {
        console.log('🔧 Extracting ID from response...');
        console.log('🔧 Raw response:', response);
        
        let id = null;
        
        // Strategy 1: response.data['@id'] (Standard OMERO API)
        if (response && response.data && response.data['@id']) {
            id = response.data['@id'];
            console.log('✅ ID found via response.data["@id"]:', id);
            return id;
        }
        
        // Strategy 2: response.data.id (Alternative)
        if (response && response.data && response.data.id) {
            id = response.data.id;
            console.log('✅ ID found via response.data.id:', id);
            return id;
        }
        
        // Strategy 3: response['@id'] (Direct response)
        if (response && response['@id']) {
            id = response['@id'];
            console.log('✅ ID found via response["@id"]:', id);
            return id;
        }
        
        // Strategy 4: response.id (Direct response alternative)
        if (response && response.id) {
            id = response.id;
            console.log('✅ ID found via response.id:', id);
            return id;
        }
        
        // Strategy 5: Array Response
        if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
            const firstItem = response.data[0];
            if (firstItem['@id']) {
                id = firstItem['@id'];
                console.log('✅ ID found via response.data[0]["@id"]:', id);
                return id;
            }
            if (firstItem.id) {
                id = firstItem.id;
                console.log('✅ ID found via response.data[0].id:', id);
                return id;
            }
        }
        
        // Strategy 6: Location Header
        if (response && response.headers && response.headers.location) {
            const locationMatch = response.headers.location.match(/\/(\d+)$/);
            if (locationMatch) {
                id = locationMatch[1];
                console.log('✅ ID extracted from Location header:', id);
                return id;
            }
        }
        
        // Strategy 7: JSON Pattern Search
        if (response && typeof response === 'object') {
            const responseStr = JSON.stringify(response);
            
            const idMatch = responseStr.match(/"@id":\s*(\d+)/) || responseStr.match(/"id":\s*(\d+)/);
            if (idMatch) {
                id = idMatch[1];
                console.log('✅ ID found via JSON pattern:', id);
                return id;
            }
        }
        
        console.error('❌ No ID found in response');
        console.error('❌ Response structure:', JSON.stringify(response, null, 2));
        
        return null;
    },

    // Delay function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Get webclient URL for objects
    getWebclientUrl(objectType, objectId) {
        if (!window.omeroAuth || !window.omeroAuth.baseUrl) {
            return null;
        }
        return `${window.omeroAuth.baseUrl}webclient/?show=${objectType}-${objectId}`;
    },

    // =================== ENDPOINT TESTING ===================

    // Test multiple endpoints to find working ones
    async testEndpoint(endpoints, method = 'GET', data = null) {
        for (const endpoint of endpoints) {
            try {
                console.log(`🔬 Testing endpoint: ${endpoint}`);
                
                const options = { method: method };
                if (data && method !== 'GET') {
                    options.body = JSON.stringify(data);
                }
                
                const response = await this.apiRequest(endpoint, options);
                
                if (response && (response.data || response.length >= 0)) {
                    console.log(`✅ Working endpoint found: ${endpoint}`);
                    return { endpoint, response };
                }
                
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                continue;
            }
        }
        
        throw new Error('No working endpoint found');
    },

    // Enhanced connection test with endpoint discovery
    async testConnectionEnhanced() {
        try {
            console.log('🔬 Starting enhanced connection test...');
            
            // Test 1: Basic connectivity with CSRF
            const basicTest = await window.omeroAuth.testConnection();
            if (!basicTest.success) {
                return basicTest;
            }
            
            // Test 2: CSRF token functionality
            console.log('🔬 Testing CSRF token functionality...');
            let csrfTest = { success: false, error: 'Not tested' };
            try {
                const token = await window.omeroAuth.getCSRFToken();
                const cookieToken = window.omeroAuth.getCSRFTokenFromCookie();
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
                await window.omeroAuth.establishSessionFromCookies();
                strategies.push({
                    name: 'Cookie Recovery',
                    success: true,
                    projects: window.omeroAuth.session?.projectCount || 0
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
                await window.omeroAuth.loginPublicGroup();
                strategies.push({
                    name: 'Public Group',
                    success: true,
                    projects: window.omeroAuth.session?.projectCount || 0
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
                csrf_test: csrfTest,
                strategies: strategies,
                bestStrategy: workingStrategies[0] || null,
                hasPrivateAccess: window.omeroAuth.session?.isAuthenticated || false,
                hasPublicAccess: window.omeroAuth.session?.isPublicGroup || false,
                fixes_applied: [
                    'Multi-university support',
                    'Enhanced retry logic',
                    'Form-based login priority',
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

    // =================== BATCH OPERATIONS ===================

    // Batch request helper
    async batchRequest(requests) {
        const results = [];
        const errors = [];
        
        for (let i = 0; i < requests.length; i++) {
            const request = requests[i];
            try {
                console.log(`🔬 Batch request ${i + 1}/${requests.length}: ${request.endpoint}`);
                const result = await this.apiRequest(request.endpoint, request.options);
                results.push({ index: i, success: true, data: result });
            } catch (error) {
                console.error(`❌ Batch request ${i + 1} failed:`, error);
                errors.push({ index: i, success: false, error: error.message });
                results.push({ index: i, success: false, error: error.message });
            }
        }
        
        return {
            results: results,
            errors: errors,
            successCount: results.filter(r => r.success).length,
            errorCount: errors.length
        };
    }
};

// Make globally available
window.omeroAPI = omeroAPI;
console.log('✅ OMERO API Module loaded');