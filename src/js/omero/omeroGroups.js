// OMERO Groups Management - Enhanced for Version 5.25.0

const omeroGroups = {
    groups: [],
    currentGroupId: null,
    currentGroupName: 'Unknown',

    // Initialize groups module
    init() {
        console.log('🔬 OMERO Groups Module initialized');
        return this;
    },

    // =================== CACHING SYSTEM FÜR PERFORMANCE ===================

    cache: {
        groups: null,
        groupsTimestamp: 0,
        projects: new Map(), // groupId -> {projects: [], timestamp: 0}
        workingEndpoint: null,
        cacheDuration: 5 * 60 * 1000 // 5 Minuten Cache
    },

    // Clear all caches
    clearCache() {
        console.log('🔬 Clearing OMERO groups cache...');
        this.cache.groups = null;
        this.cache.groupsTimestamp = 0;
        this.cache.projects.clear();
        this.cache.workingEndpoint = null;
    },

    // Check if cache is valid
    isCacheValid(timestamp) {
        return timestamp > 0 && (Date.now() - timestamp) < this.cache.cacheDuration;
    },

    // =================== OPTIMIERTE GROUPS LOADING ===================

    // Get all groups the user has access to - OPTIMIERT mit Caching
    async getGroups() {
        try {
            // ✅ CHECK CACHE FIRST
            if (this.isCacheValid(this.cache.groupsTimestamp) && this.cache.groups) {
                console.log('🔬 Using cached groups data');
                this.groups = this.cache.groups;
                return this.cache.groups;
            }
            
            console.log('🔬 Fetching OMERO groups (v5.25.0 compatible, with caching)...');
            
            // ✅ USE CACHED WORKING ENDPOINT IF AVAILABLE
            const possibleEndpoints = this.cache.workingEndpoint ? 
                [this.cache.workingEndpoint] : // Try working endpoint first
                [
                    'api/v0/m/experimentergroups/',  // ✅ Funktioniert meist (zuerst versuchen)
                    'webgateway/group_list/',
                    'webclient/api/groups/',
                    'api/v0/m/groups/'              // ❌ Als letztes versuchen
                ];
            
            let groups = [];
            let workingEndpoint = null;
            
            // ✅ OPTIMIERTE ENDPOINT-TESTS
            for (const endpoint of possibleEndpoints) {
                try {
                    console.log(`🔬 Testing endpoint: ${endpoint}`);
                    const response = await window.omeroAPI.apiRequest(endpoint);
                    
                    if (response.data && Array.isArray(response.data)) {
                        groups = response.data;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint confirmed: ${endpoint}`);
                        break;
                    } else if (response.groups && Array.isArray(response.groups)) {
                        groups = response.groups;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint confirmed: ${endpoint}`);
                        break;
                    } else if (Array.isArray(response)) {
                        groups = response;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint confirmed: ${endpoint}`);
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                    
                    // If cached endpoint fails, clear it
                    if (endpoint === this.cache.workingEndpoint) {
                        this.cache.workingEndpoint = null;
                    }
                    continue;
                }
            }
            
            if (groups.length === 0) {
                console.warn('⚠️ No groups endpoint worked, trying fallback...');
                return await this.getGroupsFallback();
            }
            
            console.log('🔬 Raw groups found:', groups.length);
            
            // ✅ NORMALIZE GROUP DATA
            const userGroups = groups.filter(group => {
                const groupName = group.Name || group.name || group.groupname || '';
                // Filter out typical system groups
                return !groupName.match(/^(system|guest|default|public|user-\d+)$/i);
            }).map(group => ({
                id: group['@id'] || group.id || group.group_id,
                name: group.Name || group.name || group.groupname || `Group ${group.id}`,
                description: group.Description || group.description || group.desc || '',
                permissions: group.Details?.permissions || group.permissions || null,
                isReadOnly: this.checkGroupPermissions(group)
            }));
            
            console.log('🔬 Processed user groups:', userGroups.length);
            console.log('🔬 Working endpoint:', workingEndpoint);
            
            // ✅ CACHE RESULTS
            this.groups = userGroups;
            this.cache.groups = userGroups;
            this.cache.groupsTimestamp = Date.now();
            this.cache.workingEndpoint = workingEndpoint;
            
            console.log('✅ Groups cached for 5 minutes');
            return userGroups;
            
        } catch (error) {
            console.error('❌ Error fetching groups:', error);
            console.log('🔬 Trying fallback method...');
            return await this.getGroupsFallback();
        }
    },

    // =================== CACHED PROJECT LOADING ===================

    // Get projects for specific group with caching
    async getProjectsForGroupCached(groupId) {
        try {
            // ✅ CHECK CACHE FIRST
            const cacheKey = groupId || 'all';
            const cachedData = this.cache.projects.get(cacheKey);
            
            if (cachedData && this.isCacheValid(cachedData.timestamp)) {
                console.log(`🔬 Using cached projects for group: ${groupId || 'all'}`);
                return cachedData.projects;
            }
            
            // ✅ FETCH FRESH DATA
            console.log(`🔬 Fetching fresh projects for group: ${groupId || 'all'}`);
            
            let projects = [];
            if (window.omeroProjects && window.omeroProjects.getProjectsForGroupEnhanced) {
                projects = await window.omeroProjects.getProjectsForGroupEnhanced(groupId);
            } else if (window.omeroProjects && window.omeroProjects.getProjectsForGroup) {
                projects = await window.omeroProjects.getProjectsForGroup(groupId);
            } else {
                console.warn('⚠️ No project loading function available');
                return [];
            }
            
            // ✅ CACHE RESULTS
            this.cache.projects.set(cacheKey, {
                projects: projects,
                timestamp: Date.now()
            });
            
            console.log(`✅ Projects cached for group ${groupId || 'all'}: ${projects.length} projects`);
            return projects;
            
        } catch (error) {
            console.error(`❌ Error getting projects for group ${groupId}:`, error);
            return [];
        }
    },

    // =================== CACHE MANAGEMENT METHODS ===================

    // Get cache status for debugging
    getCacheStatus() {
        const now = Date.now();
        
        return {
            groups: {
                cached: !!this.cache.groups,
                count: this.cache.groups ? this.cache.groups.length : 0,
                age: this.cache.groupsTimestamp > 0 ? now - this.cache.groupsTimestamp : 0,
                valid: this.isCacheValid(this.cache.groupsTimestamp)
            },
            projects: {
                cachedGroups: Array.from(this.cache.projects.keys()),
                totalCachedProjects: Array.from(this.cache.projects.values()).reduce((sum, data) => sum + data.projects.length, 0),
                cacheEntries: this.cache.projects.size
            },
            workingEndpoint: this.cache.workingEndpoint,
            cacheDuration: this.cache.cacheDuration
        };
    },

    // Force refresh of groups (clears cache first)
    async forceRefreshGroups() {
        console.log('🔬 Force refreshing groups (clearing cache)...');
        this.cache.groups = null;
        this.cache.groupsTimestamp = 0;
        this.cache.workingEndpoint = null;
        return await this.getGroups();
    },

    // Force refresh of projects for specific group
    async forceRefreshProjectsForGroup(groupId) {
        console.log(`🔬 Force refreshing projects for group: ${groupId || 'all'}`);
        const cacheKey = groupId || 'all';
        this.cache.projects.delete(cacheKey);
        return await this.getProjectsForGroupCached(groupId);
    },



    // =================== GROUPS MANAGEMENT (FIXED für 5.25.0) ===================

    // Get all groups the user has access to (FIXED für OMERO 5.25.0)
    async getGroups() {
        try {
            console.log('🔬 Fetching OMERO groups (v5.25.0 compatible)...');
            
            // OMERO 5.25.0 hat verschiedene mögliche Endpoints
            const possibleEndpoints = [
                'api/v0/m/experimentergroups/',  // ✅ Funktioniert (zuerst versuchen)
                'webgateway/group_list/',
                'webclient/api/groups/',
                'api/v0/m/groups/'              // ❌ Als letztes versuchen
            ];
            
            let groups = [];
            let workingEndpoint = null;
            
            // Teste verschiedene Endpoints
            for (const endpoint of possibleEndpoints) {
                try {
                    console.log(`🔬 Testing endpoint: ${endpoint}`);
                    const response = await window.omeroAPI.apiRequest(endpoint);
                    
                    if (response.data && Array.isArray(response.data)) {
                        groups = response.data;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint found: ${endpoint}`);
                        break;
                    } else if (response.groups && Array.isArray(response.groups)) {
                        groups = response.groups;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint found: ${endpoint}`);
                        break;
                    } else if (Array.isArray(response)) {
                        groups = response;
                        workingEndpoint = endpoint;
                        console.log(`✅ Working endpoint found: ${endpoint}`);
                        break;
                    }
                } catch (error) {
                    console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
                    continue;
                }
            }
            
            if (groups.length === 0) {
                console.warn('⚠️ No groups endpoint worked, trying fallback...');
                return await this.getGroupsFallback();
            }
            
            console.log('🔬 Raw groups found:', groups.length);
            
            // Normalisiere Gruppen-Daten (verschiedene Formate in 5.25.0)
            const userGroups = groups.filter(group => {
                const groupName = group.Name || group.name || group.groupname || '';
                // Filter out typical system groups
                return !groupName.match(/^(system|guest|default|public|user-\d+)$/i);
            }).map(group => ({
                id: group['@id'] || group.id || group.group_id,
                name: group.Name || group.name || group.groupname || `Group ${group.id}`,
                description: group.Description || group.description || group.desc || '',
                permissions: group.Details?.permissions || group.permissions || null,
                isReadOnly: this.checkGroupPermissions(group)
            }));
            
            console.log('🔬 Processed user groups:', userGroups.length);
            console.log('🔬 Working endpoint:', workingEndpoint);
            
            this.groups = userGroups;
            return userGroups;
            
        } catch (error) {
            console.error('❌ Error fetching groups:', error);
            console.log('🔬 Trying fallback method...');
            return await this.getGroupsFallback();
        }
    },

    // Fallback-Methode für Gruppen (OMERO 5.25.0)
    async getGroupsFallback() {
        try {
            console.log('🔬 Using fallback: Extracting groups from projects...');
            
            // Fallback: Extrahiere Gruppen aus Projekten
            const projects = await window.omeroProjects.getProjects();
            const groupMap = new Map();
            
            projects.forEach(project => {
                const groupInfo = project.Details?.group || project.group || {};
                const groupId = groupInfo.id || groupInfo['@id'];
                const groupName = groupInfo.name || groupInfo.Name || 'Unknown Group';
                
                if (groupId && !groupMap.has(groupId)) {
                    groupMap.set(groupId, {
                        id: groupId,
                        name: groupName,
                        description: `Group extracted from projects`,
                        permissions: null,
                        isReadOnly: false,
                        projectCount: 1
                    });
                } else if (groupId) {
                    const existing = groupMap.get(groupId);
                    existing.projectCount = (existing.projectCount || 0) + 1;
                }
            });
            
            const fallbackGroups = Array.from(groupMap.values());
            console.log('🔬 Fallback groups from projects:', fallbackGroups.length);
            
            this.groups = fallbackGroups;
            return fallbackGroups;
            
        } catch (error) {
            console.error('❌ Fallback method also failed:', error);
            
            // Ultimate fallback: Default groups
            const defaultGroups = [
                {
                    id: 'all',
                    name: 'All Groups',
                    description: 'Show all accessible projects',
                    permissions: null,
                    isReadOnly: false
                },
                {
                    id: 'current',
                    name: 'Current Group',
                    description: 'Your current group',
                    permissions: null,
                    isReadOnly: false
                }
            ];
            
            this.groups = defaultGroups;
            return defaultGroups;
        }
    },

    // Hilfsmethode für Berechtigungen
    checkGroupPermissions(group) {
        const perms = group.Details?.permissions || group.permissions;
        if (!perms) return false;
        
        const permString = perms.perm || perms;
        return permString === 'rw----' || permString === 'r-----';
    },

    // Get current user's group information (FIXED für 5.25.0)
    async getCurrentUserGroups() {
        try {
            console.log('🔬 Fetching current user group info (v5.25.0)...');
            
            // Versuche Benutzer-Info zu laden
            let currentGroupId = null;
            let currentGroupName = 'Unknown';
            
            try {
                const currentUser = await window.omeroAPI.getCurrentUser();
                
                if (currentUser) {
                    currentGroupId = currentUser.Details?.group?.id || 
                                   currentUser.group?.id || 
                                   currentUser.groupId;
                    currentGroupName = currentUser.Details?.group?.name || 
                                     currentUser.group?.name || 
                                     currentUser.groupName || 'Current Group';
                }
            } catch (error) {
                console.warn('⚠️ Could not get current user info:', error.message);
            }
            
            // Fallback: Session-Info verwenden
            if (!currentGroupId && window.omeroAuth.session?.groupId) {
                currentGroupId = window.omeroAuth.session.groupId;
                currentGroupName = window.omeroAuth.session.groupName || 'Session Group';
            }
            
            // Alle Gruppen laden
            const allGroups = await this.getGroups();
            
            // Update current group info
            this.currentGroupId = currentGroupId;
            this.currentGroupName = currentGroupName;
            
            return {
                allGroups: allGroups,
                currentGroupId: currentGroupId,
                currentGroupName: currentGroupName
            };
            
        } catch (error) {
            console.warn('⚠️ Could not get detailed user group info:', error.message);
            
            // Fallback: nur Gruppen laden
            try {
                const allGroups = await this.getGroups();
                return {
                    allGroups: allGroups,
                    currentGroupId: null,
                    currentGroupName: 'Unknown'
                };
            } catch (groupError) {
                return {
                    allGroups: [],
                    currentGroupId: null,
                    currentGroupName: 'Error'
                };
            }
        }
    },

    // =================== GROUP FILTERING ===================

    // Get group by ID
    getGroupById(groupId) {
        return this.groups.find(group => group.id == groupId) || null;
    },

    // Get group by name
    getGroupByName(groupName) {
        return this.groups.find(group => 
            group.name.toLowerCase() === groupName.toLowerCase()
        ) || null;
    },

    // Filter groups by criteria
    filterGroups(criteria = {}) {
        let filtered = [...this.groups];
        
        if (criteria.excludeReadOnly) {
            filtered = filtered.filter(group => !group.isReadOnly);
        }
        
        if (criteria.namePattern) {
            const pattern = new RegExp(criteria.namePattern, 'i');
            filtered = filtered.filter(group => pattern.test(group.name));
        }
        
        if (criteria.hasProjects) {
            filtered = filtered.filter(group => 
                group.projectCount && group.projectCount > 0
            );
        }
        
        return filtered;
    },

    // =================== GROUP VALIDATION ===================

    // Validate group access
    async validateGroupAccess(groupId) {
        try {
            const group = this.getGroupById(groupId);
            if (!group) {
                return {
                    valid: false,
                    message: `Group ${groupId} not found or no access`
                };
            }
            
            // Try to access projects in this group to validate
            try {
                const projects = await window.omeroProjects.getProjectsForGroup(groupId);
                return {
                    valid: true,
                    group: group,
                    projectCount: projects.length
                };
            } catch (error) {
                return {
                    valid: false,
                    message: `Cannot access projects in group ${group.name}: ${error.message}`
                };
            }
            
        } catch (error) {
            return {
                valid: false,
                message: `Error validating group access: ${error.message}`
            };
        }
    },

    // =================== GROUP STATISTICS ===================

    // Get group statistics
    async getGroupStatistics() {
        const stats = {
            totalGroups: this.groups.length,
            readOnlyGroups: this.groups.filter(g => g.isReadOnly).length,
            groupsWithProjects: 0,
            totalProjects: 0,
            groupDetails: []
        };
        
        for (const group of this.groups) {
            try {
                const projects = await window.omeroProjects.getProjectsForGroup(group.id);
                const projectCount = projects.length;
                
                if (projectCount > 0) {
                    stats.groupsWithProjects++;
                    stats.totalProjects += projectCount;
                }
                
                stats.groupDetails.push({
                    id: group.id,
                    name: group.name,
                    projectCount: projectCount,
                    isReadOnly: group.isReadOnly
                });
                
            } catch (error) {
                console.warn(`Could not get projects for group ${group.name}:`, error);
                stats.groupDetails.push({
                    id: group.id,
                    name: group.name,
                    projectCount: 0,
                    isReadOnly: group.isReadOnly,
                    error: error.message
                });
            }
        }
        
        return stats;
    },

    // =================== UI HELPER METHODS ===================

    // Format group for display
    formatGroupForDisplay(group) {
        return {
            id: group.id,
            displayName: group.name,
            subtitle: group.description || `Group ID: ${group.id}`,
            isReadOnly: group.isReadOnly,
            projectCount: group.projectCount || 0,
            permissions: group.permissions
        };
    },

    // Get groups formatted for dropdown
    getGroupsForDropdown() {
        const dropdownGroups = [
            {
                value: 'all',
                text: '-- All Groups --',
                description: 'Show projects from all accessible groups'
            }
        ];
        
        // Add current group first (if available)
        if (this.currentGroupId) {
            const currentGroup = this.getGroupById(this.currentGroupId);
            if (currentGroup) {
                dropdownGroups.push({
                    value: currentGroup.id,
                    text: `${currentGroup.name} (current)`,
                    description: currentGroup.description,
                    isCurrent: true
                });
            }
        }
        
        // Add other groups
        this.groups.forEach(group => {
            // Skip if already added as current
            if (group.id == this.currentGroupId) return;
            
            dropdownGroups.push({
                value: group.id,
                text: group.name,
                description: group.description,
                isReadOnly: group.isReadOnly,
                projectCount: group.projectCount
            });
        });
        
        dropdownGroups.push({
            value: 'refresh',
            text: '🔄 Refresh group list',
            description: 'Reload groups from server'
        });
        
        return dropdownGroups;
    },

    // =================== DEBUGGING METHODS ===================

    // Debug group information
    async debugGroupInfo() {
        console.log('🔬 === GROUP DEBUG INFO ===');
        console.log('Total groups loaded:', this.groups.length);
        console.log('Current group ID:', this.currentGroupId);
        console.log('Current group name:', this.currentGroupName);
        
        console.log('Groups details:');
        this.groups.forEach(group => {
            console.log(`  - ${group.name} (ID: ${group.id})`);
            console.log(`    Description: ${group.description}`);
            console.log(`    Read-only: ${group.isReadOnly}`);
            console.log(`    Projects: ${group.projectCount || 'Unknown'}`);
        });
        
        // Test group access
        console.log('Testing group access...');
        for (const group of this.groups.slice(0, 3)) { // Test first 3 groups
            try {
                const validation = await this.validateGroupAccess(group.id);
                console.log(`  ${group.name}: ${validation.valid ? 'Valid' : 'Invalid'} (${validation.message || validation.projectCount + ' projects'})`);
            } catch (error) {
                console.log(`  ${group.name}: Error - ${error.message}`);
            }
        }
        
        console.log('=============================');
    },

    // Debug current group state
    debugCurrentState() {
        console.log('🔬 === CURRENT GROUP UI STATE ===');
        console.log('Selected Group ID:', this.currentGroupId);
        console.log('Selected Group Name:', this.currentGroupName);
        console.log('Available Groups:', this.groups.map(g => `${g.id}: ${g.name}`));
        console.log('=================================');
    }
};

// Make globally available
window.omeroGroups = omeroGroups;
console.log('✅ OMERO Groups Module loaded (Enhanced for v5.25.0)');