// MetaFold Metadata Links Manager
// Manages automatic addition of integration links to project metadata

/**
 * Get OMERO Server URL from settings - NO FALLBACK!
 */
async function getConfiguredOMEROServerUrl() {
    if (!window.settingsManager) {
        throw new Error('Settings manager not available - cannot get OMERO server URL');
    }
    
    const serverUrl = await window.settingsManager.get('omero.server_url');
    
    if (!serverUrl || serverUrl.trim() === '') {
        throw new Error('No OMERO server URL configured in settings');
    }
    
    return serverUrl.trim().endsWith('/') ? serverUrl.trim() : serverUrl.trim() + '/';
}

const metadataLinksManager = {
    
    // =================== MAIN FUNCTIONS ===================
    
    /**
     * Resolve the existing metadata JSON file path on disk (so integration updates never overwrite with an empty/wrong filename)
     */
    async resolveExistingMetadataFile(localPath, projectName = null, explicitFilePath = null) {
        if (explicitFilePath && typeof explicitFilePath === 'string' && explicitFilePath.toLowerCase().endsWith('.json') &&
            explicitFilePath !== 'Unknown location' && explicitFilePath !== 'Selected metadata file') {
            return explicitFilePath;
        }
        if (!localPath || typeof localPath !== 'string' ||
            localPath === 'Unknown' || localPath === 'cloud-only' || localPath.startsWith('Cloud Project')) {
            return null;
        }
        if (localPath.toLowerCase().endsWith('.json')) {
            return localPath;
        }

        const sep = localPath.includes('\\') ? '\\' : '/';
        const cleanDir = localPath.replace(/[\\/]+$/, '');
        const dirParts = cleanDir.replace(/\\/g, '/').split('/');
        const folderName = dirParts[dirParts.length - 1] || 'Project';
        const preferredName = (projectName || folderName).replace(/[<>:"/\\|?*]/g, '_').trim();

        if (window.electronAPI && typeof window.electronAPI.listDirectory === 'function') {
            try {
                const entries = await window.electronAPI.listDirectory(cleanDir);
                const files = Array.isArray(entries) ? entries.filter(e => e && e.isFile) : [];
                const exactTarget = `${preferredName}-metadata.json`.toLowerCase();
                const match = files.find(f => f.name.toLowerCase() === exactTarget)
                    || files.find(f => f.name.endsWith('-metadata.json') && !f.name.startsWith('.'))
                    || files.find(f => f.name === 'ReadyToImport.json');
                if (match) {
                    return `${cleanDir}${sep}${match.name}`;
                }
            } catch (e) {
                console.warn('⚠️ metadataLinksManager: Could not list directory to find metadata file:', e.message);
            }
        }

        return `${cleanDir}${sep}${preferredName}-metadata.json`;
    },

    /**
     * Add integration information to metadata and update local files non-destructively
     * @param {Object} metadata - Original or current project metadata
     * @param {string} localPath - Full local path to project
     * @param {Object} elabftwResult - Result from elabFTW upload (optional)
     * @param {Object} omeroResult - Result from OMERO upload (optional)
     * @param {Object} rspaceResult - Result from RSpace upload (optional)
     * @param {Object} options - Optional context { projectName, filePath }
     * @returns {Promise<Object>} Enhanced metadata with integration info & sync history
     */
    async addIntegrationInfo(metadata, localPath, elabftwResult = null, omeroResult = null, rspaceResult = null, options = {}) {
        console.log('🔗 metadataLinksManager: Adding integration info to metadata');
        console.log(`📁 Local path: ${localPath}`);
        console.log(`🧪 elabFTW result:`, elabftwResult?.success || false);
        console.log(`🔬 OMERO result:`, omeroResult?.success || false);
        console.log(`📝 RSpace result:`, rspaceResult?.success || false);

        try {
            const targetFilePath = await this.resolveExistingMetadataFile(
                localPath,
                options.projectName || metadata?.projectName,
                options.filePath
            );

            // Always read the existing JSON from disk first so we NEVER lose existing fields or history
            let diskData = null;
            if (targetFilePath && window.electronAPI && typeof window.electronAPI.readFile === 'function') {
                try {
                    const existingStr = await window.electronAPI.readFile(targetFilePath);
                    if (existingStr) {
                        diskData = JSON.parse(existingStr);
                    }
                } catch (readErr) {
                    console.warn('⚠️ metadataLinksManager: Could not read existing metadata JSON before integration update:', readErr.message);
                }
            }

            const baseDoc = diskData && typeof diskData === 'object' ? diskData : metadata;
            const enhancedMetadata = JSON.parse(JSON.stringify(baseDoc || {}));

            // Merge any missing top-level non-empty fields from incoming metadata without clobbering disk data
            if (diskData && metadata && typeof metadata === 'object') {
                const skipMergeKeys = new Set([
                    'schemaVersion', 'schemaType', 'metafold_project_id', 'projectName',
                    'created_at', 'updated_at', 'provenance', 'metafold_integration',
                    'integrations', 'changelog', 'System.UpdateHistory',
                    'System.LastUpdatedBy', 'System.LastUpdatedAt'
                ]);
                for (const [k, v] of Object.entries(metadata)) {
                    if (skipMergeKeys.has(k) || k.startsWith('System.')) continue;
                    if (enhancedMetadata[k] === undefined && v !== undefined && v !== null && v !== '') {
                        enhancedMetadata[k] = JSON.parse(JSON.stringify(v));
                    }
                }
            }

            const nowIso = new Date().toISOString();
            const currentUser = window.userManager?.currentUser || window.userManager?.getCurrentUserInfo?.()?.username || 'User';
            const currentGroup = window.userManager?.currentGroup || window.userManager?.getCurrentUserInfo?.()?.groupname || 'Unknown';

            // Initialize/preserve metafold_integration section
            if (!enhancedMetadata.metafold_integration || typeof enhancedMetadata.metafold_integration !== 'object') {
                enhancedMetadata.metafold_integration = {
                    created_at: enhancedMetadata.created_at || nowIso,
                    local_path: localPath,
                    external_links: {},
                    sync_history: []
                };
            }
            if (!enhancedMetadata.metafold_integration.external_links || typeof enhancedMetadata.metafold_integration.external_links !== 'object') {
                enhancedMetadata.metafold_integration.external_links = {};
            }
            if (!Array.isArray(enhancedMetadata.metafold_integration.sync_history)) {
                enhancedMetadata.metafold_integration.sync_history = [];
            }
            if (!enhancedMetadata.metafold_integration.local_path || enhancedMetadata.metafold_integration.local_path === 'Unknown') {
                enhancedMetadata.metafold_integration.local_path = localPath;
            }

            const syncedServices = [];

            // Add elabFTW link info
            if (elabftwResult && elabftwResult.success) {
                console.log('🧪 Adding elabFTW integration info');
                const experimentId = elabftwResult.experimentId || elabftwResult.id;

                // Get elabFTW username via /api/v2/users/me (API key identifies the user)
                let elabUsername = null;
                try {
                    if (window.settingsManager) {
                        const elabServerUrl = await window.settingsManager.getFormattedElabFTWUrl();
                        const elabApiKey = await window.settingsManager.get('elabftw.api_key');
                        if (elabServerUrl && elabApiKey) {
                            const meResponse = await fetch(`${elabServerUrl}api/v2/users/me`, {
                                headers: { 'Authorization': elabApiKey }
                            });
                            if (meResponse.ok) {
                                const meData = await meResponse.json();
                                elabUsername = meData.fullname || meData.name || meData.email || null;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Could not retrieve elabFTW username from API:', e.message);
                }
                console.log('🧪 elabFTW username resolved:', elabUsername);

                const elabUrl = elabftwResult.url || await this.generateElabFTWUrl(experimentId);
                enhancedMetadata.metafold_integration.external_links.elabftw = {
                    url: elabUrl,
                    experiment_id: experimentId !== undefined && experimentId !== null ? experimentId.toString() : '',
                    user_name: elabUsername || currentUser,
                    uploaded_at: nowIso,
                    status: 'uploaded'
                };

                const elabSyncEntry = {
                    service: 'elabFTW',
                    url: elabUrl,
                    id: String(experimentId || ''),
                    user: elabUsername || currentUser,
                    timestamp: nowIso
                };
                syncedServices.push(elabSyncEntry);
                enhancedMetadata.metafold_integration.sync_history.push(elabSyncEntry);
            }

            // Add OMERO link info (ENHANCED VERSION with correct object type and username)
            if (omeroResult && omeroResult.success) {
                console.log('🔬 Adding OMERO integration info');

                let omeroUsername = null;
                if (window.metaFoldOMEROIntegration?.hybridAuth?.session?.userName) {
                    omeroUsername = window.metaFoldOMEROIntegration.hybridAuth.session.userName;
                } else if (window.omeroAuth?.session?.eventContext?.userName) {
                    omeroUsername = window.omeroAuth.session.eventContext.userName;
                } else if (window.omeroAuth?.session?.username &&
                         window.omeroAuth.session.username !== 'authenticated_user') {
                    omeroUsername = window.omeroAuth.session.username;
                }

                console.log('🔬 OMERO username resolved:', omeroUsername);

                let omeroUrl = omeroResult.url || omeroResult.integration?.url || omeroResult.dataset?.omeroWebUrl;
                const omeroId = omeroResult.dataset?.id || omeroResult.integration?.datasetId || omeroResult.dataset?.datasetId;
                const isProject =
                    omeroResult.integration?.projectContext === 'create_new_project' ||
                    (omeroUrl && omeroUrl.includes('show=project-'));
                const objectType = isProject ? 'project' : 'dataset';

                if (!omeroUrl && omeroId) {
                    omeroUrl = await this.generateOMEROUrl(omeroId, null, objectType);
                }

                const omeroIdKey = isProject ? 'project_id' : 'dataset_id';
                const omeroGroupId = omeroResult.integration?.actualGroup || omeroResult.integration?.groupContext || null;
                let omeroGroupName = null;
                if (window.metaFoldOMEROIntegration?.hybridAuth?.session?.groupName) {
                    omeroGroupName = window.metaFoldOMEROIntegration.hybridAuth.session.groupName;
                } else if (window.omeroAuth?.session?.eventContext?.groupName) {
                    omeroGroupName = window.omeroAuth.session.eventContext.groupName;
                } else if (window.omeroAuth?.session?.groupName) {
                    omeroGroupName = window.omeroAuth.session.groupName;
                }

                enhancedMetadata.metafold_integration.external_links.omero = {
                    url: omeroUrl,
                    [omeroIdKey]: omeroId?.toString(),
                    object_type: objectType,
                    user_name: omeroUsername || currentUser,
                    group_id: omeroGroupId?.toString() || null,
                    group_name: omeroGroupName || null,
                    uploaded_at: nowIso,
                    status: 'uploaded'
                };

                const omeroSyncEntry = {
                    service: 'OMERO',
                    url: omeroUrl,
                    id: String(omeroId || ''),
                    group: omeroGroupName || null,
                    user: omeroUsername || currentUser,
                    timestamp: nowIso
                };
                syncedServices.push(omeroSyncEntry);
                enhancedMetadata.metafold_integration.sync_history.push(omeroSyncEntry);

                console.log('✨ OMERO integration info added:', {
                    [omeroIdKey]: omeroId,
                    object_type: objectType,
                    user_name: omeroUsername,
                    group_id: omeroGroupId,
                    group_name: omeroGroupName,
                    url: omeroUrl
                });
            }

            // Add RSpace link info
            if (rspaceResult && rspaceResult.success) {
                const rspaceUrl = rspaceResult.url || rspaceResult.documentUrl || '';
                const rspaceId = rspaceResult.documentId || rspaceResult.id || '';
                enhancedMetadata.metafold_integration.external_links.rspace = {
                    url: rspaceUrl,
                    document_id: String(rspaceId),
                    user_name: currentUser,
                    uploaded_at: nowIso,
                    status: 'uploaded'
                };

                const rspaceSyncEntry = {
                    service: 'RSpace',
                    url: rspaceUrl,
                    id: String(rspaceId),
                    user: currentUser,
                    timestamp: nowIso
                };
                syncedServices.push(rspaceSyncEntry);
                enhancedMetadata.metafold_integration.sync_history.push(rspaceSyncEntry);
            }

            // Record integration sync event in System.UpdateHistory & changelog
            if (syncedServices.length > 0) {
                const actionStr = `Sent to Integrations (${syncedServices.map(s => s.service).join(', ')})`;
                const syncUser = syncedServices.map(s => s.user).filter(Boolean)[0] || currentUser;

                if (!enhancedMetadata['System.UpdateHistory']) {
                    enhancedMetadata['System.UpdateHistory'] = { value: [], type: 'history' };
                }
                const historyArr = Array.isArray(enhancedMetadata['System.UpdateHistory'].value)
                    ? enhancedMetadata['System.UpdateHistory'].value
                    : [];
                historyArr.push({
                    date: nowIso,
                    user: syncUser,
                    group: currentGroup,
                    action: actionStr,
                    integrations: syncedServices
                });
                enhancedMetadata['System.UpdateHistory'] = { value: historyArr, type: 'history' };
                enhancedMetadata['System.LastUpdatedBy'] = { value: syncUser, type: 'user' };
                enhancedMetadata['System.LastUpdatedAt'] = { value: nowIso, type: 'date' };

                if (!Array.isArray(enhancedMetadata.changelog)) {
                    enhancedMetadata.changelog = [];
                }
                enhancedMetadata.changelog.unshift({
                    timestamp: nowIso,
                    user: syncUser,
                    group: currentGroup,
                    action: actionStr,
                    changes: syncedServices.map(s => ({
                        field: `Integration.${s.service}`,
                        label: s.service,
                        from: null,
                        to: s.url || s.id,
                        op: 'synced'
                    }))
                });
                if (enhancedMetadata.changelog.length > 100) {
                    enhancedMetadata.changelog = enhancedMetadata.changelog.slice(0, 100);
                }

                enhancedMetadata.updated_at = nowIso;
            }

            // Update local metadata file non-destructively (when a local path exists)
            if (targetFilePath) {
                await this.updateLocalMetadataFile(localPath, enhancedMetadata, targetFilePath);
            }

            console.log('✅ metadataLinksManager: Integration info added successfully');
            return enhancedMetadata;

        } catch (error) {
            console.error('❌ metadataLinksManager: Error adding integration info:', error);
            throw error;
        }
    },

    /**
     * Update the local <ProjectName>-metadata.json file with enhanced metadata
     * @param {string} projectPath - Path to project directory
     * @param {Object} enhancedMetadata - Metadata with integration info
     * @param {string|null} explicitFilePath - Resolved target JSON path
     */
    async updateLocalMetadataFile(projectPath, enhancedMetadata, explicitFilePath = null) {
        console.log('💾 metadataLinksManager: Updating local metadata file');

        try {
            if (window.electronAPI && window.electronAPI.saveJsonFile) {
                const metadataPath = await this.resolveExistingMetadataFile(
                    projectPath,
                    enhancedMetadata?.projectName || null,
                    explicitFilePath
                );

                if (!metadataPath) {
                    console.log('ℹ️ metadataLinksManager: No local project folder (cloud-only), skipping file update');
                    return;
                }

                console.log(`💾 Saving to: ${metadataPath}`);

                const result = await window.electronAPI.saveJsonFile(enhancedMetadata, metadataPath);

                if (result.success) {
                    console.log('✅ metadataLinksManager: Local metadata file updated successfully');
                    if (typeof window.electronAPI.upsertUserIndexProject === 'function') {
                        const projectDir = metadataPath.replace(/[\\/][^\\/]+$/, '');
                        const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
                        await window.electronAPI.upsertUserIndexProject(projectDir, null, userInfo).catch(() => {});
                    }
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
     * Generate OMERO URL based on object ID and type - NO HARDCODED FALLBACK!
     * @param {string|number} objectId - OMERO object ID (project or dataset)
     * @param {string|number} groupId - Optional group ID
     * @param {string} objectType - 'dataset' (default) or 'project'
     * @returns {Promise<string>} Full URL to OMERO object
     */
    async generateOMEROUrl(objectId, groupId = null, objectType = 'dataset') {
        const serverUrl = await getConfiguredOMEROServerUrl();
        let url = `${serverUrl}webclient/?show=${objectType}-${objectId}`;
        if (groupId) {
            url += `&group=${groupId}`;
        }
        console.log(`🔗 metadataLinksManager: Generated OMERO URL (${objectType}): ${url}`);
        return url;
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
     * @param {Object} rspaceResult - RSpace upload result
     * @returns {boolean} Whether integration info should be added
     */
    shouldAddIntegrationInfo(elabftwResult, omeroResult, rspaceResult = null) {
        const hasElabFTW = elabftwResult && elabftwResult.success;
        const hasOMERO = omeroResult && omeroResult.success;
        const hasRSpace = rspaceResult && rspaceResult.success;

        return Boolean(hasElabFTW || hasOMERO || hasRSpace);
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