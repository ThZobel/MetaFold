// OMERO Map Annotations - FINAL WORKING VERSION
// Uses FormData with JSON string for webclient/annotate_map/ endpoint

const omeroAnnotations = {
    supportedEndpoints: [],
    workingEndpoint: 'webclient/annotate_map/',

    // Initialize annotations module
    init() {
        console.log('🔬 OMERO Annotations Module initialized (WORKING VERSION)');
        return this;
    },

    // =================== MAP ANNOTATIONS CREATION ===================

    // Add Map Annotations to OMERO object - WORKING VERSION
    async addMapAnnotations(objectId, objectType, metadata, namespace = null) {
        try {
            console.log('🔬 === MAP ANNOTATIONS CREATION (WORKING VERSION) ===');
            console.log('🔬 Target object:', objectType, objectId);
            console.log('🔬 Namespace:', namespace || 'default (omero client)');
            console.log('🔬 Metadata fields:', metadata ? Object.keys(metadata).length : 0);
            
            // Convert MetaFold metadata to OMERO Map Annotation format
            const mapPairs = this.convertMetadataToMapAnnotation(metadata);
            
            if (mapPairs.length === 0) {
                return { 
                    success: false, 
                    message: 'No valid metadata for Map Annotation',
                    details: { mapPairsGenerated: 0 }
                };
            }
            
            console.log('🔬 Generated map pairs:', mapPairs.length);
            
            // Create the annotation using WORKING webclient API format
            const annotationResult = await this.createMapAnnotation(mapPairs, namespace, objectId, objectType);
            
            if (!annotationResult.success) {
                return annotationResult;
            }
            
            const annotationId = annotationResult.annotationId;
            console.log('✅ Map Annotation created with ID:', annotationId);
            
            return {
                success: true,
                message: `Map Annotation created with ${mapPairs.length} key-value pairs`,
                annotationId: annotationId,
                keyValuePairs: mapPairs.length,
                workingStrategy: annotationResult.workingEndpoint,
                linkSuccess: true,  // webclient API links automatically to dataset
                details: {
                    mapPairsGenerated: mapPairs.length,
                    annotationCreated: true,
                    annotationLinked: true,
                    endpoint: this.workingEndpoint
                }
            };
            
        } catch (error) {
            console.error('❌ Error in Map Annotations:', error);
            return {
                success: false,
                message: `Failed to add Map Annotations: ${error.message}`,
                details: { error: error.message }
            };
        }
    },

    // Create Map Annotation using WORKING webclient API format
    async createMapAnnotation(mapPairs, namespace, objectId, objectType) {
        console.log('🔬 Using WORKING webclient annotate_map API...');
        console.log('🔬 Map pairs for annotation:', mapPairs.slice(0, 3));
        console.log('🔬 Target object:', objectType, objectId);
        
        // WORKING FORMAT: FormData with JSON string
        const formData = new FormData();
        formData.append('dataset', parseInt(objectId));  // Currently only supports datasets
        formData.append('mapAnnotation', JSON.stringify(mapPairs));
        
        // Add namespace if provided (though server uses default)
        if (namespace && namespace !== 'default') {
            formData.append('ns', namespace);
        }
        
        console.log('🔬 FormData prepared with', mapPairs.length, 'map pairs');
        
        try {
            const response = await window.omeroAPI.apiRequest('webclient/annotate_map/', {
                method: 'POST',
                headers: {
                    // NO Content-Type header - FormData sets multipart/form-data automatically
                    'Accept': 'application/json'
                },
                body: formData
            });

            console.log('✅ Webclient annotate_map response:', response);
            
            // Extract annotation ID from response
            let annotationId = 'created';
            if (response && response.annId && Array.isArray(response.annId) && response.annId.length > 0) {
                annotationId = response.annId[0];
            }
            
            return {
                success: true,
                annotationId: annotationId,
                workingEndpoint: 'webclient/annotate_map/',
                response: response
            };

        } catch (error) {
            console.error('❌ Webclient annotate_map failed:', error);
            return {
                success: false,
                message: `Annotation creation failed: ${error.message}`,
                details: { error: error.message }
            };
        }
    },

    // =================== METADATA CONVERSION ===================

    // Convert metadata to map annotation format
    convertMetadataToMapAnnotation(metadata) {
        console.log('🔬 Converting metadata to map annotation...');
        console.log('🔬 Input metadata:', metadata);
        
        if (!metadata || typeof metadata !== 'object') {
            console.warn('🔬 Invalid metadata provided');
            return [];
        }
        
        const mapPairs = [];
        
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            try {
                if (!fieldInfo || typeof fieldInfo !== 'object') {
                    console.warn(`🔬 Invalid field info for key: ${key}`);
                    return;
                }
                
                if (fieldInfo.type === 'group') {
                    console.log(`🔬 Skipping group field: ${key}`);
                    return;
                }
                
                const label = fieldInfo.label || key;
                let value = fieldInfo.value;
                
                // Handle undefined/null values
                if (value === undefined || value === null) {
                    value = '';
                }
                
                console.log(`🔬 Processing field: ${key} (${fieldInfo.type}) = "${value}"`);
                
                // Format different types for OMERO Map Annotations
                switch (fieldInfo.type) {
                    case 'checkbox':
                        value = (value === true || value === 'true' || value === 'on') ? 'Yes' : 'No';
                        break;
                    case 'date':
                        if (value) {
                            try {
                                const dateObj = new Date(value);
                                if (!isNaN(dateObj.getTime())) {
                                    value = dateObj.toISOString().split('T')[0]; // YYYY-MM-DD format
                                } else {
                                    console.warn(`🔬 Invalid date for ${key}: ${value}`);
                                    value = String(value);
                                }
                            } catch (e) {
                                console.warn(`🔬 Date parsing failed for ${key}:`, e);
                                value = String(value);
                            }
                        } else {
                            value = '';
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
                
                // Add main field (only if we have a meaningful value or it's a checkbox)
                if (value !== '' || fieldInfo.type === 'checkbox') {
                    // Use simple [key, value] arrays for webclient API compatibility
                    mapPairs.push([label, value]);
                    
                    // Add type information
                    mapPairs.push([`${label}_type`, fieldInfo.type]);
                    
                    // Add description if available
                    if (fieldInfo.description && fieldInfo.description.trim()) {
                        mapPairs.push([`${label}_description`, fieldInfo.description.trim()]);
                    }
                    
                    console.log(`🔬 Added ${fieldInfo.description ? 3 : 2} pairs for field ${key}`);
                } else {
                    console.log(`🔬 Skipped empty field: ${key}`);
                }
                
            } catch (error) {
                console.error(`🔬 Error processing field ${key}:`, error);
            }
        });
        
        // Add MetaFold metadata
        const metaFoldPairs = [
            ['MetaFold_TemplateType', 'Experiment'],
            ['MetaFold_Created', new Date().toISOString()],
            ['MetaFold_Version', '1.1.0'],
            ['NFDI4BioImage_Tool', 'MetaFold'],
            ['MetaFold_FieldCount', String(Object.keys(metadata).length)],
            ['MetaFold_API_Version', 'webclient_annotate_map']
        ];
        
        mapPairs.push(...metaFoldPairs);
        
        console.log(`🔬 Total map pairs generated: ${mapPairs.length}`);
        console.log('🔬 Final map pairs preview:');
        mapPairs.slice(0, 5).forEach((pair, index) => {
            console.log(`🔬   ${index + 1}. ${pair[0]} = "${pair[1]}"`);
        });
        if (mapPairs.length > 5) {
            console.log(`🔬   ... and ${mapPairs.length - 5} more pairs`);
        }
        
        return mapPairs;
    },

    // =================== ANNOTATION RETRIEVAL ===================

    // Get annotations for an object
    async getAnnotationsForObject(objectId, objectType) {
        try {
            console.log(`🔬 Getting annotations for ${objectType} ${objectId}`);
            
            // Use the working GET endpoint
            const response = await window.omeroAPI.apiRequest(`webclient/api/annotations/?type=map&${objectType}=${objectId}`);
            
            if (response.annotations && Array.isArray(response.annotations)) {
                console.log(`✅ Found ${response.annotations.length} annotations`);
                return response.annotations;
            }
            
            console.warn('⚠️ No annotations found in response');
            return [];
            
        } catch (error) {
            console.error('❌ Error getting annotations:', error);
            return [];
        }
    },

    // Get Map Annotations specifically
    async getMapAnnotationsForObject(objectId, objectType, namespace = null) {
        try {
            const allAnnotations = await this.getAnnotationsForObject(objectId, objectType);
            
            // Filter for Map Annotations
            const mapAnnotations = allAnnotations.filter(annotation => {
                const annotationType = annotation['@type'] || annotation.type || annotation.class || '';
                const isMapAnnotation = annotationType.includes('MapAnnotation');
                
                if (namespace) {
                    const annotationNamespace = annotation.ns || annotation.namespace || '';
                    return isMapAnnotation && annotationNamespace === namespace;
                }
                
                return isMapAnnotation;
            });
            
            console.log(`🔬 Found ${mapAnnotations.length} Map Annotations for ${objectType} ${objectId}`);
            return mapAnnotations;
            
        } catch (error) {
            console.error('❌ Error getting Map Annotations:', error);
            return [];
        }
    },

    // =================== ANNOTATION UTILITIES ===================

    // Parse Map Annotation back to MetaFold format
    parseMapAnnotationToMetadata(mapAnnotation) {
        try {
            const mapValue = mapAnnotation.mapValue || mapAnnotation.values || [];
            const metadata = {};
            const tempFields = {};
            
            // First pass: collect all key-value pairs
            mapValue.forEach(pair => {
                let name, value;
                
                // Handle both array and object formats
                if (Array.isArray(pair)) {
                    [name, value] = pair;
                } else {
                    name = pair.name || pair.key;
                    value = pair.value;
                }
                
                if (name.endsWith('_type')) {
                    const fieldName = name.replace('_type', '');
                    if (!tempFields[fieldName]) tempFields[fieldName] = {};
                    tempFields[fieldName].type = value;
                } else if (name.endsWith('_description')) {
                    const fieldName = name.replace('_description', '');
                    if (!tempFields[fieldName]) tempFields[fieldName] = {};
                    tempFields[fieldName].description = value;
                } else if (!name.startsWith('MetaFold_') && !name.startsWith('NFDI4BioImage_')) {
                    // Regular field
                    if (!tempFields[name]) tempFields[name] = {};
                    tempFields[name].label = name;
                    tempFields[name].value = value;
                }
            });
            
            // Second pass: construct proper metadata objects
            Object.entries(tempFields).forEach(([fieldName, fieldData]) => {
                if (fieldData.type && fieldData.value !== undefined) {
                    metadata[fieldName] = {
                        type: fieldData.type,
                        label: fieldData.label || fieldName,
                        value: this.parseValueByType(fieldData.value, fieldData.type),
                        description: fieldData.description || ''
                    };
                }
            });
            
            return metadata;
            
        } catch (error) {
            console.error('❌ Error parsing Map Annotation:', error);
            return {};
        }
    },

    // Parse value according to type
    parseValueByType(value, type) {
        try {
            switch (type) {
                case 'checkbox':
                    return value === 'Yes' || value === 'true' || value === true;
                case 'number':
                    return parseFloat(value) || 0;
                case 'date':
                    return value; // Keep as string for now
                default:
                    return String(value);
            }
        } catch (error) {
            console.warn('Error parsing value:', error);
            return value;
        }
    },

    // =================== TESTING METHODS ===================

    // Test Map Annotations with sample data
    async testMapAnnotationsWithSampleData() {
        console.log('🔬 === TESTING MAP ANNOTATIONS WITH SAMPLE DATA (WORKING VERSION) ===');
        
        const sampleMetadata = this.generateTestMetadata();
        console.log('🔬 Test metadata:', sampleMetadata);
        
        // Test the map annotations creation
        const result = await this.addMapAnnotations(15145, 'dataset', sampleMetadata, null);
        
        console.log('🔬 Test result:', result);
        
        return result;
    },

    // Generate test metadata for testing
    generateTestMetadata() {
        return {
            'test_experiment_name': { 
                type: 'text', 
                label: 'Test Experiment Name', 
                value: 'MetaFold Map Annotations Working Test',
                description: 'Test experiment for validating working Map Annotations functionality'
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
            }
        };
    },

    // =================== VALIDATION METHODS ===================

    // Validate annotation data before creation
    validateAnnotationData(mapPairs, namespace) {
        const validation = {
            valid: true,
            warnings: [],
            errors: []
        };
        
        if (!Array.isArray(mapPairs) || mapPairs.length === 0) {
            validation.valid = false;
            validation.errors.push('No map pairs provided');
            return validation;
        }
        
        mapPairs.forEach((pair, index) => {
            if (!Array.isArray(pair) || pair.length !== 2) {
                validation.errors.push(`Map pair ${index}: Must be array with exactly 2 elements [key, value]`);
                validation.valid = false;
            } else {
                const [key, value] = pair;
                
                if (!key || typeof key !== 'string') {
                    validation.errors.push(`Map pair ${index}: Key must be a non-empty string`);
                    validation.valid = false;
                }
                
                if (value === undefined || value === null) {
                    validation.warnings.push(`Map pair ${index} (${key}): Empty value`);
                }
                
                if (key && key.length > 255) {
                    validation.warnings.push(`Map pair ${index} (${key}): Key is very long (${key.length} chars)`);
                }
                
                if (String(value).length > 1000) {
                    validation.warnings.push(`Map pair ${index} (${key}): Value is very long (${String(value).length} chars)`);
                }
            }
        });
        
        if (namespace && typeof namespace !== 'string') {
            validation.warnings.push('Namespace should be a string');
        }
        
        return validation;
    },

    // =================== SUCCESS VERIFICATION ===================

    // Verify that annotation was actually created
    async verifyAnnotationCreated(objectId, objectType = 'dataset') {
        console.log(`🔍 Verifying annotation creation on ${objectType} ${objectId}...`);
        
        try {
            // Wait a moment for async creation
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const annotations = await this.getAnnotationsForObject(objectId, objectType);
            
            console.log(`✅ Current annotations on ${objectType} ${objectId}: ${annotations.length}`);
            
            if (annotations.length > 0) {
                // Look for recent MetaFold annotations
                const metaFoldAnnotations = annotations.filter(ann => 
                    ann.values && ann.values.some(pair => 
                        pair[0] && (
                            pair[0].includes('MetaFold') || 
                            pair[0].includes('NFDI4BioImage')
                        )
                    )
                );
                
                if (metaFoldAnnotations.length > 0) {
                    console.log(`🎉 Found ${metaFoldAnnotations.length} MetaFold annotations!`);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.log("❌ Verification failed:", error.message);
            return false;
        }
    },

    // =================== NEUE KEY-VALUE METHODEN (nach bestehenden Funktionen einfügen) ===================

    // Test multiple key-value pairs at once - NEW SIMPLE METHOD
    async testCreateMultipleKeyValues(datasetId, keyValuePairs) {
            try {
                console.log('🧪 === OMERO Console Test: Create Multiple Key-Value Pairs ===');
                console.log(`🧪 Dataset ID: ${datasetId}`);
                console.log(`🧪 Pairs count: ${keyValuePairs.length}`);
                
                // *** FIX: ROBUSTE SESSION VALIDATION ***
                console.log('🔍 Checking OMERO authentication status...');
                console.log('🔍 window.omeroAuth exists:', !!window.omeroAuth);
                console.log('🔍 session exists:', !!window.omeroAuth?.session);
                
                // Try to get CSRF token (more reliable than session check)
                let csrfToken = null;
                if (window.omeroAuth && typeof window.omeroAuth.getBestCSRFToken === 'function') {
                    try {
                        csrfToken = window.omeroAuth.getBestCSRFToken();
                        console.log('🔍 CSRF token available:', !!csrfToken);
                    } catch (tokenError) {
                        console.warn('⚠️ Error getting CSRF token:', tokenError);
                    }
                }
                
                // If no token, try to check if we can get one
                if (!csrfToken) {
                    console.log('🔄 No CSRF token available, checking authentication...');
                    
                    // Try to verify authentication by checking current session
                    if (window.omeroUIIntegration && typeof window.omeroUIIntegration.checkAuthentication === 'function') {
                        try {
                            const authCheck = await window.omeroUIIntegration.checkAuthentication();
                            if (authCheck && authCheck.authenticated) {
                                console.log('✅ Authentication verified via omeroUIIntegration');
                                // Try to get token again
                                csrfToken = window.omeroAuth.getBestCSRFToken();
                            }
                        } catch (authError) {
                            console.warn('⚠️ Authentication check failed:', authError);
                        }
                    }
                }
                
                // Final token check
                if (!csrfToken) {
                    console.error('❌ No valid CSRF token - authentication required');
                    return { 
                        success: false, 
                        error: 'No valid OMERO session - please log in again',
                        needsLogin: true
                    };
                }
                
                console.log('✅ CSRF token confirmed, proceeding with annotation creation...');
                
                // Convert key-value pairs to the format OMERO expects
                const mapAnnotation = JSON.stringify(keyValuePairs);
                console.log('🧪 Map annotation data:', mapAnnotation);
                
                const formData = new URLSearchParams();
                formData.append('parents', 'true');
                formData.append('dataset', datasetId);
                formData.append('mapAnnotation', mapAnnotation);
                
                // FIX: Verwende Proxy URL statt direkte Server URL
                const proxyUrl = window.omeroAuth.proxyUrl || 'http://localhost:3000/omero-api/';
                const url = `${proxyUrl}webclient/annotate_map/`;
                
                console.log('🧪 Using proxy URL:', url); // Debug log
                
                const response = await fetch(url, {
                    method: 'POST',
                    credentials: 'include',
                    mode: 'cors',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-CSRFToken': csrfToken,
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                        'Origin': window.location.origin,
                        'Referer': window.location.href
                    },
                    body: formData.toString()
                });
                
                console.log('🧪 Response status:', response.status);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Request failed:', response.status, errorText);
                    return { success: false, error: `HTTP ${response.status}: ${errorText}` };
                }
                
                const result = await response.json();
                console.log('🧪 Response data:', result);
                
                if (result.annId) {
                    console.log('✅ Success! Annotation ID:', result.annId);
                    return {
                        success: true,
                        annotationId: result.annId,
                        keyValuePairs: keyValuePairs,
                        datasetId: datasetId,
                        message: `Successfully created ${keyValuePairs.length} key-value pairs`
                    };
                } else {
                    return { success: false, error: 'Unexpected response format', details: result };
                }
                
            } catch (error) {
                console.error('❌ Error creating multiple key-value pairs:', error);
                return { success: false, error: error.message, details: error };
            }
        },

    // Convert MetaFold metadata to simple key-value pairs (NEW SIMPLE METHOD)
    convertMetadataToSimpleKeyValues(metadata) {
        console.log('🔄 Converting metadata to simple key-value pairs...');
        console.log('🔄 Input metadata:', metadata);
        
        if (!metadata || typeof metadata !== 'object') {
            console.warn('🔄 Invalid metadata provided');
            return [];
        }
        
        const keyValuePairs = [];
        let totalFields = 0;
        let processedFields = 0;
        
        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            totalFields++;
            
            try {
                if (!fieldInfo || typeof fieldInfo !== 'object') {
                    console.warn(`🔄 Invalid field info for key: ${key}`);
                    return;
                }
                
                // Skip group fields for simple conversion
                if (fieldInfo.type === 'group') {
                    console.log(`🔄 Skipping group field: ${key}`);
                    return;
                }
                
                // Extract actual value
                let value = fieldInfo.value;
                if (value === undefined || value === null || value === '') {
                    console.log(`🔄 Skipping empty field: ${key}`);
                    return;
                }
                
                // Use label if available, otherwise use key
                const fieldName = fieldInfo.label || key;
                
                // Convert value to string for OMERO
                let stringValue;
                if (typeof value === 'boolean') {
                    stringValue = value ? 'true' : 'false';
                } else if (typeof value === 'number') {
                    stringValue = value.toString();
                } else {
                    stringValue = String(value);
                }
                
                console.log(`🔄 Processing: ${fieldName} = "${stringValue}"`);
                keyValuePairs.push([fieldName, stringValue]);
                processedFields++;
                
            } catch (error) {
                console.warn(`🔄 Error processing field ${key}:`, error);
            }
        });
        
        console.log(`🔄 Conversion complete: ${processedFields}/${totalFields} fields processed`);
        console.log('🔄 Generated key-value pairs:');
        keyValuePairs.forEach(([key, value]) => {
            console.log(`   ${key} = "${value}"`);
        });
        
        return keyValuePairs;
    },


    // Convert metadata to simple key-value pairs WITH groups (NEW ENHANCED METHOD)
    convertMetadataToSimpleKeyValuesWithGroups(metadata, templateMetadata = null) {
        console.log('🔄 Converting metadata to simple key-value pairs WITH groups IN CORRECT ORDER...');
        console.log('🔄 Input metadata:', metadata);
        console.log('🔄 Template metadata provided:', !!templateMetadata);
        
        if (!metadata || typeof metadata !== 'object') {
            console.warn('🔄 Invalid metadata provided');
            return [];
        }
        
        const keyValuePairs = [];
        
        // *** NEW: Use fieldOrder to maintain correct sequence ***
        if (templateMetadata && templateMetadata.metadata && templateMetadata.metadata.fieldOrder && templateMetadata.metadata.fields) {
            console.log('🔄 Using template fieldOrder for correct sequence...');
            
            const fieldOrder = templateMetadata.metadata.fieldOrder;
            const fieldsObject = templateMetadata.metadata.fields;
            
            // Process fields IN fieldOrder sequence
            fieldOrder.forEach(fieldKey => {
                const fieldDefinition = fieldsObject[fieldKey];
                
                if (!fieldDefinition) {
                    console.warn(`🔄 Field definition not found for: ${fieldKey}`);
                    return;
                }
                
                // Check if this is a GROUP field
                if (fieldDefinition.type === 'group') {
                    const groupName = fieldDefinition.label || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    keyValuePairs.push([groupName, '']);
                    console.log(`🔄 Added GROUP in order: "${groupName}" = "" (position ${fieldOrder.indexOf(fieldKey) + 1})`);
                }
                // Check if this is a DATA field with actual value
                else if (metadata[fieldKey]) {
                    const fieldInfo = metadata[fieldKey];
                    
                    // Skip if empty
                    let value = fieldInfo.value;
                    if (value === undefined || value === null || value === '') {
                        console.log(`🔄 Skipping empty field: ${fieldKey}`);
                        return;
                    }
                    
                    // Use label if available, otherwise use key
                    const fieldName = fieldInfo.label || fieldKey;
                    
                    // Convert value to string for OMERO
                    let stringValue;
                    if (typeof value === 'boolean') {
                        stringValue = value ? 'true' : 'false';
                    } else if (typeof value === 'number') {
                        stringValue = value.toString();
                    } else {
                        stringValue = String(value);
                    }
                    
                    keyValuePairs.push([fieldName, stringValue]);
                    console.log(`🔄 Added DATA in order: "${fieldName}" = "${stringValue}" (position ${fieldOrder.indexOf(fieldKey) + 1})`);
                }
            });
            
            console.log(`🔄 Ordered conversion complete: ${keyValuePairs.length} total pairs in correct fieldOrder`);
            
        } else {
            console.log('🔄 No fieldOrder found, using fallback method...');
            
            // FALLBACK: Old method for templates without fieldOrder
            let totalFields = 0;
            let processedFields = 0;
            
            // STEP 1: Add group fields as key-only pairs FIRST
            if (templateMetadata) {
                const groupPairs = this.convertGroupFieldsToKeyOnlyPairs(templateMetadata);
                keyValuePairs.push(...groupPairs);
                console.log(`🔄 Added ${groupPairs.length} group key-only pairs`);
            }
            
            // STEP 2: Add regular metadata fields
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                totalFields++;
                
                try {
                    if (!fieldInfo || typeof fieldInfo !== 'object') {
                        console.warn(`🔄 Invalid field info for key: ${key}`);
                        return;
                    }
                    
                    // Skip group fields (already added)
                    if (fieldInfo.type === 'group') {
                        console.log(`🔄 Skipping group field (already added as key-only): ${key}`);
                        return;
                    }
                    
                    // Extract actual value
                    let value = fieldInfo.value;
                    if (value === undefined || value === null || value === '') {
                        console.log(`🔄 Skipping empty field: ${key}`);
                        return;
                    }
                    
                    // Use label if available, otherwise use key
                    const fieldName = fieldInfo.label || key;
                    
                    // Convert value to string for OMERO
                    let stringValue;
                    if (typeof value === 'boolean') {
                        stringValue = value ? 'true' : 'false';
                    } else if (typeof value === 'number') {
                        stringValue = value.toString();
                    } else {
                        stringValue = String(value);
                    }
                    
                    keyValuePairs.push([fieldName, stringValue]);
                    processedFields++;
                    
                    console.log(`🔄 Processing: ${fieldName} = "${stringValue}"`);
                    
                } catch (error) {
                    console.warn(`🔄 Error processing field ${key}:`, error);
                }
            });
            
            console.log(`🔄 Fallback conversion complete: ${processedFields}/${totalFields} data fields processed`);
        }
        
        console.log(`🔄 Final result: ${keyValuePairs.length} total pairs`);
        console.log('🔄 Generated key-value pairs IN ORDER:');
        keyValuePairs.forEach(([key, value], index) => {
            if (value === '') {
                console.log(`   ${index + 1}. 📁 GROUP: "${key}" = "" (key-only)`);
            } else {
                console.log(`   ${index + 1}. 📝 DATA:  "${key}" = "${value}"`);
            }
        });
        
        return keyValuePairs;
    },

    // =================== FEHLENDE FUNKTION: GROUP-FELDER ALS KEY-ONLY PAARE ===================
    
    // Extract group fields as key-only pairs from template metadata
convertGroupFieldsToKeyOnlyPairs(templateMetadata) {
        console.log('📁 Converting group fields to key-only pairs...');
        console.log('📁 Template metadata:', templateMetadata);
        
        if (!templateMetadata) {
            console.warn('📁 No template metadata provided');
            return [];
        }
        
        // *** FIX: Look in the correct location ***
        let fieldsObject = null;
        
        // Method 1: New format with metadata.fields  
        if (templateMetadata.metadata && templateMetadata.metadata.fields) {
            fieldsObject = templateMetadata.metadata.fields;
        }
        // Method 2: Old format with direct metadata
        else if (templateMetadata.metadata) {
            fieldsObject = templateMetadata.metadata;
        }
        else {
            console.warn('📁 No fields object found in template metadata');
            return [];
        }
        
        const groupPairs = [];
        
        // Find all group-type fields
        Object.entries(fieldsObject).forEach(([key, fieldInfo]) => {
            if (fieldInfo && fieldInfo.type === 'group') {
                // Use label if available, otherwise format key as title
                const groupName = fieldInfo.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                
                // Add as key-only pair (empty value)
                groupPairs.push([groupName, '']);
                
                console.log(`📁 Added group key-only pair: "${groupName}" → ""`);
            }
        });
        
        console.log(`📁 Group conversion complete: ${groupPairs.length} group pairs created`);
        return groupPairs;
    },

    // =================== HILFSFUNKTION: JSON TRIPLETS CHECKBOX ABFRAGE ===================
    
    // Check if JSON Triplets mode is enabled (from UI checkbox or settings)
    async checkJsonTripletsMode() {
        try {
            // Method 1: Check UI checkbox first (immediate user preference)
            const checkbox = document.getElementById('omeroUseJsonTriplets');
            if (checkbox) {
                console.log('📋 JSON Triplets checkbox found, checked:', checkbox.checked);
                return checkbox.checked;
            }
            
            // Method 2: Fallback to settings if checkbox not available
            if (window.settingsManager && window.settingsManager.get) {
                const setting = await window.settingsManager.get('omero.use_json_triplets');
                console.log('📋 JSON Triplets from settings:', setting);
                return setting || false;
            }
            
            // Method 3: Default to false if neither available
            console.log('📋 JSON Triplets: Using default (false)');
            return false;
            
        } catch (error) {
            console.warn('⚠️ Error checking JSON Triplets mode:', error);
            return false;
        }
    },

    // NEW MAIN METHOD: Add Map Annotations using simple key-value approach
    async addMapAnnotationsSimple(objectId, objectType, metadata, namespace = null, templateMetadata = null) {
        try {
            console.log('🚀 === NEW SIMPLE MAP ANNOTATIONS METHOD - ENHANCED WITH GROUPS ===');
            console.log('🚀 Target object:', objectType, objectId);
            console.log('🚀 Namespace:', namespace || 'default (omero client)');
            console.log('🚀 Metadata fields:', metadata ? Object.keys(metadata).length : 0);
            console.log('🚀 Template metadata for groups:', !!templateMetadata);
            
            // *** ENHANCED: Use the new function that supports groups and fieldOrder ***
            let keyValuePairs;
            if (templateMetadata) {
                console.log('🚀 Using ENHANCED conversion with groups and fieldOrder...');
                keyValuePairs = this.convertMetadataToSimpleKeyValuesWithGroups(metadata, templateMetadata);
            } else {
                console.log('🚀 Using SIMPLE conversion (no groups)...');
                keyValuePairs = this.convertMetadataToSimpleKeyValues(metadata);
            }
            
            if (keyValuePairs.length === 0) {
                return { 
                    success: false, 
                    message: 'No valid metadata for simple Map Annotation',
                    details: { keyValuePairsGenerated: 0 }
                };
            }
            
            console.log('🚀 Generated key-value pairs:', keyValuePairs.length);
            
            // Use the tested working method
            const result = await this.testCreateMultipleKeyValues(objectId, keyValuePairs);
            
            if (result.success) {
                console.log('✅ Enhanced Simple Map Annotation created successfully!');
                console.log('✅ Groups included in correct fieldOrder sequence');
                
                return {
                    success: true,
                    message: `Enhanced Simple Map Annotation created with ${keyValuePairs.length} key-value pairs (including groups)`,
                    annotationId: result.annotationId,
                    keyValuePairs: keyValuePairs.length,
                    method: 'enhanced_simple_with_groups_and_fieldorder',
                    groupsIncluded: templateMetadata ? true : false,
                    details: {
                        keyValuePairsGenerated: keyValuePairs.length,
                        annotationCreated: true,
                        groupsInCorrectOrder: templateMetadata ? true : false
                    }
                };
                
            } else {
                return {
                    success: false,
                    message: 'Failed to create enhanced simple Map Annotation',
                    error: result.error,
                    details: result.details
                };
            }
            
        } catch (error) {
            console.error('❌ Error in enhanced simple Map Annotations:', error);
            return {
                success: false,
                message: `Failed to add enhanced simple Map Annotations: ${error.message}`,
                error: error.message
            };
        }
    },

    // =================== PHASE 2: INTEGRATION LINKS CONVERSION ===================
    
    // Convert Integration Links to Key-Value pairs
    convertIntegrationLinksToKeyValue(integrationData) {
        console.log('🔗 Converting integration links to key-value pairs...');
        console.log('🔗 Input integration data:', integrationData);
        
        if (!integrationData || typeof integrationData !== 'object') {
            console.warn('🔗 Invalid integration data provided');
            return [];
        }
        
        const keyValuePairs = [];
        
        // Standard integration links mapping
        const linkMapping = {
            'metafold_export_timestamp': 'MetaFold Export Timestamp',
            'project_local_path': 'Project Local Path', 
            'omero_link': 'OMERO Link',
            'elabftw_link': 'elabFTW Link',
            'project_created_at': 'Project Created At',
            'template_used': 'Template Used',
            'created_by_user': 'Created By User',
            'created_by_group': 'Created By Group'
        };
        
        Object.entries(integrationData).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                const displayName = linkMapping[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                keyValuePairs.push([displayName, String(value)]);
                console.log(`🔗 Added: ${displayName} = "${value}"`);
            }
        });
        
        console.log(`🔗 Integration links conversion complete: ${keyValuePairs.length} pairs generated`);
        return keyValuePairs;
    },
    
    // =================== PHASE 2: TEMPLATE GROUPS AS NAMESPACES ===================
    
    // Convert metadata to grouped key-value pairs (for template groups as namespaces)

// FIXED: Enhanced metadata conversion that includes group fields as key-only pairs

    convertMetadataToSimpleKeyValuesWithGroups(metadata, templateMetadata = null) {
        console.log('🔄 Converting metadata to simple key-value pairs WITH groups IN CORRECT ORDER...');
        console.log('🔄 Input metadata:', metadata);
        console.log('🔄 Template metadata provided:', !!templateMetadata);
        
        if (!metadata || typeof metadata !== 'object') {
            console.warn('🔄 Invalid metadata provided');
            return [];
        }
        
        const keyValuePairs = [];
        
        // *** NEW: Use fieldOrder to maintain correct sequence ***
        if (templateMetadata && templateMetadata.metadata && templateMetadata.metadata.fieldOrder && templateMetadata.metadata.fields) {
            console.log('🔄 Using template fieldOrder for correct sequence...');
            
            const fieldOrder = templateMetadata.metadata.fieldOrder;
            const fieldsObject = templateMetadata.metadata.fields;
            
            // Process fields IN fieldOrder sequence
            fieldOrder.forEach(fieldKey => {
                const fieldDefinition = fieldsObject[fieldKey];
                
                if (!fieldDefinition) {
                    console.warn(`🔄 Field definition not found for: ${fieldKey}`);
                    return;
                }
                
                // Check if this is a GROUP field
                if (fieldDefinition.type === 'group') {
                    const groupName = fieldDefinition.label || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    keyValuePairs.push([groupName, '']);
                    console.log(`🔄 Added GROUP in order: "${groupName}" = "" (position ${fieldOrder.indexOf(fieldKey) + 1})`);
                }
                // Check if this is a DATA field with actual value
                else if (metadata[fieldKey]) {
                    const fieldInfo = metadata[fieldKey];
                    
                    // Skip if empty
                    let value = fieldInfo.value;
                    if (value === undefined || value === null || value === '') {
                        console.log(`🔄 Skipping empty field: ${fieldKey}`);
                        return;
                    }
                    
                    // Use label if available, otherwise use key
                    const fieldName = fieldInfo.label || fieldKey;
                    
                    // Convert value to string for OMERO
                    let stringValue;
                    if (typeof value === 'boolean') {
                        stringValue = value ? 'true' : 'false';
                    } else if (typeof value === 'number') {
                        stringValue = value.toString();
                    } else {
                        stringValue = String(value);
                    }
                    
                    keyValuePairs.push([fieldName, stringValue]);
                    console.log(`🔄 Added DATA in order: "${fieldName}" = "${stringValue}" (position ${fieldOrder.indexOf(fieldKey) + 1})`);
                }
            });
            
            console.log(`🔄 Ordered conversion complete: ${keyValuePairs.length} total pairs in correct fieldOrder`);
            
        } else {
            console.log('🔄 No fieldOrder found, using fallback method...');
            
            // FALLBACK: Old method for templates without fieldOrder
            let totalFields = 0;
            let processedFields = 0;
            
            // STEP 1: Add group fields as key-only pairs FIRST
            if (templateMetadata) {
                const groupPairs = this.convertGroupFieldsToKeyOnlyPairs(templateMetadata);
                keyValuePairs.push(...groupPairs);
                console.log(`🔄 Added ${groupPairs.length} group key-only pairs`);
            }
            
            // STEP 2: Add regular metadata fields
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                totalFields++;
                
                try {
                    if (!fieldInfo || typeof fieldInfo !== 'object') {
                        console.warn(`🔄 Invalid field info for key: ${key}`);
                        return;
                    }
                    
                    // Skip group fields (already added)
                    if (fieldInfo.type === 'group') {
                        console.log(`🔄 Skipping group field (already added as key-only): ${key}`);
                        return;
                    }
                    
                    // Extract actual value
                    let value = fieldInfo.value;
                    if (value === undefined || value === null || value === '') {
                        console.log(`🔄 Skipping empty field: ${key}`);
                        return;
                    }
                    
                    // Use label if available, otherwise use key
                    const fieldName = fieldInfo.label || key;
                    
                    // Convert value to string for OMERO
                    let stringValue;
                    if (typeof value === 'boolean') {
                        stringValue = value ? 'true' : 'false';
                    } else if (typeof value === 'number') {
                        stringValue = value.toString();
                    } else {
                        stringValue = String(value);
                    }
                    
                    keyValuePairs.push([fieldName, stringValue]);
                    processedFields++;
                    
                    console.log(`🔄 Processing: ${fieldName} = "${stringValue}"`);
                    
                } catch (error) {
                    console.warn(`🔄 Error processing field ${key}:`, error);
                }
            });
            
            console.log(`🔄 Fallback conversion complete: ${processedFields}/${totalFields} data fields processed`);
        }
        
        console.log(`🔄 Final result: ${keyValuePairs.length} total pairs`);
        console.log('🔄 Generated key-value pairs IN ORDER:');
        keyValuePairs.forEach(([key, value], index) => {
            if (value === '') {
                console.log(`   ${index + 1}. 📁 GROUP: "${key}" = "" (key-only)`);
            } else {
                console.log(`   ${index + 1}. 📝 DATA:  "${key}" = "${value}"`);
            }
        });
        
        return keyValuePairs;
    },

    // =================== PHASE 2: MULTI-NAMESPACE SUPPORT ===================

    // Add Map Annotations with multiple namespaces support - UPDATED WITH GROUPS
    async addMapAnnotationsWithGroups(objectId, objectType, metadata, options = {}) {
        console.log('🚀 === MULTI-NAMESPACE MAP ANNOTATIONS (WITH GROUPS) ===');
        console.log('🚀 Object:', objectType, objectId);
        console.log('🚀 Options:', options);
        console.log('🚀 Template metadata provided:', !!options.templateMetadata);
        
        try {
            const results = [];
            let totalPairs = 0;
            
            // Check if template groups should be used as namespaces
            if (options.useTemplateGroupsAsNamespaces && options.templateMetadata) {
                console.log('📁 Using template groups as namespaces...');
                
                const groupedData = this.convertMetadataToGroupedKeyValues(metadata, options.templateMetadata);
                
                // Create annotations for each group
                for (const group of groupedData.groups) {
                    if (group.keyValuePairs.length > 0) {
                        console.log(`📁 Creating annotation for group: ${group.namespace}`);
                        const result = await this.testCreateMultipleKeyValues(objectId, group.keyValuePairs);
                        
                        if (result.success) {
                            results.push({
                                success: true,
                                namespace: group.namespace,
                                annotationId: result.annotationId,
                                keyValuePairs: group.keyValuePairs.length
                            });
                            totalPairs += group.keyValuePairs.length;
                            console.log(`✅ Group ${group.namespace}: ${group.keyValuePairs.length} pairs created`);
                        } else {
                            results.push({
                                success: false,
                                namespace: group.namespace,
                                error: result.error
                            });
                            console.error(`❌ Group ${group.namespace} failed:`, result.error);
                        }
                    }
                }
                
                // Handle ungrouped fields
                if (groupedData.ungrouped.length > 0) {
                    console.log('📁 Creating annotation for ungrouped fields...');
                    const result = await this.testCreateMultipleKeyValues(objectId, groupedData.ungrouped);
                    
                    if (result.success) {
                        results.push({
                            success: true,
                            namespace: 'General Metadata',
                            annotationId: result.annotationId,
                            keyValuePairs: groupedData.ungrouped.length
                        });
                        totalPairs += groupedData.ungrouped.length;
                        console.log(`✅ Ungrouped fields: ${groupedData.ungrouped.length} pairs created`);
                    }
                }
                
            } else {
                // *** DECISION POINT: JSON Triplets vs Enhanced Key-Value ***
                
                if (options.useJsonTriplets) {
                    console.log('📋 Using JSON TRIPLETS approach (original method)...');
                    
                    // Use original JSON triplet method - DO NOT include group key-only pairs
                    // This maintains backward compatibility for users who prefer the old format
                    const keyValuePairs = this.convertMetadataToSimpleKeyValues(metadata);
                    
                    if (keyValuePairs.length > 0) {
                        // Convert to JSON triplet format and use original method
                        console.log('📋 Converting to JSON triplet format for OMERO...');
                        
                        // Use the original JSON triplet method from metaFoldOMEROIntegration
                        if (window.metaFoldOMEROIntegration && window.metaFoldOMEROIntegration.addMapAnnotations) {
                            const tripletResult = await window.metaFoldOMEROIntegration.addMapAnnotations(objectId, metadata, options.namespace);
                            
                            if (tripletResult.success) {
                                results.push({
                                    success: true,
                                    namespace: options.namespace || 'MetaFold Integration',
                                    annotationId: tripletResult.annotationId,
                                    keyValuePairs: tripletResult.keyValuePairs || keyValuePairs.length,
                                    method: 'json_triplets'
                                });
                                totalPairs += tripletResult.keyValuePairs || keyValuePairs.length;
                                console.log(`✅ JSON Triplets: ${tripletResult.keyValuePairs || keyValuePairs.length} pairs created`);
                            } else {
                                results.push({
                                    success: false,
                                    namespace: options.namespace || 'MetaFold Integration',
                                    error: tripletResult.error,
                                    method: 'json_triplets'
                                });
                            }
                        }
                    }
                    
                } else {
                    console.log('🔄 Using enhanced key-value approach (includes groups as key-only)...');
                    
                    // Use new function that includes group fields as key-only pairs
                    const keyValuePairs = options.templateMetadata ? 
                        this.convertMetadataToSimpleKeyValuesWithGroups(metadata, options.templateMetadata) : 
                        this.convertMetadataToSimpleKeyValues(metadata);
                    
                    if (keyValuePairs.length > 0) {
                        const result = await this.testCreateMultipleKeyValues(objectId, keyValuePairs);
                        
                        if (result.success) {
                            results.push({
                                success: true,
                                namespace: options.namespace || 'MetaFold Integration',
                                annotationId: result.annotationId,
                                keyValuePairs: keyValuePairs.length,
                                method: 'enhanced_key_value'
                            });
                            totalPairs += keyValuePairs.length;
                            console.log(`✅ Enhanced Key-Value: ${keyValuePairs.length} pairs created`);
                        } else {
                            results.push({
                                success: false,
                                namespace: options.namespace || 'MetaFold Integration', 
                                error: result.error,
                                method: 'enhanced_key_value'
                            });
                        }
                    }
                }
            }
            
            // Handle integration links separately
            if (options.integrationData && options.integrationLinksAsKeyValue) {
                console.log('🔗 Creating annotation for integration links...');
                const integrationPairs = this.convertIntegrationLinksToKeyValue(options.integrationData);
                
                if (integrationPairs.length > 0) {
                    const result = await this.testCreateMultipleKeyValues(objectId, integrationPairs);
                    
                    if (result.success) {
                        results.push({
                            success: true,
                            namespace: 'Integration Links',
                            annotationId: result.annotationId,
                            keyValuePairs: integrationPairs.length
                        });
                        totalPairs += integrationPairs.length;
                        console.log(`✅ Integration links: ${integrationPairs.length} pairs created`);
                    } else {
                        results.push({
                            success: false,
                            namespace: 'Integration Links',
                            error: result.error
                        });
                    }
                }
            }
            
            // Summary
            const successful = results.filter(r => r.success);
            const failed = results.filter(r => !r.success);
            
            console.log(`🎉 Multi-namespace annotations complete:`);
            console.log(`   Successful: ${successful.length}/${results.length} namespaces`);
            console.log(`   Total pairs: ${totalPairs}`);
            if (failed.length > 0) {
                console.log(`   Failed namespaces: ${failed.map(f => f.namespace).join(', ')}`);
            }
            
            return {
                success: failed.length === 0,
                results: results,
                totalPairs: totalPairs,
                successCount: successful.length,
                failureCount: failed.length
            };
            
        } catch (error) {
            console.error('❌ Error in multi-namespace annotations:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    },


};

// Make globally available
window.omeroAnnotations = omeroAnnotations;
console.log('✅ OMERO Annotations Module loaded (FINAL WORKING VERSION)');
console.log('🎉 Map Annotations now work with FormData + JSON string format!');
console.log('📋 Usage: window.omeroAnnotations.addMapAnnotations(objectId, objectType, metadata)');

// Auto-initialize
omeroAnnotations.init();