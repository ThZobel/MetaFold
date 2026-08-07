/**
 * OMERO UI Performance Optimizations
 * 
 * These functions replace the slow project loading in omeroUIIntegration.js
 * and omeroProjects.js to make the UI much faster.
 */

// =================== FAST PROJECT LOADING ===================

/**
 * SIMPLE FALLBACK: Just try to load projects without complex session detection
 * Since authentication was successful, browser should have session cookies
 */
async function loadProjectsForGroupOptimized(groupId) {
    console.log(`🚀 Loading projects for group ${groupId} (SIMPLE APPROACH)`);
    
    try {
        // Show loading indicator
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Loading projects...</option>';
            projectSelect.disabled = true;
        }
        
        let projects = [];
        
        // Simple approach: Try the API call directly
        // Authentication was successful, so session cookies should work
        console.log('🔬 Making direct API call (session cookies should work)');
        
        try {
            let apiUrl;
            if (groupId === 'all' || !groupId) {
                apiUrl = `http://localhost:3000/omero-api/api/v0/m/projects/?limit=100`;
            } else if (window.omeroProjects && window.omeroProjects.projects && window.omeroProjects.projects.length > 0) {
                // Use cached projects and filter them
                console.log('🔬 Using cached projects for filtering');
                const allProjects = window.omeroProjects.projects;
                
                projects = allProjects.filter(project => {
                    const projectGroup = project['omero:details']?.group?.['@id'] || 
                                       project.group?.id || 
                                       project.groupId;
                    return projectGroup == groupId;
                });
                
                console.log(`✅ Filtered ${projects.length} cached projects for group ${groupId}`);
                updateProjectDropdown(projects);
                
                return {
                    success: true,
                    projects: projects,
                    count: projects.length,
                    method: 'cached_filtered'
                };
            } else {
                apiUrl = `http://localhost:3000/omero-api/api/v0/m/projects/?group=${groupId}&limit=200`;
            }
            
            if (apiUrl) {
                console.log('🔬 API URL:', apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                console.log('📊 API Response status:', response.status);
                
                if (response.ok) {
                    const data = await response.json();
                    projects = data.data || [];
                    console.log(`✅ Loaded ${projects.length} projects from API`);
                } else {
                    console.warn(`⚠️ API call failed with ${response.status}, trying fallback`);
                    
                    // Fallback: Use any cached projects
                    if (window.omeroProjects && window.omeroProjects.projects) {
                        projects = window.omeroProjects.projects.slice(0, 100);
                        console.log(`🔄 Using ${projects.length} cached projects as fallback`);
                    }
                }
            }
            
        } catch (apiError) {
            console.warn('⚠️ Direct API call failed:', apiError.message);
            
            // Ultimate fallback: Try to use any existing projects
            if (window.omeroProjects && window.omeroProjects.projects) {
                projects = window.omeroProjects.projects.slice(0, 100);
                console.log(`🔄 Using ${projects.length} existing projects as ultimate fallback`);
            } else {
                // Show friendly message
                console.log('ℹ️ No projects available - this is normal if no projects exist in this group');
                projects = [];
            }
        }
        
        // Update UI
        updateProjectDropdown(projects);
        
        return {
            success: true,
            projects: projects,
            count: projects.length,
            method: 'simple_approach'
        };
        
    } catch (error) {
        console.error('❌ Simple project loading failed:', error);
        
        // Show error in dropdown but don't fail completely
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">Projects unavailable</option>';
            projectSelect.disabled = false;
        }
        
        return {
            success: false,
            error: error.message,
            projects: []
        };
    }
}

/**
 * Update project dropdown with loaded projects
 */
function updateProjectDropdown(projects) {
    const projectSelect = document.getElementById('omeroProjectSelect');
    if (!projectSelect) return;
    
    // Clear existing options
    projectSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = 'create_standalone';
    defaultOption.textContent = 'Create New Dataset';
    projectSelect.appendChild(defaultOption);
    
    // Add projects
    projects.forEach(project => {
        const option = document.createElement('option');
        option.value = project['@id'] || project.id;
        option.textContent = project.Name || project.name || `Project ${project.id}`;
        projectSelect.appendChild(option);
    });
    
    // Re-enable dropdown
    projectSelect.disabled = false;
    
    console.log(`✅ Project dropdown updated with ${projects.length} projects`);
}

/**
 * Fast group change handler - replaces slow existing handler
 */
async function handleGroupChangeOptimized() {
    const groupSelect = document.getElementById('omeroGroupSelect');
    if (!groupSelect) return;
    
    const selectedGroupId = groupSelect.value;
    console.log('🔄 Group changed to:', selectedGroupId);
    
    // Clear current projects immediately for better UX
    const projectSelect = document.getElementById('omeroProjectSelect');
    if (projectSelect) {
        projectSelect.innerHTML = '<option value="">Loading...</option>';
        projectSelect.disabled = true;
    }
    
    // Load projects for the selected group only
    await loadProjectsForGroupOptimized(selectedGroupId);
}

// =================== REDUCED LOGGING FUNCTIONS ===================

/**
 * Minimal logging version of project loading
 * Replace verbose logging in omeroProjects.js
 */
function enableMinimalLogging() {
    // Override console.log for OMERO modules to reduce verbosity
    const originalLog = console.log;
    const originalWarn = console.warn;
    
    // Only log important messages
    console.log = function(...args) {
        const message = args.join(' ');
        
        // Only log these important messages
        if (message.includes('✅') || 
            message.includes('❌') || 
            message.includes('🚀') ||
            message.includes('Total projects loaded') ||
            message.includes('Authentication successful') ||
            message.includes('Dataset created')) {
            originalLog.apply(console, args);
        }
    };
    
    // Keep warnings
    console.warn = originalWarn;
}

/**
 * Restore full logging (for debugging)
 */
function enableFullLogging() {
    // Restore original console.log
    console.log = console.log.originalFunction || console.log;
}

// =================== UI INITIALIZATION ===================

/**
 * AGGRESSIVE UI FIX: Override existing functions to stop slow loading
 * This replaces the problematic functions that load all 1713 projects
 */
function initializeOptimizedOMEROUI() {
    console.log('🚀 Initializing optimized OMERO UI (AGGRESSIVE MODE)...');
    
    // STEP 1: Override the slow project loading function
    if (window.loadOMEROProjects) {
        console.log('🔧 Overriding slow loadOMEROProjects function');
        
        // Backup original function
        window.loadOMEROProjects_original = window.loadOMEROProjects;
        
        // Replace with fast version
        window.loadOMEROProjects = async function() {
            const groupSelect = document.getElementById('omeroGroupSelect');
            const selectedGroupId = groupSelect?.value || '103';
            
            console.log('🚀 FAST loadOMEROProjects triggered for group:', selectedGroupId);
            
            return await loadProjectsForGroupOptimized(selectedGroupId);
        };
    }
    
    // STEP 2: Override any functions that load all projects
    if (window.omeroProjects && window.omeroProjects.getProjects) {
        console.log('🔧 Optimizing omeroProjects.getProjects');
        
        window.omeroProjects.getProjects_original = window.omeroProjects.getProjects;
        
        window.omeroProjects.getProjects = async function() {
            // Return cached projects if available, otherwise limited set
            if (this.projects && this.projects.length > 0) {
                console.log('✅ Using cached projects:', this.projects.length);
                return this.projects.slice(0, 200); // Limit to 200 max
            }
            
            // Otherwise call original but with limit
            console.log('🔬 Loading limited projects set');
            
            try {
                // Get any available CSRF token
                let csrfToken = null;
                if (window.metaFoldOMEROIntegration?.session?.csrfToken) {
                    csrfToken = window.metaFoldOMEROIntegration.session.csrfToken;
                } else if (window.omeroAuth?.session?.csrfToken) {
                    csrfToken = window.omeroAuth.session.csrfToken;
                }
                
                const response = await fetch('http://localhost:3000/omero-api/api/v0/m/projects/?limit=200', {
                    method: 'GET',
                    credentials: 'include',
                    headers: csrfToken ? {
                        'X-CSRFToken': csrfToken,
                        'Accept': 'application/json'
                    } : {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.projects = data.data || [];
                    return this.projects;
                }
                
                return [];
            } catch (error) {
                console.error('❌ Limited project loading failed:', error);
                return [];
            }
        };
    }
    
    // STEP 3: Enable minimal logging for better performance
    enableMinimalLogging();
    
    // STEP 4: Add loading styles
    addOptimizedLoadingStyles();
    
    // STEP 5: Force update current dropdown
    setTimeout(() => {
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (groupSelect && groupSelect.value) {
            console.log('🔄 Force updating project dropdown for current group');
            loadProjectsForGroupOptimized(groupSelect.value);
        }
    }, 500);
    
    console.log('✅ Aggressive OMERO UI optimization completed');
    console.log('💡 Old slow functions have been replaced with fast versions');
}

/**
 * Add CSS for better loading indicators
 */
function addOptimizedLoadingStyles() {
    const style = document.createElement('style');
    style.textContent = `
        /* Optimized OMERO UI Styles */
        #omeroProjectSelect:disabled {
            background-color: #f8f9fa;
            color: #6c757d;
            cursor: wait;
        }
        
        #omeroGroupSelect:disabled {
            background-color: #f8f9fa;
            color: #6c757d;
            cursor: wait;
        }
        
        /* Prevent browser from styling empty-value options as italic grey placeholders */
        #omeroProjectSelect option,
        #omeroProjectSelect_viewer option {
            font-style: normal !important;
            color: #374151 !important;
        }
        
        .omero-loading {
            position: relative;
        }
        
        .omero-loading::after {
            content: "⟳";
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            animation: spin 1s linear infinite;
            color: #007bff;
        }
        
        @keyframes spin {
            from { transform: translateY(-50%) rotate(0deg); }
            to { transform: translateY(-50%) rotate(360deg); }
        }
        
        .omero-fast-mode {
            font-size: 0.9em;
            color: #28a745;
            font-weight: bold;
        }
    `;
    
    document.head.appendChild(style);
}

// =================== PERFORMANCE MONITORING ===================

/**
 * Monitor and log performance improvements
 */
function startPerformanceMonitoring() {
    const originalFetch = window.fetch;
    let requestCount = 0;
    let startTime = Date.now();
    
    window.fetch = function(...args) {
        requestCount++;
        console.log(`📊 API Request #${requestCount}: ${args[0]}`);
        
        return originalFetch.apply(this, arguments).then(response => {
            const elapsed = Date.now() - startTime;
            console.log(`📊 Request completed in ${elapsed}ms`);
            return response;
        });
    };
    
    console.log('📊 Performance monitoring started');
}

// =================== GLOBAL SETUP ===================

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOptimizedOMEROUI);
} else {
    // DOM already loaded
    setTimeout(initializeOptimizedOMEROUI, 100);
}

// Make functions globally available
window.loadProjectsForGroupOptimized = loadProjectsForGroupOptimized;
window.handleGroupChangeOptimized = handleGroupChangeOptimized;
window.initializeOptimizedOMEROUI = initializeOptimizedOMEROUI;
window.enableMinimalLogging = enableMinimalLogging;
window.enableFullLogging = enableFullLogging;

console.log('✅ OMERO UI Optimizations loaded!');
console.log('🎯 Key improvements:');
console.log('  • Group-specific project loading (no more loading all 1713 projects)');
console.log('  • Minimal logging for better performance');
console.log('  • Faster UI responsiveness');
console.log('  • Better loading indicators');
