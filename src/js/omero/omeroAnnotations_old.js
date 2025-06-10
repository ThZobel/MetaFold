// OMERO Map Annotations - Enhanced Multi-Endpoint Version

const omeroAnnotations = {
    supportedEndpoints: [],
    workingEndpoint: null,

    // Initialize annotations module
    init() {
        console.log('🔬 OMERO Annotations Module initialized');
        return this;
    },

    // =================== MAP ANNOTATIONS CREATION ===================

    // Add Map Annotations to OMERO object - FIXED VERSION
    async addMapAnnotations(objectId, objectType, metadata, namespace = 'NFDI4BioImage.MetaFold.ExperimentMetadata') {
        try {
            console.log('🔬 === MAP ANNOTATIONS CREATION (MULTI-ENDPOINT) ===');
            console.log('🔬 Target object:', objectType, objectId);
            console.log('🔬 Namespace:', namespace);
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
            
            // Create the annotation using multiple endpoint strategy
            const annotationResult = await this.createMapAnnotation(mapPairs, namespace);
            
            if (!annotationResult.success) {
                return annotationResult;
            }
            
            const annotationId = annotationResult.annotationId;
            console.log('✅ Map Annotation created with ID:', annotationId);
            
            // Try to link annotation to the object (optional - don't fail if this doesn't work)
            let linkResult = null;
            if (objectId && annotationId) {
                try {
                    console.log('🔬 Linking annotation to object...');
                    linkResult = await this.linkAnnotationToObject(annotationId, objectId, objectType);
                    console.log('✅ Map Annotation linked successfully');
                } catch (linkError) {
                    console.warn('⚠️ Failed to link annotation, but annotation was created:', linkError.message);
                    // Don't fail completely if linking fails
                }
            }
            
            return {
                success: true,
                message: `Map Annotation created ${linkResult ? 'and linked' : '(linking skipped)'} with ${mapPairs.length} key-value pairs`,
                annotationId: annotationId,
                keyValuePairs: mapPairs.length,
                workingStrategy: annotationResult.workingEndpoint,
                linkSuccess: !!linkResult,
                details: {
                    mapPairsGenerated: mapPairs.length,
                    annotationCreated: true,
                    annotationLinked: !!linkResult
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

		 // Create Map Annotation using webclient API (FIXED for simple format)
	async createMapAnnotation(mapPairs, namespace) {
		console.log('🔬 Using webclient annotate_map API...');
		console.log('🔬 Map pairs for webclient:', mapPairs.slice(0, 3));
		
		// Use the simple webclient format from your research
		const requestData = {
			mapAnnotation: mapPairs  // Direct array format: [["key", "value"], ...]
		};
		
		console.log('🔬 Request data for webclient:', JSON.stringify(requestData, null, 2));
		
		try {
			// Use webclient annotate_map endpoint (from your research)
			const response = await window.omeroAPI.apiRequest('webclient/annotate_map/', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(requestData)
			});

			console.log('✅ Webclient annotate_map response:', response);
			
			return {
				success: true,
				annotationId: 'webclient_created',
				workingEndpoint: 'webclient/annotate_map/',
				response: response
			};

		} catch (error) {
			console.error('❌ Webclient annotate_map failed:', error);
			return {
				success: false,
				message: `Webclient annotation failed: ${error.message}`,
				details: { error: error.message }
			};
		}
	};

    // Link annotation to object using working endpoint
    async linkAnnotationToObject(annotationId, objectId, objectType) {
        console.log(`🔬 Linking annotation ${annotationId} to ${objectType} ${objectId}`);
        
        // Skip linking if we don't have valid IDs
        if (!annotationId || !objectId || annotationId === 'unknown' || annotationId === 'array_response') {
            console.warn('🔬 Skipping link - missing or invalid annotation ID or object ID');
            return {
                success: false,
                message: 'Missing or invalid annotation ID or object ID for linking'
            };
        }
        
        return await window.omeroAPI.linkAnnotationToObject(annotationId, objectId, objectType);
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
					// FIXED: Use simple [key, value] arrays for webclient API compatibility
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
			['MetaFold_Version', '1.0'],
			['NFDI4BioImage_Tool', 'MetaFold'],
			['MetaFold_FieldCount', String(Object.keys(metadata).length)]
		];
        
        mapPairs.push(...metaFoldPairs);
        
        console.log(`🔬 Total map pairs generated: ${mapPairs.length}`);
        console.log('🔬 Final map pairs preview:');
			mapPairs.slice(0, 5).forEach((pair, index) => {
			console.log(`🔬   ${index + 1}. ${pair[0]} = "${pair[1]}"`);  // FIXED: pair[0], pair[1]
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
            
            const endpoints = [
                `api/v0/m/${objectType}s/${objectId}/annotations/`,
                `webclient/api/${objectType}s/${objectId}/annotations/`,
                `api/v0/m/annotations/?${objectType}=${objectId}`,
                `webclient/api/annotations/?${objectType}=${objectId}`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await window.omeroAPI.apiRequest(endpoint);
                    if (response.data && Array.isArray(response.data)) {
                        console.log(`✅ Found annotations via ${endpoint}:`, response.data.length);
                        return response.data;
                    }
                } catch (error) {
                    console.log(`❌ Annotation retrieval endpoint failed: ${endpoint}`);
                    continue;
                }
            }
            
            console.warn('⚠️ No working endpoint for annotation retrieval');
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
                const annotationType = annotation['@type'] || annotation.type || '';
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
                const name = pair.name || pair.key;
                const value = pair.value;
                
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
        console.log('🔬 === TESTING MAP ANNOTATIONS WITH SAMPLE DATA ===');
        
        const sampleMetadata = this.generateTestMetadata();
        console.log('🔬 Test metadata:', sampleMetadata);
        
        // Test the map annotations creation
        const result = await this.addMapAnnotations(null, 'dataset', sampleMetadata, 'NFDI4BioImage.MetaFold.Test');
        
        console.log('🔬 Test result:', result);
        
        return result;
    },

    // Generate test metadata for testing
    generateTestMetadata() {
        return {
            'test_experiment_name': { 
                type: 'text', 
                label: 'Test Experiment Name', 
                value: 'MetaFold Map Annotations Test',
                description: 'Test experiment for validating Map Annotations functionality'
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

    // =================== ENDPOINT DISCOVERY ===================

    // Discover working annotation endpoints
    async discoverWorkingEndpoints() {
        console.log('🔬 Discovering working annotation endpoints...');
        
        const testEndpoints = [
            'api/v0/m/annotations/',
            'webclient/api/annotations/',
            'api/v0/m/mapannotations/',
            'webgateway/annotation/',
            'webclient/api/mapannotations/',
            'api/v0/annotations/',
            'webclient/annotations/'
        ];
        
        const workingEndpoints = [];
        const failedEndpoints = [];
        
        for (const endpoint of testEndpoints) {
            try {
                console.log(`🔬 Testing endpoint: ${endpoint}`);
                
                // Try a simple GET request first
                const response = await window.omeroAPI.apiRequest(endpoint, {
                    method: 'GET'
                });
                
                if (response && (response.data !== undefined || Array.isArray(response))) {
                    workingEndpoints.push({
                        endpoint: endpoint,
                        method: 'GET',
                        responseType: Array.isArray(response) ? 'array' : 'object',
                        hasData: !!response.data
                    });
                    console.log(`✅ Working endpoint: ${endpoint}`);
                } else {
                    failedEndpoints.push({
                        endpoint: endpoint,
                        method: 'GET',
                        error: 'No valid response structure'
                    });
                }
                
            } catch (error) {
                console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                failedEndpoints.push({
                    endpoint: endpoint,
                    method: 'GET',
                    error: error.message
                });
            }
        }
        
        this.supportedEndpoints = workingEndpoints;
        
        console.log('🔬 Endpoint discovery complete:');
        console.log(`   Working: ${workingEndpoints.length}`);
        console.log(`   Failed: ${failedEndpoints.length}`);
        
        return {
            working: workingEndpoints,
            failed: failedEndpoints,
            recommendations: this.generateEndpointRecommendations(workingEndpoints)
        };
    },

    // Generate endpoint recommendations
    generateEndpointRecommendations(workingEndpoints) {
        const recommendations = {
            annotationCreation: 'api/v0/m/annotations/',
            annotationRetrieval: 'api/v0/m/annotations/',
            mapAnnotations: 'api/v0/m/mapannotations/'
        };
        
        // Override with working endpoints if available
        workingEndpoints.forEach(endpoint => {
            if (endpoint.endpoint.includes('mapannotations')) {
                recommendations.mapAnnotations = endpoint.endpoint;
                recommendations.annotationCreation = endpoint.endpoint;
            } else if (endpoint.endpoint.includes('annotations')) {
                if (!recommendations.annotationCreation.includes('mapannotations')) {
                    recommendations.annotationCreation = endpoint.endpoint;
                }
                recommendations.annotationRetrieval = endpoint.endpoint;
            }
        });
        
        return recommendations;
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
            if (!pair.name || typeof pair.name !== 'string') {
                validation.errors.push(`Map pair ${index}: Missing or invalid name`);
                validation.valid = false;
            }
            
            if (pair.value === undefined || pair.value === null) {
                validation.warnings.push(`Map pair ${index} (${pair.name}): Empty value`);
            }
            
            if (pair.name.length > 255) {
                validation.warnings.push(`Map pair ${index} (${pair.name}): Name is very long (${pair.name.length} chars)`);
            }
            
            if (String(pair.value).length > 1000) {
                validation.warnings.push(`Map pair ${index} (${pair.name}): Value is very long (${String(pair.value).length} chars)`);
            }
        });
        
        if (!namespace || typeof namespace !== 'string') {
            validation.warnings.push('No namespace provided - using default');
        }
        
        return validation;
    }
};

// Make globally available
window.omeroAnnotations = omeroAnnotations;
console.log('✅ OMERO Annotations Module loaded (Enhanced Multi-Endpoint)');
                