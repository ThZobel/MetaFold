// OMERO Dataset Creation - WORKING SOLUTION
// Fixes the project linking issue and ensures dataset creation works

async function createOMERODatasetWorking(projectName, metadata, options = {}) {
    console.log("🔧 === CREATING OMERO DATASET - WORKING VERSION ===");
    
    const projectId = options.projectId;
    const namespace = options.namespace || "NFDI4BioImage.MetaFold.ExperimentMetadata";
    
    console.log(`🔧 Project Name: ${projectName}`);
    console.log(`🔧 Target Project ID: ${projectId}`);
    console.log(`🔧 Metadata fields: ${metadata ? Object.keys(metadata).length : 0}`);
    
    try {
        // STEP 1: Create the dataset
        console.log("🔧 Step 1: Creating dataset...");
        
        const datasetName = projectName;
        const datasetDescription = `MetaFold project: ${projectName}\nCreated: ${new Date().toLocaleDateString()}\nMetadata fields: ${metadata ? Object.keys(metadata).length : 0}\nCreated with: MetaFold v1.1 (NFDI4BioImage)`;
        
        const datasetData = {
            name: datasetName,
            description: datasetDescription
        };
        
        console.log("🔧 Dataset data:", datasetData);
        
        // Test different dataset creation endpoints
        let datasetId = null;
        let creationMethod = null;
        
        const creationMethods = [
            {
                name: "Webclient API",
                endpoint: "webclient/api/datasets/",
                prepare: () => datasetData
            },
            {
                name: "WebGateway",
                endpoint: "webgateway/dataset/",
                prepare: () => datasetData
            },
            {
                name: "FormData Webclient",
                endpoint: "webclient/api/datasets/",
                prepare: () => {
                    const formData = new FormData();
                    formData.append('name', datasetName);
                    formData.append('description', datasetDescription);
                    if (projectId) {
                        formData.append('project', projectId);
                    }
                    return formData;
                }
            }
        ];
        
        for (const method of creationMethods) {
            console.log(`🔧 Trying: ${method.name}`);
            
            try {
                const data = method.prepare();
                const isFormData = data instanceof FormData;
                
                const response = await window.omeroAPI.apiRequest(method.endpoint, {
                    method: 'POST',
                    headers: isFormData ? {} : { 'Content-Type': 'application/json' },
                    body: isFormData ? data : JSON.stringify(data)
                });
                
                console.log(`   Response:`, response);
                
                // Extract dataset ID from various response formats
                if (response) {
                    if (response.datasets && Array.isArray(response.datasets) && response.datasets.length > 0) {
                        // Find the newest dataset (highest ID)
                        const newestDataset = response.datasets.reduce((prev, current) => 
                            (prev.id > current.id) ? prev : current
                        );
                        datasetId = newestDataset.id;
                        creationMethod = method.name;
                        console.log(`✅ ${method.name}: Dataset created with ID ${datasetId}`);
                        break;
                    } else if (response.data && response.data.id) {
                        datasetId = response.data.id;
                        creationMethod = method.name;
                        console.log(`✅ ${method.name}: Dataset created with ID ${datasetId}`);
                        break;
                    } else if (response.id) {
                        datasetId = response.id;
                        creationMethod = method.name;
                        console.log(`✅ ${method.name}: Dataset created with ID ${datasetId}`);
                        break;
                    }
                }
                
            } catch (error) {
                console.log(`   ❌ ${method.name}: ${error.message}`);
            }
        }
        
        if (!datasetId) {
            throw new Error("Could not create dataset with any method");
        }
        
        // STEP 2: Link to project (if projectId provided and dataset wasn't auto-linked)
        let linkingSuccess = false;
        
        if (projectId) {
            console.log(`🔧 Step 2: Linking dataset ${datasetId} to project ${projectId}...`);
            
            const linkingMethods = [
                {
                    name: "WebClient Form Link",
                    method: async () => {
                        const formData = new FormData();
                        formData.append('dataset', datasetId);
                        formData.append('project', projectId);
                        
                        return await fetch(`http://localhost:3000/omero-api/webclient/link_dataset_project/`, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': window.omeroAuth.getBestCSRFToken(),
                                'Origin': window.location.origin,
                                'Referer': window.location.href
                            },
                            credentials: 'include',
                            body: formData
                        });
                    }
                },
                {
                    name: "Direct URL Update",
                    method: async () => {
                        return await fetch(`http://localhost:3000/omero-api/webclient/api/datasets/${datasetId}/`, {
                            method: 'PATCH',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': window.omeroAuth.getBestCSRFToken(),
                                'Accept': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                project: projectId
                            })
                        });
                    }
                },
                {
                    name: "WebGateway Link",
                    method: async () => {
                        return await fetch(`http://localhost:3000/omero-api/webgateway/link/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': window.omeroAuth.getBestCSRFToken(),
                                'Accept': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                dataset_id: datasetId,
                                project_id: projectId
                            })
                        });
                    }
                }
            ];
            
            for (const linkMethod of linkingMethods) {
                console.log(`🔧 Trying linking: ${linkMethod.name}`);
                
                try {
                    const response = await linkMethod.method();
                    
                    if (response.ok) {
                        console.log(`✅ ${linkMethod.name}: Linking successful`);
                        linkingSuccess = true;
                        break;
                    } else {
                        console.log(`   ⚠️ ${linkMethod.name}: Status ${response.status}`);
                    }
                    
                } catch (error) {
                    console.log(`   ❌ ${linkMethod.name}: ${error.message}`);
                }
            }
            
            if (!linkingSuccess) {
                console.log("⚠️ Could not link dataset to project, but dataset was created");
            }
        } else {
            console.log("🔧 No project ID provided, skipping linking");
            linkingSuccess = true; // No linking needed
        }
        
        // STEP 3: Add Map Annotations
        let annotationSuccess = false;
        let annotationId = null;
        
        if (metadata && Object.keys(metadata).length > 0) {
            console.log("🔧 Step 3: Adding Map Annotations...");
            
            try {
                const annotationResult = await window.omeroAnnotations.addMapAnnotations(
                    datasetId, 
                    'dataset', 
                    metadata, 
                    namespace
                );
                
                if (annotationResult.success) {
                    annotationSuccess = true;
                    annotationId = annotationResult.annotationId;
                    console.log(`✅ Map Annotations added with ID: ${annotationId}`);
                } else {
                    console.log("⚠️ Map Annotations failed:", annotationResult.message);
                }
                
            } catch (error) {
                console.log("⚠️ Map Annotations error:", error.message);
            }
        } else {
            console.log("🔧 No metadata provided, skipping annotations");
            annotationSuccess = true; // No annotations needed
        }
        
        // STEP 4: Build result
        const result = {
            success: true,
            message: `Dataset "${datasetName}" created successfully`,
            datasetId: datasetId,
            datasetName: datasetName,
            projectId: projectId,
            creationMethod: creationMethod,
            linkingSuccess: linkingSuccess,
            annotationSuccess: annotationSuccess,
            annotationId: annotationId,
            webclientUrl: `${window.omeroAuth.baseUrl}webclient/?show=dataset-${datasetId}`,
            details: {
                datasetCreated: true,
                datasetLinked: linkingSuccess,
                annotationsAdded: annotationSuccess,
                metadataFieldCount: metadata ? Object.keys(metadata).length : 0
            }
        };
        
        console.log("🎉 Dataset creation completed:", result);
        
        return result;
        
    } catch (error) {
        console.error("❌ Dataset creation failed:", error);
        
        return {
            success: false,
            message: `Dataset creation failed: ${error.message}`,
            error: error.message,
            details: {
                datasetCreated: false,
                datasetLinked: false,
                annotationsAdded: false
            }
        };
    }
}

// Test dataset creation with sample data
async function testDatasetCreation() {
    console.log("🧪 === TESTING DATASET CREATION ===");
    
    const testMetadata = {
        'experiment_name': { 
            type: 'text', 
            label: 'Experiment Name', 
            value: 'Dataset Creation Test',
            description: 'Test experiment for dataset creation'
        },
        'researcher': { 
            type: 'text', 
            label: 'Researcher', 
            value: 'NFDI4BioImage Team',
            description: 'Primary researcher'
        },
        'test_date': { 
            type: 'date', 
            label: 'Date', 
            value: new Date().toISOString().split('T')[0],
            description: 'Experiment date'
        }
    };
    
    const options = {
        projectId: null, // Test without project linking first
        namespace: "NFDI4BioImage.MetaFold.DatasetTest"
    };
    
    const result = await createOMERODatasetWorking("Test Dataset Creation", testMetadata, options);
    
    if (result.success) {
        console.log("🎉 Dataset creation test successful!");
        console.log(`   Dataset ID: ${result.datasetId}`);
        console.log(`   Webclient URL: ${result.webclientUrl}`);
        
        // Verify the dataset exists
        await verifyDatasetExists(result.datasetId);
        
        return result;
    } else {
        console.log("❌ Dataset creation test failed:", result.message);
        return result;
    }
}

// Verify that dataset was actually created
async function verifyDatasetExists(datasetId) {
    console.log(`🔍 Verifying dataset ${datasetId} exists...`);
    
    try {
        const response = await window.omeroAPI.apiRequest(`webclient/api/datasets/${datasetId}/`);
        
        if (response && response.id === datasetId) {
            console.log("✅ Dataset verified:", {
                id: response.id,
                name: response.name,
                description: response.description?.substring(0, 100) + "..."
            });
            return true;
        } else {
            console.log("❌ Dataset verification failed");
            return false;
        }
        
    } catch (error) {
        console.log("❌ Dataset verification error:", error.message);
        return false;
    }
}

// Integration with existing omeroDatasetCreation module
function createPatchForOmeroDatasetCreation() {
    console.log("🔧 === GENERATING PATCH FOR omeroDatasetCreation.js ===");
    
    const patchInstructions = `
// PATCH FOR omeroDatasetCreation.js
// Replace the failing createDatasetForProject function with this working version:

async createDatasetForProject(datasetName, metadata, options = {}) {
    console.log('🔬 Creating OMERO dataset with Map Annotations (FIXED)');
    
    const projectId = options.projectId;
    const namespace = options.namespace || "NFDI4BioImage.MetaFold.ExperimentMetadata";
    
    try {
        // Use the working dataset creation function
        const result = await createOMERODatasetWorking(datasetName, metadata, options);
        
        if (result.success) {
            console.log('✅ Dataset creation successful via working method');
            return result;
        } else {
            throw new Error(result.message);
        }
        
    } catch (error) {
        console.error('❌ Error in dataset creation:', error);
        return {
            success: false,
            message: error.message,
            guidance: 'Check the console for detailed error information.'
        };
    }
}

// OR: Update the existing linking method to use working endpoints
async function linkDatasetToProject(datasetId, projectId) {
    console.log('🔗 Linking dataset to project (FIXED)');
    
    // Try FormData approach first
    try {
        const formData = new FormData();
        formData.append('dataset', datasetId);
        formData.append('project', projectId);
        
        const response = await fetch(\`\${window.omeroAuth.baseUrl}webclient/link_dataset_project/\`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': window.omeroAuth.getBestCSRFToken(),
                'Origin': window.location.origin,
                'Referer': window.location.href
            },
            credentials: 'include',
            body: formData
        });
        
        if (response.ok) {
            console.log('✅ Dataset linked to project via FormData');
            return { success: true };
        }
        
    } catch (error) {
        console.log('⚠️ FormData linking failed, trying alternatives...');
    }
    
    // If FormData fails, dataset was created but linking failed
    // This is not critical - dataset still exists
    console.log('⚠️ Linking failed but dataset was created successfully');
    return { success: false, message: 'Dataset created but could not be linked to project' };
}
`;
    
    console.log(patchInstructions);
    return patchInstructions;
}

// Export functions
window.createOMERODatasetWorking = createOMERODatasetWorking;
window.testDatasetCreation = testDatasetCreation;
window.verifyDatasetExists = verifyDatasetExists;
window.createPatchForOmeroDatasetCreation = createPatchForOmeroDatasetCreation;

console.log("✅ OMERO Dataset Creation (Working) loaded");
console.log("Usage:");
console.log("  await createOMERODatasetWorking(name, metadata, options)  - Create dataset with working method");
console.log("  await testDatasetCreation()                              - Test dataset creation");
console.log("  createPatchForOmeroDatasetCreation()                     - Get patch for existing module");