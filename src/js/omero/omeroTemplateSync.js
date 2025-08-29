// OMERO Template Sync - Template Metadata zu OMERO Map Annotations
// Getestet und funktional - August 2025

const omeroTemplateSync = {
    
    // Get currently selected OMERO group and project from UI
    getOMEROSelection() {
        const groupSelect = document.getElementById('omeroGroupSelect');
        const projectSelect = document.getElementById('omeroProjectSelect');
        
        const selection = {
            groupId: groupSelect?.value || null,
            groupName: groupSelect?.options[groupSelect?.selectedIndex]?.text || 'Unknown',
            projectId: projectSelect?.value || null,
            projectName: projectSelect?.options[projectSelect?.selectedIndex]?.text || 'Standalone dataset',
            hasProject: !!(projectSelect?.value && projectSelect.value !== '' && projectSelect.value !== 'refresh')
        };
        
        console.log('🎯 OMERO Selection:', selection);
        return selection;
    },
    
    // Extract only the filled values from current template
    extractTemplateValues() {
        console.log('📋 Extracting template values...');
        
        if (!window.templateManager?.currentTemplate) {
            console.error('❌ No template currently selected');
            return null;
        }
        
        if (!window.experimentForm?.collectData) {
            console.error('❌ experimentForm.collectData not available');
            return null;
        }
        
        const formData = window.experimentForm.collectData();
        if (!formData) {
            console.error('❌ No form data collected');
            return null;
        }
        
        console.log('📋 Raw form data:', formData);
        
        // Convert to simple key-value pairs (only values, not schema)
        const templateValues = {};
        let totalFields = 0;
        let filledFields = 0;
        
        Object.entries(formData).forEach(([fieldName, fieldData]) => {
            totalFields++;
            
            // Extract only the actual value 
            let value;
            if (typeof fieldData === 'object' && fieldData.value !== undefined) {
                value = fieldData.value;
            } else {
                value = fieldData; // Direct value
            }
            
            // Skip empty values
            if (value === null || value === undefined || value === '') {
                return;
            }
            
            // Convert boolean and numbers to strings for OMERO
            if (typeof value === 'boolean') {
                value = value ? 'true' : 'false';
            } else if (typeof value === 'number') {
                value = value.toString();
            }
            
            templateValues[fieldName] = value;
            filledFields++;
        });
        
        const templateInfo = {
            templateName: window.templateManager.currentTemplate.name || 'Unknown Template',
            templateType: window.templateManager.currentTemplate.type || 'experiment',
            values: templateValues,
            stats: {
                totalFields: totalFields,
                filledFields: filledFields,
                emptyFields: totalFields - filledFields
            }
        };
        
        console.log('📋 Template values extracted:', templateInfo.stats);
        console.log('📋 Template name:', templateInfo.templateName);
        console.log('📋 Filled fields:', Object.keys(templateValues));
        
        return templateInfo;
    },
    
    // Add MetaFold context information to the metadata
    addMetaFoldContext(templateValues, templateInfo, omeroSelection) {
        const contextValues = {
            // MetaFold identification
            'MetaFold_Source': 'MetaFold_v06',
            'MetaFold_Template': templateInfo.templateName,
            'MetaFold_Type': templateInfo.templateType,
            'MetaFold_Timestamp': new Date().toISOString(),
            
            // OMERO context
            'OMERO_Group': omeroSelection.groupName,
            'OMERO_Project': omeroSelection.hasProject ? omeroSelection.projectName : 'Standalone Dataset',
            
            // Template statistics
            'Template_Fields_Total': templateInfo.stats.totalFields.toString(),
            'Template_Fields_Filled': templateInfo.stats.filledFields.toString(),
            
            // User context (if available)
            'Created_By': window.userManager?.getCurrentUser()?.username || 'Unknown User',
            'User_Group': window.userManager?.getCurrentUser()?.group || 'Unknown Group'
        };
        
        // Merge context with template values (template values take precedence)
        return { ...contextValues, ...templateValues };
    },
    
    // Main sync function: Send current template data to OMERO
    async syncToOMERO(datasetId = null, addContext = true) {
        try {
            console.log('🚀 === OMERO Template Sync Started ===');
            
            // Step 1: Check OMERO authentication
            if (!window.omeroAuth?.session || !window.omeroAuth.isSessionValid()) {
                console.error('❌ Not authenticated to OMERO');
                return { success: false, error: 'No valid OMERO session' };
            }
            
            // Step 2: Get OMERO selection from UI
            const omeroSelection = this.getOMEROSelection();
            if (!omeroSelection.groupId) {
                console.error('❌ No OMERO group selected');
                return { success: false, error: 'Please select an OMERO group first' };
            }
            
            // Step 3: Extract template values
            const templateInfo = this.extractTemplateValues();
            if (!templateInfo) {
                return { success: false, error: 'Could not extract template values' };
            }
            
            if (Object.keys(templateInfo.values).length === 0) {
                console.warn('⚠️ No filled fields found in template');
                return { success: false, error: 'No filled fields to sync to OMERO' };
            }
            
            // Step 4: Prepare metadata for OMERO
            let finalValues = templateInfo.values;
            if (addContext) {
                finalValues = this.addMetaFoldContext(templateInfo.values, templateInfo, omeroSelection);
            }
            
            // Step 5: Determine target dataset
            let targetDatasetId = datasetId;
            if (!targetDatasetId) {
                targetDatasetId = prompt(`Enter OMERO Dataset ID to sync metadata to:\n\nTemplate: ${templateInfo.templateName}\nFields: ${Object.keys(finalValues).length} key-value pairs\nGroup: ${omeroSelection.groupName}`);
                
                if (!targetDatasetId) {
                    return { success: false, error: 'No dataset ID provided' };
                }
            }
            
            // Step 6: Convert to OMERO Map Annotation format
            const mapPairs = Object.entries(finalValues).map(([key, value]) => [key, value]);
            
            console.log('🚀 Sync summary:');
            console.log('  Template:', templateInfo.templateName);
            console.log('  Dataset ID:', targetDatasetId);
            console.log('  Group:', omeroSelection.groupName);
            console.log('  Project:', omeroSelection.projectName);
            console.log('  Key-value pairs:', mapPairs.length);
            
            // Step 7: Send to OMERO using new simple method
            const result = await window.omeroAnnotations.testCreateMultipleKeyValues(targetDatasetId, mapPairs);
            
            if (result.success) {
                console.log('🎉 Template metadata successfully synced to OMERO!');
                console.log('✅ Annotation ID:', result.annotationId);
                
                // Log the synced data for verification
                console.log('📋 Synced metadata:');
                mapPairs.forEach(([key, value]) => {
                    console.log(`   ${key} = "${value}"`);
                });
                
                return {
                    success: true,
                    message: `Successfully synced ${mapPairs.length} metadata fields from template "${templateInfo.templateName}" to OMERO dataset ${targetDatasetId}`,
                    details: {
                        templateName: templateInfo.templateName,
                        datasetId: targetDatasetId,
                        annotationId: result.annotationId,
                        keyValuePairs: mapPairs.length,
                        omeroGroup: omeroSelection.groupName,
                        omeroProject: omeroSelection.projectName
                    }
                };
            } else {
                console.error('❌ Failed to sync to OMERO:', result.error);
                return result;
            }
            
        } catch (error) {
            console.error('❌ Error in template sync:', error);
            return {
                success: false,
                error: error.message,
                details: error
            };
        }
    },
    
    // Preview function to show what would be synced without actually sending
    previewSync() {
        console.log('👁️ === Sync Preview (No Data Sent) ===');
        
        const omeroSelection = this.getOMEROSelection();
        const templateInfo = this.extractTemplateValues();
        
        if (!templateInfo) {
            console.log('❌ No template data available');
            return null;
        }
        
        const finalValues = this.addMetaFoldContext(templateInfo.values, templateInfo, omeroSelection);
        const mapPairs = Object.entries(finalValues).map(([key, value]) => [key, value]);
        
        console.log('📋 Preview of data that would be sent:');
        console.log('  Template:', templateInfo.templateName);
        console.log('  OMERO Group:', omeroSelection.groupName);
        console.log('  OMERO Project:', omeroSelection.projectName);
        console.log('  Total key-value pairs:', mapPairs.length);
        console.log('');
        console.log('📋 Key-value pairs:');
        mapPairs.forEach(([key, value]) => {
            console.log(`  "${key}" = "${value}"`);
        });
        
        return {
            templateInfo,
            omeroSelection,
            mapPairs,
            summary: `${mapPairs.length} key-value pairs from template "${templateInfo.templateName}"`
        };
    }
};

// Make globally available
window.omeroTemplateSync = omeroTemplateSync;
console.log('✅ OMERO Template Sync Module loaded');
