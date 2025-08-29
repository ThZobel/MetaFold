// =================== OMERO PROJECTS MODULE (CLEAN & FAST VERSION) ===================
// Only working logic - no legacy code

const omeroProjects = {
    projects: [],
    datasets: [],
    isInitialized: false,

    // Initialize
    init() {
        if (!window.omeroAPI) {
            console.error('❌ OMERO Projects requires omeroAPI module');
            return false;
        }
        
        this.isInitialized = true;
        console.log('🔬 OMERO Projects Module initialized (CLEAN & FAST VERSION)');
        return true;
    },

    // =================== FAST PROJECT LOADING ===================

    // Main function: Get projects for specific group (FAST VERSION)
    async getProjectsForGroupEnhanced(groupId) {
        console.log('🚀 Fast project loading for group:', groupId);
        
        try {
            let allProjects = [];
            
            // For specific groups: Use fast API
            if (groupId && groupId !== 'all') {
                console.log(`🚀 Using fast group-specific API for group ${groupId}`);
                
                try {
                    const experimenterId = window.metaFoldOMEROIntegration?.session?.eventContext?.userId || 
                                         window.omeroAuth?.session?.eventContext?.userId || 
                                         2;
                    
                    const fastUrl = `webclient/api/containers/?id=${experimenterId}&experimenter_id=${experimenterId}&page=0&group=${groupId}`;
                    console.log(`🔬 Fast API URL: ${fastUrl}`);
                    
                    const response = await window.omeroAPI.apiRequest(fastUrl);
                    
                    if (response && response.projects && Array.isArray(response.projects)) {
                        allProjects = response.projects;
                        console.log(`✅ Fast API loaded ${allProjects.length} projects for group ${groupId}`);
                    } else {
                        console.log(`ℹ️ Group ${groupId} has no projects (this is normal)`);
                        allProjects = [];
                    }
                    
                } catch (fastApiError) {
                    console.log(`⚠️ Fast API failed for group ${groupId}: ${fastApiError.message}`);
                    console.log('🔄 Using empty result instead of slow fallback');
                    allProjects = [];
                }
            } else {
                // For "all" groups: Limited load
                console.log('🔬 Loading limited projects for "all" groups');
                
                try {
                    const response = await window.omeroAPI.apiRequest('api/v0/m/projects/?limit=100');
                    allProjects = response.data || [];
                    console.log(`✅ Limited load: ${allProjects.length} projects`);
                } catch (error) {
                    console.log('⚠️ Limited load failed, returning empty array');
                    allProjects = [];
                }
            }
            
            // Normalize project data for UI compatibility
            const normalizedProjects = allProjects
                .filter(project => project && (project.id || project['@id'])) // Filter valid projects
                .map(project => this.normalizeProjectDataSimple(project, groupId));
            
            console.log(`✅ Returning ${normalizedProjects.length} normalized projects for group ${groupId}`);
            return normalizedProjects;
            
        } catch (error) {
            console.error('❌ Error in fast project loading:', error);
            return []; // Return empty instead of crashing
        }
    },

    // Normalize project data (handles both API formats)
    normalizeProjectDataSimple(project, groupId = null) {
        if (!project) return null;
        
        // Handle both Fast-API and Standard-API field names
        const projectId = project['@id'] || project.id;
        const projectName = project.Name || project.name;
        
        if (!projectId || !projectName) {
            console.warn('⚠️ Project missing ID or name:', project);
            return null;
        }
        
        // Create normalized project object that works with UI
        const normalized = {
            '@id': projectId,           // UI expects @id
            'id': projectId,            // Also provide id for compatibility
            'Name': projectName,        // UI expects Name
            'name': projectName,        // Also provide name for compatibility
            'Description': project.Description || project.description || '',
            'ownerId': project.ownerId || project.owner?.['@id'] || null,
            'childCount': project.childCount || 0,
            'permsCss': project.permsCss || ''
        };
        
        // Add group info if available
        if (groupId) {
            normalized.groupId = groupId;
        }
        
        // Preserve original omero:details if present
        if (project['omero:details']) {
            normalized['omero:details'] = project['omero:details'];
        }
        
        return normalized;
    },

    // =================== DATASET CREATION ===================

    // Create dataset in project (working method)
    async createDatasetInProject(projectId, name, description, groupId) {
        console.log('🚀 Creating dataset in project:', { projectId, name, groupId });
        
        try {
            // Ensure authentication
            if (!window.omeroAuth?.session?.isAuthenticated && !window.metaFoldOMEROIntegration?.session?.authenticated) {
                throw new Error('Not authenticated with OMERO');
            }
            
            // Use working webclient API for dataset creation
            const formData = new URLSearchParams();
            formData.append('name', name);
            formData.append('description', description || `Created by MetaFold in project ${projectId}`);
            formData.append('datatype', 'dataset');
            
            let apiUrl = `http://localhost:3000/omero-api/webclient/action/savenewcontainer/`;
            if (groupId) {
                apiUrl += `?group=${groupId}`;
            }
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': window.omeroAuth?.session?.csrfToken || window.metaFoldOMEROIntegration?.session?.csrfToken
                },
                body: formData
            });
            
            if (!response.ok) {
                throw new Error(`Dataset creation failed: ${response.status}`);
            }
            
            const result = await response.json();
            let datasetId = result.id || result.data?.id || result.data?.['@id'];
            
            if (!datasetId) {
                // Try to extract from response
                const responseText = await response.text();
                const idMatch = responseText.match(/dataset[_-](\d+)/i);
                if (idMatch) {
                    datasetId = parseInt(idMatch[1]);
                }
            }
            
            if (!datasetId) {
                throw new Error('Dataset ID not found in response');
            }
            
            console.log('✅ Dataset created:', datasetId);
            
            // Link to project if specified
            if (projectId && projectId !== 'none') {
                await this.linkDatasetToProject(datasetId, projectId);
            }
            
            return {
                success: true,
                id: datasetId,
                name: name,
                projectId: projectId,
                omeroWebUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`
            };
            
        } catch (error) {
            console.error('❌ Dataset creation failed:', error);
            throw error;
        }
    },

    // Link dataset to project (working method)
    async linkDatasetToProject(datasetId, projectId) {
        console.log('🔗 Linking dataset to project:', { datasetId, projectId });
        
        try {
            const linksUrl = `http://localhost:3000/omero-api/webclient/api/links/`;
            
            const linkBody = {
                "project": {
                    [projectId]: {
                        "dataset": [parseInt(datasetId)]
                    }
                }
            };
            
            const response = await fetch(linksUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-CSRFToken': window.omeroAuth?.session?.csrfToken || window.metaFoldOMEROIntegration?.session?.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(linkBody)
            });
            
            if (response.ok) {
                console.log('✅ Dataset linked to project');
                return { success: true };
            } else {
                console.warn(`⚠️ Linking failed: ${response.status}`);
                return { success: false, status: response.status };
            }
            
        } catch (error) {
            console.error('❌ Dataset linking failed:', error);
            return { success: false, error: error.message };
        }
    },

    // =================== HELPER FUNCTIONS ===================

    // Get all projects (fallback)
    async getProjects() {
        try {
            const response = await window.omeroAPI.apiRequest('api/v0/m/projects/?limit=200');
            const projects = response.data || [];
            this.projects = projects;
            return projects;
        } catch (error) {
            console.error('❌ Error getting projects:', error);
            return [];
        }
    },

    // Get datasets
    async getDatasets() {
        try {
            const response = await window.omeroAPI.apiRequest('api/v0/m/datasets/?limit=200');
            const datasets = response.data || [];
            this.datasets = datasets;
            return datasets;
        } catch (error) {
            console.error('❌ Error getting datasets:', error);
            return [];
        }
    }
};

// Initialize and make globally available
omeroProjects.init();
window.omeroProjects = omeroProjects;

console.log('✅ OMERO Projects Module loaded (CLEAN & FAST VERSION)');
console.log('🎯 Features: Fast group loading, no legacy code, robust error handling');
