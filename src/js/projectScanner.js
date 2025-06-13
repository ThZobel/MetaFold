// MetaFold Project Scanner - Frontend Module
// Scans directories for MetaFold projects and provides visualization

const projectScanner = {
    initialized: false,
    currentScannedPath: null,
    projects: [],
    filteredProjects: [],
    statistics: null,
    
    // UI state
    currentView: 'grid', // 'grid', 'list', 'tree'
    currentSort: { field: 'created', ascending: false },
    currentFilters: {},
    searchQuery: '',
    
    // Initialize the project scanner
    async init() {
        if (this.initialized) return;
        
        console.log('🔍 Initializing Project Scanner...');
        
        try {
            this.setupUI();
            this.setupEventHandlers();
            this.initialized = true;
            console.log('✅ Project Scanner initialized');
        } catch (error) {
            console.error('❌ Error initializing Project Scanner:', error);
        }
    },
    
    // Setup the basic UI structure
    setupUI() {
        // This will be called when the scanner is integrated into a tab
        console.log('🎨 Setting up Project Scanner UI...');
    },
    
    // Setup event handlers
    setupEventHandlers() {
        console.log('🔗 Setting up Project Scanner event handlers...');
    },
    
    // =================== CORE SCANNING FUNCTIONS ===================
    
    // Scan a directory for MetaFold projects
    async scanDirectory(directoryPath = null) {
        try {
            console.log('🔍 Starting project scan...');
            
            // If no path provided, show folder dialog
            if (!directoryPath) {
                directoryPath = await window.electronAPI.selectFolder();
                if (!directoryPath) {
                    console.log('📁 No directory selected');
                    return false;
                }
            }
            
            this.showScanningUI(directoryPath);
            
            // Perform the scan
            const result = await window.electronAPI.scanMetaFoldProjects(directoryPath, 5);
            
            if (result.success) {
                // FIXED: Normalize paths and ensure proper structure
                this.projects = result.projects.map(project => {
                    // Ensure proper path formatting
                    const normalizedPath = project.path.replace(/\//g, window.electronAPI.platform === 'win32' ? '\\' : '/');
                    
                    return {
                        ...project,
                        path: normalizedPath,
                        // Add additional safety checks
                        name: project.name || 'Unknown Project',
                        created: project.created || new Date().toISOString(),
                        size: project.size || 0,
                        metadataFieldCount: project.metadataFieldCount || 0
                    };
                });
                
                this.currentScannedPath = directoryPath;
                this.filteredProjects = [...this.projects];
                
                // Get statistics
                const statsResult = await window.electronAPI.getProjectsStatistics(this.projects);
                if (statsResult.success) {
                    this.statistics = statsResult.statistics;
                }
                
                console.log(`✅ Found ${this.projects.length} MetaFold projects`);
                console.log('📋 Project paths:', this.projects.map(p => p.path));
                
                this.renderResults();
                this.showSuccess(`Found ${this.projects.length} MetaFold projects in ${directoryPath}`);
                
                return true;
            } else {
                this.showError(`Scan failed: ${result.message}`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error scanning directory:', error);
            this.showError(`Error scanning directory: ${error.message}`);
            return false;
        } finally {
            this.hideScanningUI();
        }
    },
    
    // Rescan current directory
    async rescan() {
        if (this.currentScannedPath) {
            return await this.scanDirectory(this.currentScannedPath);
        } else {
            return await this.scanDirectory();
        }
    },
    
    // =================== FILTERING AND SEARCH ===================
    
    // Apply filters to projects
    applyFilters(filters = {}) {
        this.currentFilters = { ...filters };
        
        if (window.utils && window.utils.filterProjects) {
            this.filteredProjects = window.utils.filterProjects(this.projects, this.currentFilters);
        } else {
            // Fallback filtering
            this.filteredProjects = this.projects.filter(project => {
                if (filters.search) {
                    const searchTerm = filters.search.toLowerCase();
                    const projectText = `${project.name} ${project.path}`.toLowerCase();
                    if (!projectText.includes(searchTerm)) return false;
                }
                return true;
            });
        }
        
        this.renderResults();
        console.log(`🔍 Applied filters, showing ${this.filteredProjects.length}/${this.projects.length} projects`);
    },
    
    // Search projects
    searchProjects(query) {
        this.searchQuery = query;
        
        if (!query || query.trim() === '') {
            this.filteredProjects = [...this.projects];
        } else if (window.utils && window.utils.searchProjects) {
            this.filteredProjects = window.utils.searchProjects(this.projects, query);
        } else {
            // Fallback search
            const searchTerm = query.toLowerCase();
            this.filteredProjects = this.projects.filter(project => 
                project.name.toLowerCase().includes(searchTerm) ||
                project.path.toLowerCase().includes(searchTerm)
            );
        }
        
        this.renderResults();
        console.log(`🔍 Search "${query}" found ${this.filteredProjects.length} projects`);
    },
    
    // Sort projects
    sortProjects(field, ascending = true) {
        this.currentSort = { field, ascending };
        
        if (window.utils && window.utils.sortProjects) {
            this.filteredProjects = window.utils.sortProjects(this.filteredProjects, field, ascending);
        } else {
            // Fallback sorting
            this.filteredProjects.sort((a, b) => {
                let aVal = a[field];
                let bVal = b[field];
                
                if (field === 'created' || field === 'modified') {
                    aVal = new Date(aVal);
                    bVal = new Date(bVal);
                }
                
                if (aVal < bVal) return ascending ? -1 : 1;
                if (aVal > bVal) return ascending ? 1 : -1;
                return 0;
            });
        }
        
        this.renderResults();
    },
    
    // =================== UI RENDERING ===================
    
    // Show scanning UI
    showScanningUI(path) {
        const container = this.getContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="project-scanner-scanning">
                <div class="scanning-animation">
                    <div class="spinner"></div>
                    <h3>🔍 Scanning for MetaFold Projects...</h3>
                    <p>Searching in: <code>${path}</code></p>
                    <p>Looking for <code>elabftw-metadata.json</code> files...</p>
                </div>
            </div>
        `;
    },
    
    // Hide scanning UI
    hideScanningUI() {
        // This will be replaced by renderResults() or error state
    },
    
    // Render scan results
    renderResults() {
        const container = this.getContainer();
        if (!container) {
            console.warn('⚠️ Project Scanner container not found');
            return;
        }
        
        if (this.projects.length === 0) {
            this.renderEmptyState();
            return;
        }
        
        const html = `
            <div class="project-scanner-results">
                ${this.renderHeader()}
                ${this.renderControls()}
                ${this.renderStatistics()}
                ${this.renderProjectList()}
            </div>
        `;
        
        container.innerHTML = html;
        this.setupResultEventHandlers();
    },
    
    // Render header
    renderHeader() {
        return `
            <div class="scanner-header">
                <div class="header-info">
                    <h3>📊 MetaFold Projects</h3>
                    <p>Found <strong>${this.projects.length}</strong> projects in <code>${this.currentScannedPath}</code></p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-secondary" onclick="projectScanner.rescan()">
                        🔄 Rescan
                    </button>
                    <button class="btn btn-secondary" onclick="projectScanner.scanDirectory()">
                        📁 Change Directory
                    </button>
                </div>
            </div>
        `;
    },
    
    // Render controls (search, filter, sort)
    renderControls() {
        return `
            <div class="scanner-controls">
                <div class="search-controls">
                    <input type="text" 
                           id="projectSearch" 
                           placeholder="🔍 Search projects..." 
                           value="${this.searchQuery}"
                           onInput="projectScanner.handleSearch(this.value)">
                </div>
                
                <div class="view-controls">
                    <select id="sortSelect" onchange="projectScanner.handleSort(this.value)">
                        <option value="created">📅 Latest First</option>
                        <option value="name">📝 Name A-Z</option>
                        <option value="size">📏 Size</option>
                        <option value="fieldCount">📊 Field Count</option>
                    </select>
                    
                    <div class="view-toggle">
                        <button class="view-btn ${this.currentView === 'grid' ? 'active' : ''}" 
                                onclick="projectScanner.setView('grid')" title="Grid View">
                            ⊞
                        </button>
                        <button class="view-btn ${this.currentView === 'list' ? 'active' : ''}" 
                                onclick="projectScanner.setView('list')" title="List View">
                            ☰
                        </button>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Render statistics summary
    renderStatistics() {
        if (!this.statistics) return '';
        
        const stats = this.statistics;
        
        return `
            <div class="scanner-statistics">
                <div class="stat-item">
                    <span class="stat-value">${stats.totalProjects}</span>
                    <span class="stat-label">Projects</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.totalSizeFormatted || '0 B'}</span>
                    <span class="stat-label">Total Size</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round(stats.averageFieldCount || 0)}</span>
                    <span class="stat-label">Avg Fields</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${Math.round(stats.averageCompletionRate || 0)}%</span>
                    <span class="stat-label">Completion</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${stats.projectsWithReadme}</span>
                    <span class="stat-label">With README</span>
                </div>
            </div>
        `;
    },
    
    // Render project list
    renderProjectList() {
        if (this.filteredProjects.length === 0) {
            return `
                <div class="no-results">
                    <h4>No projects match your search</h4>
                    <p>Try adjusting your search terms or filters</p>
                </div>
            `;
        }
        
        const projectsHtml = this.filteredProjects.map(project => 
            this.renderProject(project)
        ).join('');
        
        return `
            <div class="projects-container ${this.currentView}">
                ${projectsHtml}
            </div>
        `;
    },
    
    // Render individual project
    renderProject(project) {
        const displayInfo = window.utils && window.utils.formatProjectForDisplay ? 
            window.utils.formatProjectForDisplay(project) : 
            { 
                name: project.name,
                displayName: project.name,
                icon: '📁'
            };
        
        const createdDate = new Date(project.created).toLocaleDateString();
        const size = project.size ? this.formatBytes(project.size) : 'Unknown';
        const fieldCount = project.metadataFieldCount || 0;
        
        // FIXED: Properly escape path for HTML attributes
        const escapedPath = project.path.replace(/\\/g, '\\\\').replace(/"/g, '&quot;');
        
        return `
            <div class="project-item" data-project-path="${escapedPath}">
                <div class="project-icon">${displayInfo.icon}</div>
                <div class="project-info">
                    <h4 class="project-name">${displayInfo.displayName}</h4>
                    <div class="project-meta">
                        <span class="project-date">📅 ${createdDate}</span>
                        <span class="project-size">📏 ${size}</span>
                        <span class="project-fields">📊 ${fieldCount} fields</span>
                        ${project.hasReadme ? '<span class="project-readme">📖 README</span>' : ''}
                    </div>
                    <div class="project-path" title="${project.path}">${project.path}</div>
                </div>
                <div class="project-actions">
                    <button class="btn btn-small" onclick="projectScanner.openProject('${escapedPath}')" title="Open in Explorer">
                        📂 Open
                    </button>
                    <button class="btn btn-small" onclick="projectScanner.viewProjectDetails('${escapedPath}')" title="View Details">
                        👁️ Details
                    </button>
                    <button class="btn btn-small" onclick="projectScanner.visualizeProject('${escapedPath}')" title="Visualize">
                        📊 Visualize
                    </button>
                </div>
            </div>
        `;
    },
    
    // Render empty state
    renderEmptyState() {
        const container = this.getContainer();
        if (!container) return;
        
        container.innerHTML = `
            <div class="project-scanner-empty">
                <div class="empty-icon">📁</div>
                <h3>No MetaFold Projects Found</h3>
                <p>No directories with <code>elabftw-metadata.json</code> files were found in the scanned location.</p>
                <div class="empty-actions">
                    <button class="btn" onclick="projectScanner.scanDirectory()">
                        📁 Choose Different Directory
                    </button>
                    <button class="btn btn-secondary" onclick="projectScanner.showCreateProjectHelp()">
                        ❓ How to Create Projects
                    </button>
                </div>
            </div>
        `;
    },
    
    // =================== EVENT HANDLERS ===================
    
    // Setup event handlers for results
    setupResultEventHandlers() {
        // Search input handler is set via onInput in the HTML
        
        // Double-click to open project
        const projectItems = document.querySelectorAll('.project-item');
        projectItems.forEach(item => {
            item.addEventListener('dblclick', () => {
                const projectPath = item.getAttribute('data-project-path');
                // FIXED: Unescape path for actual usage
                const unescapedPath = projectPath.replace(/\\\\/g, '\\').replace(/&quot;/g, '"');
                this.openProject(unescapedPath);
            });
        });
    },
    
    // Handle search input
    handleSearch(query) {
        this.searchProjects(query);
    },
    
    // Handle sort change
    handleSort(sortValue) {
        const [field, direction] = sortValue.includes('_desc') ? 
            [sortValue.replace('_desc', ''), false] : 
            [sortValue, true];
        
        // Special case for created date - newest first by default
        const ascending = field === 'created' ? false : true;
        
        this.sortProjects(field, ascending);
    },
    
    // Set view mode
    setView(viewMode) {
        this.currentView = viewMode;
        this.renderResults();
    },
    
    // =================== PROJECT ACTIONS ===================
    
    // Open project in file explorer
    async openProject(projectPath) {
        try {
            console.log('📂 Attempting to open project:', projectPath);
            
            // FIXED: Ensure proper path formatting for Windows
            let normalizedPath = projectPath;
            if (window.electronAPI.platform === 'win32') {
                // Ensure proper Windows path format
                normalizedPath = projectPath.replace(/\//g, '\\');
                // Remove any double backslashes
                normalizedPath = normalizedPath.replace(/\\\\/g, '\\');
            }
            
            console.log('📂 Normalized path:', normalizedPath);
            
            const result = await window.electronAPI.openFolder(normalizedPath);
            if (result.success) {
                console.log(`📂 Successfully opened project: ${normalizedPath}`);
            } else {
                this.showError(`Failed to open project: ${result.message || 'Unknown error'}`);
                console.error('📂 Failed to open project:', result);
            }
        } catch (error) {
            console.error('❌ Error opening project:', error);
            this.showError(`Error opening project: ${error.message}`);
        }
    },
    
    // View detailed project information
    async viewProjectDetails(projectPath) {
        try {
            console.log('👁️ Getting project details for:', projectPath);
            
            // FIXED: Ensure proper path formatting
            let normalizedPath = projectPath;
            if (window.electronAPI.platform === 'win32') {
                normalizedPath = projectPath.replace(/\//g, '\\').replace(/\\\\/g, '\\');
            }
            
            const result = await window.electronAPI.getProjectDetails(normalizedPath);
            if (result.success) {
                this.showProjectDetailsModal(result.details);
            } else {
                this.showError(`Failed to get project details: ${result.message}`);
                console.error('👁️ Project details error:', result);
            }
        } catch (error) {
            console.error('❌ Error getting project details:', error);
            this.showError(`Error getting project details: ${error.message}`);
        }
    },
    
    // Visualize project metadata
    visualizeProject(projectPath) {
        console.log('📊 Visualizing project:', projectPath);
        
        const project = this.projects.find(p => p.path === projectPath);
        if (project && window.visualizationManager) {
            // Switch to visualize tab and load project data
            if (window.switchMainTab) {
                window.switchMainTab('visualize');
            }
            
            // Load project metadata into visualizer
            setTimeout(() => {
                if (window.visualizationManager.renderVisualization) {
                    window.visualizationManager.renderVisualization(project.metadata);
                } else {
                    console.warn('⚠️ visualizationManager.renderVisualization not available');
                }
            }, 200);
        } else {
            if (!project) {
                this.showError('Project not found in current scan results');
            } else if (!window.visualizationManager) {
                this.showError('Visualization manager not available');
            }
        }
    },
    
    // =================== UTILITY FUNCTIONS ===================
    
    // Get scanner container element
    getContainer() {
        return document.getElementById('projectScannerContainer') || 
               document.getElementById('visualizationContent');
    },
    
    // Format bytes
    formatBytes(bytes) {
        if (window.utils && window.utils.formatBytes) {
            return window.utils.formatBytes(bytes);
        }
        
        // Fallback
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },
    
    // Show success message
    showSuccess(message) {
        console.log('✅', message);
        if (window.projectManager && window.projectManager.showSuccess) {
            window.projectManager.showSuccess(message);
        } else if (window.showSuccess) {
            window.showSuccess(message);
        }
    },
    
    // Show error message
    showError(message) {
        console.error('❌', message);
        if (window.projectManager && window.projectManager.showError) {
            window.projectManager.showError(message);
        } else if (window.showError) {
            window.showError(message);
        } else {
            alert(`Error: ${message}`);
        }
    },
    
    // Show project details modal
    showProjectDetailsModal(project) {
        const details = `
Project Details:

Name: ${project.name}
Path: ${project.path}
Created: ${new Date(project.created).toLocaleString()}
Size: ${this.formatBytes(project.size)}
Metadata Fields: ${project.metadataFieldCount}
Files: ${project.fileCount || 'Unknown'}
Directories: ${project.directoryCount || 'Unknown'}
Has README: ${project.hasReadme ? 'Yes' : 'No'}
${project.hasNestedProjects ? '\nContains nested projects' : ''}
        `.trim();
        
        alert(details);
    },
    
    // Show help for creating projects
    showCreateProjectHelp() {
        alert('To create MetaFold projects:\n\n1. Go to the "Create Project" tab\n2. Select an experiment template\n3. Fill in metadata\n4. Click "Create Project"\n\nThis will create a project with elabftw-metadata.json that can be discovered by the scanner.');
    }
};

// Make globally available
window.projectScanner = projectScanner;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => projectScanner.init(), 100);
    });
} else {
    setTimeout(() => projectScanner.init(), 100);
}