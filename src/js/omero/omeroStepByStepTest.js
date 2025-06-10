// Schrittweise OMERO Tests - Debugging der Integration

// SCHRITT 1: Test nur Dataset-Erstellung (ohne Map Annotations)
async function testOMERODatasetCreationOnly() {
    console.log('🧪 === TESTING DATASET CREATION ONLY ===');
    
    try {
        // Check modules
        if (!window.omeroProjects || !window.omeroUIIntegration) {
            throw new Error('Required OMERO modules not loaded');
        }
        
        // Check connection
        if (!window.omeroAuth?.session) {
            console.log('🔬 No session - trying to connect...');
            const connectionResult = await window.omeroUIIntegration.testConnection();
            if (!connectionResult.success) {
                throw new Error(`Connection failed: ${connectionResult.message}`);
            }
        }
        
        // Test dataset creation ONLY
        const testDatasetName = `MetaFold_DatasetTest_${Date.now()}`;
        const testDescription = `Test dataset created by MetaFold on ${new Date().toISOString()}`;
        
        console.log('🔬 Creating dataset:', testDatasetName);
        
        const dataset = await window.omeroProjects.createDataset(testDatasetName, testDescription);
        
        console.log('🔬 Dataset creation response:', dataset);
        
        // Extract ID
        const datasetId = dataset['@id'] || dataset.id;
        
        if (!datasetId) {
            throw new Error('Dataset creation failed - no ID returned');
        }
        
        console.log('✅ Dataset created successfully!');
        console.log(`   Dataset ID: ${datasetId}`);
        console.log(`   Dataset Name: ${testDatasetName}`);
        
        return {
            success: true,
            datasetId: datasetId,
            datasetName: testDatasetName,
            message: 'Dataset creation works!'
        };
        
    } catch (error) {
        console.error('❌ Dataset creation failed:', error);
        return {
            success: false,
            message: error.message,
            step: 'dataset_creation'
        };
    }
}

// SCHRITT 2: Test Map Annotations zu bestehendem Dataset
async function testOMEROMapAnnotationsToExistingDataset(datasetId) {
    console.log('🧪 === TESTING MAP ANNOTATIONS TO EXISTING DATASET ===');
    console.log('🔬 Target Dataset ID:', datasetId);
    
    try {
        if (!datasetId) {
            throw new Error('No dataset ID provided');
        }
        
        // Generate test metadata
        const testMetadata = {
            'test_field': {
                type: 'text',
                label: 'Test Field',
                value: 'Map Annotations Test',
                description: 'Testing Map Annotations functionality'
            },
            'test_number': {
                type: 'number',
                label: 'Test Number',
                value: 42,
                description: 'A test number'
            },
            'test_date': {
                type: 'date',
                label: 'Test Date',
                value: new Date().toISOString().split('T')[0],
                description: 'Today\'s date'
            }
        };
        
        console.log('🔬 Test metadata:', testMetadata);
        
        // Test Map Annotations
        const result = await window.omeroAnnotations.addMapAnnotations(
            datasetId,
            'dataset',
            testMetadata,
            null  // no namespace for now
        );
        
        console.log('🔬 Map Annotations result:', result);
        
        if (result.success) {
            console.log('✅ Map Annotations added successfully!');
            console.log(`   Key-Value Pairs: ${result.keyValuePairs}`);
        } else {
            console.log('❌ Map Annotations failed:', result.message);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Map Annotations test failed:', error);
        return {
            success: false,
            message: error.message,
            step: 'map_annotations'
        };
    }
}

// SCHRITT 3: Kombinierter Test (Dataset + Map Annotations)
async function testOMEROCompleteWorkflow() {
    console.log('🚀 === TESTING COMPLETE OMERO WORKFLOW ===');
    
    try {
        // Step 1: Create dataset
        console.log('🚀 Step 1: Creating dataset...');
        const datasetResult = await testOMERODatasetCreationOnly();
        
        if (!datasetResult.success) {
            return {
                success: false,
                message: `Step 1 failed: ${datasetResult.message}`,
                step: 'dataset_creation'
            };
        }
        
        console.log('✅ Step 1 passed - Dataset created');
        
        // Step 2: Add Map Annotations
        console.log('🚀 Step 2: Adding Map Annotations...');
        const annotationsResult = await testOMEROMapAnnotationsToExistingDataset(datasetResult.datasetId);
        
        if (!annotationsResult.success) {
            return {
                success: false,
                message: `Step 2 failed: ${annotationsResult.message}`,
                step: 'map_annotations',
                datasetCreated: true,
                datasetId: datasetResult.datasetId
            };
        }
        
        console.log('✅ Step 2 passed - Map Annotations added');
        
        // Success!
        console.log('🎉 Complete workflow successful!');
        
        return {
            success: true,
            message: 'Complete OMERO workflow successful!',
            datasetId: datasetResult.datasetId,
            datasetName: datasetResult.datasetName,
            mapAnnotationsAdded: annotationsResult.keyValuePairs,
            details: {
                dataset: datasetResult,
                annotations: annotationsResult
            }
        };
        
    } catch (error) {
        console.error('❌ Complete workflow failed:', error);
        return {
            success: false,
            message: error.message,
            step: 'workflow_error'
        };
    }
}

// SCHRITT 4: Debug Dataset Creation Details
async function debugOMERODatasetCreation() {
    console.log('🔍 === DEBUGGING DATASET CREATION ===');
    
    try {
        // Check what's available
        console.log('🔍 Available modules:');
        console.log('   omeroProjects:', !!window.omeroProjects);
        console.log('   omeroAPI:', !!window.omeroAPI);
        console.log('   omeroAuth:', !!window.omeroAuth);
        
        // Check session
        if (window.omeroAuth?.session) {
            console.log('🔍 Session details:');
            console.log('   Valid:', window.omeroAuth.isSessionValid());
            console.log('   Authenticated:', window.omeroAuth.session.isAuthenticated);
            console.log('   Login method:', window.omeroAuth.session.loginMethod);
        }
        
        // Test basic API access
        console.log('🔍 Testing basic API access...');
        try {
            const response = await window.omeroAPI.apiRequest('api/v0/m/datasets/', {
                method: 'GET'
            });
            console.log('🔍 Can access datasets API:', !!response);
            console.log('🔍 Existing datasets count:', response.data?.length || 0);
        } catch (apiError) {
            console.log('🔍 API access error:', apiError.message);
        }
        
        // Check create permissions
        console.log('🔍 Testing dataset creation permission...');
        const testDatasetName = `MetaFold_PermissionTest_${Date.now()}`;
        const minimalDatasetData = { name: testDatasetName };
        
        try {
            const createResponse = await window.omeroAPI.apiRequest('api/v0/m/datasets/', {
                method: 'POST',
                body: JSON.stringify(minimalDatasetData)
            });
            
            const createdId = createResponse.data?.['@id'] || createResponse.data?.id;
            
            console.log('✅ Dataset creation permission: OK');
            console.log('🔍 Created dataset ID:', createdId);
            
            return {
                success: true,
                canCreateDatasets: true,
                testDatasetId: createdId,
                message: 'Dataset creation works at API level'
            };
            
        } catch (createError) {
            console.log('❌ Dataset creation permission error:', createError.message);
            
            return {
                success: false,
                canCreateDatasets: false,
                error: createError.message,
                message: 'Cannot create datasets - check permissions'
            };
        }
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// SCHRITT 5: Check Current omeroDatasetCreation Process
function debugCurrentDatasetCreationFlow() {
    console.log('🔍 === DEBUGGING CURRENT FLOW ===');
    
    // Check if omeroDatasetCreation exists and what it does
    if (!window.omeroDatasetCreation) {
        console.log('❌ omeroDatasetCreation module not loaded');
        return { success: false, message: 'omeroDatasetCreation not loaded' };
    }
    
    console.log('✅ omeroDatasetCreation module loaded');
    
    // Check available functions
    const availableFunctions = Object.getOwnPropertyNames(window.omeroDatasetCreation)
        .filter(name => typeof window.omeroDatasetCreation[name] === 'function');
    
    console.log('🔍 Available functions:', availableFunctions);
    
    // Check last created dataset
    const lastCreated = window.omeroDatasetCreation.getLastCreatedDataset?.();
    console.log('🔍 Last created dataset:', lastCreated);
    
    // Check creation history
    const history = window.omeroDatasetCreation.getCreationHistory?.();
    console.log('🔍 Creation history:', history?.length || 0, 'entries');
    
    return {
        success: true,
        availableFunctions: availableFunctions,
        lastCreated: lastCreated,
        historyCount: history?.length || 0
    };
}

// Make functions globally available
window.testOMERODatasetCreationOnly = testOMERODatasetCreationOnly;
window.testOMEROMapAnnotationsToExistingDataset = testOMEROMapAnnotationsToExistingDataset;
window.testOMEROCompleteWorkflow = testOMEROCompleteWorkflow;
window.debugOMERODatasetCreation = debugOMERODatasetCreation;
window.debugCurrentDatasetCreationFlow = debugCurrentDatasetCreationFlow;

console.log('✅ OMERO Step-by-Step Test Functions loaded');
console.log('   Available tests:');
console.log('   • testOMERODatasetCreationOnly() - Test dataset creation only');
console.log('   • testOMEROCompleteWorkflow() - Full workflow test');
console.log('   • debugOMERODatasetCreation() - Debug dataset creation');
console.log('   • debugCurrentDatasetCreationFlow() - Debug current flow');