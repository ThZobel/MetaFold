// OMERO Test Functions Module
// Comprehensive testing, debugging, and validation functions for OMERO integration

const omeroTestFunctions = {
    isInitialized: false,
    
    // Initialize test functions
    init() {
        if (!window.omeroAuth || !window.omeroAPI || !window.omeroUIIntegration) {
            console.error('❌ OMERO Test Functions require omeroAuth, omeroAPI, and omeroUIIntegration modules');
            return false;
        }
        
        this.isInitialized = true;
        console.log('🧪 OMERO Test Functions initialized');
        return true;
    },
    
    // =================== CONNECTION TESTING ===================
    
    // Test OMERO endpoint discovery
    async testOMEROEndpointDiscovery() {
        console.log('🔬 === OMERO ENDPOINT DISCOVERY TEST ===');
        
        try {
            const settings = window.omeroUIIntegration.getSettings();
            
            if (!settings.serverUrl) {
                return {
                    success: false,
                    error: 'No OMERO server URL configured'
                };
            }
            
            // Initialize client first
            await window.omeroUIIntegration.initializeClient();
            
            // Test various OMERO endpoints
            const endpoints = [
                'api/v0/token/',
                'api/v0/servers/',
                'api/v0/login/',
                'api/v0/m/projects/',
                'api/v0/m/datasets/',
                'api/v0/m/experimentergroups/',
                'api/v0/m/annotations/',
                'webclient/api/projects/',
                'webgateway/projects/',
                'api/v0/m/mapannotations/',
                'webclient/api/annotations/'
            ];
            
            const workingEndpoints = {};
            const failedEndpoints = {};
            
            // Test each endpoint
            for (const endpoint of endpoints) {
                try {
                    console.log(`🔬 Testing endpoint: ${endpoint}`);
                    const response = await window.omeroAPI.makeRequest(endpoint, {
                        method: 'GET',
                        skipAuth: true
                    });
                    
                    workingEndpoints[endpoint] = {
                        status: 'success',
                        hasData: !!(response && (response.data || response.length > 0)),
                        responseType: Array.isArray(response) ? 'array' : typeof response
                    };
                    
                    console.log(`✅ ${endpoint}: Working`);
                    
                } catch (error) {
                    failedEndpoints[endpoint] = {
                        status: 'failed',
                        error: error.message
                    };
                    
                    console.log(`❌ ${endpoint}: Failed - ${error.message}`);
                }
            }
            
            // Generate recommendations
            const recommendations = this.generateEndpointRecommendations(workingEndpoints);
            
            return {
                success: true,
                workingEndpoints: workingEndpoints,
                failedEndpoints: failedEndpoints,
                recommendations: recommendations,
                summary: {
                    totalTested: endpoints.length,
                    working: Object.keys(workingEndpoints).length,
                    failed: Object.keys(failedEndpoints).length
                }
            };
            
        } catch (error) {
            console.error('❌ Endpoint discovery failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
    
    // Generate endpoint recommendations based on test results
    generateEndpointRecommendations(workingEndpoints) {
        const recommendations = {
            datasetCreation: 'Unknown',
            annotations: 'Unknown',
            projects: 'Unknown',
            groups: 'Unknown'
        };
        
        // Dataset creation recommendation
        if (workingEndpoints['api/v0/m/datasets/']) {
            recommendations.datasetCreation = 'api/v0/m/datasets/';
        } else if (workingEndpoints['webclient/api/datasets/']) {
            recommendations.datasetCreation = 'webclient/api/datasets/';
        }
        
        // Annotations recommendation
        if (workingEndpoints['api/v0/m/annotations/']) {
            recommendations.annotations = 'api/v0/m/annotations/';
        } else if (workingEndpoints['webclient/api/annotations/']) {
            recommendations.annotations = 'webclient/api/annotations/';
        } else if (workingEndpoints['api/v0/m/mapannotations/']) {
            recommendations.annotations = 'api/v0/m/mapannotations/';
        }
        
        // Projects recommendation
        if (workingEndpoints['api/v0/m/projects/']) {
            recommendations.projects = 'api/v0/m/projects/';
        } else if (workingEndpoints['webclient/api/projects/']) {
            recommendations.projects = 'webclient/api/projects/';
        } else if (workingEndpoints['webgateway/projects/']) {
            recommendations.projects = 'webgateway/projects/';
        }
        
        // Groups recommendation
        if (workingEndpoints['api/v0/m/experimentergroups/']) {
            recommendations.groups = 'api/v0/m/experimentergroups/';
        } else if (workingEndpoints['webclient/api/groups/']) {
            recommendations.groups = 'webclient/api/groups/';
        }
        
        return recommendations;
    },
    
    // =================== QUICK INTEGRATION TEST ===================
    
    // Quick OMERO integration test
    async quickOMEROTest() {
        console.log('🚀 === QUICK OMERO INTEGRATION TEST ===');
        
        try {
            // Step 1: Test connection
            console.log('🚀 Step 1: Testing connection...');
            const connectionTest = await this.testOMEROEndpointDiscovery();
            
            if (!connectionTest.success) {
                return {
                    connection: connectionTest,
                    integration: { success: false, message: 'Connection test failed' }
                };
            }
            
            // Step 2: Test integration with sample data
            console.log('🚀 Step 2: Testing integration with sample data...');
            const sampleMetadata = this.generateSampleMetadata();
            const testProjectName = `MetaFold_QuickTest_${Date.now()}`;
            
            // Ensure we're logged in
            await window.omeroUIIntegration.ensureLoggedIn();
            
            // Test dataset creation
            const integrationResult = await window.omeroDatasetCreation.createDatasetForProject(
                testProjectName,
                sampleMetadata,
                {
                    namespace: 'NFDI4BioImage.MetaFold.QuickTest'
                }
            );
            
            return {
                connection: connectionTest,
                integration: integrationResult
            };
            
        } catch (error) {
            console.error('❌ Quick test failed:', error);
            return {
                connection: { success: false, error: 'Connection failed' },
                integration: { success: false, message: error.message }
            };
        }
    },
    
    // =================== CURRENT EXPERIMENT DATA TEST ===================
    
    // Test with current experiment data from UI
    async testWithCurrentExperimentData() {
        console.log('🧬 === TESTING WITH CURRENT EXPERIMENT DATA ===');
        
        try {
            // Get metadata from current experiment form
            let metadata = null;
            let projectName = 'MetaFold_ExperimentTest';
            
            if (window.experimentForm && window.templateManager?.currentTemplate?.metadata) {
                try {
                    metadata = window.experimentForm.collectData();
                    console.log('🧬 Using metadata from current experiment form');
                    
                    // Try to get project name from UI
                    const projectNameInput = document.getElementById('projectName');
                    if (projectNameInput && projectNameInput.value.trim()) {
                        projectName = projectNameInput.value.trim() + '_Test';
                    }
                } catch (error) {
                    console.warn('🧬 Could not get metadata from experiment form:', error);
                }
            }
            
            // Fallback to sample metadata if no form data
            if (!metadata) {
                metadata = this.generateSampleMetadata();
                console.log('🧬 Using fallback sample metadata');
            }
            
            console.log('🧬 Test metadata:', metadata);
            console.log('🧬 Test project name:', projectName);
            
            // Ensure we're logged in
            await window.omeroUIIntegration.ensureLoggedIn();
            
            // Create dataset with current experiment data
            const result = await window.omeroDatasetCreation.createDatasetForProject(
                projectName,
                metadata,
                {
                    namespace: 'NFDI4BioImage.MetaFold.ExperimentTest'
                }
            );
            
            return result;
            
        } catch (error) {
            console.error('❌ Experiment data test failed:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },
    
    // =================== SAMPLE DATA GENERATION ===================
    
    // Generate sample metadata for testing
    generateSampleMetadata() {
        return {
            'test_experiment_name': { 
                type: 'text', 
                label: 'Test Experiment Name', 
                value: 'MetaFold OMERO Integration Test',
                description: 'Test experiment for validating OMERO functionality'
            },
            'test_researcher': { 
                type: 'text', 
                label: 'Test Researcher', 
                value: 'NFDI4BioImage Team',
                description: 'Researcher conducting the test'
            },
            'test_date': { 
                type: 'date', 
                label: 'Test Date', 
                value: new Date().toISOString().split('T')[0],
                description: 'Date when the test was conducted'
            },
            'test_temperature': { 
                type: 'number', 
                label: 'Test Temperature (°C)', 
                value: 25,
                description: 'Room temperature during test'
            },
            'test_success_expected': { 
                type: 'checkbox', 
                label: 'Success Expected', 
                value: true,
                description: 'Whether we expect this test to succeed'
            },
            'test_protocol': {
                type: 'dropdown',
                label: 'Test Protocol',
                value: 'Standard',
                options: ['Standard', 'Extended', 'Minimal', 'Custom'],
                description: 'Type of test protocol used'
            },
            'test_notes': {
                type: 'textarea',
                label: 'Test Notes',
                value: 'Automated test run by MetaFold OMERO integration system. This validates connection, authentication, dataset creation, and map annotations functionality.',
                description: 'Additional notes about the test'
            }
        };
    },
    
    // =================== MAP ANNOTATIONS TESTING ===================
    
    // Test Map Annotations with current metadata
    async testMapAnnotationsWithCurrentMetadata() {
        console.log('🔬 === TESTING MAP ANNOTATIONS WITH CURRENT METADATA ===');
        
        // Try to get metadata from current experiment form
        let metadata = null;
        
        if (window.experimentForm && window.templateManager?.currentTemplate?.metadata) {
            try {
                metadata = window.experimentForm.collectData();
                console.log('🔬 Using metadata from current experiment form');
            } catch (error) {
                console.warn('🔬 Could not get metadata from experiment form:', error);
            }
        }
        
        // Fallback to sample metadata
        if (!metadata) {
            metadata = this.generateSampleMetadata();
            console.log('🔬 Using fallback sample metadata');
        }
        
        console.log('🔬 Test metadata:', metadata);
        
        // Test the map annotations creation (without linking to a dataset)
        const result = await window.omeroAnnotations.addMapAnnotations(
            null, 
            'dataset', 
            metadata, 
            'NFDI4BioImage.MetaFold.Test'
        );
        
        console.log('🔬 Test result:', result);
        
        return result;
    },
    
    // =================== ADVANCED TESTING ===================
    
    // Test OMERO connection with advanced diagnostics
    async testOMEROConnectionAdvanced() {
        console.log('🔍 === ADVANCED OMERO CONNECTION TEST ===');
        
        const diagnostics = {
            proxy: { tested: false, working: false, details: null },
            csrf: { tested: false, working: false, details: null },
            authentication: { tested: false, working: false, details: null },
            endpoints: { tested: false, working: false, details: null }
        };
        
        try {
            // Test 1: Proxy server
            console.log('🔍 Testing proxy server...');
            diagnostics.proxy.tested = true;
            
            const proxyCheck = await window.omeroUIIntegration.checkProxyServer();
            diagnostics.proxy.working = proxyCheck.running;
            diagnostics.proxy.details = proxyCheck;
            
            if (!proxyCheck.running) {
                return {
                    success: false,
                    error: 'Proxy server not running',
                    diagnostics: diagnostics
                };
            }
            
            // Test 2: CSRF token functionality
            console.log('🔍 Testing CSRF functionality...');
            diagnostics.csrf.tested = true;
            
            try {
                const token = await window.omeroAuth.getCSRFToken();
                const cookieToken = window.omeroAuth.getCSRFTokenFromCookie();
                diagnostics.csrf.working = !!(token || cookieToken);
                diagnostics.csrf.details = {
                    tokenReceived: !!token,
                    cookieSet: !!cookieToken,
                    tokensMatch: token === cookieToken
                };
            } catch (csrfError) {
                diagnostics.csrf.details = { error: csrfError.message };
            }
            
            // Test 3: Authentication strategies
            console.log('🔍 Testing authentication strategies...');
            diagnostics.authentication.tested = true;
            
            const authStrategies = [];
            
            // Try cookie recovery
            try {
                await window.omeroAuth.establishSessionFromCookies();
                authStrategies.push({
                    name: 'Cookie Recovery',
                    success: true,
                    projects: window.omeroAuth.session?.projectCount || 0
                });
            } catch (error) {
                authStrategies.push({
                    name: 'Cookie Recovery',
                    success: false,
                    error: error.message
                });
            }
            
            // Try public group
            try {
                await window.omeroAuth.loginPublicGroup();
                authStrategies.push({
                    name: 'Public Group',
                    success: true,
                    projects: window.omeroAuth.session?.projectCount || 0
                });
            } catch (error) {
                authStrategies.push({
                    name: 'Public Group',
                    success: false,
                    error: error.message
                });
            }
            
            const workingStrategies = authStrategies.filter(s => s.success);
            diagnostics.authentication.working = workingStrategies.length > 0;
            diagnostics.authentication.details = {
                strategies: authStrategies,
                workingCount: workingStrategies.length
            };
            
            // Test 4: Endpoint discovery
            console.log('🔍 Testing endpoint discovery...');
            diagnostics.endpoints.tested = true;
            
            const endpointTest = await this.testOMEROEndpointDiscovery();
            diagnostics.endpoints.working = endpointTest.success;
            diagnostics.endpoints.details = endpointTest;
            
            // Overall result
            const allWorking = diagnostics.proxy.working && 
                             diagnostics.authentication.working && 
                             diagnostics.endpoints.working;
            
            return {
                success: allWorking,
                message: allWorking ? 
                    'Advanced connection test passed all checks' : 
                    'Some advanced connection tests failed',
                diagnostics: diagnostics,
                recommendations: this.generateConnectionRecommendations(diagnostics)
            };
            
        } catch (error) {
            console.error('❌ Advanced connection test failed:', error);
            return {
                success: false,
                error: error.message,
                diagnostics: diagnostics
            };
        }
    },
    
    // Generate connection recommendations based on diagnostics
    generateConnectionRecommendations(diagnostics) {
        const recommendations = [];
        
        if (!diagnostics.proxy.working) {
            recommendations.push('Start the proxy server: python omero_proxy.py');
        }
        
        if (!diagnostics.csrf.working) {
            recommendations.push('Check CSRF token configuration in proxy server');
        }
        
        if (!diagnostics.authentication.working) {
            recommendations.push('Verify OMERO credentials or check public group access');
        }
        
        if (!diagnostics.endpoints.working) {
            recommendations.push('Check OMERO server version compatibility');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('All tests passed - OMERO integration is working correctly');
        }
        
        return recommendations;
    },
    
    // =================== DEBUG FUNCTIONS ===================
    
    // Debug current OMERO state
    debugCurrentState() {
        console.log('🔬 === OMERO DEBUG STATE ===');
        
        const state = {
            modules: {
                omeroAuth: !!window.omeroAuth,
                omeroAPI: !!window.omeroAPI,
                omeroGroups: !!window.omeroGroups,
                omeroProjects: !!window.omeroProjects,
                omeroAnnotations: !!window.omeroAnnotations,
                omeroDatasetCreation: !!window.omeroDatasetCreation,
                omeroUIIntegration: !!window.omeroUIIntegration
            },
            settings: null,
            session: null,
            ui: {
                groupSelect: null,
                projectSelect: null,
                statusIcon: null,
                statusText: null
            }
        };
        
        // Get settings if available
        try {
            state.settings = window.omeroUIIntegration?.getSettings() || null;
        } catch (error) {
            state.settings = { error: error.message };
        }
        
        // Get session if available
        if (window.omeroAuth) {
            state.session = {
                exists: !!window.omeroAuth.session,
                valid: window.omeroAuth.isSessionValid(),
                details: window.omeroAuth.session || null
            };
        }
        
        // Get UI elements
        const groupSelect = document.getElementById('omeroGroupSelect');
        const projectSelect = document.getElementById('omeroProjectSelect');
        const statusIcon = document.getElementById('omeroStatusIcon');
        const statusText = document.getElementById('omeroStatusText');
        
        state.ui = {
            groupSelect: groupSelect ? {
                exists: true,
                value: groupSelect.value,
                optionCount: groupSelect.options.length
            } : { exists: false },
            projectSelect: projectSelect ? {
                exists: true,
                value: projectSelect.value,
                optionCount: projectSelect.options.length
            } : { exists: false },
            statusIcon: statusIcon ? {
                exists: true,
                text: statusIcon.textContent
            } : { exists: false },
            statusText: statusText ? {
                exists: true,
                text: statusText.textContent,
                color: statusText.style.color
            } : { exists: false }
        };
        
        console.log('Debug State:', state);
        return state;
    },
    
    // =================== CLEANUP ===================
    
    // Logout and cleanup test resources
    async cleanup() {
        if (window.omeroAuth?.session) {
            await window.omeroAuth.logout();
        }
        console.log('🧪 OMERO Test Functions cleaned up');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        omeroTestFunctions.init();
    });
} else {
    omeroTestFunctions.init();
}

// Make globally available
window.omeroTestFunctions = omeroTestFunctions;

// =================== GLOBAL TEST FUNCTIONS FOR HTML ===================

// Test OMERO endpoint discovery
window.testOMEROEndpointDiscovery = async function() {
    if (window.omeroTestFunctions && window.omeroTestFunctions.testOMEROEndpointDiscovery) {
        return await window.omeroTestFunctions.testOMEROEndpointDiscovery();
    } else {
        console.error('❌ OMERO test functions not available');
        return { success: false, error: 'Test functions not loaded' };
    }
};

// Quick OMERO test
window.quickOMEROTest = async function() {
    if (window.omeroTestFunctions && window.omeroTestFunctions.quickOMEROTest) {
        return await window.omeroTestFunctions.quickOMEROTest();
    } else {
        console.error('❌ OMERO test functions not available');
        return { success: false, error: 'Test functions not loaded' };
    }
};

// Test with current experiment data
window.testWithCurrentExperimentData = async function() {
    if (window.omeroTestFunctions && window.omeroTestFunctions.testWithCurrentExperimentData) {
        return await window.omeroTestFunctions.testWithCurrentExperimentData();
    } else {
        console.error('❌ OMERO test functions not available');
        return { success: false, error: 'Test functions not loaded' };
    }
};

// Test Map Annotations function
window.testOMEROMapAnnotations = async function() {
    if (window.omeroTestFunctions && window.omeroTestFunctions.testMapAnnotationsWithCurrentMetadata) {
        return await window.omeroTestFunctions.testMapAnnotationsWithCurrentMetadata();
    } else {
        console.error('❌ OMERO test functions not available');
        return { success: false, error: 'Test functions not loaded' };
    }
};

// Advanced connection test
window.testOMEROConnectionAdvanced = async function() {
    if (window.omeroTestFunctions && window.omeroTestFunctions.testOMEROConnectionAdvanced) {
        return await window.omeroTestFunctions.testOMEROConnectionAdvanced();
    } else {
        console.error('❌ OMERO test functions not available');
        return { success: false, error: 'Test functions not loaded' };
    }
};

// Debug current state
window.debugOMEROCurrentState = function() {
    if (window.omeroTestFunctions && window.omeroTestFunctions.debugCurrentState) {
        return window.omeroTestFunctions.debugCurrentState();
    } else {
        console.error('❌ OMERO test functions not available');
        return { error: 'Test functions not loaded' };
    }
};

console.log('✅ OMERO Test Functions loaded (Comprehensive Testing & Debugging)');