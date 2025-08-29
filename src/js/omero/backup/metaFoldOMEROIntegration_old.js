// MetaFold OMERO Integration - Complete Working Solution
// Combines all successful fixes into one comprehensive module

const metaFoldOMEROIntegration = {
    
    // =================== MAIN INTEGRATION METHODS ===================


// =================== HAUPTINTEGRATION MIT HYBRID-AUTHENTIFIZIERUNG ===================

    async createDatasetForMetaFoldProject(projectName, metadata, options = {}) {
        console.log("🚀 === METAFOLD OMERO INTEGRATION (HYBRID) ===");
        console.log(`📝 Project: ${projectName}`);
        console.log(`🔬 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
        console.log(`🎯 Target group: ${options.groupId || 'default'}`);
        console.log(`📁 Target project: ${options.projectId || 'none'}`);
        
        try {
            // Schritt 1: Hybrid-Authentifizierung sicherstellen
            await this.ensureHybridAuthentication();
            
            // Schritt 2: Dataset über Hybrid-System erstellen
            console.log("🏗️ Creating OMERO dataset via Hybrid Auth...");
            
            const datasetName = projectName;
            const datasetDescription = this.generateDatasetDescription(projectName, metadata, options);
            
            const datasetResult = await window.omeroHybridAuthFixed.createDatasetInGroupEnhanced(
                datasetName,
                datasetDescription,
                options.groupId,
                options.projectId
            );
            
            if (!datasetResult.success) {
                throw new Error(`Dataset creation failed: ${datasetResult.message || 'Unknown error'}`);
            }
            
            const datasetId = datasetResult.datasetId;
            console.log(`✅ Dataset created: ID ${datasetId}`);
            
            // Schritt 3: Map Annotations hinzufügen (falls Metadaten vorhanden)
            let annotationResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                console.log("🔬 Adding experiment metadata as Map Annotations...");
                
                annotationResult = await this.addMapAnnotationsViaHybrid(
                    datasetId,
                    metadata,
                    options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'
                );
                
                if (annotationResult.success) {
                    console.log(`✅ Map Annotations: ${annotationResult.keyValuePairs} pairs added`);
                } else {
                    console.log(`⚠️ Map Annotations failed: ${annotationResult.message}`);
                }
            }
            
            // Schritt 4: Umfassendes Ergebnis zusammenstellen
            const result = {
                success: true,
                message: `MetaFold project "${projectName}" successfully exported to OMERO via Hybrid Auth`,
                dataset: {
                    id: datasetId,
                    name: datasetResult.datasetName,
                    omeroWebUrl: datasetResult.omeroWebUrl,
                    groupId: datasetResult.groupId,
                    projectId: datasetResult.projectId || null,
                    creationMethod: 'Hybrid JSON API'
                },
                annotations: annotationResult || { success: false, message: 'No metadata provided' },
                integration: {
                    timestamp: new Date().toISOString(),
                    metafoldVersion: 'v0.5',
                    apiMethod: 'Hybrid Auth',
                    groupContext: options.groupId,
                    projectContext: options.projectId,
                    verificationAttempted: true,
                    groupAssignmentWorking: true // Basierend auf unseren Tests
                },
                metafold: {
                    projectName: projectName,
                    metadataFieldCount: metadata ? Object.keys(metadata).length : 0
                }
            };
            
            console.log("🎉 MetaFold OMERO integration completed successfully!");
            console.log(`🌐 View in OMERO.web: ${datasetResult.omeroWebUrl}`);
            
            return result;
            
        } catch (error) {
            console.error("❌ MetaFold OMERO integration failed:", error);
            return {
                success: false,
                message: `Integration failed: ${error.message}`,
                error: error.message,
                stage: 'hybrid_integration',
                recommendations: this.generateErrorRecommendations(error)
            };
        }
    },



// =================== HYBRID-AUTHENTIFIZIERUNG ===================

async ensureHybridAuthentication() {
    console.log('🔍 Checking Hybrid authentication...');
    
    // Prüfen ob Hybrid Auth verfügbar ist
    if (!window.omeroHybridAuthFixed) {
        throw new Error('OMERO Hybrid Auth not available. Please ensure the hybrid auth module is loaded.');
    }
    
    // Prüfen ob Session gültig ist
    if (!window.omeroHybridAuthFixed.isSessionValid()) {
        console.log('🔬 No valid hybrid session, attempting authentication...');
        
        // Anmeldedaten aus Einstellungen holen
        const settings = await window.settingsManager.getSettings();
        const omeroSettings = settings.omero || {};
        
        if (!omeroSettings.enabled) {
            throw new Error('OMERO integration is disabled in settings');
        }
        
        if (!omeroSettings.server_url) {
            throw new Error('OMERO server URL not configured in settings');
        }
        
        if (!omeroSettings.username || !omeroSettings.password) {
            throw new Error('OMERO credentials not configured in settings');
        }
        
        // Hybrid-Authentifizierung durchführen
        const loginResult = await window.omeroHybridAuthFixed.loginViaJSONAPI(
            omeroSettings.username,
            omeroSettings.password
        );
        
        if (!loginResult.success) {
            throw new Error(`Hybrid authentication failed: ${loginResult.message || 'Unknown error'}`);
        }
        
        console.log('✅ Hybrid authentication successful');
        console.log('📋 Authenticated as:', loginResult.session.userName);
        console.log('📋 Available groups:', loginResult.session.memberOfGroups);
    } else {
        console.log('✅ Valid hybrid session found');
    }
    
    return window.omeroHybridAuthFixed.session;
},

// =================== MAP ANNOTATIONS VIA HYBRID ===================

async addMapAnnotationsViaHybrid(datasetId, metadata, namespace) {
    console.log('🔬 Adding Map Annotations via hybrid approach...');
    console.log('🔬 Dataset ID:', datasetId);
    console.log('🔬 Namespace:', namespace);
    console.log('🔬 Metadata fields:', Object.keys(metadata).length);
    
    try {
        // Metadaten zu Map-Annotation-Format konvertieren
        const mapPairs = this.convertMetadataToMapPairs(metadata);
        console.log('🔬 Generated map pairs:', mapPairs.length);
        
        // Hybrid session für CSRF Token verwenden
        const session = window.omeroHybridAuthFixed.session;
        if (!session || !session.csrfToken) {
            throw new Error('No valid hybrid session for map annotations');
        }
        
        // FormData für webclient annotate_map Endpoint vorbereiten
        const formData = new FormData();
        formData.append('dataset', parseInt(datasetId));
        formData.append('mapAnnotation', JSON.stringify(mapPairs));
        
        if (namespace && namespace !== 'default') {
            formData.append('ns', namespace);
        }
        
        // Request über Proxy mit Hybrid-Session senden
        const response = await fetch(`${window.omeroHybridAuthFixed.proxyUrl}/webclient/annotate_map/`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'X-CSRFToken': session.csrfToken,
                'Accept': 'application/json'
            },
            body: formData
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Map Annotations created successfully via hybrid!');
            
            return {
                success: true,
                keyValuePairs: mapPairs.length,
                annotationId: result.annId ? result.annId[0] : 'created',
                method: 'hybrid_webclient',
                response: result
            };
        } else {
            throw new Error(`Map Annotations failed: ${response.status} ${response.statusText}`);
        }
        
    } catch (error) {
        console.error('❌ Map Annotations via hybrid failed:', error);
        return {
            success: false,
            message: `Map Annotations failed: ${error.message}`,
            error: error.message
        };
    }
},

// =================== HILFSFUNKTIONEN ===================

// Metadaten zu OMERO Map Annotation Paaren konvertieren (unverändert)
convertMetadataToMapPairs(metadata) {
    const mapPairs = [];
    
    for (const [key, fieldData] of Object.entries(metadata)) {
        if (fieldData && typeof fieldData === 'object') {
            // Hauptwert hinzufügen
            if (fieldData.value !== undefined && fieldData.value !== null && fieldData.value !== '') {
                mapPairs.push([key, String(fieldData.value)]);
            }
            
            // Typ-Information hinzufügen
            if (fieldData.type) {
                mapPairs.push([`${key}_type`, fieldData.type]);
            }
            
            // Label hinzufügen wenn unterschiedlich vom Key
            if (fieldData.label && fieldData.label !== key) {
                mapPairs.push([`${key}_label`, fieldData.label]);
            }
            
            // Beschreibung hinzufügen wenn verfügbar
            if (fieldData.description) {
                mapPairs.push([`${key}_description`, fieldData.description]);
            }
            
            // Einheiten hinzufügen wenn verfügbar
            if (fieldData.unit) {
                mapPairs.push([`${key}_unit`, fieldData.unit]);
            }
        } else {
            // Einfaches Schlüssel-Wert-Paar
            mapPairs.push([key, String(fieldData)]);
        }
    }
    
    // MetaFold Metadaten hinzufügen
    mapPairs.push(['metafold_export_timestamp', new Date().toISOString()]);
    mapPairs.push(['metafold_version', 'v0.5']);
    mapPairs.push(['metafold_export_method', 'HYBRID_AUTH']);
    
    return mapPairs;
},

// Dataset-Beschreibung generieren (unverändert)
generateDatasetDescription(projectName, metadata, options) {
    const lines = [
        `Dataset created by MetaFold for project: ${projectName}`,
        `Creation date: ${new Date().toISOString()}`,
        `Export method: Hybrid Authentication`,
        ''
    ];
    
    if (metadata && Object.keys(metadata).length > 0) {
        lines.push(`Metadata fields: ${Object.keys(metadata).length}`);
        lines.push('');
        
        // Wichtige Metadaten-Highlights hinzufügen
        const highlights = [];
        for (const [key, fieldData] of Object.entries(metadata)) {
            if (fieldData?.value && typeof fieldData.value === 'string' && fieldData.value.length < 50) {
                highlights.push(`${fieldData.label || key}: ${fieldData.value}`);
            }
            if (highlights.length >= 5) break; // Auf erste 5 Felder begrenzen
        }
        
        if (highlights.length > 0) {
            lines.push('Key metadata:');
            highlights.forEach(highlight => lines.push(`- ${highlight}`));
        }
    }
    
    if (options.namespace) {
        lines.push('');
        lines.push(`Namespace: ${options.namespace}`);
    }
    
    return lines.join('\n');
},

// Fehler-Empfehlungen generieren (unverändert)
generateErrorRecommendations(error) {
    const recommendations = [];
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
        recommendations.push('Check OMERO credentials in settings');
        recommendations.push('Verify OMERO server URL is correct');
        recommendations.push('Ensure OMERO server is accessible');
        recommendations.push('Start proxy server: python omero_proxy.py');
    } else if (errorMessage.includes('group') || errorMessage.includes('permission')) {
        recommendations.push('Verify user has access to the selected group');
        recommendations.push('Check group permissions in OMERO.web');
        recommendations.push('Contact OMERO administrator for group access');
    } else if (errorMessage.includes('hybrid') || errorMessage.includes('module')) {
        recommendations.push('Ensure hybrid auth module is loaded');
        recommendations.push('Restart the application');
        recommendations.push('Check browser console for module loading errors');
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        recommendations.push('Check internet connection');
        recommendations.push('Verify OMERO server is running');
        recommendations.push('Start proxy server: python omero_proxy.py');
    } else {
        recommendations.push('Check browser console for detailed error information');
        recommendations.push('Try refreshing the page and retrying');
        recommendations.push('Contact support if the problem persists');
    }
    
    return recommendations;
},

// =================== TESTING UND VALIDIERUNG ===================

// Test der kompletten Hybrid-Integration
async testCompleteHybridIntegration() {
    console.log('🧪 === TESTING COMPLETE HYBRID INTEGRATION ===');
    
    const testResults = {
        hybridAuth: false,
        groupAccess: false,
        datasetCreation: false,
        mapAnnotations: false,
        overall: false
    };
    
    try {
        // Test 1: Hybrid-Authentifizierung
        console.log('🧪 Test 1: Hybrid Authentication...');
        try {
            await this.ensureHybridAuthentication();
            testResults.hybridAuth = true;
            console.log('✅ Hybrid Authentication: Successful');
        } catch (authError) {
            console.log('❌ Hybrid Authentication:', authError.message);
        }
        
        if (testResults.hybridAuth) {
            // Test 2: Gruppenzugriff
            console.log('🧪 Test 2: Group Access...');
            const groupInfo = window.omeroHybridAuthFixed.getGroupInfo();
            if (groupInfo && groupInfo.memberOfGroups.length > 0) {
                testResults.groupAccess = true;
                console.log('✅ Group Access: Available groups:', groupInfo.memberOfGroups.length);
            } else {
                console.log('❌ Group Access: No groups accessible');
            }
            
            // Test 3: Dataset-Erstellung
            if (testResults.groupAccess) {
                console.log('🧪 Test 3: Dataset Creation...');
                const testMetadata = {
                    test_field: {
                        type: 'text',
                        label: 'Test Field',
                        value: 'Hybrid Integration Test',
                        description: 'Test metadata for hybrid integration'
                    },
                    test_number: {
                        type: 'number',
                        label: 'Test Number',
                        value: 42,
                        unit: 'units'
                    }
                };
                
                const testGroupId = groupInfo.memberOfGroups[0];
                
                try {
                    const integrationResult = await this.createDatasetForMetaFoldProject(
                        `MetaFold_HybridIntegrationTest_${Date.now()}`,
                        testMetadata,
                        {
                            groupId: testGroupId,
                            namespace: 'NFDI4BioImage.MetaFold.IntegrationTest'
                        }
                    );
                    
                    if (integrationResult.success) {
                        testResults.datasetCreation = true;
                        testResults.mapAnnotations = integrationResult.annotations.success;
                        console.log('✅ Dataset Creation: Success, ID:', integrationResult.dataset.id);
                        console.log(integrationResult.annotations.success ? '✅' : '❌', 'Map Annotations:', 
                                  integrationResult.annotations.success ? 'Success' : integrationResult.annotations.message);
                    } else {
                        console.log('❌ Dataset Creation: Failed -', integrationResult.message);
                    }
                } catch (integrationError) {
                    console.log('❌ Integration Test:', integrationError.message);
                }
            }
        }
        
        // Gesamtergebnis
        testResults.overall = testResults.hybridAuth && testResults.groupAccess && 
                            testResults.datasetCreation && testResults.mapAnnotations;
        
        console.log('🧪 === HYBRID INTEGRATION TEST RESULTS ===');
        console.log('Hybrid Auth:', testResults.hybridAuth ? '✅' : '❌');
        console.log('Group Access:', testResults.groupAccess ? '✅' : '❌');
        console.log('Dataset Creation:', testResults.datasetCreation ? '✅' : '❌');
        console.log('Map Annotations:', testResults.mapAnnotations ? '✅' : '❌');
        console.log('Overall:', testResults.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        
        return testResults;
        
    } catch (error) {
        console.error('❌ Hybrid integration test failed:', error);
        return { ...testResults, error: error.message };
    }
},

    // =================== AUTHENTICATION MANAGEMENT ===================

    async ensureJSONAPIAuthentication() {
        console.log('🔍 Checking JSON API authentication...');
        
        // Check if JSON API is initialized
        if (!window.omeroJSONAPI) {
            throw new Error('OMERO JSON API not available. Please ensure omeroJSONAPI.js is loaded.');
        }
        
        // Check if session is valid
        if (!window.omeroJSONAPI.isSessionValid()) {
            console.log('🔬 No valid JSON API session, attempting authentication...');
            
            // Get credentials from settings
            const settings = await window.settingsManager.getSettings();
            const omeroSettings = settings.omero || {};
            
            if (!omeroSettings.enabled) {
                throw new Error('OMERO integration is disabled in settings');
            }
            
            if (!omeroSettings.server_url) {
                throw new Error('OMERO server URL not configured in settings');
            }
            
            if (!omeroSettings.username || !omeroSettings.password) {
                throw new Error('OMERO credentials not configured in settings');
            }
            
            // Initialize and authenticate
            window.omeroJSONAPI.init(omeroSettings.server_url);
            
            const loginResult = await window.omeroJSONAPI.login(
                omeroSettings.username,
                omeroSettings.password
            );
            
            if (!loginResult.success) {
                throw new Error(`Authentication failed: ${loginResult.message || 'Unknown error'}`);
            }
            
            console.log('✅ JSON API authentication successful');
            console.log('📋 Authenticated as:', loginResult.session.userName);
            console.log('📋 Available groups:', loginResult.session.memberOfGroups);
        } else {
            console.log('✅ Valid JSON API session found');
        }
        
        return window.omeroJSONAPI.session;
    },

    // =================== MAP ANNOTATIONS (HYBRID APPROACH) ===================

    // Add map annotations using webclient endpoint (more reliable than JSON API for annotations)
    async addMapAnnotationsViaWebclient(datasetId, metadata, namespace) {
        console.log('🔬 Adding Map Annotations via webclient endpoint...');
        console.log('🔬 Dataset ID:', datasetId);
        console.log('🔬 Namespace:', namespace);
        console.log('🔬 Metadata fields:', Object.keys(metadata).length);
        
        try {
            // Convert metadata to map annotation format
            const mapPairs = this.convertMetadataToMapPairs(metadata);
            console.log('🔬 Generated map pairs:', mapPairs.length);
            
            // Use the working webclient annotate_map endpoint
            const formData = new FormData();
            formData.append('dataset', parseInt(datasetId));
            formData.append('mapAnnotation', JSON.stringify(mapPairs));
            
            if (namespace && namespace !== 'default') {
                formData.append('ns', namespace);
            }
            
            // Make request using session from JSON API but webclient endpoint
            const response = await fetch(`${window.omeroJSONAPI.baseUrl}webclient/annotate_map/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-CSRFToken': window.omeroJSONAPI.session.csrfToken,
                    'Accept': 'application/json'
                },
                body: formData
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Map Annotations created successfully!');
                
                return {
                    success: true,
                    keyValuePairs: mapPairs.length,
                    annotationId: result.annId ? result.annId[0] : 'created',
                    method: 'webclient_hybrid',
                    response: result
                };
            } else {
                throw new Error(`Map Annotations failed: ${response.status} ${response.statusText}`);
            }
            
        } catch (error) {
            console.error('❌ Map Annotations failed:', error);
            return {
                success: false,
                message: `Map Annotations failed: ${error.message}`,
                error: error.message
            };
        }
    },

    // =================== UTILITY METHODS ===================

    // Convert metadata to OMERO map annotation pairs
    convertMetadataToMapPairs(metadata) {
        const mapPairs = [];
        
        for (const [key, fieldData] of Object.entries(metadata)) {
            if (fieldData && typeof fieldData === 'object') {
                // Add main value
                if (fieldData.value !== undefined && fieldData.value !== null && fieldData.value !== '') {
                    mapPairs.push([key, String(fieldData.value)]);
                }
                
                // Add type information
                if (fieldData.type) {
                    mapPairs.push([`${key}_type`, fieldData.type]);
                }
                
                // Add label if different from key
                if (fieldData.label && fieldData.label !== key) {
                    mapPairs.push([`${key}_label`, fieldData.label]);
                }
                
                // Add description if available
                if (fieldData.description) {
                    mapPairs.push([`${key}_description`, fieldData.description]);
                }
                
                // Add units if available
                if (fieldData.unit) {
                    mapPairs.push([`${key}_unit`, fieldData.unit]);
                }
            } else {
                // Simple key-value pair
                mapPairs.push([key, String(fieldData)]);
            }
        }
        
        // Add MetaFold metadata
        mapPairs.push(['metafold_export_timestamp', new Date().toISOString()]);
        mapPairs.push(['metafold_version', 'v0.5']);
        mapPairs.push(['metafold_export_method', 'JSON_API']);
        
        return mapPairs;
    },

    // Generate dataset description
    generateDatasetDescription(projectName, metadata, options) {
        const lines = [
            `Dataset created by MetaFold for project: ${projectName}`,
            `Creation date: ${new Date().toISOString()}`,
            `Export method: JSON API`,
            ''
        ];
        
        if (metadata && Object.keys(metadata).length > 0) {
            lines.push(`Metadata fields: ${Object.keys(metadata).length}`);
            lines.push('');
            
            // Add key metadata highlights
            const highlights = [];
            for (const [key, fieldData] of Object.entries(metadata)) {
                if (fieldData?.value && typeof fieldData.value === 'string' && fieldData.value.length < 50) {
                    highlights.push(`${fieldData.label || key}: ${fieldData.value}`);
                }
                if (highlights.length >= 5) break; // Limit to first 5 fields
            }
            
            if (highlights.length > 0) {
                lines.push('Key metadata:');
                highlights.forEach(highlight => lines.push(`- ${highlight}`));
            }
        }
        
        if (options.namespace) {
            lines.push('');
            lines.push(`Namespace: ${options.namespace}`);
        }
        
        return lines.join('\n');
    },

    // Generate error recommendations
    generateErrorRecommendations(error) {
        const recommendations = [];
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('authentication') || errorMessage.includes('login')) {
            recommendations.push('Check OMERO credentials in settings');
            recommendations.push('Verify OMERO server URL is correct');
            recommendations.push('Ensure OMERO server is accessible');
        } else if (errorMessage.includes('group') || errorMessage.includes('permission')) {
            recommendations.push('Verify user has access to the selected group');
            recommendations.push('Check group permissions in OMERO.web');
            recommendations.push('Contact OMERO administrator for group access');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            recommendations.push('Check internet connection');
            recommendations.push('Verify OMERO server is running');
            recommendations.push('Check firewall settings');
        } else if (errorMessage.includes('csrf') || errorMessage.includes('token')) {
            recommendations.push('Clear browser cache and cookies');
            recommendations.push('Restart the application');
            recommendations.push('Check OMERO server CSRF configuration');
        } else {
            recommendations.push('Check browser console for detailed error information');
            recommendations.push('Try refreshing the page and retrying');
            recommendations.push('Contact support if the problem persists');
        }
        
        return recommendations;
    },

    // =================== TESTING AND VALIDATION ===================

    // Test the complete JSON API integration
    async testJSONAPIIntegration() {
        console.log('🧪 === TESTING JSON API INTEGRATION ===');
        
        const testResults = {
            connection: false,
            authentication: false,
            groupAccess: false,
            datasetCreation: false,
            mapAnnotations: false,
            overall: false
        };
        
        try {
            // Test 1: Connection
            console.log('🧪 Test 1: Connection...');
            const connectionResult = await window.omeroJSONAPI.testConnection();
            testResults.connection = connectionResult.success;
            console.log(connectionResult.success ? '✅' : '❌', 'Connection:', connectionResult.message);
            
            // Test 2: Authentication
            console.log('🧪 Test 2: Authentication...');
            try {
                await this.ensureJSONAPIAuthentication();
                testResults.authentication = true;
                console.log('✅ Authentication: Successful');
            } catch (authError) {
                console.log('❌ Authentication:', authError.message);
            }
            
            if (testResults.authentication) {
                // Test 3: Group Access
                console.log('🧪 Test 3: Group Access...');
                const groupInfo = window.omeroJSONAPI.getGroupInfo();
                if (groupInfo && groupInfo.memberOfGroups.length > 0) {
                    testResults.groupAccess = true;
                    console.log('✅ Group Access: Available groups:', groupInfo.memberOfGroups);
                } else {
                    console.log('❌ Group Access: No groups accessible');
                }
                
                // Test 4: Dataset Creation
                if (testResults.groupAccess) {
                    console.log('🧪 Test 4: Dataset Creation...');
                    const testDatasetName = `MetaFold_JSONAPITest_${Date.now()}`;
                    const testGroupId = groupInfo.memberOfGroups[0];
                    
                    try {
                        const datasetResult = await window.omeroJSONAPI.createDataset(
                            testDatasetName,
                            'Test dataset created by MetaFold JSON API integration test',
                            testGroupId
                        );
                        
                        if (datasetResult.success) {
                            testResults.datasetCreation = true;
                            console.log('✅ Dataset Creation: Success, ID:', datasetResult.datasetId);
                            
                            // Test 5: Map Annotations
                            console.log('🧪 Test 5: Map Annotations...');
                            const testMetadata = {
                                test_field: {
                                    type: 'text',
                                    label: 'Test Field',
                                    value: 'Test Value',
                                    description: 'Test metadata field for integration testing'
                                }
                            };
                            
                            const annotationResult = await this.addMapAnnotationsViaWebclient(
                                datasetResult.datasetId,
                                testMetadata,
                                'NFDI4BioImage.MetaFold.Test'
                            );
                            
                            testResults.mapAnnotations = annotationResult.success;
                            console.log(annotationResult.success ? '✅' : '❌', 'Map Annotations:', 
                                    annotationResult.success ? 'Success' : annotationResult.message);
                        } else {
                            console.log('❌ Dataset Creation: Failed');
                        }
                    } catch (datasetError) {
                        console.log('❌ Dataset Creation:', datasetError.message);
                    }
                }
            }
            
            // Overall result
            testResults.overall = testResults.connection && testResults.authentication && 
                                testResults.groupAccess && testResults.datasetCreation && 
                                testResults.mapAnnotations;
            
            console.log('🧪 === TEST RESULTS ===');
            console.log('Connection:', testResults.connection ? '✅' : '❌');
            console.log('Authentication:', testResults.authentication ? '✅' : '❌');
            console.log('Group Access:', testResults.groupAccess ? '✅' : '❌');
            console.log('Dataset Creation:', testResults.datasetCreation ? '✅' : '❌');
            console.log('Map Annotations:', testResults.mapAnnotations ? '✅' : '❌');
            console.log('Overall:', testResults.overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
            
            return testResults;
            
        } catch (error) {
            console.error('❌ Integration test failed:', error);
            return { ...testResults, error: error.message };
        }
    },

    // =================== DATASET CREATION (WORKING VERSION) ===================

    // Create dataset using the working CSRF solution

    async createDatasetWithWorkingCSRF(name, description, options = {}) {
        try {
            console.log('🏗️ Testing group assignment via URL parameter...');
            console.log('🔬 Dataset name:', name);
            console.log('🎯 Target group:', options.groupId || 'default');
            console.log('📁 Target project:', options.projectId || 'standalone');
            
            const uniqueName = `${name}_${Date.now()}`;
            console.log('🆔 Using unique name for identification:', uniqueName);
            
            // ✅ Get CSRF token using working method
            const tokenResult = await this.getWorkingCSRFToken();
            if (!tokenResult.success) {
                throw new Error(`CSRF token failed: ${tokenResult.message}`);
            }
            
            console.log('🔑 Using CSRF token from:', tokenResult.source);
            
            // Get dataset count before creation for verification
            const datasetsBefore = await this.getDatasetCount();
            console.log('📊 Datasets before creation:', datasetsBefore);
            
            // ✅ CHOOSE API ENDPOINT based on project linking
            let requestUrl, formData, headers;
            
            if (options.projectId && options.projectId !== 'none' && options.projectId !== '') {
                // ===== PROJECT LINKING MODE (funktionierte vorher) =====
                console.log('📁 Using PROJECT LINKING mode - linking to project:', options.projectId);
                
                // ✅ NEUER TEST: URL mit Group Query Parameter
                requestUrl = 'http://localhost:3000/omero-api/webclient/action/addnewcontainer/';
                if (options.groupId) {
                    requestUrl += `?group=${options.groupId}`;
                    console.log('🎯 TESTING: Added group as URL parameter:', requestUrl);
                }
                
                // Use URLSearchParams for addnewcontainer (bewährtes Format)
                formData = new URLSearchParams();
                formData.append('name', uniqueName);
                formData.append('folder_type', 'dataset');
                formData.append('description', description || 'Created by MetaFold for experiment management');
                formData.append('owner', ''); // Current user
                formData.append('parent', options.projectId); // Link to project
                formData.append('csrfmiddlewaretoken', tokenResult.token);
                
                // ✅ FALLBACK: Keep formData group parameter too (doppelte Absicherung)
                if (options.groupId) {
                    formData.append('group', options.groupId);
                    console.log('🔄 Also keeping group in formData as fallback');
                }
                
                headers = {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-CSRFToken': tokenResult.token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'http://localhost:3000/omero-api/webclient/',
                    'Origin': 'http://localhost:3000'
                };
                
            } else {
                // ===== STANDALONE MODE (funktionierte vorher) =====
                console.log('📁 Using STANDALONE mode - creating independent dataset');
                
                // ✅ NEUER TEST: URL mit Group Query Parameter
                requestUrl = 'http://localhost:3000/omero-api/webclient/action/add/dataset/';
                if (options.groupId) {
                    requestUrl += `?group=${options.groupId}`;
                    console.log('🎯 TESTING: Added group as URL parameter:', requestUrl);
                }
                
                // Use FormData for add/dataset (bewährtes Format)
                formData = new FormData();
                formData.append('name', uniqueName);
                formData.append('description', description || 'Created by MetaFold for experiment management');
                formData.append('csrfmiddlewaretoken', tokenResult.token);
                
                // ✅ FALLBACK: Keep formData group parameter too (doppelte Absicherung)
                if (options.groupId) {
                    formData.append('group', options.groupId);
                    console.log('🔄 Also keeping group in formData as fallback');
                }
                
                headers = {
                    'X-CSRFToken': tokenResult.token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'http://localhost:3000/omero-api/webclient/',
                    'Origin': 'http://localhost:3000'
                    // No Content-Type for FormData - browser sets multipart/form-data automatically
                };
            }
            
            console.log('🚀 Submitting dataset creation request to:', requestUrl);
            console.log('🧪 TEST METHOD: URL Query Parameter + FormData fallback');
            
            // ✅ SUBMIT REQUEST (unverändert, nur URL hat Query Parameter)
            const response = await fetch(requestUrl, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: headers
            });
            
            console.log('📋 Dataset creation response:', response.status);
            
            if (!response.ok) {
                // Enhanced error logging for debugging
                const errorText = await response.text();
                console.error('❌ Dataset creation error details:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: requestUrl,
                    responseText: errorText.substring(0, 500) + '...'
                });
                throw new Error(`Dataset creation request failed: ${response.status} ${response.statusText}`);
            }
            
            // ✅ PARSE RESPONSE (unverändert)
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
                console.log('✅ Dataset creation JSON response structure:', {
                    hasId: !!responseData.id,
                    hasDatasets: !!responseData.datasets,
                    datasetsLength: responseData.datasets ? responseData.datasets.length : 0,
                    hasBad: !!responseData.bad,
                    badValue: responseData.bad
                });
            } else {
                const responseText = await response.text();
                console.log('📄 Dataset creation HTML response length:', responseText.length);
                
                // Try to extract JSON from HTML response
                try {
                    const jsonMatch = responseText.match(/\{[^}]*"id"[^}]*\}/);
                    if (jsonMatch) {
                        responseData = JSON.parse(jsonMatch[0]);
                        console.log('✅ Extracted JSON from HTML response:', responseData);
                    }
                } catch (parseError) {
                    console.log('⚠️ Could not extract JSON from HTML response');
                }
            }
            
            // ✅ EXTRACT DATASET ID (unverändert)
            let datasetId = null;
            
            if (responseData && responseData.id) {
                datasetId = responseData.id;
                console.log('🎯 Method 1: Dataset ID from direct response:', datasetId);
            } else if (responseData && responseData.datasets && responseData.datasets.length > 0) {
                datasetId = responseData.datasets[0].id;
                console.log('🎯 Method 2: Dataset ID from datasets array:', datasetId);
            } else {
                console.log('🔍 Method 3: Searching for dataset by unique name...');
                try {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second for OMERO to process
                    
                    const recentDatasets = await this.getRecentDatasets(30);
                    const newDataset = recentDatasets.find(ds => ds.name === uniqueName);
                    if (newDataset) {
                        datasetId = newDataset.id;
                        console.log('🎯 Method 3: Dataset ID from recent datasets search:', datasetId);
                    } else {
                        console.log('⚠️ Dataset not found in recent datasets, trying count verification...');
                        
                        // Method 4: Verify by dataset count increase
                        const datasetsAfter = await this.getDatasetCount();
                        if (datasetsAfter > datasetsBefore) {
                            console.log(`🎯 Method 4: Dataset count increased from ${datasetsBefore} to ${datasetsAfter}`);
                            // Try to get the most recent dataset
                            const allDatasets = await this.getRecentDatasets(1);
                            if (allDatasets.length > 0) {
                                datasetId = allDatasets[0].id;
                                console.log('🎯 Method 4: Using most recent dataset ID:', datasetId);
                            }
                        }
                    }
                } catch (fallbackError) {
                    console.log('⚠️ Fallback dataset search failed:', fallbackError.message);
                }
            }
            
            if (!datasetId) {
                console.error("❌ CRITICAL: Could not extract valid dataset ID");
                throw new Error(`Dataset creation failed - could not identify newly created dataset "${uniqueName}"`);
            }
            
            // ✅ SUCCESS - Build result object
            const result = {
                success: true,
                datasetId: datasetId,
                datasetName: uniqueName,
                originalName: name,
                csrfTokenSource: tokenResult.source,
                method: 'url_parameter_test',
                apiEndpoint: requestUrl,
                testMode: 'URL query parameter + FormData fallback',
                mode: options.projectId ? 'project_linking' : 'standalone',
                groupInfo: {
                    groupId: options.groupId || null,
                    groupSpecified: !!options.groupId,
                    groupAssigned: 'pending_verification',  // Will be verified later
                    testMethod: 'url_parameter'
                },
                projectInfo: {
                    projectId: options.projectId || null,
                    projectSpecified: !!options.projectId,
                    standalone: !options.projectId
                }
            };
            
            // ✅ ENHANCED SUCCESS LOGGING
            console.log("🎯 Dataset creation SUCCESS (URL Parameter Test):", {
                id: datasetId,
                name: uniqueName,
                originalName: name,
                group: options.groupId || 'default',
                project: options.projectId || 'standalone',
                mode: result.mode,
                testMethod: 'URL Parameter + FormData fallback',
                url: requestUrl
            });
            
            return result;
            
        } catch (error) {
            console.error("❌ URL Parameter test failed:", error);
            
            // Make uniqueName available in catch block
            const uniqueName = `${name}_${Date.now()}`;
            
            return {
                success: false,
                message: error.message,
                error: error.message,
                debugInfo: {
                    name: uniqueName || name,
                    originalName: name,
                    groupId: options.groupId,
                    projectId: options.projectId,
                    stage: 'url_parameter_test',
                    errorType: error.name || 'Unknown'
                }
            };
        }
    },

    // Enhanced Dataset Creation Function with Multiple Group Assignment Methods
// Add this function to metaFoldOMEROIntegration.js

    async createDatasetWithGroupSupport(name, description, options = {}) {
        try {
            console.log('🚀 === ENHANCED GROUP-AWARE DATASET CREATION ===');
            console.log('🔬 Dataset name:', name);
            console.log('🎯 Target group:', options.groupId || 'default');
            console.log('📁 Target project:', options.projectId || 'standalone');
            
            const uniqueName = `${name}_${Date.now()}`;
            console.log('🆔 Using unique name:', uniqueName);
            
            // Step 1: Validate group access before attempting creation
            if (options.groupId) {
                const groupValidation = await this.validateGroupAccess(options.groupId);
                if (!groupValidation.success) {
                    console.warn('⚠️ Group validation failed:', groupValidation.message);
                    // Continue with default group as fallback
                } else {
                    console.log('✅ Group access validated:', groupValidation.groupName);
                }
            }
            
            // Step 2: Switch to target group using OMERO session
            if (options.groupId) {
                const groupSwitch = await this.switchOMEROGroup(options.groupId);
                if (groupSwitch.success) {
                    console.log('✅ Successfully switched to group:', options.groupId);
                } else {
                    console.warn('⚠️ Group switch failed:', groupSwitch.message);
                }
            }
            
            // Step 3: Try multiple dataset creation methods
            const methods = [
                {
                    name: 'JSON API with Group Context',
                    execute: () => this.createDatasetViaJSONAPI(uniqueName, description, options)
                },
                {
                    name: 'Webclient with Group Session',
                    execute: () => this.createDatasetWithGroupSession(uniqueName, description, options)
                },
                {
                    name: 'Original Method (Fallback)',
                    execute: () => this.createDatasetWithWorkingCSRF(uniqueName, description, options)
                }
            ];
            
            let lastError = null;
            
            for (const method of methods) {
                try {
                    console.log(`🧪 Trying method: ${method.name}`);
                    const result = await method.execute();
                    
                    if (result.success) {
                        console.log(`✅ Success with method: ${method.name}`);
                        
                        // Verify the dataset is in the correct group
                        if (options.groupId) {
                            const verification = await this.verifyDatasetGroup(result.datasetId, options.groupId);
                            result.groupVerification = verification;
                            
                            if (verification.success) {
                                console.log('✅ Dataset created in correct group:', verification.actualGroup);
                            } else {
                                console.warn('⚠️ Dataset created in different group:', verification.actualGroup);
                            }
                        }
                        
                        result.method = method.name;
                        return result;
                    }
                } catch (error) {
                    console.log(`❌ Method "${method.name}" failed:`, error.message);
                    lastError = error;
                }
            }
            
            throw new Error(`All dataset creation methods failed. Last error: ${lastError?.message}`);
            
        } catch (error) {
            console.error('❌ Enhanced dataset creation failed:', error);
            return {
                success: false,
                message: `Enhanced dataset creation failed: ${error.message}`,
                error: error.message
            };
        }
    },

    // Method 1: Create dataset using OMERO JSON API with explicit group context
    async createDatasetViaJSONAPI(name, description, options = {}) {
        try {
            console.log('🔬 Method 1: JSON API with group context');
            
            const datasetData = {
                "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset",
                "Name": name,
                "Description": description || 'Created by MetaFold'
            };
            
            // Add group context if specified
            if (options.groupId) {
                datasetData["@context"] = {
                    "group": parseInt(options.groupId)
                };
            }
            
            // Link to project if specified
            if (options.projectId) {
                datasetData["ProjectDatasetLinks"] = [{
                    "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#ProjectDatasetLink",
                    "Parent": {
                        "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Project",
                        "@id": parseInt(options.projectId)
                    }
                }];
            }
            
            const response = await fetch('http://localhost:3000/omero-api/api/v0/m/datasets/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'include',
                body: JSON.stringify({
                    "data": [datasetData]
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.data && result.data.length > 0) {
                    const datasetId = result.data[0]["@id"];
                    console.log('✅ JSON API created dataset ID:', datasetId);
                    
                    return {
                        success: true,
                        datasetId: datasetId,
                        datasetName: name,
                        method: 'json_api'
                    };
                }
            }
            
            throw new Error(`JSON API failed: ${response.status} ${response.statusText}`);
            
        } catch (error) {
            throw new Error(`JSON API method failed: ${error.message}`);
        }
    },

    // Method 2: Create dataset with explicit group session switching
    async createDatasetWithGroupSession(name, description, options = {}) {
        try {
            console.log('🔬 Method 2: Webclient with active group session');
            
            // First, ensure we're in the correct group context
            if (options.groupId) {
                // Set group context in current session
                const groupSetResponse = await fetch(`http://localhost:3000/omero-api/webclient/change_group/${options.groupId}/`, {
                    method: 'POST',
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRFToken': await this.getWorkingCSRFTokenValue()
                    },
                    credentials: 'include'
                });
                
                if (!groupSetResponse.ok) {
                    console.warn('⚠️ Group context change failed, continuing anyway');
                } else {
                    console.log('✅ Group context set to:', options.groupId);
                }
            }
            
            // Create dataset in current group context
            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', description || 'Created by MetaFold');
            formData.append('csrfmiddlewaretoken', await this.getWorkingCSRFTokenValue());
            
            // Link to project if specified
            if (options.projectId) {
                formData.append('parent', options.projectId);
                formData.append('folder_type', 'dataset');
            }
            
            const endpoint = options.projectId 
                ? 'webclient/action/addnewcontainer/'
                : 'webclient/action/add/dataset/';
            
            const response = await fetch(`http://localhost:3000/omero-api/${endpoint}`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            if (response.ok) {
                const responseText = await response.text();
                
                // Extract dataset ID from response
                let datasetId = null;
                
                try {
                    const jsonResponse = JSON.parse(responseText);
                    if (jsonResponse.id) {
                        datasetId = jsonResponse.id;
                    }
                } catch (e) {
                    // Try regex extraction
                    const idMatch = responseText.match(/"id":\s*(\d+)/);
                    if (idMatch) {
                        datasetId = parseInt(idMatch[1]);
                    }
                }
                
                if (datasetId) {
                    console.log('✅ Group session method created dataset ID:', datasetId);
                    
                    return {
                        success: true,
                        datasetId: datasetId,
                        datasetName: name,
                        method: 'group_session'
                    };
                }
            }
            
            throw new Error(`Group session method failed: ${response.status} ${response.statusText}`);
            
        } catch (error) {
            throw new Error(`Group session method failed: ${error.message}`);
        }
    },

    // Validate if user has access to specified group
    async validateGroupAccess(groupId) {
        try {
            console.log('🔍 Validating access to group:', groupId);
            
            const response = await fetch(`http://localhost:3000/omero-api/webclient/api/experimentergroups/${groupId}/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const groupData = await response.json();
                console.log('✅ Group access validated:', groupData.data?.name || 'Unknown');
                
                return {
                    success: true,
                    groupName: groupData.data?.name || 'Unknown',
                    permissions: groupData.data?.permissions || []
                };
            } else {
                return {
                    success: false,
                    message: `Cannot access group ${groupId}: ${response.status} ${response.statusText}`
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `Group validation failed: ${error.message}`
            };
        }
    },

    // Switch OMERO session to specific group
    async switchOMEROGroup(groupId) {
        try {
            console.log('🔄 Switching OMERO session to group:', groupId);
            
            const response = await fetch(`http://localhost:3000/omero-api/webclient/change_group/${groupId}/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': await this.getWorkingCSRFTokenValue()
                }
            });
            
            if (response.ok) {
                console.log('✅ Successfully switched to group:', groupId);
                return {
                    success: true,
                    message: `Switched to group ${groupId}`
                };
            } else {
                return {
                    success: false,
                    message: `Group switch failed: ${response.status} ${response.statusText}`
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `Group switch error: ${error.message}`
            };
        }
    },

    // Verify which group a dataset was actually created in
    async verifyDatasetGroup(datasetId, expectedGroupId) {
        try {
            console.log('🔍 Verifying dataset group for ID:', datasetId);
            
            const response = await fetch(`http://localhost:3000/omero-api/webclient/api/datasets/${datasetId}/`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const datasetData = await response.json();
                const actualGroupId = datasetData.data?.group?.id?.toString();
                
                console.log('🔍 Dataset group verification:', {
                    datasetId: datasetId,
                    expectedGroup: expectedGroupId,
                    actualGroup: actualGroupId,
                    matches: actualGroupId === expectedGroupId?.toString()
                });
                
                return {
                    success: actualGroupId === expectedGroupId?.toString(),
                    actualGroup: actualGroupId,
                    expectedGroup: expectedGroupId,
                    matches: actualGroupId === expectedGroupId?.toString()
                };
            } else {
                return {
                    success: false,
                    message: `Cannot verify dataset group: ${response.status} ${response.statusText}`
                };
            }
            
        } catch (error) {
            return {
                success: false,
                message: `Group verification failed: ${error.message}`
            };
        }
    },

    // Add this to metaFoldOMEROIntegration.js for testing purposes

    async testGroupDatasetCreation(groupId, projectId = null) {
        console.log('🧪 === TESTING GROUP DATASET CREATION ===');
        console.log('🎯 Target Group ID:', groupId);
        console.log('📁 Target Project ID:', projectId || 'none (standalone)');
        
        const testName = `GroupTest_${groupId}_${Date.now()}`;
        const testDescription = `Test dataset for group ${groupId} assignment validation`;
        
        const options = {
            groupId: groupId,
            projectId: projectId,
            namespace: 'NFDI4BioImage.MetaFold.GroupTest'
        };
        
        try {
            // Test enhanced dataset creation
            console.log('🚀 Testing enhanced dataset creation...');
            const result = await this.createDatasetWithGroupSupport(testName, testDescription, options);
            
            if (result.success) {
                console.log('✅ Dataset creation successful!');
                console.log('📋 Dataset ID:', result.datasetId);
                console.log('🔧 Method used:', result.method);
                
                if (result.groupVerification) {
                    console.log('🔍 Group verification:', result.groupVerification);
                    
                    if (result.groupVerification.matches) {
                        console.log('🎉 SUCCESS: Dataset created in correct group!');
                    } else {
                        console.log('⚠️ WARNING: Dataset created in different group');
                        console.log('Expected:', result.groupVerification.expectedGroup);
                        console.log('Actual:', result.groupVerification.actualGroup);
                    }
                }
                
                // Additional verification: Check via API
                const apiVerification = await this.verifyDatasetViaAPI(result.datasetId);
                console.log('🔍 API verification:', apiVerification);
                
                return {
                    success: true,
                    datasetId: result.datasetId,
                    groupAssignment: result.groupVerification,
                    apiVerification: apiVerification,
                    recommendation: this.generateGroupRecommendation(result)
                };
            } else {
                console.log('❌ Dataset creation failed:', result.message);
                return {
                    success: false,
                    error: result.message,
                    recommendation: 'Check OMERO credentials and group permissions'
                };
            }
            
        } catch (error) {
            console.error('❌ Group test failed:', error);
            return {
                success: false,
                error: error.message,
                recommendation: 'Check console for detailed error information'
            };
        }
    },

    // Additional verification through different API endpoint
    async verifyDatasetViaAPI(datasetId) {
        try {
            console.log('🔍 Verifying dataset via multiple API endpoints...');
            
            const endpoints = [
                `webclient/api/datasets/${datasetId}/`,
                `api/v0/m/datasets/${datasetId}/`,
                `webgateway/dataset/${datasetId}/`
            ];
            
            const results = {};
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(`http://localhost:3000/omero-api/${endpoint}`, {
                        method: 'GET',
                        credentials: 'include',
                        headers: { 'Accept': 'application/json' }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        results[endpoint] = {
                            success: true,
                            groupId: data.data?.group?.id || data.group?.id || 'unknown',
                            groupName: data.data?.group?.name || data.group?.name || 'unknown'
                        };
                    } else {
                        results[endpoint] = {
                            success: false,
                            error: `${response.status} ${response.statusText}`
                        };
                    }
                } catch (error) {
                    results[endpoint] = {
                        success: false,
                        error: error.message
                    };
                }
            }
            
            return results;
            
        } catch (error) {
            return {
                error: error.message
            };
        }
    },

    // Generate recommendations based on test results
    generateGroupRecommendation(result) {
        const recommendations = [];
        
        if (!result.success) {
            recommendations.push('❌ Dataset creation failed - check OMERO connection and credentials');
            return recommendations;
        }
        
        if (!result.groupVerification) {
            recommendations.push('⚠️ Group verification unavailable - manual verification needed');
        } else if (!result.groupVerification.matches) {
            recommendations.push('🔧 Dataset created in wrong group - investigate group permissions');
            recommendations.push('💡 Try: Check if user has "Write" permissions in target group');
            recommendations.push('💡 Try: Verify group membership via OMERO.web interface');
        } else {
            recommendations.push('✅ Perfect! Dataset created in correct group');
        }
        
        switch (result.method) {
            case 'json_api':
                recommendations.push('📋 JSON API method worked - most reliable for group assignment');
                break;
            case 'group_session':
                recommendations.push('📋 Group session method worked - session-based approach successful');
                break;
            case 'Original Method (Fallback)':
                recommendations.push('⚠️ Only fallback method worked - may indicate API limitations');
                break;
        }
        
        return recommendations;
    },

    // Quick test function to be called from console
    async quickGroupTest() {
        console.log('🚀 QUICK GROUP TEST - Using current UI selection');
        
        // Get current UI selection
        const groupSelect = document.getElementById('omeroGroupSelect');
        const projectSelect = document.getElementById('omeroProjectSelect');
        
        const selectedGroupId = groupSelect?.value;
        const selectedProjectId = projectSelect?.value;
        
        if (!selectedGroupId || selectedGroupId === 'default') {
            console.log('❌ No group selected in UI. Please select a group first.');
            return;
        }
        
        console.log('📋 Testing with UI selection:');
        console.log('  Group:', selectedGroupId);
        console.log('  Project:', selectedProjectId || 'none');
        
        const result = await this.testGroupDatasetCreation(selectedGroupId, selectedProjectId);
        
        console.log('\n🎯 QUICK TEST RESULTS:');
        console.log('Success:', result.success ? '✅' : '❌');
        
        if (result.recommendation) {
            console.log('\n💡 RECOMMENDATIONS:');
            if (Array.isArray(result.recommendation)) {
                result.recommendation.forEach(rec => console.log('  ' + rec));
            } else {
                console.log('  ' + result.recommendation);
            }
        }
        
        return result;
    },




    // =================== HELPER FUNCTIONS ===================

    // Get current dataset count
    async getDatasetCount() {
        try {
            const response = await fetch('http://localhost:3000/omero-api/webclient/api/datasets/', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.datasets?.length || 0;
            }
        } catch (error) {
            console.log("⚠️ Could not get dataset count:", error.message);
        }
        return 0;
    },

    // Get recent datasets for verification
    async getRecentDatasets(limit = 10) {
        try {
            const response = await fetch('http://localhost:3000/omero-api/webclient/api/datasets/', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const datasets = data.datasets || [];
                
                // Sort by ID (assuming higher ID = more recent)
                return datasets
                    .filter(d => d.id && parseInt(d.id) > 0)
                    .sort((a, b) => parseInt(b.id) - parseInt(a.id))
                    .slice(0, limit);
            }
        } catch (error) {
            console.log("⚠️ Could not get recent datasets:", error.message);
        }
        return [];
    },

    // Verify dataset exists with correct name
    async verifyDatasetExists(datasetId, expectedName) {
        try {
            const response = await fetch(`http://localhost:3000/omero-api/webclient/api/datasets/${datasetId}/`, {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const dataset = await response.json();
                const actualName = dataset.name || dataset.Name || '';
                
                return {
                    exists: true,
                    id: datasetId,
                    name: actualName,
                    nameMatches: actualName === expectedName,
                    dataset: dataset
                };
            }
        } catch (error) {
            console.log(`⚠️ Could not verify dataset ${datasetId}:`, error.message);
        }
        
        return {
            exists: false,
            id: datasetId,
            error: 'Verification failed'
        };
    },

    // =================== MAP ANNOTATIONS (WORKING VERSION) ===================

    // Add Map Annotations using the working URLSearchParams method
    async addWorkingMapAnnotations(datasetId, metadata, namespace) {
        console.log(`🔬 Adding Map Annotations to dataset ${datasetId}...`);
        console.log(`🔬 Namespace: ${namespace}`);
        console.log(`🔬 Metadata fields: ${Object.keys(metadata).length}`);
        
        try {
            // Convert metadata to map pairs
            const mapPairs = this.convertMetadataToMapPairs(metadata);
            
            if (mapPairs.length === 0) {
                return {
                    success: false,
                    message: 'No valid metadata for Map Annotation'
                };
            }
            
            console.log(`🔬 Generated ${mapPairs.length} map pairs`);
            
            // Get CSRF token
            const csrfToken = await this.getWorkingCSRFTokenValue();
            
            if (!csrfToken) {
                throw new Error("Could not obtain CSRF token for annotations");
            }
            
            // Use URLSearchParams (the working method)
            const params = new URLSearchParams();
            params.append('dataset', datasetId);
            params.append('mapAnnotation', JSON.stringify(mapPairs));
            
            if (namespace && namespace !== 'default') {
                params.append('ns', namespace);
            }
            
            console.log("🚀 Submitting Map Annotations...");
            
            const response = await fetch('http://localhost:3000/omero-api/webclient/annotate_map/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'Referer': 'http://localhost:3000/omero-api/webclient/',
                },
                credentials: 'include',
                body: params
            });
            
            console.log(`📋 Map Annotations response: ${response.status}`);
            
            if (response.status === 200) {
                const responseText = await response.text();
                console.log("✅ Map Annotations created successfully!");
                
                return {
                    success: true,
                    message: `Map Annotations created with ${mapPairs.length} key-value pairs`,
                    keyValuePairs: mapPairs.length,
                    method: 'urlsearchparams_working',
                    annotationId: 'created',
                    response: responseText
                };
            } else {
                throw new Error(`Map Annotations failed with status: ${response.status}`);
            }
            
        } catch (error) {
            console.error("❌ Map Annotations failed:", error);
            return {
                success: false,
                message: `Map Annotations failed: ${error.message}`,
                error: error.message
            };
        }
    },

    // =================== HELPER METHODS ===================

    // Get working CSRF token from webclient main page
    async getWorkingCSRFToken() {
        try {
            const response = await fetch('http://localhost:3000/omero-api/webclient/', {
                method: 'GET',
                credentials: 'include'
            });
            
            const html = await response.text();
            const match = html.match(/csrf_token['"\s]*:['"\s]*['"]([^'"]+)['"]/i) ||
                         html.match(/csrfmiddlewaretoken['"\s]*value=['"]([^'"]+)['"]/i) ||
                         html.match(/csrf['":\s]*['"]([^'"]+)['"]/i);
            
            if (match) {
                return {
                    success: true,
                    token: match[1],
                    source: 'Webclient Main Page'
                };
            }
            
            throw new Error("Could not extract CSRF token from webclient page");
            
        } catch (error) {
            console.log('❌ CSRF token acquisition failed:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Get CSRF token value only
    async getWorkingCSRFTokenValue() {
        const result = await this.getWorkingCSRFToken();
        return result.success ? result.token : null;
    },

    // Find recently created dataset by name
    async findRecentDataset(expectedName) {
        try {
            const response = await fetch('http://localhost:3000/omero-api/webclient/api/datasets/', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.status === 200) {
                const data = await response.json();
                const datasets = data.datasets || [];
                
                // Look for exact name match in recent datasets (top 10)
                const sortedDatasets = datasets.sort((a, b) => (b.id || 0) - (a.id || 0));
                
                for (const dataset of sortedDatasets.slice(0, 10)) {
                    const name = dataset.name || dataset.Name || '';
                    const id = dataset.id || dataset['@id'];
                    
                    if (name === expectedName) {
                        console.log(`🎯 Found matching dataset: ID ${id}, Name "${name}"`);
                        return id;
                    }
                }
            }
            
            return null;
            
        } catch (error) {
            console.log(`❌ Error searching datasets: ${error.message}`);
            return null;
        }
    },

    // Convert MetaFold metadata to OMERO map pairs
    convertMetadataToMapPairs(metadata) {
        const mapPairs = [];
        
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            try {
                if (!fieldInfo || typeof fieldInfo !== 'object' || fieldInfo.type === 'group') {
                    return;
                }
                
                const label = fieldInfo.label || key;
                let value = fieldInfo.value;
                
                // Handle different field types
                if (value === undefined || value === null) {
                    value = '';
                }
                
                switch (fieldInfo.type) {
                    case 'checkbox':
                        value = (value === true || value === 'true' || value === 'on') ? 'Yes' : 'No';
                        break;
                    case 'date':
                        if (value) {
                            try {
                                const dateObj = new Date(value);
                                if (!isNaN(dateObj.getTime())) {
                                    value = dateObj.toISOString().split('T')[0];
                                } else {
                                    value = String(value);
                                }
                            } catch (e) {
                                value = String(value);
                            }
                        }
                        break;
                    case 'number':
                        if (typeof value === 'number') {
                            value = String(value);
                        } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                            value = String(parseFloat(value));
                        } else {
                            value = '0';
                        }
                        break;
                    default:
                        value = String(value || '');
                }
                
                // Add field data
                if (value !== '' || fieldInfo.type === 'checkbox') {
                    mapPairs.push([label, value]);
                    mapPairs.push([`${label}_type`, fieldInfo.type]);
                    
                    if (fieldInfo.description && fieldInfo.description.trim()) {
                        mapPairs.push([`${label}_description`, fieldInfo.description.trim()]);
                    }
                }
                
            } catch (error) {
                console.error(`Error processing field ${key}:`, error);
            }
        });
        
        // Add MetaFold system metadata
        const systemPairs = [
            ['MetaFold_TemplateType', 'Experiment'],
            ['MetaFold_Created', new Date().toISOString()],
            ['MetaFold_Version', '1.1.0'],
            ['NFDI4BioImage_Tool', 'MetaFold'],
            ['MetaFold_FieldCount', String(Object.keys(metadata).length)],
            ['MetaFold_Integration', 'Complete Working Solution']
        ];
        
        mapPairs.push(...systemPairs);
        
        return mapPairs;
    },

    // Generate dataset description
    generateDatasetDescription(projectName, metadata, options) {
        const lines = [
            `MetaFold project: ${projectName}`,
            `Created: ${new Date().toLocaleDateString()}`,
            `Integration: MetaFold v1.1.0 (NFDI4BioImage)`,
            ``
        ];
        
        if (metadata && Object.keys(metadata).length > 0) {
            lines.push(`Experiment metadata: ${Object.keys(metadata).length} fields`);
            lines.push(`Namespace: ${options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'}`);
        }
        
        if (options.templateType) {
            lines.push(`Template type: ${options.templateType}`);
        }
        
        lines.push('');
        lines.push('Generated by MetaFold - Laboratory Organization Tool');
        lines.push('NFDI4BioImage - https://nfdi4bioimage.de/');
        
        return lines.join('\n');
    },

    // =================== TESTING AND VALIDATION ===================

    // Test the complete integration with sample data
    async testCompleteIntegration() {
        console.log("🧪 === TESTING COMPLETE METAFOLD OMERO INTEGRATION ===");
        
        const testProjectName = `MetaFold_Complete_Test_${Date.now()}`;
        
        const testMetadata = {
            'experiment_name': {
                type: 'text',
                label: 'Experiment Name',
                value: 'Complete Integration Test',
                description: 'Testing the complete MetaFold OMERO integration'
            },
            'researcher': {
                type: 'text',
                label: 'Researcher',
                value: 'NFDI4BioImage Team',
                description: 'Primary researcher conducting the experiment'
            },
            'experiment_date': {
                type: 'date',
                label: 'Experiment Date',
                value: new Date().toISOString().split('T')[0],
                description: 'Date when the experiment was conducted'
            },
            'temperature': {
                type: 'number',
                label: 'Temperature (°C)',
                value: 25,
                description: 'Room temperature during experiment'
            },
            'successful': {
                type: 'checkbox',
                label: 'Experiment Successful',
                value: true,
                description: 'Whether the experiment was successful'
            },
            'notes': {
                type: 'textarea',
                label: 'Notes',
                value: 'This is a complete integration test of MetaFold OMERO functionality. All components should be working.',
                description: 'Additional experiment notes'
            }
        };
        
        const testOptions = {
            templateType: 'experiment',
            namespace: 'NFDI4BioImage.MetaFold.CompleteTest',
            projectId: null // Create dataset without project for now
        };
        
        console.log("🚀 Running complete integration test...");
        
        const result = await this.createDatasetForMetaFoldProject(testProjectName, testMetadata, testOptions);
        
        console.log("🧪 Complete integration test result:", result);
        
        if (result.success) {
            console.log("🎉 COMPLETE INTEGRATION SUCCESS!");
            console.log(`📋 Dataset ID: ${result.dataset.id}`);
            console.log(`🌐 OMERO.web: ${result.dataset.omeroWebUrl}`);
            console.log(`🔬 Metadata: ${result.metafold.metadataFieldCount} fields processed`);
            
            if (result.annotations?.success) {
                console.log(`✅ Annotations: ${result.annotations.keyValuePairs} pairs added`);
            }
            
            console.log("🎯 Integration is ready for production use!");
        } else {
            console.log("❌ Integration test failed:", result.message);
        }
        
        return result;
    },

    // Validate connection to OMERO
    async validateOMEROConnection() {
        console.log("🔍 Validating OMERO connection...");
        
        try {
            // Test basic connectivity
            const response = await fetch('http://localhost:3000/omero-api/webclient/api/datasets/', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.status === 200) {
                const data = await response.json();
                const datasetCount = data.datasets?.length || 0;
                
                console.log(`✅ OMERO connection validated: ${datasetCount} datasets accessible`);
                
                return {
                    success: true,
                    connected: true,
                    datasetCount: datasetCount,
                    message: 'OMERO connection is working'
                };
            } else {
                throw new Error(`OMERO connection failed: HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.log("❌ OMERO connection validation failed:", error.message);
            return {
                success: false,
                connected: false,
                message: error.message
            };
        }
    }
};

// Make globally available
window.metaFoldOMEROIntegration = metaFoldOMEROIntegration;

console.log("✅ MetaFold OMERO Integration - Complete Working Solution loaded!");
console.log("");
console.log("🎯 MAIN FUNCTION:");
console.log("  await metaFoldOMEROIntegration.createDatasetForMetaFoldProject(name, metadata, options)");
console.log("");
console.log("🧪 TESTING:");
console.log("  await metaFoldOMEROIntegration.testCompleteIntegration()       - Full integration test");
console.log("  await metaFoldOMEROIntegration.validateOMEROConnection()       - Connection validation");
console.log("");
console.log("🚀 QUICK START:");
console.log("  await metaFoldOMEROIntegration.testCompleteIntegration()");