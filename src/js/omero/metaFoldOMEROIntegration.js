// MetaFold OMERO Integration - Complete Working Solution
// Combines all successful fixes into one comprehensive module

const metaFoldOMEROIntegration = {
    
    // =================== MAIN INTEGRATION METHODS ===================

    // Create OMERO dataset from MetaFold project data
    async createDatasetForMetaFoldProject(projectName, metadata, options = {}) {
        console.log("🚀 === METAFOLD OMERO INTEGRATION ===");
        console.log(`📝 Project: ${projectName}`);
        console.log(`🔬 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
        console.log(`🎯 Target group: ${options.groupId || 'default'}`);
        console.log(`📁 Target project: ${options.projectId || 'none'}`);
        
        try {
            // Step 1: Validate inputs
            if (!projectName || projectName.trim() === '') {
                throw new Error("Project name is required");
            }
            
            // Step 2: Prepare dataset details
            const datasetName = projectName;
            const datasetDescription = this.generateDatasetDescription(projectName, metadata, options);
            
            console.log("🏗️ Creating OMERO dataset...");
            
            // Step 3: Create dataset using working CSRF fix
            const datasetResult = await this.createDatasetWithWorkingCSRF(datasetName, datasetDescription, options);
            
            if (!datasetResult.success) {
                return {
                    success: false,
                    message: `Dataset creation failed: ${datasetResult.message}`,
                    error: datasetResult.error || datasetResult.message,
                    stage: 'dataset_creation'
                };
            }
            
            const datasetId = datasetResult.datasetId;
            console.log(`✅ Dataset created: ID ${datasetId}`);
            
            // Step 4: Add Map Annotations if metadata provided
            let annotationResult = null;
            if (metadata && Object.keys(metadata).length > 0) {
                console.log("🔬 Adding experiment metadata as Map Annotations...");
                
                annotationResult = await this.addWorkingMapAnnotations(
                    datasetId,
                    metadata,
                    options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'
                );
                
                if (annotationResult.success) {
                    console.log(`✅ Map Annotations: ${annotationResult.keyValuePairs} pairs added`);
                } else {
                    console.log(`⚠️ Map Annotations failed: ${annotationResult.message}`);
                }
            } else {
                console.log("📋 No metadata provided, skipping annotations");
            }
            
            // Step 5: Generate result
            const result = {
                success: true,
                message: `MetaFold project "${projectName}" successfully exported to OMERO`,
                dataset: {
                    id: datasetId,
                    name: datasetName,
                    description: datasetDescription,
                    omeroWebUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`
                },
                annotations: annotationResult,
                integration: {
                    tool: 'MetaFold',
                    version: '1.1.0',
                    timestamp: new Date().toISOString(),
                    method: 'complete_working_solution',
                    csrfTokenSource: datasetResult.csrfTokenSource
                },
                metafold: {
                    projectName: projectName,
                    metadataFieldCount: metadata ? Object.keys(metadata).length : 0,
                    templateType: options.templateType || 'experiment',
                    namespace: options.namespace || 'NFDI4BioImage.MetaFold.ExperimentMetadata'
                },
                // For compatibility with projectManager.js
                url: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`
            };
            
            console.log("🎉 MetaFold OMERO integration completed successfully!");
            console.log(`🌐 View in OMERO.web: ${result.dataset.omeroWebUrl}`);
            
            return result;
            
        } catch (error) {
            console.error("❌ MetaFold OMERO integration failed:", error);
            return {
                success: false,
                message: `Integration failed: ${error.message}`,
                error: error.message,
                stage: 'integration_error'
            };
        }
    },

    // =================== DATASET CREATION (WORKING VERSION) ===================

    // Create dataset using the working CSRF solution
    async createDatasetWithWorkingCSRF(name, description, options = {}) {
        console.log("🏗️ Creating dataset with working CSRF solution...");
        
        try {
            // Get working CSRF token from webclient main page
            const tokenResult = await this.getWorkingCSRFToken();
            
            if (!tokenResult.success) {
                throw new Error(`CSRF token acquisition failed: ${tokenResult.message}`);
            }
            
            const csrfToken = tokenResult.token;
            console.log(`🔑 Using CSRF token from: ${tokenResult.source}`);
            
            // Prepare dataset creation request
            const formData = new URLSearchParams();
            formData.append('name', name);
            formData.append('folder_type', 'dataset');
            formData.append('description', description || '');
            formData.append('owner', ''); // Current user
            formData.append('csrfmiddlewaretoken', csrfToken);
            
            // Add project if specified
            if (options.projectId) {
                formData.append('project', options.projectId);
            }
            
            console.log("🚀 Submitting dataset creation request...");
            
            // Create dataset
            const response = await fetch('http://localhost:3000/omero-api/webclient/action/addnewcontainer/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-CSRFToken': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': 'http://localhost:3000/omero-api/webclient/',
                    'Origin': 'http://localhost:3000'
                },
                credentials: 'include',
                body: formData
            });
            
            console.log(`📋 Dataset creation response: ${response.status}`);
            
            if (response.status !== 200) {
                throw new Error(`Dataset creation failed with status: ${response.status}`);
            }
            
            const responseText = await response.text();
            
            // Check for login page (session issue)
            if (responseText.includes('<title>') && responseText.includes('Login')) {
                throw new Error("Session expired - got login page instead of dataset creation response");
            }
            
            // Extract dataset ID from response
            let datasetId = null;
            
            try {
                // Try JSON parsing first
                const jsonData = JSON.parse(responseText);
                console.log("✅ Dataset creation JSON response:", jsonData);
                
                if (jsonData.id) {
                    datasetId = jsonData.id;
                } else if (jsonData.dataset_id) {
                    datasetId = jsonData.dataset_id;
                }
            } catch (e) {
                // If not JSON, try text patterns
                const patterns = [
                    /dataset[_-](\d+)/i,
                    /show=dataset-(\d+)/i,
                    /"id":\s*(\d+)/
                ];
                
                for (const pattern of patterns) {
                    const match = responseText.match(pattern);
                    if (match) {
                        datasetId = parseInt(match[1]);
                        break;
                    }
                }
            }
            
            if (!datasetId) {
                // Fallback: Search for recently created dataset
                console.log("🔍 ID extraction failed, searching recent datasets...");
                datasetId = await this.findRecentDataset(name);
            }
            
            if (datasetId) {
                console.log(`✅ Dataset created successfully: ID ${datasetId}`);
                
                return {
                    success: true,
                    datasetId: datasetId,
                    datasetName: name,
                    csrfTokenSource: tokenResult.source,
                    method: 'working_csrf_solution'
                };
            } else {
                throw new Error("Dataset creation succeeded but ID could not be extracted");
            }
            
        } catch (error) {
            console.error("❌ Dataset creation with working CSRF failed:", error);
            return {
                success: false,
                message: error.message,
                error: error.message
            };
        }
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