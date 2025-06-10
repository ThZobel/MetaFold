// OMERO Projects and Datasets Management - Enhanced with Pagination

const omeroProjects = {
    projects: [],
    datasets: [],

    // Initialize projects module
    init() {
        console.log('🔬 OMERO Projects Module initialized');
        return this;
    },

    // =================== PROJECT MANAGEMENT ===================

    // Get all projects with enhanced pagination
    async getProjects() {
        try {
            console.log('🔬 Loading ALL projects with pagination...');
            
            let allProjects = [];
            let offset = 0;
            const limit = 500; // Größere Chunks für Effizienz
            let hasMore = true;
            
            while (hasMore) {
                try {
                    console.log(`🔬 Loading projects chunk: offset=${offset}, limit=${limit}`);
                    
                    // Verschiedene Paginierungs-Strategien für OMERO 5.25.0
                    const paginationUrls = [
                        `api/v0/m/projects/?limit=${limit}&offset=${offset}`,
                        `api/v0/m/projects/?limit=${limit}&skip=${offset}`,
                        `api/v0/m/projects/?page_size=${limit}&page=${Math.floor(offset / limit) + 1}`,
                        `api/v0/m/projects/?count=${limit}&start=${offset}`
                    ];
                    
                    let response = null;
                    let workingUrl = null;
                    
                    // Teste verschiedene Paginierungs-APIs
                    for (const url of paginationUrls) {
                        try {
                            response = await window.omeroAPI.apiRequest(url);
                            if (response.data && Array.isArray(response.data)) {
                                workingUrl = url;
                                console.log(`✅ Working pagination URL: ${url}`);
                                break;
                            }
                        } catch (error) {
                            console.log(`❌ Pagination URL failed: ${url}`);
                            continue;
                        }
                    }
                    
                    // Fallback: Standard-API (gibt meist nur erste 200 zurück)
                    if (!response || !response.data) {
                        console.log('🔬 Fallback: Using standard API');
                        response = await window.omeroAPI.apiRequest('api/v0/m/projects/');
                    }
                    
                    const projects = response.data || [];
                    console.log(`🔬 Loaded ${projects.length} projects in this chunk`);
                    
                    if (projects.length === 0) {
                        hasMore = false;
                        break;
                    }
                    
                    allProjects = allProjects.concat(projects);
                    
                    // Prüfe ob mehr Projekte verfügbar sind
                    if (projects.length < limit) {
                        hasMore = false; // Weniger als Limit = letzter Chunk
                    } else {
                        offset += limit;
                        
                        // Sicherheits-Stopp bei unrealistisch vielen Projekten
                        if (allProjects.length > 10000) {
                            console.warn('⚠️ Safety stop: More than 10,000 projects');
                            hasMore = false;
                        }
                    }
                    
                    // Kurze Pause zwischen Requests (OMERO-freundlich)
                    if (hasMore) {
                        await window.omeroAPI.delay(100);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error loading chunk at offset ${offset}:`, error);
                    hasMore = false;
                }
            }
            
            console.log(`✅ Total projects loaded: ${allProjects.length}`);
            
            // Debug: Zeige Projekte, die mit "B" beginnen
            const bProjects = allProjects.filter(p => 
                (p.Name || p.name || '').toLowerCase().startsWith('b')
            );
            console.log(`🔬 Projects starting with 'B': ${bProjects.length}`);
            bProjects.slice(0, 5).forEach(p => console.log(`  - ${p.Name || p.name}`));
            
            this.projects = allProjects;
            return allProjects;
            
        } catch (error) {
            console.error('❌ Error in enhanced getProjects:', error);
            
            // Ultimate fallback: Standard API
            try {
                console.log('🔬 Ultimate fallback: Standard API');
                const response = await window.omeroAPI.apiRequest('api/v0/m/projects/');
                const fallbackProjects = response.data || [];
                this.projects = fallbackProjects;
                return fallbackProjects;
            } catch (fallbackError) {
                console.error('❌ Even fallback failed:', fallbackError);
                throw fallbackError;
            }
        }
    },

    // Create new project
    async createProject(name, description = '') {
        const projectData = { name, description };
        const response = await window.omeroAPI.apiRequest('api/v0/m/projects/', {
            method: 'POST',
            body: JSON.stringify(projectData)
        });
        return response.data;
    },

    // =================== PROJECT SEARCH ===================

    // Search projects by name
    async searchProjectsByName(searchTerm) {
        try {
            console.log('🔬 Searching projects by name:', searchTerm);
            
            // Verschiedene Such-APIs versuchen
            const searchUrls = [
                `api/v0/m/projects/?search=${encodeURIComponent(searchTerm)}`,
                `api/v0/m/projects/?name=${encodeURIComponent(searchTerm)}`,
                `api/v0/m/projects/?query=${encodeURIComponent(searchTerm)}`,
                `api/v0/m/projects/?filter=${encodeURIComponent(searchTerm)}`,
                `webclient/api/projects/?search=${encodeURIComponent(searchTerm)}`
            ];
            
            for (const url of searchUrls) {
                try {
                    const response = await window.omeroAPI.apiRequest(url);
                    if (response.data && response.data.length > 0) {
                        console.log(`✅ Search successful with: ${url}`);
                        return response.data;
                    }
                } catch (error) {
                    console.log(`❌ Search URL failed: ${url}`);
                    continue;
                }
            }
            
            console.log('⚠️ No search API worked, using fallback');
            return [];
            
        } catch (error) {
            console.error('❌ Error searching projects:', error);
            return [];
        }
    },

    // =================== GROUP-BASED PROJECT FILTERING ===================

    // Enhanced project loading for specific group
    async getProjectsForGroupEnhanced(groupId) {
        try {
            console.log('🔬 Enhanced project loading for group:', groupId);
            
            // Strategie 1: Alle Projekte laden (mit Paginierung)
            const allProjects = await this.getProjects();
            console.log('🔬 Total projects loaded:', allProjects.length);
            
            if (groupId === 'all' || !groupId) {
                return allProjects.map(project => this.normalizeProjectDataSimple(project));
            }
            
            // Strategie 2: Standard-Filterung
            const filteredProjects = this.filterProjectsByGroup(allProjects, groupId);
            console.log('🔬 Projects found by standard filtering:', filteredProjects.length);
            
            // Strategie 3: Wenn bekannte Projekte fehlen, explizit suchen
            if (groupId === '1353' && filteredProjects.length < 2) {
                console.log('🔬 Missing known projects, searching explicitly...');
                
                const missingSearchTerms = ['Basics of Image Analysis', 'Image Analysis', 'MetaFold'];
                
                for (const term of missingSearchTerms) {
                    try {
                        const searchResults = await this.searchProjectsByName(term);
                        
                        searchResults.forEach(project => {
                            if (!filteredProjects.find(p => (p.id || p['@id']) === (project.id || project['@id']))) {
                                console.log(`🔍 Found missing project via search: ${project.Name || project.name}`);
                                filteredProjects.push(project);
                            }
                        });
                    } catch (searchError) {
                        console.warn(`⚠️ Search for "${term}" failed:`, searchError.message);
                    }
                }
            }
            
            console.log('🔬 Final project count:', filteredProjects.length);
            return filteredProjects.map(project => this.normalizeProjectDataSimple(project, groupId));
            
        } catch (error) {
            console.error('❌ Enhanced project loading failed:', error);
            // Fallback zur alten Methode
            return await this.getProjectsForGroup(groupId);
        }
    },

    // Standard method for getting projects for group
    async getProjectsForGroup(groupId) {
        try {
            console.log('🔬 Loading projects for group:', groupId);
            
            const allProjects = await this.getProjects();
            
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

    // Universal group filter
    filterProjectsByGroup(allProjects, groupId) {
        console.log(`🔬 Filtering ${allProjects.length} projects for group ${groupId} (Universal)`);
        
        const matchedProjects = allProjects.filter(project => {
            const projectStr = JSON.stringify(project);
            const projectName = project.Name || project.name || '';
            const projectId = project.id || project['@id'];
            
            // SCHRITT 1: Präzise Gruppen-ID Suche in omero:details (HAUPTMETHODE)
            let groupMatch = false;
            
            try {
                // Methode 1a: omero:details.group.id
                if (project['omero:details'] && project['omero:details'].group) {
                    const groupInfo = project['omero:details'].group;
                    const detailGroupId = groupInfo.id || groupInfo['@id'];
                    
                    if (detailGroupId && String(detailGroupId) === String(groupId)) {
                        console.log(`✅ Group match via omero:details: "${projectName}" (ID: ${projectId}) -> Group: ${detailGroupId}`);
                        groupMatch = true;
                    }
                }
                
                // Methode 1b: Andere Details-Strukturen
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
            
            // SCHRITT 2: Owner-basierte Gruppenzugehörigkeit (Fallback)
            if (!groupMatch) {
                try {
                    // Prüfe ob Owner derselben Gruppe angehört
                    const ownerGroupRegex = new RegExp(`"owner"[^}]*"group"[^}]*"(?:id|@id)"\\s*:\\s*${groupId}(?![0-9])`);
                    if (ownerGroupRegex.test(projectStr)) {
                        console.log(`✅ Group match via owner group: "${projectName}" (ID: ${projectId})`);
                        groupMatch = true;
                    }
                } catch (error) {
                    console.warn(`⚠️ Error checking owner group for project ${projectId}:`, error.message);
                }
            }
            
            // SCHRITT 3: Konservative JSON-Struktur-Suche (Letzter Fallback)
            if (!groupMatch) {
                const conservativePatterns = [
                    // Direkte Gruppen-Referenz in sauberer JSON-Struktur
                    new RegExp(`"group"\\s*:\\s*{[^}]*"(?:id|@id)"\\s*:\\s*${groupId}(?![0-9])`),
                    // Gruppen-ID direkt in Group-Objekt
                    new RegExp(`"group"\\s*:\\s*${groupId}(?![0-9])[^0-9]`)
                ];
                
                for (const pattern of conservativePatterns) {
                    if (pattern.test(projectStr)) {
                        console.log(`✅ Conservative pattern match: "${projectName}" (ID: ${projectId})`);
                        groupMatch = true;
                        break;
                    }
                }
            }
            
            // DEBUGGING: Zeige warum Projekt nicht gematcht wurde
            if (!groupMatch && projectStr.includes(groupId)) {
                console.log(`🔍 Project contains groupId but NOT matched: "${projectName}" (ID: ${projectId})`);
                
                // Zeige Kontext wo groupId vorkommt (aber nicht als echte Gruppen-Zugehörigkeit)
                const contextMatches = projectStr.match(new RegExp(`.{0,30}${groupId}.{0,30}`, 'g'));
                if (contextMatches && contextMatches.length <= 3) { // Nur erste paar zeigen
                    contextMatches.slice(0, 3).forEach(match => {
                        console.log(`   Context: ...${match}...`);
                    });
                }
            }
            
            return groupMatch;
        });
        
        console.log(`🔬 Universal group ${groupId} filtering result: ${matchedProjects.length} projects`);
        
        // Debug: Zeige alle gematchten Projekte
        matchedProjects.slice(0, 10).forEach(project => {
            console.log(`   ✅ ${project.Name || project.name} (ID: ${project.id || project['@id']})`);
        });
        
        // WARNUNG: Falls keine Projekte gefunden, aber erwartet werden
        if (matchedProjects.length === 0) {
            console.warn(`⚠️ No projects found for group ${groupId}. This might indicate:`);
            console.warn(`   - Group has no projects`);
            console.warn(`   - Different OMERO version/structure`);
            console.warn(`   - Permissions prevent access`);
            console.warn(`   - Group ID format differs`);
        }
        
        return matchedProjects;
    },

    // Vereinfachte Projekt-Normalisierung
    normalizeProjectDataSimple(project, groupId = null) {
        return {
            id: project['@id'] || project.id,
            name: project.Name || project.name || `Project ${project.id}`,
            description: project.Description || project.description || '',
            groupId: groupId, // Verwende die übergebene Gruppen-ID
            groupName: groupId ? `Group ${groupId}` : 'Unknown Group',
            owner: 'Unknown', // Da Details undefined sind
            permissions: null
        };
    },

    // =================== DATASET MANAGEMENT ===================

    // Get all datasets
    async getDatasets() {
        const response = await window.omeroAPI.apiRequest('api/v0/m/datasets/');
        const datasets = response.data || [];
        this.datasets = datasets;
        return datasets;
    },

    // Create dataset
    async createDataset(name, description = '') {
        const datasetData = { name, description };
        const response = await window.omeroAPI.apiRequest('api/v0/m/datasets/', {
            method: 'POST',
            body: JSON.stringify(datasetData)
        });
        return response.data;
    },

    // Link dataset to project
    async linkDatasetToProject(datasetId, projectId) {
        return await window.omeroAPI.linkDatasetToProject(datasetId, projectId);
    },

    // =================== PROJECT UTILITIES ===================

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

    // Get projects with details (erweiterte API)
    async getProjectsWithDetails() {
        try {
            console.log('🔬 Trying to fetch projects WITH details...');
            
            // Verschiedene OMERO 5.25.0 Endpoints mit Details
            const detailEndpoints = [
                'api/v0/m/projects/?expand=details',
                'api/v0/m/projects/?include=details',
                'api/v0/m/projects/?details=true',
                'webclient/api/projects/',
                'webgateway/projects/'
            ];
            
            for (const endpoint of detailEndpoints) {
                try {
                    console.log(`🔬 Trying endpoint: ${endpoint}`);
                    const response = await window.omeroAPI.apiRequest(endpoint);
                    
                    if (response.data && response.data.length > 0) {
                        const firstProject = response.data[0];
                        if (firstProject.Details || firstProject.details || firstProject.owner) {
                            console.log(`✅ Found endpoint with details: ${endpoint}`);
                            console.log('Sample project with details:', firstProject);
                            return response.data;
                        }
                    }
                } catch (error) {
                    console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                }
            }
            
            console.log('⚠️ No endpoint returned projects with details');
            return await this.getProjects(); // Fallback
            
        } catch (error) {
            console.error('❌ Error fetching projects with details:', error);
            return await this.getProjects(); // Fallback
        }
    },

    // =================== DEBUGGING METHODS ===================

    // Debug project group assignment
    async debugProjectGroupAssignment(projectId) {
        const allProjects = await this.getProjects();
        const project = allProjects.find(p => (p.id || p['@id']) == projectId);
        
        if (!project) {
            console.log(`❌ Project ${projectId} not found`);
            return;
        }
        
        console.log(`🔬 === DEBUG PROJECT ${projectId} ===`);
        console.log('Project Name:', project.Name || project.name);
        console.log('Full JSON:', JSON.stringify(project, null, 2));
        
        // Suche nach allen Gruppen-Referenzen
        const projectStr = JSON.stringify(project);
        const groupMatches = projectStr.match(/\d{4}/g) || [];
        console.log('All 4-digit numbers in project:', [...new Set(groupMatches)]);
        
        // Speziell nach 1353 suchen
        const context1353 = projectStr.match(/.{0,50}1353.{0,50}/g) || [];
        console.log('Context around 1353:', context1353);
        
        console.log('===========================================');
    },

    // Get project statistics
    async getProjectStatistics() {
        const projects = await this.getProjects();
        
        const stats = {
            totalProjects: projects.length,
            projectsWithDatasets: 0,
            totalDatasets: 0,
            groupDistribution: {},
            largestProject: null,
            newestProject: null
        };
        
        // Analyze projects
        projects.forEach(project => {
            const groupId = this.extractGroupIdFromProject(project);
            if (groupId) {
                stats.groupDistribution[groupId] = (stats.groupDistribution[groupId] || 0) + 1;
            }
            
            // Find newest project (if timestamps available)
            if (project.Details?.creation_event?.time || project.created) {
                const projectTime = new Date(project.Details?.creation_event?.time || project.created);
                if (!stats.newestProject || projectTime > new Date(stats.newestProject.created)) {
                    stats.newestProject = {
                        id: project['@id'] || project.id,
                        name: project.Name || project.name,
                        created: projectTime.toISOString()
                    };
                }
            }
        });
        
        return stats;
    },

    // Extract group ID from project
    extractGroupIdFromProject(project) {
        if (project['omero:details'] && project['omero:details'].group) {
            return project['omero:details'].group.id || project['omero:details'].group['@id'];
        }
        
        if (project.Details && project.Details.group) {
            return project.Details.group.id || project.Details.group['@id'];
        }
        
        if (project.group) {
            return project.group.id || project.group['@id'];
        }
        
        return null;
    }
};

// Make globally available
window.omeroProjects = omeroProjects;
console.log('✅ OMERO Projects Module loaded (Enhanced with Pagination)');