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
    }
};

// Make globally available
window.omeroAnnotations = omeroAnnotations;
console.log('✅ OMERO Annotations Module loaded (FINAL WORKING VERSION)');
console.log('🎉 Map Annotations now work with FormData + JSON string format!');
console.log('📋 Usage: window.omeroAnnotations.addMapAnnotations(objectId, objectType, metadata)');

// Auto-initialize
omeroAnnotations.init();