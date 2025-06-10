// OMERO Integration Test Function - For testing the complete integration chain

async function testOMEROIntegrationChain() {
    console.log('🚀 === TESTING COMPLETE OMERO INTEGRATION CHAIN ===');
    
    const testResults = {
        step1_modules: { status: 'pending', details: null },
        step2_settings: { status: 'pending', details: null },
        step3_connection: { status: 'pending', details: null },
        step4_metadata: { status: 'pending', details: null },
        step5_dataset: { status: 'pending', details: null },
        overall: { success: false, errors: [] }
    };
    
    try {
        // STEP 1: Check if all required modules are loaded
        console.log('🚀 Step 1: Checking module availability...');
        const requiredModules = {
            settingsManager: !!window.settingsManager,
            omeroUIIntegration: !!window.omeroUIIntegration,
            omeroDatasetCreation: !!window.omeroDatasetCreation,
            omeroAnnotations: !!window.omeroAnnotations,
            omeroAuth: !!window.omeroAuth,
            omeroAPI: !!window.omeroAPI
        };
        
        const missingModules = Object.entries(requiredModules)
            .filter(([name, loaded]) => !loaded)
            .map(([name]) => name);
        
        if (missingModules.length > 0) {
            testResults.step1_modules = {
                status: 'failed',
                details: { missing: missingModules, available: requiredModules }
            };
            testResults.overall.errors.push(`Missing modules: ${missingModules.join(', ')}`);
        } else {
            testResults.step1_modules = {
                status: 'passed',
                details: { all_modules_loaded: true, modules: requiredModules }
            };
            console.log('✅ Step 1: All modules loaded');
        }
        
        // STEP 2: Check OMERO settings
        console.log('🚀 Step 2: Checking OMERO settings...');
        const omeroSettings = {
            enabled: window.settingsManager.get('omero.enabled'),
            serverUrl: window.settingsManager.get('omero.server_url'),
            username: window.settingsManager.get('omero.username'),
            hasPassword: !!window.settingsManager.get('omero.password')
        };
        
        const settingsOk = omeroSettings.enabled && omeroSettings.serverUrl;
        testResults.step2_settings = {
            status: settingsOk ? 'passed' : 'failed',
            details: {
                ...omeroSettings,
                recommendation: settingsOk ? 
                    'Settings look good' : 
                    'Enable OMERO and configure server URL in settings'
            }
        };
        
        if (!settingsOk) {
            testResults.overall.errors.push('OMERO not enabled or server URL missing');
            console.log('❌ Step 2: OMERO settings incomplete');
        } else {
            console.log('✅ Step 2: OMERO settings configured');
        }
        
        // STEP 3: Test OMERO connection
        console.log('🚀 Step 3: Testing OMERO connection...');
        try {
            const connectionResult = await window.settingsManager.testOMEROConnection();
            testResults.step3_connection = {
                status: connectionResult.success ? 'passed' : 'failed',
                details: connectionResult
            };
            
            if (!connectionResult.success) {
                testResults.overall.errors.push(`Connection failed: ${connectionResult.message}`);
                console.log('❌ Step 3: Connection failed');
            } else {
                console.log('✅ Step 3: Connection successful');
            }
        } catch (connectionError) {
            testResults.step3_connection = {
                status: 'failed',
                details: { error: connectionError.message }
            };
            testResults.overall.errors.push(`Connection error: ${connectionError.message}`);
            console.log('❌ Step 3: Connection error');
        }
        
        // STEP 4: Test metadata conversion
        console.log('🚀 Step 4: Testing metadata conversion...');
        const sampleMetadata = generateTestMetadata();
        
        try {
            const mapPairs = window.omeroAnnotations.convertMetadataToMapAnnotation(sampleMetadata);
            const validationResult = window.omeroAnnotations.validateAnnotationData(
                mapPairs, 
                'NFDI4BioImage.MetaFold.Test'
            );
            
            testResults.step4_metadata = {
                status: validationResult.valid ? 'passed' : 'failed',
                details: {
                    inputFields: Object.keys(sampleMetadata).length,
                    outputPairs: mapPairs.length,
                    validation: validationResult,
                    samplePairs: mapPairs.slice(0, 3)
                }
            };
            
            if (!validationResult.valid) {
                testResults.overall.errors.push(`Metadata validation failed: ${validationResult.errors.join(', ')}`);
                console.log('❌ Step 4: Metadata validation failed');
            } else {
                console.log('✅ Step 4: Metadata conversion successful');
            }
        } catch (metadataError) {
            testResults.step4_metadata = {
                status: 'failed',
                details: { error: metadataError.message }
            };
            testResults.overall.errors.push(`Metadata conversion error: ${metadataError.message}`);
            console.log('❌ Step 4: Metadata conversion error');
        }
        
        // STEP 5: Test dataset creation (only if connection works)
        if (testResults.step3_connection.status === 'passed') {
            console.log('🚀 Step 5: Testing dataset creation...');
            
            try {
                const testProjectName = `MetaFold_IntegrationTest_${Date.now()}`;
                const datasetResult = await window.settingsManager.createOMERODataset(
                    testProjectName,
                    sampleMetadata,
                    { namespace: 'NFDI4BioImage.MetaFold.IntegrationTest' }
                );
                
                testResults.step5_dataset = {
                    status: datasetResult.success ? 'passed' : 'failed',
                    details: datasetResult
                };
                
                if (!datasetResult.success) {
                    testResults.overall.errors.push(`Dataset creation failed: ${datasetResult.message}`);
                    console.log('❌ Step 5: Dataset creation failed');
                } else {
                    console.log('✅ Step 5: Dataset creation successful');
                    console.log(`   Dataset ID: ${datasetResult.datasetId}`);
                    console.log(`   Map Annotations: ${datasetResult.mapAnnotationsAdded} pairs`);
                    if (datasetResult.url) {
                        console.log(`   OMERO URL: ${datasetResult.url}`);
                    }
                }
            } catch (datasetError) {
                testResults.step5_dataset = {
                    status: 'failed',
                    details: { error: datasetError.message }
                };
                testResults.overall.errors.push(`Dataset creation error: ${datasetError.message}`);
                console.log('❌ Step 5: Dataset creation error');
            }
        } else {
            testResults.step5_dataset = {
                status: 'skipped',
                details: { reason: 'Connection test failed - skipping dataset creation' }
            };
            console.log('⏭️ Step 5: Skipped (connection failed)');
        }
        
        // Calculate overall result
        const passedSteps = Object.values(testResults)
            .filter(result => typeof result === 'object' && result.status === 'passed').length;
        const totalSteps = 5;
        
        testResults.overall.success = passedSteps >= 4; // At least 4 out of 5 steps should pass
        testResults.overall.summary = `${passedSteps}/${totalSteps} steps passed`;
        
        // Final result
        console.log('🚀 === INTEGRATION TEST COMPLETE ===');
        console.log(`Overall Result: ${testResults.overall.success ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Summary: ${testResults.overall.summary}`);
        
        if (testResults.overall.errors.length > 0) {
            console.log('Errors encountered:');
            testResults.overall.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }
        
        // Show recommendations
        console.log('\n🎯 Recommendations:');
        if (testResults.step2_settings.status === 'failed') {
            console.log('  • Configure OMERO settings (enable + server URL)');
        }
        if (testResults.step3_connection.status === 'failed') {
            console.log('  • Start proxy server: python omero_proxy.py');
            console.log('  • Check OMERO credentials');
        }
        if (testResults.step5_dataset.status === 'failed') {
            console.log('  • Check OMERO permissions for dataset creation');
            console.log('  • Verify group access in OMERO');
        }
        
        return testResults;
        
    } catch (error) {
        console.error('❌ Integration test failed with error:', error);
        testResults.overall.success = false;
        testResults.overall.errors.push(`Test execution error: ${error.message}`);
        return testResults;
    }
}

// Generate test metadata
function generateTestMetadata() {
    return {
        'experiment_name': {
            type: 'text',
            label: 'Experiment Name',
            value: 'OMERO Integration Test Experiment',
            description: 'Test experiment for validating OMERO integration'
        },
        'researcher': {
            type: 'text',
            label: 'Researcher',
            value: 'MetaFold Integration Test',
            description: 'Researcher conducting the integration test'
        },
        'test_date': {
            type: 'date',
            label: 'Test Date',
            value: new Date().toISOString().split('T')[0],
            description: 'Date when integration test was conducted'
        },
        'temperature': {
            type: 'number',
            label: 'Temperature (°C)',
            value: 23,
            description: 'Room temperature during test'
        },
        'success_expected': {
            type: 'checkbox',
            label: 'Success Expected',
            value: true,
            description: 'Whether we expect this integration test to succeed'
        },
        'test_protocol': {
            type: 'dropdown',
            label: 'Test Protocol',
            value: 'Full Integration',
            options: ['Full Integration', 'Connection Only', 'Metadata Only'],
            description: 'Type of integration test being performed'
        },
        'notes': {
            type: 'textarea',
            label: 'Test Notes',
            value: 'Automated integration test validating the complete OMERO workflow: projectManager → settingsManager → omeroUIIntegration → omeroDatasetCreation → omeroAnnotations',
            description: 'Detailed notes about the integration test'
        }
    };
}

// Quick test function (shorter version)
async function quickOMEROIntegrationTest() {
    console.log('⚡ === QUICK OMERO INTEGRATION TEST ===');
    
    try {
        // Check modules
        if (!window.settingsManager || !window.omeroUIIntegration) {
            throw new Error('Required modules not loaded');
        }
        
        // Check settings
        if (!window.settingsManager.get('omero.enabled')) {
            throw new Error('OMERO not enabled in settings');
        }
        
        // Test connection
        const connectionResult = await window.settingsManager.testOMEROConnection();
        if (!connectionResult.success) {
            throw new Error(`Connection failed: ${connectionResult.message}`);
        }
        
        // Test metadata conversion
        const metadata = generateTestMetadata();
        const mapPairs = window.omeroAnnotations.convertMetadataToMapAnnotation(metadata);
        
        if (mapPairs.length === 0) {
            throw new Error('Metadata conversion failed');
        }
        
        console.log('✅ Quick test passed!');
        console.log(`   Modules: ✅`);
        console.log(`   Settings: ✅`);
        console.log(`   Connection: ✅`);
        console.log(`   Metadata: ✅ (${mapPairs.length} pairs)`);
        
        return {
            success: true,
            message: 'Quick integration test passed',
            details: {
                mapPairsGenerated: mapPairs.length,
                connectionMethod: connectionResult.details?.loginMethod
            }
        };
        
    } catch (error) {
        console.log('❌ Quick test failed:', error.message);
        return {
            success: false,
            message: error.message
        };
    }
}

// Make functions globally available
window.testOMEROIntegrationChain = testOMEROIntegrationChain;
window.quickOMEROIntegrationTest = quickOMEROIntegrationTest;

console.log('✅ OMERO Integration Test Functions loaded');
console.log('   Use: testOMEROIntegrationChain() for comprehensive test');
console.log('   Use: quickOMEROIntegrationTest() for quick validation');