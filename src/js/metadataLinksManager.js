// MetaFold Metadata Links Manager
// Manages automatic addition of integration links to project metadata

const metadataLinksManager = {
    
    // =================== MAIN FUNCTIONS ===================
    
    /**
     * Add integration information to metadata and update local files
     * @param {Object} metadata - Original project metadata
     * @param {string} localPath - Full local path to project
     * @param {Object} elabftwResult - Result from elabFTW upload (optional)
     * @param {Object} omeroResult - Result from OMERO upload (optional)
     * @returns {Object} Enhanced metadata with integration info
     */
    async addIntegrationInfo(metadata, localPath, elabftwResult = null, omeroResult = null) {
        console.log('🔗 metadataLinksManager: Adding integration info to metadata');
        console.log(`📁 Local path: ${localPath}`);
        console.log(`🧪 elabFTW result:`, elabftwResult?.success || false);
        console.log(`🔬 OMERO result:`, omeroResult?.success || false);
        
        try {
            // Clone metadata to avoid modifying original
            const enhancedMetadata = JSON.parse(JSON.stringify(metadata));
            
            // Initialize metafold_integration section if not exists
            if (!enhancedMetadata.metafold_integration) {
                enhancedMetadata.metafold_integration = {
                    created_at: new Date().toISOString(),
                    local_path: localPath,
                    external_links: {}
                };
            }
            
            // Add elabFTW link info
            if (elabftwResult && elabftwResult.success) {
                console.log('🧪 Adding elabFTW integration info');
                const experimentId = elabftwResult.experimentId || elabftwResult.id;
                enhancedMetadata.metafold_integration.external_links.elabftw = {
                    url: elabftwResult.url || await this.generateElabFTWUrl(experimentId),
                    experiment_id: experimentId.toString(),
                    uploaded_at: new Date().toISOString(),
                    status: 'uploaded'
                };
            }
            
            // Add OMERO link info
            if (omeroResult && omeroResult.success) {
                console.log('🔬 Adding OMERO integration info');
                enhancedMetadata.metafold_integration.external_links.omero = {
                    url: omeroResult.url || this.generateOMEROUrl(omeroResult.dataset?.id),
                    dataset_id: omeroResult.dataset?.id?.toString(),
                    uploaded_at: new Date().toISOString(),
                    status: 'uploaded'
                };
            }
            
            // Update local metadata file
            await this.updateLocalMetadataFile(localPath, enhancedMetadata);
            
            console.log('✅ metadataLinksManager: Integration info added successfully');
            return enhancedMetadata;
            
        } catch (error) {
            console.error('❌ metadataLinksManager: Error adding integration info:', error);
            throw error;
        }
    },
    
    /**
     * Update the local elabftw-metadata.json file with enhanced metadata
     * @param {string} projectPath - Path to project directory
     * @param {Object} enhancedMetadata - Metadata with integration info
     */
    async updateLocalMetadataFile(projectPath, enhancedMetadata) {
        console.log('💾 metadataLinksManager: Updating local metadata file');
        
        try {
            if (window.electronAPI && window.electronAPI.saveJsonFile) {
                // Electron environment - use IPC
                const metadataPath = projectPath + '/elabftw-metadata.json';
                const result = await window.electronAPI.saveJsonFile(enhancedMetadata, metadataPath);
                
                if (result.success) {
                    console.log('✅ metadataLinksManager: Local metadata file updated successfully');
                } else {
                    throw new Error(result.message || 'Failed to save metadata file');
                }
            } else {
                // Browser environment - cannot update local file
                console.warn('⚠️ metadataLinksManager: Cannot update local file in browser mode');
            }
        } catch (error) {
            console.error('❌ metadataLinksManager: Error updating local metadata file:', error);
            throw error;
        }
    },
    
    /**
     * Create additional metadata fields for integration info to upload to external services
     * @param {Object} integrationInfo - Integration information from metafold_integration
     * @returns {Object} Additional metadata fields for external upload
     */
    createIntegrationFields(integrationInfo) {
        console.log('🔧 metadataLinksManager: Creating integration fields for external upload');
        
        const integrationFields = {};
        
        // Add local path information
        if (integrationInfo.local_path) {
            integrationFields['MetaFold Local Path'] = {
                type: 'text',
                value: integrationInfo.local_path,
                description: 'Local file system path to this MetaFold project'
            };
        }
        
        // Add creation timestamp
        if (integrationInfo.created_at) {
            integrationFields['MetaFold Created'] = {
                type: 'date',
                value: integrationInfo.created_at.split('T')[0], // Date only
                description: 'Date when this MetaFold project was created'
            };
        }
        
        // Add external links
        if (integrationInfo.external_links) {
            if (integrationInfo.external_links.elabftw) {
                integrationFields['elabFTW Link'] = {
                    type: 'text',
                    value: integrationInfo.external_links.elabftw.url,
                    description: 'Direct link to corresponding elabFTW experiment'
                };
            }
            
            if (integrationInfo.external_links.omero) {
                integrationFields['OMERO Link'] = {
                    type: 'text',
                    value: integrationInfo.external_links.omero.url,
                    description: 'Direct link to corresponding OMERO dataset'
                };
            }
        }
        
        console.log(`🔧 metadataLinksManager: Created ${Object.keys(integrationFields).length} integration fields`);
        return integrationFields;
    },
    
    // =================== URL GENERATION ===================
    
    /**
     * Generate elabFTW URL based on experiment ID and current settings
     * @param {string|number} experimentId - elabFTW experiment ID
     * @returns {string} Full URL to elabFTW experiment
     */
    async generateElabFTWUrl(experimentId) {
        try {
            if (window.settingsManager && typeof window.settingsManager.getFormattedElabFTWUrl === 'function') {
                const baseUrl = await window.settingsManager.getFormattedElabFTWUrl();
                if (baseUrl) {
                    return `${baseUrl}experiments.php?mode=view&id=${experimentId}`;
                }
            }
            
            // Fallback - use basic format
            console.warn('⚠️ metadataLinksManager: Using fallback elabFTW URL generation');
            return `https://your-elabftw-server/experiments.php?mode=view&id=${experimentId}`;
            
        } catch (error) {
            console.error('❌ metadataLinksManager: Error generating elabFTW URL:', error);
            return `https://your-elabftw-server/experiments.php?mode=view&id=${experimentId}`;
        }
    },
    
    /**
     * Generate OMERO URL based on dataset ID
     * @param {string|number} datasetId - OMERO dataset ID
     * @returns {string} Full URL to OMERO dataset
     */
    generateOMEROUrl(datasetId) {
        // This matches the format used in metaFoldOMEROIntegration.js
        return `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`;
    },
    
    // =================== HELPER FUNCTIONS ===================
    
    /**
     * Merge original metadata with integration fields for external upload
     * @param {Object} originalMetadata - Original project metadata
     * @param {Object} integrationInfo - Integration information
     * @returns {Object} Merged metadata for external upload
     */
    mergeMetadataForUpload(originalMetadata, integrationInfo) {
        console.log('🔄 metadataLinksManager: Merging metadata for external upload');
        
        // Create integration fields
        const integrationFields = this.createIntegrationFields(integrationInfo);
        
        // Merge with original metadata
        const mergedMetadata = { ...originalMetadata };
        
        // Add integration fields to the merged metadata
        Object.entries(integrationFields).forEach(([key, field]) => {
            mergedMetadata[key] = field;
        });
        
        console.log(`🔄 metadataLinksManager: Merged ${Object.keys(integrationFields).length} integration fields`);
        return mergedMetadata;
    },
    
    /**
     * Check if integration info should be added based on upload results
     * @param {Object} elabftwResult - elabFTW upload result
     * @param {Object} omeroResult - OMERO upload result
     * @returns {boolean} Whether integration info should be added
     */
    shouldAddIntegrationInfo(elabftwResult, omeroResult) {
        const hasElabFTW = elabftwResult && elabftwResult.success;
        const hasOMERO = omeroResult && omeroResult.success;
        
        return hasElabFTW || hasOMERO;
    },
    
    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        try {
            return new Date(timestamp).toLocaleString();
        } catch (error) {
            return timestamp || 'Unknown';
        }
    }
};

// Make globally available
window.metadataLinksManager = metadataLinksManager;

console.log('✅ metadataLinksManager loaded - Link management for MetaFold projects');
console.log('');
console.log('🎯 MAIN FUNCTION:');
console.log('  await metadataLinksManager.addIntegrationInfo(metadata, localPath, elabftwResult, omeroResult)');
console.log('');
console.log('🔧 UTILITIES:');
console.log('  metadataLinksManager.createIntegrationFields(integrationInfo)');
console.log('  metadataLinksManager.mergeMetadataForUpload(metadata, integrationInfo)');
console.log('');