// OMERO Dataset Creation - Enhanced for MetaFold Integration

const omeroDatasetCreation = {
    lastCreatedDataset: null,
    creationHistory: [],

    // Initialize dataset creation module
    init() {
        console.log('🔬 OMERO Dataset Creation Module initialized');
        return this;
    },

    // =================== MAIN DATASET CREATION ===================

    // Create dataset for MetaFold project with Map Annotations
    async createDatasetForProject(projectName, metadata = null, options = {}) {
        try {
            console.log('🔬 Creating OMERO dataset with Map Annotations for project:', projectName);
            
            // Validate inputs
            if (!projectName || typeof projectName !== 'string') {
                throw new Error('Project name is required and must be a string');
            }

            // Ensure we have an authenticated session
            await this.ensureAuthentication();
            
            // Prepare dataset info
            const datasetName = options.datasetName || projectName;
            const description = this.generateDatasetDescription(projectName, metadata, options);
            
            console.log('🔬 Dataset name:', datasetName);
            console.log('🔬 Metadata fields:', metadata ? Object.keys(metadata).length : 0);
            
            // Create dataset
            console.log('🔬 Creating dataset in OMERO...');
            const dataset = await window.omeroProjects.createDataset(datasetName, description);
            const datasetId = dataset['@id'] || dataset.id;
            
            if (!datasetId) {
                throw new Error('Dataset creation failed - no ID returned');
            }
            
            console.log('✅ Dataset created with ID:', datasetId);
            
            // Link to project if specified
            await this.handleProjectLinking(datasetId, options);
            
            // Add metadata as Map Annotations
            let mapAnnotationsResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                try {
                    console.log('🔬 Adding Map Annotations for metadata...');
                    mapAnnotationsResult = await window.omeroAnnotations.addMapAnnotations(
                        datasetId, 
                        'dataset', 
                        metadata, 
                        options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'
                    );
                    
                    if (mapAnnotationsResult.success) {
                        console.log('✅ Map Annotations added successfully:', mapAnnotationsResult.keyValuePairs, 'key-value pairs');
                    } else {
                        console.warn('⚠️ Map Annotations partially failed:', mapAnnotationsResult.message);
                    }
                } catch (metadataError) {
                    console.warn('⚠️ Failed to add Map Annotations:', metadataError.message);
                    mapAnnotationsResult = {
                        success: false,
                        message: metadataError.message,
                        keyValuePairs: 0
                    };
                }
            }
            
            // Create result object
            const result = this.buildCreationResult(datasetId, datasetName, mapAnnotationsResult, options);
            
            // Store in history
            this.lastCreatedDataset = result;
            this.creationHistory.push({
                timestamp: new Date().toISOString(),
                projectName: projectName,
                datasetId: datasetId,
                datasetName: datasetName,
                success: true,
                metadataFields: metadata ? Object.keys(metadata).length : 0
            });
            
            console.log('✅ Dataset creation completed successfully');
            return result;
            
        } catch (error) {
            console.error('❌ Error creating OMERO dataset:', error);
            
            // Store error in history
            this.creationHistory.push({
                timestamp: new Date().toISOString(),
                projectName: projectName,
                success: false,
                error: error.message
            });
            
            return {
                success: false,
                message: `Error creating OMERO dataset: ${error.message}`,
                guidance: this.generateErrorGuidance(error)
            };
        }
    },

    // =================== AUTHENTICATION & VALIDATION ===================

    // Ensure we have valid authentication
    async ensureAuthentication() {
        if (!window.omeroAuth || !window.omeroAuth.session) {
            throw new Error('No OMERO session available');
        }
        
        if (!window.omeroAuth.isSessionValid()) {
            console.log('🔬 Session expired, attempting to re-establish...');
            
            // Try to recover session from cookies or re-login
            try {
                await window.omeroAuth.establishSessionFromCookies();
            } catch (cookieError) {
                // Try public group as fallback
                await window.omeroAuth.loginPublicGroup();
            }
        }
        
        if (!window.omeroAuth.session.hasApiAccess) {
            console.warn('⚠️ Limited API access - some operations may fail');
        }
        
        console.log('✅ Authentication validated');
    },

    // =================== PROJECT LINKING ===================

    // Handle linking dataset to project
    async handleProjectLinking(datasetId, options) {
        let linkedProjectId = null;
        
        try {
            // Priority 1: Explicit project ID in options
            if (options.projectId) {
                console.log('🔬 Linking to specified project:', options.projectId);
                await window.omeroProjects.linkDatasetToProject(datasetId, parseInt(options.projectId));
                linkedProjectId = options.projectId;
                console.log('✅ Dataset linked to specified project');
            }
            // Priority 2: Default project ID from settings
            else if (window.settingsManager) {
                const defaultProjectId = window.settingsManager.get('omero.default_project_id');
                if (defaultProjectId && defaultProjectId.trim()) {
                    console.log('🔬 Linking to default project:', defaultProjectId);
                    await window.omeroProjects.linkDatasetToProject(datasetId, parseInt(defaultProjectId));
                    linkedProjectId = defaultProjectId;
                    console.log('✅ Dataset linked to default project');
                }
            }
            
            if (!linkedProjectId) {
                console.log('ℹ️ No project linking - dataset created as standalone');
            }
            
        } catch (linkError) {
            console.warn('⚠️ Failed to link dataset to project:', linkError.message);
            // Don't fail the entire operation if linking fails
        }
        
        return linkedProjectId;
    },

    // =================== DESCRIPTION GENERATION ===================

    // Generate comprehensive dataset description
    generateDatasetDescription(projectName, metadata, options = {}) {
        const date = new Date().toLocaleDateString();
        let description = `MetaFold project: ${projectName}\nCreated: ${date}`;
        
        // Add metadata info
        if (metadata && Object.keys(metadata).length > 0) {
            const fieldCount = Object.keys(metadata).filter(key => metadata[key].type !== 'group').length;
            description += `\nMetadata fields: ${fieldCount}`;
            
            // Add key metadata fields to description
            const keyFields = ['experiment_name', 'researcher', 'description', 'hypothesis'];
            keyFields.forEach(fieldKey => {
                if (metadata[fieldKey] && metadata[fieldKey].value) {
                    const label = metadata[fieldKey].label || fieldKey;
                    const value = String(metadata[fieldKey].value).substring(0, 100); // Limit length
                    description += `\n${label}: ${value}`;
                }
            });
        }
        
        // Add tool info
        description += `\nCreated with: MetaFold v1.0 (NFDI4BioImage)`;
        
        // Add namespace info if custom
        if (options.namespace && options.namespace !== 'NFDI4BioImage.MetaFold.ExperimentMetadata') {
            description += `\nCustom namespace: ${options.namespace}`;
        }
        
        return description;
    },

    // =================== RESULT BUILDING ===================

    // Build comprehensive creation result
    buildCreationResult(datasetId, datasetName, mapAnnotationsResult, options) {
        const settings = window.settingsManager?.getSettings() || {};
        const realServerUrl = window.omeroAuth?.baseUrl?.replace('/omero-api', '') || settings.serverUrl || '';
        const webclientUrl = `${realServerUrl}webclient/?show=dataset-${datasetId}`;
        
        return {
            success: true,
            message: `Dataset created in OMERO${mapAnnotationsResult?.success ? ' with Map Annotations' : ''}! Login: ${window.omeroAuth.session?.loginMethod}`,
            datasetId: datasetId,
            datasetName: datasetName,
            url: webclientUrl,
            proxyUrl: window.omeroAuth?.baseUrl,
            targetServer: realServerUrl,
            loginMethod: window.omeroAuth.session?.loginMethod,
            isAuthenticated: window.omeroAuth.session?.isAuthenticated || false,
            mapAnnotationsAdded: mapAnnotationsResult?.keyValuePairs || 0,
            mapAnnotationsSuccess: mapAnnotationsResult?.success || false,
            workingEndpoint: mapAnnotationsResult?.workingStrategy,
            details: {
                created: new Date().toISOString(),
                metadataFields: mapAnnotationsResult?.keyValuePairs || 0,
                linkedToProject: !!options.projectId,
                projectId: options.projectId || null,
                namespace: options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'
            }
        };
    },

    // =================== ERROR HANDLING ===================

    // Generate error guidance based on error type
    generateErrorGuidance(error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('proxy')) {
            return 'Start the proxy server with: python omero_proxy.py';
        } else if (errorMessage.includes('session') || errorMessage.includes('login')) {
            return 'Check your OMERO credentials in settings or try refreshing the page.';
        } else if (errorMessage.includes('403') || errorMessage.includes('permission')) {
            return 'Check if you have permission to create datasets in OMERO.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return 'Check your network connection and ensure the OMERO server is accessible.';
        } else if (errorMessage.includes('csrf')) {
            return 'CSRF token issue - try refreshing the page and logging in again.';
        } else {
            return 'Check the console for detailed error information.';
        }
    },

    // =================== BATCH OPERATIONS ===================

    // Create multiple datasets from a batch
    async createDatasetBatch(projects) {
        console.log(`🔬 Creating batch of ${projects.length} datasets...`);
        
        const results = [];
        const errors = [];
        
        for (let i = 0; i < projects.length; i++) {
            const project = projects[i];
            
            try {
                console.log(`🔬 Creating dataset ${i + 1}/${projects.length}: ${project.name}`);
                
                const result = await this.createDatasetForProject(
                    project.name,
                    project.metadata,
                    project.options || {}
                );
                
                results.push({
                    index: i,
                    projectName: project.name,
                    success: result.success,
                    datasetId: result.datasetId,
                    result: result
                });
                
                // Small delay between creations to be OMERO-friendly
                if (i < projects.length - 1) {
                    await window.omeroAPI.delay(500);
                }
                
            } catch (error) {
                console.error(`❌ Batch creation ${i + 1} failed:`, error);
                
                const errorResult = {
                    index: i,
                    projectName: project.name,
                    success: false,
                    error: error.message
                };
                
                results.push(errorResult);
                errors.push(errorResult);
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        console.log(`✅ Batch creation completed: ${successCount}/${projects.length} successful`);
        
        return {
            total: projects.length,
            successful: successCount,
            failed: errors.length,
            results: results,
            errors: errors
        };
    },

    // =================== HISTORY & STATISTICS ===================

    // Get creation history
    getCreationHistory() {
        return [...this.creationHistory];
    },

    // Get creation statistics
    getCreationStatistics() {
        const history = this.creationHistory;
        const successful = history.filter(h => h.success);
        const failed = history.filter(h => !h.success);
        
        return {
            total: history.length,
            successful: successful.length,
            failed: failed.length,
            totalMetadataFields: successful.reduce((sum, h) => sum + (h.metadataFields || 0), 0),
            averageMetadataFields: successful.length > 0 ? 
                (successful.reduce((sum, h) => sum + (h.metadataFields || 0), 0) / successful.length).toFixed(1) : 0,
            lastCreated: history.length > 0 ? history[history.length - 1] : null,
            commonErrors: this.getCommonErrors(failed)
        };
    },

    // Analyze common errors
    getCommonErrors(failedCreations) {
        const errorMap = new Map();
        
        failedCreations.forEach(creation => {
            const errorKey = creation.error?.split(':')[0] || 'Unknown error';
            errorMap.set(errorKey, (errorMap.get(errorKey) || 0) + 1);
        });
        
        return Array.from(errorMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([error, count]) => ({ error, count }));
    },

    // Clear creation history
    clearHistory() {
        this.creationHistory = [];
        this.lastCreatedDataset = null;
        console.log('🔬 Creation history cleared');
    },

    // =================== VALIDATION METHODS ===================

    // Validate dataset creation options
    validateCreationOptions(projectName, metadata, options) {
        const validation = {
            valid: true,
            warnings: [],
            errors: []
        };
        
        // Validate project name
        if (!projectName || typeof projectName !== 'string') {
            validation.errors.push('Project name is required and must be a string');
            validation.valid = false;
        } else if (projectName.length > 255) {
            validation.warnings.push('Project name is very long and may be truncated');
        }
        
        // Validate metadata
        if (metadata && typeof metadata !== 'object') {
            validation.errors.push('Metadata must be an object');
            validation.valid = false;
        } else if (metadata) {
            const metadataValidation = window.omeroAnnotations?.validateAnnotationData(
                window.omeroAnnotations.convertMetadataToMapAnnotation(metadata),
                options.namespace
            );
            
            if (metadataValidation && !metadataValidation.valid) {
                validation.errors.push(...metadataValidation.errors);
                validation.valid = false;
            }
            
            if (metadataValidation && metadataValidation.warnings) {
                validation.warnings.push(...metadataValidation.warnings);
            }
        }
        
        // Validate options
        if (options.projectId && (isNaN(parseInt(options.projectId)) || parseInt(options.projectId) <= 0)) {
            validation.errors.push('Project ID must be a positive number');
            validation.valid = false;
        }
        
        if (options.datasetName && typeof options.datasetName !== 'string') {
            validation.errors.push('Dataset name must be a string');
            validation.valid = false;
        }
        
        if (options.namespace && typeof options.namespace !== 'string') {
            validation.errors.push('Namespace must be a string');
            validation.valid = false;
        }
        
        return validation;
    },

    // =================== UTILITY METHODS ===================

    // Get last created dataset info
    getLastCreatedDataset() {
        return this.lastCreatedDataset;
    },

    // Check if dataset exists
    async datasetExists(datasetName) {
        try {
            const datasets = await window.omeroProjects.getDatasets();
            return datasets.some(dataset => 
                (dataset.Name || dataset.name) === datasetName
            );
        } catch (error) {
            console.warn('Could not check if dataset exists:', error);
            return false;
        }
    },

    // Generate unique dataset name
    async generateUniqueDatasetName(baseName) {
        let counter = 1;
        let uniqueName = baseName;
        
        while (await this.datasetExists(uniqueName)) {
            uniqueName = `${baseName} (${counter})`;
            counter++;
            
            if (counter > 100) {
                // Safety break
                uniqueName = `${baseName} (${Date.now()})`;
                break;
            }
        }
        
        return uniqueName;
    },

    // =================== DEBUGGING METHODS ===================

    // Debug dataset creation process
    async debugDatasetCreation(projectName, metadata) {
        console.log('🔬 === DATASET CREATION DEBUG ===');
        console.log('Project name:', projectName);
        console.log('Metadata:', metadata);
        
        // Check authentication
        console.log('Auth status:', {
            hasSession: !!window.omeroAuth?.session,
            sessionValid: window.omeroAuth?.isSessionValid(),
            hasApiAccess: window.omeroAuth?.session?.hasApiAccess,
            loginMethod: window.omeroAuth?.session?.loginMethod
        });
        
        // Check settings
        const settings = window.settingsManager?.getSettings() || {};
        console.log('OMERO settings:', {
            enabled: settings['omero.enabled'],
            serverUrl: settings['omero.server_url'],
            autoSync: settings['omero.auto_sync'],
            defaultProject: settings['omero.default_project_id']
        });
        
        // Validate creation options
        const validation = this.validateCreationOptions(projectName, metadata, {});
        console.log('Validation result:', validation);
        
        // Test metadata conversion
        if (metadata) {
            const mapPairs = window.omeroAnnotations?.convertMetadataToMapAnnotation(metadata);
            console.log('Map pairs generated:', mapPairs?.length || 0);
            console.log('Sample map pairs:', mapPairs?.slice(0, 3));
        }
        
        // Test endpoint availability
        if (window.omeroAnnotations?.discoverWorkingEndpoints) {
            const endpoints = await window.omeroAnnotations.discoverWorkingEndpoints();
            console.log('Working endpoints:', endpoints.working.length);
            console.log('Recommendations:', endpoints.recommendations);
        }
        
        console.log('================================');
        
        return {
            projectName,
            validation,
            authStatus: {
                hasSession: !!window.omeroAuth?.session,
                sessionValid: window.omeroAuth?.isSessionValid(),
                hasApiAccess: window.omeroAuth?.session?.hasApiAccess
            },
            settings: {
                enabled: settings['omero.enabled'],
                serverUrl: settings['omero.server_url']
            }
        };
    },

    // Test dataset creation with sample data
    async testDatasetCreation() {
        console.log('🔬 === TESTING DATASET CREATION ===');
        
        const testProjectName = `MetaFold Test ${Date.now()}`;
        const testMetadata = {
            'test_field': {
                type: 'text',
                label: 'Test Field',
                value: 'Test Value',
                description: 'This is a test field for dataset creation'
            },
            'test_number': {
                type: 'number',
                label: 'Test Number',
                value: 42,
                description: 'A test number field'
            },
            'test_date': {
                type: 'date',
                label: 'Test Date',
                value: new Date().toISOString().split('T')[0],
                description: 'Today\'s date'
            }
        };
        
        try {
            const result = await this.createDatasetForProject(testProjectName, testMetadata, {
                namespace: 'NFDI4BioImage.MetaFold.Test'
            });
            
            console.log('✅ Test result:', result);
            
            if (result.success) {
                console.log(`✅ Test dataset created successfully!`);
                console.log(`   Dataset ID: ${result.datasetId}`);
                console.log(`   Map Annotations: ${result.mapAnnotationsAdded} fields`);
                console.log(`   URL: ${result.url}`);
            } else {
                console.log(`❌ Test failed: ${result.message}`);
            }
            
            return result;
            
        } catch (error) {
            console.error('❌ Test dataset creation failed:', error);
            return {
                success: false,
                message: error.message,
                error: error
            };
        }
    }
};

// Make globally available
window.omeroDatasetCreation = omeroDatasetCreation;
console.log('✅ OMERO Dataset Creation Module loaded (Enhanced for MetaFold)');