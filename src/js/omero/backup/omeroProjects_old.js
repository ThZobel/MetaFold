// =================== OMERO PROJECTS MODULE (CLEAN VERSION) ===================
// Handles OMERO project and dataset operations with focus on dataset-in-project creation

const omeroProjects = {
    projects: [],
    datasets: [],
    isInitialized: false,

    // =================== INITIALIZATION ===================

    init() {
        if (!window.omeroAPI) {
            console.error('❌ OMERO Projects requires omeroAPI module');
            return false;
        }
        
        this.isInitialized = true;
        console.log('🔬 OMERO Projects Module initialized (CLEAN VERSION)');
        return true;
    },

    // =================== CORE PROJECT FUNCTIONS ===================

    // Get all projects with pagination
    async getProjects() {
        console.log('🔬 Loading ALL projects with pagination...');
        
        const allProjects = [];
        const limit = 500;
        let offset = 0;
        let hasMore = true;
        
        try {
            while (hasMore) {
                console.log(`🔬 Loading projects chunk: offset=${offset}, limit=${limit}`);
                
                // Try pagination URLs
                const paginationUrls = [
                    `api/v0/m/projects/?limit=${limit}&offset=${offset}`,
                    `api/v0/m/projects/?limit=${limit}&skip=${offset}`,
                    `api/v0/m/projects/?page_size=${limit}&page=${Math.floor(offset/limit)+1}`,
                    `api/v0/m/projects/?count=${limit}&start=${offset}`
                ];
                
                let chunkProjects = [];
                let urlWorked = false;
                
                for (const url of paginationUrls) {
                    try {
                        const response = await window.omeroAPI.apiRequest(url);
                        chunkProjects = response.data || [];
                        console.log(`✅ Working pagination URL: ${url}`);
                        urlWorked = true;
                        break;
                    } catch (error) {
                        console.log(`❌ Pagination URL failed: ${url}`);
                        continue;
                    }
                }
                
                if (!urlWorked) {
                    console.log('🔬 Fallback: Using standard API');
                    const response = await window.omeroAPI.apiRequest('api/v0/m/projects/');
                    chunkProjects = response.data || [];
                    hasMore = false; // No pagination with fallback
                } else {
                    hasMore = chunkProjects.length === limit;
                }
                
                console.log(`🔬 Loaded ${chunkProjects.length} projects in this chunk`);
                allProjects.push(...chunkProjects);
                offset += limit;
                
                // Safety break
                if (offset > 10000) {
                    console.warn('⚠️ Safety break: Too many projects, stopping pagination');
                    break;
                }
            }
            
            console.log(`✅ Total projects loaded: ${allProjects.length}`);
            this.projects = allProjects;
            return allProjects;
            
        } catch (error) {
            console.error('❌ Error loading projects:', error);
            return [];
        }
    },

    // Get project by ID
    getProjectById(projectId) {
        return this.projects.find(project => 
            (project['@id'] || project.id) == projectId
        ) || null;
    },

    // Get project by name
    getProjectByName(projectName) {
        return this.projects.find(project => 
            (project.Name || project.name || '').toLowerCase() === projectName.toLowerCase()
        ) || null;
    },

    // =================== CORE DATASET FUNCTIONS ===================

    // Get all datasets
    async getDatasets() {
        try {
            let response;
            try {
                response = await window.omeroAPI.apiRequest('api/v0/m/datasets/');
            } catch (standardError) {
                console.log('🔬 Standard datasets API failed, trying webclient...');
                response = await window.omeroAPI.apiRequest('webclient/api/datasets/');
            }
            
            const datasets = response.data || response.datasets || [];
            this.datasets = datasets;
            return datasets;
        } catch (error) {
            console.error('❌ Error getting datasets:', error);
            return [];
        }
    },

    // Create standalone dataset (working method from successful logs)
    async createDataset(name, description = '') {
        console.log('🔬 Creating dataset via working method:', { name, description });
        
        try {
            // Use the exact working method from successful logs
            const response = await window.omeroAPI.apiRequest('webclient/api/datasets/', {
                method: 'POST',
                body: JSON.stringify({ name, description })
            });
            
            console.log('✅ Dataset created:', response);
            
            // Extract dataset data from response
            if (response.datasets && Array.isArray(response.datasets) && response.datasets.length > 0) {
                const newDataset = response.datasets.find(d => d.name === name) || response.datasets[response.datasets.length - 1];
                
                return {
                    '@id': newDataset.id || newDataset['@id'],
                    id: newDataset.id || newDataset['@id'],
                    name: newDataset.name || name,
                    description: newDataset.description || description,
                    ...newDataset
                };
            }
            
            return response;
            
        } catch (error) {
            console.error('❌ Dataset creation failed:', error);
            throw error;
        }
    },

    // =================== DATASET IN PROJECT CREATION (WORKING METHOD) ===================

    // Create dataset directly in project using the EXACT working POST command
    async createDatasetInProject(projectId, datasetName, description = '', groupId = null) {
        console.log('🔬 === CREATE DATASET IN PROJECT (WORKING METHOD) ===');
        console.log('🔬 Creating dataset using exact working POST command');
        console.log('🔬 Project ID:', projectId);
        console.log('🔬 Dataset Name:', datasetName);
        
        try {
            // Get group ID from UI if not provided
            if (!groupId) {
                groupId = document.getElementById('omeroGroupSelect')?.value ||
                          window.omeroUIIntegration?.getSelectedGroupId?.() ||
                          null;
                
                // Filter out invalid values (same as projectManager.js)
                if (!groupId || groupId === '' || groupId === 'refresh' || groupId === 'all') {
                    throw new Error('No valid group ID provided and no group selected in UI. Please select a group first.');
                }
            }
            
            console.log('🔬 Group ID (from UI):', groupId);
            
            // Check for any existing session (simplified check)
            let session = null;
            
            // Try multiple session sources
            if (window.metaFoldOMEROIntegration?.hybridAuth?.session) {
                session = window.metaFoldOMEROIntegration.hybridAuth.session;
                console.log('✅ Found session via metaFoldOMEROIntegration.hybridAuth');
            } else if (window.omeroAuth?.session) {
                session = window.omeroAuth.session;
                console.log('✅ Found session via omeroAuth');
            } else {
                throw new Error('No OMERO session found. Please create a MetaFold project first or log in via OMERO UI.');
            }
            
            const proxyUrl = 'http://localhost:3000/omero-api';
            
            console.log('✅ Using existing session for user:', session.userName || session.username || 'Unknown');
            console.log('📋 CSRF Token available:', !!session.csrfToken);
            
            // Simplified group validation - just check if it's a number
            const groupIdNum = parseInt(groupId);
            if (isNaN(groupIdNum)) {
                throw new Error(`Invalid group ID: ${groupId}`);
            }
            console.log('✅ Group ID validated:', groupId);
            
            // Use EXACT working POST command (from successful log)
            console.log('🔬 Creating dataset with working POST...');
            
            const datasetData = {
                "Name": datasetName,
                "Description": description || 'Created by MetaFold',
                "@type": "http://www.openmicroscopy.org/Schemas/OME/2016-06#Dataset"
            };
            
            const saveUrl = `${proxyUrl}/api/v0/m/save/?group=${groupId}`;
            
            console.log('🔬 Using working POST URL:', saveUrl);
            
            const response = await fetch(saveUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRFToken': session.csrfToken
                },
                body: JSON.stringify(datasetData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Dataset creation failed: ${response.status} - ${errorText}`);
            }
            
            const result = await response.json();
            const datasetId = result.data['@id'];
            
            if (!datasetId) {
                throw new Error('Dataset ID not found in response');
            }
            
            console.log('✅ Dataset created:', datasetId);
            
            // Link dataset to project using working method
            console.log('🔗 Linking dataset to project...');
            
            const linkResult = await this.linkDatasetToProject(datasetId, projectId, session);
            
            return {
                success: true,
                datasetId: datasetId,
                datasetName: datasetName,
                projectId: projectId,
                groupId: groupId,
                linkedToProject: linkResult.success,
                method: 'working_post_with_link',
                verified: true,
                message: `Dataset "${datasetName}" created and ${linkResult.success ? 'linked to' : 'attempted to link to'} project ${projectId}`,
                omeroUrl: `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`,
                linkDetails: linkResult
            };
            
        } catch (error) {
            console.error('❌ Dataset in project creation failed:', error);
            
            return {
                success: false,
                error: error.message,
                projectId: projectId,
                datasetName: datasetName,
                groupId: groupId,
                method: 'working_post_with_link'
            };
        }
    },

    // Link dataset to project using working method (from successful logs)
    async linkDatasetToProject(datasetId, projectId, session) {
        console.log('🔗 Linking dataset to project using working method...');
        console.log('🔗 Dataset ID:', datasetId);
        console.log('🔗 Project ID:', projectId);
        
        try {
            const proxyUrl = 'http://localhost:3000/omero-api';
            const linkUrl = `${proxyUrl}/webclient/action/addnewcontainer/`;
            
            // Use exact form data from working logs
            const formData = new URLSearchParams();
            formData.append('folder_type', 'dataset');
            formData.append('parent', projectId);
            formData.append('dataset', datasetId);
            formData.append('csrfmiddlewaretoken', session.csrfToken);
            
            console.log('🔗 Link URL:', linkUrl);
            
            const response = await fetch(linkUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': session.csrfToken
                },
                body: formData
            });
            
            if (response.ok) {
                console.log('✅ Dataset successfully linked to project');
                return { success: true, method: 'webclient_link' };
            } else {
                const errorText = await response.text();
                console.warn('⚠️ Project linking failed:', errorText.substring(0, 200));
                return { success: false, method: 'webclient_link_failed', error: errorText };
            }
            
        } catch (error) {
            console.error('❌ Dataset-Project linking failed:', error);
            return { success: false, error: error.message };
        }
    },

    // =================== UI INTEGRATION ===================

    // Create dataset in UI-selected project (simple wrapper)
    async createDatasetInUISelectedProject(datasetName, description = '') {
        console.log('🔬 === CREATE DATASET IN UI-SELECTED PROJECT ===');
        
        try {
            // Get project ID from UI
            const projectId = document.getElementById('omeroProjectSelect')?.value ||
                             window.omeroUIIntegration?.getSelectedProjectId?.() ||
                             null;
            
            // Get group ID from UI
            const groupId = document.getElementById('omeroGroupSelect')?.value ||
                           window.omeroUIIntegration?.getSelectedGroupId?.() ||
                           null;
            
            console.log('🔬 UI Selected Project ID:', projectId);
            console.log('🔬 UI Selected Group ID:', groupId);
            
            if (!projectId || projectId === 'none' || projectId === '' || projectId === 'refresh') {
                throw new Error('No project selected in UI. Please select a project first.');
            }
            
            if (!groupId || groupId === 'none' || groupId === '' || groupId === 'refresh' || groupId === 'all') {
                throw new Error('No group selected in UI. Please select a group first.');
            }
            
            // Use the working method with UI values
            return await this.createDatasetInProject(
                projectId,
                datasetName,
                description,
                groupId
            );
            
        } catch (error) {
            console.error('❌ UI-based dataset creation failed:', error);
            
            return {
                success: false,
                error: error.message,
                message: 'Failed to create dataset with UI-selected values. Please check UI selections.',
                timestamp: new Date().toISOString()
            };
        }
    },

    // =================== COMPLETE METAFOLD WORKFLOW ===================

    // Complete MetaFold workflow: Create dataset in project + add metadata
    async createDatasetForMetaFoldProject(projectData, options = {}) {
        console.log('🔬 === COMPLETE METAFOLD DATASET IN PROJECT WORKFLOW ===');
        console.log('🔬 Project data:', projectData);
        console.log('🔬 Options:', options);
        
        try {
            const projectName = projectData.projectName || projectData.name;
            const metadata = projectData.metadata || {};
            const targetProjectId = options.projectId || options.omeroProjectId;
            
            // Get group ID from UI if not in options
            let groupId = options.groupId;
            if (!groupId) {
                groupId = document.getElementById('omeroGroupSelect')?.value ||
                          window.omeroUIIntegration?.getSelectedGroupId?.() ||
                          null;
                
                // Filter out invalid values (same as projectManager.js)
                if (!groupId || groupId === '' || groupId === 'refresh' || groupId === 'all') {
                    throw new Error('No valid group ID provided and no group selected in UI. Please select a group first.');
                }
            }
            
            if (!targetProjectId) {
                throw new Error('Target OMERO project ID is required');
            }
            
            console.log('🔬 Target Project ID:', targetProjectId);
            console.log('🔬 Group ID (from UI):', groupId);
            
            // Generate dataset name
            const datasetName = options.datasetName || `MetaFold_${projectName}`;
            const description = options.description || `MetaFold project: ${projectName} | Created: ${new Date().toLocaleString()}`;
            
            console.log('🔬 Creating dataset in project:', {
                datasetName,
                targetProjectId,
                groupId,
                metadataFields: Object.keys(metadata).length
            });
            
            // Step 1: Create dataset in project
            const datasetResult = await this.createDatasetInProject(
                targetProjectId,
                datasetName,
                description,
                groupId
            );
            
            if (!datasetResult.success) {
                throw new Error(`Dataset creation failed: ${datasetResult.error}`);
            }
            
            console.log('✅ Dataset created in project:', datasetResult);
            
            // Step 2: Add metadata annotations (if available)
            if (metadata && Object.keys(metadata).length > 0 && datasetResult.datasetId) {
                console.log('🔬 Adding metadata annotations...');
                
                try {
                    const annotationResult = await window.metaFoldOMEROIntegration.addMapAnnotations(
                        datasetResult.datasetId,
                        metadata,
                        'NFDI4BioImage.MetaFold.ExperimentMetadata'
                    );
                    
                    if (annotationResult.success) {
                        console.log('✅ Metadata annotations added');
                        datasetResult.metadataAdded = true;
                        datasetResult.metadataFields = Object.keys(metadata).length;
                    } else {
                        console.warn('⚠️ Metadata annotation failed:', annotationResult.error);
                        datasetResult.metadataAdded = false;
                    }
                } catch (metadataError) {
                    console.warn('⚠️ Metadata annotation error:', metadataError.message);
                    datasetResult.metadataAdded = false;
                }
            }
            
            // Step 3: Final result
            const finalResult = {
                success: true,
                message: `MetaFold project "${projectName}" successfully created in OMERO project ${targetProjectId}`,
                dataset: {
                    id: datasetResult.datasetId,
                    name: datasetName,
                    url: datasetResult.omeroUrl
                },
                project: {
                    id: targetProjectId,
                    linkedSuccessfully: datasetResult.linkedToProject
                },
                metadata: {
                    added: datasetResult.metadataAdded || false,
                    fields: datasetResult.metadataFields || 0
                },
                integration: {
                    method: 'clean_working_method',
                    timestamp: new Date().toISOString()
                }
            };
            
            console.log('🎉 Complete MetaFold workflow successful:', finalResult);
            return finalResult;
            
        } catch (error) {
            console.error('❌ Complete MetaFold workflow failed:', error);
            
            return {
                success: false,
                message: `Failed to create MetaFold project in OMERO: ${error.message}`,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    },

    // =================== UTILITY FUNCTIONS ===================

    // =================== GROUP FILTERING (REQUIRED BY UI) ===================

    // Enhanced project loading for specific group (required by omeroGroups.js)

    async getProjectsForGroupEnhanced(groupId) {
        console.log('🔬 Enhanced project loading for group:', groupId);
        
        try {
            let allProjects = [];
            let usedFastAPI = false; // Track if we used the fast API
            
            // Use fast group-specific API if available
            if (groupId && groupId !== 'all') {
                console.log(`🚀 Using fast group-specific API for group ${groupId}`);
                
                try {
                    // Use the real OMERO webclient API (from browser logs)
                    const experimenterId = window.metaFoldOMEROIntegration?.session?.eventContext?.userId || 
                                        window.omeroAuth?.session?.eventContext?.userId || 
                                        2; // fallback experimenter ID
                    
                    const fastUrl = `webclient/api/containers/?id=${experimenterId}&experimenter_id=${experimenterId}&page=0&group=${groupId}`;
                    console.log(`🔬 Fast API URL: ${fastUrl}`);

                    const response = await window.omeroAPI.apiRequest(fastUrl);

                    if (response && response.projects) {
                        allProjects = response.projects;
                        usedFastAPI = true;
                        console.log(`✅ Fast API loaded ${allProjects.length} projects for group ${groupId}`);
                        
                        // *** DEBUG: Schauen Sie sich die ersten 2 Projekte an ***
                        console.log('🔍 DEBUG: First project structure:', JSON.stringify(allProjects[0], null, 2));
                        if (allProjects[1]) {
                            console.log('🔍 DEBUG: Second project structure:', JSON.stringify(allProjects[1], null, 2));
                        }
                        console.log('🔍 DEBUG: Project fields in first project:', Object.keys(allProjects[0]));
                        
                    } else if (response && response.data && response.data.projects) {
                        allProjects = response.data.projects;
                        usedFastAPI = true;
                        console.log(`✅ Fast API loaded ${allProjects.length} projects for group ${groupId} (nested)`);
                    } else {
                        throw new Error('Fast API returned no projects');
                    }
                    
                } catch (fastApiError) {
                    console.log(`⚠️ Fast API failed: ${fastApiError.message}, falling back to standard method`);
                    
                    // Fallback to old method
                    allProjects = await this.getProjects();
                    console.log('🔬 Fallback: Total projects loaded:', allProjects.length);
                }
            } else {
                // For "all" groups, use standard method but with limit
                console.log('🔬 Loading projects for "all" groups (limited)');
                
                try {
                    const response = await window.omeroAPI.apiRequest('api/v0/m/projects/?limit=200');
                    allProjects = response.data || [];
                    console.log(`✅ Limited load: ${allProjects.length} projects`);
                } catch (error) {
                    // Ultimate fallback
                    allProjects = await this.getProjects();
                    console.log('🔬 Ultimate fallback: Total projects loaded:', allProjects.length);
                }
            }
            
            // SKIP FILTERING if we used the fast API (projects are already group-specific)
            if (usedFastAPI) {
                console.log(`🚀 Skipping filtering - fast API already returned group ${groupId} projects`);
                return allProjects.map(project => this.normalizeProjectDataSimple(project, groupId));
            }
            
            // Continue with existing logic for fallback cases
            if (groupId === 'all' || !groupId) {
                return allProjects.map(project => this.normalizeProjectDataSimple(project));
            }
            
            const filteredProjects = this.filterProjectsByGroup(allProjects, groupId);
            return filteredProjects.map(project => this.normalizeProjectDataSimple(project, groupId));
            
        } catch (error) {
            console.error('❌ Error loading projects for group:', error);
            throw error;
        }
    },

    // Filter projects by group ID (required by UI)
    filterProjectsByGroup(allProjects, groupId) {
        console.log(`🔬 Filtering ${allProjects.length} projects for group ${groupId} (Universal)`);
        
        const matchedProjects = allProjects.filter(project => {
            const projectStr = JSON.stringify(project);
            const projectName = project.Name || project.name || '';
            const projectId = project.id || project['@id'];
            
            // Method 1: Check omero:details.group.id (primary method)
            let groupMatch = false;
            
            try {
                if (project['omero:details'] && project['omero:details'].group) {
                    const groupInfo = project['omero:details'].group;
                    const detailGroupId = groupInfo.id || groupInfo['@id'];
                    
                    if (detailGroupId && String(detailGroupId) === String(groupId)) {
                        console.log(`✅ Group match via omero:details: "${projectName}" (ID: ${projectId}) -> Group: ${detailGroupId}`);
                        groupMatch = true;
                    }
                }
                
                // Method 1b: Regex fallback for details
                if (!groupMatch && projectStr.includes('"omero:details"')) {
                    const detailsGroupRegex = new RegExp(`"omero:details"[^}]*"group"[^}]*"(?:id|@id)"\\s*:\\s*${groupId}(?![0-9])`);
                    if (detailsGroupRegex.test(projectStr)) {
                        console.log(`✅ Group match via details regex: "${projectName}" (ID: ${projectId})`);
                        groupMatch = true;
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Error parsing details for project ${projectId}:`, error.message);
            }
            
            // Method 2: Owner-based group membership (fallback)
            if (!groupMatch) {
                try {
                    const ownerGroupRegex = new RegExp(`"owner"[^}]*"group"[^}]*"(?:id|@id)"\\s*:\\s*${groupId}(?![0-9])`);
                    if (ownerGroupRegex.test(projectStr)) {
                        console.log(`✅ Group match via owner: "${projectName}" (ID: ${projectId})`);
                        groupMatch = true;
                    }
                } catch (error) {
                    // Silent fallback
                }
            }
            
            // Method 3: Direct group property check
            if (!groupMatch) {
                const directGroupId = project.group?.id || project.group?.['@id'] ||
                                    project.Details?.group?.id || project.Details?.group?.['@id'];
                if (directGroupId && String(directGroupId) === String(groupId)) {
                    console.log(`✅ Group match via direct property: "${projectName}" (ID: ${projectId})`);
                    groupMatch = true;
                }
            }
            
            // Debug unmatched projects
            if (!groupMatch && projectStr.includes(groupId)) {
                console.log(`🔍 Project contains groupId but NOT matched: "${projectName}" (ID: ${projectId})`);
                const context = projectStr.match(new RegExp(`.{0,50}${groupId}.{0,50}`, 'g')) || [];
                console.log(`    Context: ${context.join('...')}`);
            }
            
            return groupMatch;
        });
        
        console.log(`🔬 Universal group ${groupId} filtering result: ${matchedProjects.length} projects`);
        
        // Log some matched projects for verification
        matchedProjects.slice(0, 10).forEach(project => {
            const projectName = project.Name || project.name || '';
            const projectId = project.id || project['@id'];
            console.log(`    ✅ ${projectName} (ID: ${projectId})`);
        });
        
        return matchedProjects;
    },

    // Normalize project data (required by UI)
    normalizeProjectDataSimple(project, groupId = null) {
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
        
        // Preserve original omero:details if present (for Standard API compatibility)
        if (project['omero:details']) {
            normalized['omero:details'] = project['omero:details'];
        }
        
        return normalized;
    },

    // Get projects for specific group (simple version, also required by UI)
    async getProjectsForGroup(groupId) {
        console.log('🔬 Simple project loading for group:', groupId);
        const allProjects = await this.getProjects();
        
        return allProjects.filter(project => {
            const projectGroupId = project['omero:details']?.group?.id || 
                                  project.Details?.group?.id ||
                                  project.group?.id;
            return projectGroupId == groupId;
        });
    },

    // Search projects by name
    searchProjects(searchTerm) {
        if (!searchTerm) return this.projects;
        
        const term = searchTerm.toLowerCase();
        return this.projects.filter(project => {
            const name = (project.Name || project.name || '').toLowerCase();
            const description = (project.Description || project.description || '').toLowerCase();
            return name.includes(term) || description.includes(term);
        });
    },

    // Get project statistics
    getProjectStats() {
        return {
            total: this.projects.length,
            loaded: this.projects.length > 0,
            lastUpdate: new Date().toISOString()
        };
    },

    // =================== DEBUG FUNCTIONS ===================

    // Debug UI values (helper function)
    debugUIValues() {
        console.log('🔬 === DEBUG UI VALUES ===');
        
        const groupSelect = document.getElementById('omeroGroupSelect');
        const projectSelect = document.getElementById('omeroProjectSelect');
        
        console.log('Group Select Element:', !!groupSelect);
        console.log('Group Select Value:', groupSelect?.value || 'null');
        console.log('Group Select Options:', Array.from(groupSelect?.options || []).map(o => `${o.value}: ${o.text}`));
        
        console.log('Project Select Element:', !!projectSelect);
        console.log('Project Select Value:', projectSelect?.value || 'null');
        console.log('Project Select Options:', Array.from(projectSelect?.options || []).slice(0, 5).map(o => `${o.value}: ${o.text}`));
        
        console.log('========================');
    }
};

// Initialize and make globally available
omeroProjects.init();
window.omeroProjects = omeroProjects;

console.log('✅ OMERO Projects Module loaded (CLEAN VERSION - Only Working Functions)');
console.log('🎯 Main Functions:');
console.log('  • omeroProjects.createDatasetInProject(projectId, name, description, groupId)');
console.log('  • omeroProjects.createDatasetInUISelectedProject(name, description)');
console.log('  • omeroProjects.createDatasetForMetaFoldProject(projectData, options)');
console.log('  • omeroProjects.getProjects()');
console.log('  • omeroProjects.getDatasets()');
console.log('🔧 UI Integration Functions:');
console.log('  • omeroProjects.getProjectsForGroupEnhanced(groupId) - For UI group filtering');
console.log('  • omeroProjects.getProjectsForGroup(groupId) - Simple group filtering');
console.log('  • omeroProjects.filterProjectsByGroup(projects, groupId) - Project filtering logic');
console.log('🐛 Debug Functions:');
console.log('  • omeroProjects.debugUIValues() - Show current UI values');