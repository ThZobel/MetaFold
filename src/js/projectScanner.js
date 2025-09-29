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
                        🔍 Change Directory
                    </button>
                    <!-- NEW: Export Button -->
                    <button class="btn btn-primary" onclick="projectScanner.exportScanResults()" style="margin-left: 10px;">
                        💾 Export Summary
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
    },

    // Export scanned projects as HTML and JSON summary
async exportScanResults() {
    try {
        console.log('💾 Starting export of scanned projects...');
        
        if (!this.projects || this.projects.length === 0) {
            this.showError('No projects to export. Please scan a directory first.');
            return;
        }
        
        // Show export dialog to select location
        const exportPath = await window.electronAPI.selectFolder('Select folder to save export files');
        if (!exportPath) {
            console.log('🚫 Export cancelled by user');
            return;
        }
        
        // Generate export data
        const exportData = this.prepareExportData();
        
        // Create HTML summary with external CSS reference
        const htmlContent = this.generateProjectSummaryHTML(exportData);
        const htmlFilename = `MetaFold-Projects-Summary-${this.getTimestamp()}.html`;
        
        // Create JSON summary
        const jsonContent = JSON.stringify(exportData, null, 2);
        const jsonFilename = `MetaFold-Projects-Data-${this.getTimestamp()}.json`;
        
        // Copy CSS file to export directory for standalone HTML
        await this.copyExportCSS(exportPath);
        
        // Write files using electronAPI
    const htmlResult = await window.electronAPI.writeFile(
        await window.utils.joinPath(exportPath, htmlFilename),
        htmlContent
    );

    const jsonResult = await window.electronAPI.writeFile(
        await window.utils.joinPath(exportPath, jsonFilename),
        jsonContent
    );
        
        if (htmlResult.success && jsonResult.success) {
            this.showSuccess(`✅ Export completed successfully!

            📄 HTML: ${htmlFilename}
            📊 JSON: ${jsonFilename}
            🎨 CSS: projectScanner-export.css

            📁 Location: ${exportPath}

            💡 The HTML file includes interactive features and is self-contained with the CSS file.`);

        } else {
            this.showError(`Export failed:
${htmlResult.message || ''}
${jsonResult.message || ''}`);
        }
        
    } catch (error) {
        console.error('⚠️ Error exporting scan results:', error);
        this.showError(`Export failed: ${error.message}`);
    }
},

async copyExportCSS(exportPath) {
    try {
        // Path to source CSS file
        const appPath = await window.electronAPI.getAppPath();
        const cssSourcePath = await window.utils.joinPath(
            appPath, 
            'css', 
            'projectScanner-export.css'
        );

        // Destination path
        const cssDestPath = await window.utils.joinPath(exportPath, 'css');
        const cssDestFile = await window.utils.joinPath(cssDestPath, 'projectScanner-export.css');
        
        // Create css directory if it doesn't exist
        await window.electronAPI.ensureDir(cssDestPath);
        
        // Copy CSS file
        await window.electronAPI.copyFile(cssSourcePath, cssDestFile);
        
        console.log('🎨 CSS file copied to export directory');
        
    } catch (error) {
        console.warn('⚠️ Could not copy CSS file:', error.message);
        // Continue with export even if CSS copy fails
    }
},
    // Prepare comprehensive export data structure
    prepareExportData() {
        console.log('📊 Preparing export data structure...');
        
        const exportData = {
            exportInfo: {
                timestamp: new Date().toISOString(),
                exportedBy: 'MetaFold Project Scanner',
                version: '1.1.0',
                scannedPath: this.currentScannedPath,
                totalProjects: this.projects.length
            },
            scanStatistics: this.statistics || {},
            directoryTree: this.buildDirectoryTree(),
            projects: this.projects.map(project => this.enrichProjectForExport(project)),
            aggregatedMetadata: this.analyzeAggregatedMetadata(),
            projectRelationships: this.analyzeProjectDependencies()
        };
        
        console.log('✅ Export data prepared:', exportData);
        return exportData;
    },

    // Build directory tree structure with nested projects
    buildDirectoryTree() {
        console.log('🌳 Building directory tree structure...');
        
        const tree = {
            rootPath: this.currentScannedPath,
            structure: {}
        };
        
        // Group projects by their directory path
        this.projects.forEach(project => {
            const relativePath = project.path.replace(this.currentScannedPath, '').replace(/^[\\\/]/, '');
            const pathParts = relativePath.split(/[\\\/]/);
            
            let current = tree.structure;
            let fullPath = this.currentScannedPath;
            
            pathParts.forEach(async (part, index) => {
                fullPath = window.utils && window.utils.joinPath ? 
                    await window.utils.joinPath(fullPath, part) : 
                    `${fullPath}/${part}`;

                if (!current[part]) {
                    current[part] = {
                        type: index === pathParts.length - 1 ? 'project' : 'directory',
                        fullPath: fullPath,
                        children: {},
                        project: index === pathParts.length - 1 ? project : null
                    };
                }
                current = current[part].children;
            });
        });
        
        return tree;
    },

    // Enrich project data for export
    enrichProjectForExport(project) {
        return {
            ...project,
            exportEnhancements: {
                metadataFieldNames: Object.keys(project.metadata || {}),
                hasReadme: project.hasReadme || false,
                complexity: this.calculateProjectComplexity(project),
                completeness: this.calculateProjectCompleteness(project)
            },
            // Keep original metadata structure for AI searchability
            originalMetadata: project.metadata,
            // Add flattened version for easy searching
            flattenedMetadata: this.flattenMetadata(project.metadata || {})
        };
    },

    // Analyze aggregated metadata patterns
    analyzeAggregatedMetadata() {
        const analysis = {
            totalFields: 0,
            fieldFrequency: {},
            fieldTypes: {},
            commonValues: {},
            uniqueFields: new Set()
        };
        
        this.projects.forEach(project => {
            if (project.metadata) {
                Object.entries(project.metadata).forEach(([fieldName, fieldData]) => {
                    analysis.uniqueFields.add(fieldName);
                    analysis.fieldFrequency[fieldName] = (analysis.fieldFrequency[fieldName] || 0) + 1;
                    
                    if (fieldData.type) {
                        analysis.fieldTypes[fieldData.type] = (analysis.fieldTypes[fieldData.type] || 0) + 1;
                    }
                    
                    if (fieldData.value) {
                        const key = `${fieldName}:${fieldData.value}`;
                        analysis.commonValues[key] = (analysis.commonValues[key] || 0) + 1;
                    }
                });
            }
        });
        
        analysis.totalFields = analysis.uniqueFields.size;
        analysis.uniqueFields = Array.from(analysis.uniqueFields);
        
        return analysis;
    },

    // Analyze project dependencies and relationships
    analyzeProjectDependencies() {
        const relationships = {
            nestedProjects: [],
            sharedPaths: [],
            potentialDuplicates: []
        };
        
        // Find nested projects
        this.projects.forEach((project, index) => {
            this.projects.forEach((otherProject, otherIndex) => {
                if (index !== otherIndex && otherProject.path.startsWith(project.path)) {
                    relationships.nestedProjects.push({
                        parent: project.name,
                        parentPath: project.path,
                        child: otherProject.name,
                        childPath: otherProject.path
                    });
                }
            });
        });
        
        return relationships;
    },

    // Calculate project complexity score
    calculateProjectComplexity(project) {
        let score = 0;
        
        // Metadata complexity
        if (project.metadata) {
            score += Object.keys(project.metadata).length * 2;
        }
        
        // Size factor
        if (project.size) {
            score += Math.log10(project.size / 1024 / 1024) || 0; // MB scale
        }
        
        // File count factor
        if (project.fileCount) {
            score += Math.log10(project.fileCount) * 3 || 0;
        }
        
        return Math.round(Math.max(score, 1));
    },

    // Calculate project completeness score
    calculateProjectCompleteness(project) {
        let score = 0;
        let maxScore = 10;
        
        // Has metadata
        if (project.metadata && Object.keys(project.metadata).length > 0) {
            score += 4;
        }
        
        // Has README
        if (project.hasReadme) {
            score += 2;
        }
        
        // Has filled metadata fields
        if (project.metadata) {
            const filledFields = Object.values(project.metadata).filter(field => 
                field.value && field.value.toString().trim() !== ''
            ).length;
            const totalFields = Object.keys(project.metadata).length;
            
            if (totalFields > 0) {
                score += Math.round((filledFields / totalFields) * 4);
            }
        }
        
        return Math.round((score / maxScore) * 100);
    },

    // Flatten nested metadata for easy searching
    flattenMetadata(metadata, prefix = '') {
        const flattened = {};
        
        Object.entries(metadata).forEach(([key, value]) => {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Recursively flatten nested objects
                Object.assign(flattened, this.flattenMetadata(value, newKey));
            } else {
                // Store the actual value for searching
                flattened[newKey] = typeof value === 'object' ? value.value : value;
            }
        });
        
        return flattened;
    },

    // Generate comprehensive HTML summary
    generateProjectSummaryHTML(exportData) {
        console.log('📄 Generating project navigator with inline CSS...');
        
        const timestamp = new Date().toLocaleString();
        
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MetaFold Projects Navigator - ${timestamp}</title>
        <style>
            ${this.generateNavigatorCSS()}
        </style>
    </head>
    <body>
        <div class="navigator-container">
            <!-- Left Navigation Panel -->
            <div class="nav-panel">
                ${this.generateNavigationPanel(exportData)}
            </div>

            <!-- Right Content Panel -->
            <div class="content-panel">
                <div id="welcome-screen" class="welcome-screen">
                    <h1>🔬 MetaFold Projects Navigator</h1>
                    <p>Found <strong>${exportData.exportInfo.totalProjects}</strong> projects in your laboratory directory.</p>
                    <p>Select a project from the left panel to view its detailed README with experiment metadata.</p>
                    <div class="export-info">
                        <div><strong>Scanned Path:</strong> <code>${exportData.exportInfo.scannedPath}</code></div>
                        <div><strong>Generated:</strong> ${timestamp}</div>
                        <div><strong>Scanner Version:</strong> ${exportData.exportInfo.version}</div>
                    </div>
                </div>
                
                <!-- Loading overlay -->
                <div id="loading-overlay" class="loading-overlay">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading project README...</div>
                </div>
                
                <iframe id="project-frame" class="project-frame" style="display: none;"></iframe>
            </div>
        </div>

        <script>
            ${this.generateNavigationScript(exportData)}
        </script>
    </body>
    </html>`;
    },

// Generate sidebar with project tree
generateSidebar(exportData) {
    return `
        <div class="sidebar-header">
            <div class="sidebar-title">🔬 MetaFold</div>
            <div class="sidebar-subtitle">Projects Explorer</div>
        </div>
        
        <div class="sidebar-stats">
            <div class="stat-number">${exportData.exportInfo.totalProjects}</div>
            <div class="stat-label">Projects Found</div>
        </div>
        
        <div class="project-tree">
            <div class="tree-section">
                <div class="tree-section-title">📊 Overview</div>
                <div class="tree-node">
                    <div class="tree-node-header" onclick="showContent('overview-content')" id="nav-overview">
                        <span class="tree-node-icon">📈</span>
                        <span class="tree-node-name">Project Summary</span>
                    </div>
                </div>
            </div>
            
            <div class="tree-section">
                <div class="tree-section-title">🗂️ Projects</div>
                ${this.generateProjectTree(exportData.projects)}
            </div>
        </div>
    `;
},

// Generate project tree structure
generateProjectTree(projects) {
    return projects.map(project => {
        const sanitizedId = this.sanitizeId(project.name);
        const fieldCount = project.metadataFieldCount || 0;
        const completeness = project.exportEnhancements?.completeness || 0;
        
        return `
            <div class="tree-node tree-project-node">
                <div class="tree-node-header" onclick="showContent('project-${sanitizedId}')" id="nav-project-${sanitizedId}">
                    <span class="tree-node-icon">🔬</span>
                    <span class="tree-node-name">${project.name}</span>
                    <span class="project-meta-info">${fieldCount} fields</span>
                </div>
            </div>
        `;
    }).join('');
},

// Generate overview content (default view)
generateOverviewContent(exportData) {
    return `
        <div class="project-content-header">
            <h1 class="project-content-title">🔬 MetaFold Projects</h1>
            <p class="project-content-subtitle">Laboratory Data Management & Discovery</p>
        </div>
        
        <div class="content-main">
            <div class="overview-section">
                <h2 class="overview-title">Projects Overview</h2>
                <p class="overview-description">
                    Discovered ${exportData.exportInfo.totalProjects} MetaFold projects in your laboratory directory.
                    Navigate through the projects using the sidebar to explore detailed metadata and experiment information.
                </p>
                
                <div class="overview-stats">
                    <div class="overview-stat-card">
                        <div class="overview-stat-number">${exportData.exportInfo.totalProjects}</div>
                        <div class="overview-stat-label">Total Projects</div>
                    </div>
                    <div class="overview-stat-card">
                        <div class="overview-stat-number">${this.countUniqueFields(exportData.projects)}</div>
                        <div class="overview-stat-label">Unique Fields</div>
                    </div>
                    <div class="overview-stat-card">
                        <div class="overview-stat-number">${this.countProjectsWithReadme(exportData.projects)}</div>
                        <div class="overview-stat-label">With README</div>
                    </div>
                    <div class="overview-stat-card">
                        <div class="overview-stat-number">${this.calculateAverageCompletion(exportData.projects)}%</div>
                        <div class="overview-stat-label">Avg Completion</div>
                    </div>
                </div>
            </div>
            
            <div class="content-section">
                <h2 class="section-title">
                    <span class="section-icon">📍</span>
                    Scanned Location
                </h2>
                <div class="metadata-item">
                    <div class="metadata-label">Directory Path</div>
                    <div class="metadata-value">${exportData.exportInfo.scannedPath}</div>
                    <div class="metadata-description">Root directory containing all discovered projects</div>
                </div>
            </div>
            
            <div class="content-section">
                <h2 class="section-title">
                    <span class="section-icon">⏰</span>
                    Export Information
                </h2>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <div class="metadata-label">Generated</div>
                        <div class="metadata-value">${new Date(exportData.exportInfo.timestamp).toLocaleString()}</div>
                        <div class="metadata-description">Export timestamp</div>
                    </div>
                    <div class="metadata-item">
                        <div class="metadata-label">Version</div>
                        <div class="metadata-value">${exportData.exportInfo.version}</div>
                        <div class="metadata-description">MetaFold scanner version</div>
                    </div>
                </div>
            </div>
        </div>
    `;
},

// Generate individual project content (README.html style)
generateProjectContent(project) {
    const hasIntegrations = project.metadata && (project.metadata.elabftw?.value || project.metadata.metafold_integration?.value);
    
    return `
        <div class="project-content-header">
            <h1 class="project-content-title">🧬 ${project.name}</h1>
            <p class="project-content-subtitle">MetaFold Laboratory Project</p>
        </div>
        
        <div class="content-main">
            ${hasIntegrations ? this.generateIntegrationsSection(project) : ''}
            
            <div class="content-section">
                <h2 class="section-title">
                    <span class="section-icon">📊</span>
                    Experiment Metadata
                </h2>
                ${this.generateProjectMetadata(project)}
            </div>
            
            <div class="content-section">
                <h2 class="section-title">
                    <span class="section-icon">📍</span>
                    Project Information
                </h2>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <div class="metadata-label">Created</div>
                        <div class="metadata-value">${new Date(project.created).toLocaleString()}</div>
                        <div class="metadata-description">Project creation timestamp</div>
                    </div>
                    <div class="metadata-item">
                        <div class="metadata-label">Location</div>
                        <div class="metadata-value" style="font-family: monospace; word-break: break-all;">${project.path}</div>
                        <div class="metadata-description">Full project directory path</div>
                    </div>
                    <div class="metadata-item">
                        <div class="metadata-label">Size</div>
                        <div class="metadata-value">${this.formatBytes(project.size || 0)}</div>
                        <div class="metadata-description">Total project size on disk</div>
                    </div>
                    <div class="metadata-item">
                        <div class="metadata-label">Metadata Fields</div>
                        <div class="metadata-value">${project.metadataFieldCount || 0}</div>
                        <div class="metadata-description">Number of configured metadata fields</div>
                    </div>
                </div>
            </div>
            
            <!-- Editable sections like in README.html -->
            <div class="content-section" style="background: linear-gradient(135deg, rgba(234, 88, 12, 0.1), rgba(220, 38, 38, 0.05)); border: 1px solid rgba(234, 88, 12, 0.2); border-left: 4px solid #ea580c;">
                <h2 class="section-title">
                    <span class="section-icon">📝</span>
                    Project Description
                </h2>
                <div style="color: #9ca3af; font-style: italic; background: rgba(0, 0, 0, 0.2); padding: 15px; border-radius: 8px; border: 1px dashed rgba(255, 255, 255, 0.2); min-height: 60px; display: flex; align-items: center; justify-content: center;">
                    This section can be edited in the original project README.html file to add detailed project descriptions, methodology, and results.
                </div>
            </div>
        </div>
    `;
},

// Generate integrations section if available
generateIntegrationsSection(project) {
    const elabLink = project.metadata?.elabftw?.value;
    const omeroLink = project.metadata?.metafold_integration?.value;
    
    if (!elabLink && !omeroLink) return '';
    
    return `
        <div class="content-section integration-section">
            <h2 class="section-title">
                <span class="section-icon">🔗</span>
                Integration Links
            </h2>
            <div class="integration-links">
                ${elabLink ? `
                    <a href="${elabLink}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">🧪</span>
                        <span class="link-text">Open in elabFTW</span>
                    </a>
                ` : ''}
                ${omeroLink ? `
                    <a href="${omeroLink}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">🔬</span>
                        <span class="link-text">Open in OMERO</span>
                    </a>
                ` : ''}
            </div>
        </div>
    `;
},

// Generate project metadata section
generateProjectMetadata(project) {
    if (!project.metadata || Object.keys(project.metadata).length === 0) {
        return `
            <div style="text-align: center; color: #9ca3af; font-style: italic; padding: 30px; background: rgba(0, 0, 0, 0.2); border-radius: 10px;">
                No metadata available for this project. Use the MetaFold app to add experiment metadata.
            </div>
        `;
    }
    
    return `
        <div class="metadata-grid">
            ${Object.entries(project.metadata)
                .filter(([key]) => !['elabftw', 'metafold_integration', 'extra_fields'].includes(key))
                .map(([key, field]) => {
                    const value = field.value || field;
                    const type = field.type || 'text';
                    const description = this.getFieldDescription(key);
                    
                    return `
                        <div class="metadata-item">
                            <div class="metadata-label">${this.formatFieldName(key)}</div>
                            <div class="metadata-value">${value || '<em>Not filled</em>'}</div>
                            ${description ? `<div class="metadata-description">${description}</div>` : ''}
                        </div>
                    `;
                }).join('')}
        </div>
    `;
},

// Generate interactive JavaScript
generateInteractiveScript() {
    return `
        // Navigation functionality
        function showContent(contentId) {
            // Hide all content views
            document.querySelectorAll('.content-view').forEach(view => {
                view.classList.remove('active');
                view.style.display = 'none';
            });
            
            // Show selected content
            const selectedContent = document.getElementById(contentId);
            if (selectedContent) {
                selectedContent.classList.add('active');
                selectedContent.style.display = 'block';
            }
            
            // Update navigation styling
            document.querySelectorAll('.tree-node-header').forEach(header => {
                header.parentElement.classList.remove('selected');
            });
            
            const selectedNav = document.getElementById('nav-' + contentId.replace('project-', 'project-'));
            if (selectedNav) {
                selectedNav.parentElement.classList.add('selected');
            } else if (contentId === 'overview-content') {
                document.getElementById('nav-overview').parentElement.classList.add('selected');
            }
            
            // Scroll to top of content
            document.querySelector('.main-content').scrollTop = 0;
        }
        
        // Initialize - show overview by default
        document.addEventListener('DOMContentLoaded', function() {
            showContent('overview-content');
            
            // Add smooth transitions
            const style = document.createElement('style');
            style.textContent = \`
                .content-view {
                    display: none;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .content-view.active {
                    display: block !important;
                    opacity: 1;
                }
            \`;
            document.head.appendChild(style);
        });
    `;
},

// Helper functions
sanitizeId(name) {
    return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
},

countUniqueFields(projects) {
    const allFields = new Set();
    projects.forEach(project => {
        if (project.metadata) {
            Object.keys(project.metadata).forEach(field => allFields.add(field));
        }
    });
    return allFields.size;
},

countProjectsWithReadme(projects) {
    return projects.filter(project => project.hasReadme).length;
},

calculateAverageCompletion(projects) {
    if (projects.length === 0) return 0;
    const total = projects.reduce((sum, project) => 
        sum + (project.exportEnhancements?.completeness || 0), 0);
    return Math.round(total / projects.length);
},

formatFieldName(key) {
    return key.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
},

getFieldDescription(key) {
    const descriptions = {
        'mode': 'Microscopy acquisition mode',
        'laser_lines': 'Used laser wavelengths (multiple values separated by comma)',
        'dyes': 'Used fluorescent dyes (multiple values separated by comma)',
        'fluorescent_proteins': 'Used fluorescent proteins (multiple values separated by comma)',
        'organism': 'Source organism',
        'cell_type': 'Type of cells being imaged',
        'organism_part': 'Specific part of organism',
        'fixation': 'Sample fixation status',
        'sample_type': 'Type of sample preparation',
        'sample_description': 'Detailed description of the sample',
        'imaging_purpose': 'Purpose and goals of the imaging experiment'
    };
    return descriptions[key] || null;
},

    // Get timestamp for filenames
    getTimestamp() {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
    },


// Render scan statistics
renderScanStatistics(exportData) {
    const stats = exportData.scanStatistics;
    
    return `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${exportData.exportInfo.totalProjects}</div>
                <div class="stat-label">Total Projects</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${exportData.aggregatedMetadata.totalFields}</div>
                <div class="stat-label">Unique Metadata Fields</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Object.keys(exportData.aggregatedMetadata.fieldTypes).length}</div>
                <div class="stat-label">Field Types</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${exportData.projects.filter(p => p.hasReadme).length}</div>
                <div class="stat-label">Projects with README</div>
            </div>
        </div>
        
        <div class="scan-path-info">
            <h3>📁 Scanned Location</h3>
            <div class="path-display">
                <code>${exportData.exportInfo.scannedPath}</code>
                <span class="path-type">(Root Directory)</span>
            </div>
        </div>
    `;
},

// Render interactive directory tree
renderDirectoryTree(directoryTree) {
    return `
        <div class="directory-tree">
            <div class="tree-info">
                <p>Interactive directory structure showing all discovered MetaFold projects:</p>
            </div>
            <div class="tree-container">
                ${this.renderTreeNode(directoryTree.structure, directoryTree.rootPath, 0)}
            </div>
        </div>
    `;
},

// Render individual tree node (recursive)
renderTreeNode(node, currentPath, depth) {
    let html = '';
    
    Object.entries(node).forEach(([name, nodeData]) => {
        const hasChildren = Object.keys(nodeData.children).length > 0;
        const isProject = nodeData.type === 'project';
        const indent = '  '.repeat(depth);
        
        html += `
            <div class="tree-node ${isProject ? 'project-node' : 'directory-node'}" style="margin-left: ${depth * 20}px;">
                <div class="tree-node-header">
                    ${hasChildren ? '<span class="tree-node-toggle">▼</span>' : '<span class="tree-node-spacer">  </span>'}
                    <span class="tree-node-icon">${isProject ? '📁🔬' : '📁'}</span>
                    <span class="tree-node-name">${name}</span>
                    ${isProject ? `<span class="project-badge">MetaFold Project</span>` : ''}
                </div>
                
                ${isProject ? this.renderProjectInTree(nodeData.project) : ''}
                
                ${hasChildren ? `
                    <div class="tree-node-children">
                        ${this.renderTreeNode(nodeData.children, nodeData.fullPath, depth + 1)}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    return html;
},

// Render project details within tree
renderProjectInTree(project) {
    const metadataCount = project.metadata ? Object.keys(project.metadata).length : 0;
    
    return `
        <div class="project-details">
            <div class="project-meta">
                <span class="meta-item">📅 ${new Date(project.created).toLocaleDateString()}</span>
                <span class="meta-item">📊 ${metadataCount} fields</span>
                <span class="meta-item">💾 ${this.formatBytes(project.size)}</span>
                ${project.hasReadme ? '<span class="meta-item">📖 README</span>' : ''}
            </div>
            
            ${metadataCount > 0 ? `
                <div class="metadata-preview">
                    <strong>🔍 Metadata Preview:</strong>
                    <ul class="metadata-fields">
                        ${Object.entries(project.metadata).slice(0, 3).map(([key, field]) => `
                            <li><strong>${key}:</strong> ${field.value || '(empty)'}</li>
                        `).join('')}
                        ${metadataCount > 3 ? `<li class="more-fields">... and ${metadataCount - 3} more fields</li>` : ''}
                    </ul>
                </div>
            ` : '<div class="no-metadata">No metadata available</div>'}
            
            <div class="project-path">
                <small>📂 ${project.path}</small>
            </div>
        </div>
    `;
},

// Render detailed projects list
renderProjectsList(projects) {
    const sortedProjects = [...projects].sort((a, b) => new Date(b.created) - new Date(a.created));
    
    return `
        <div class="projects-list">
            <div class="list-header">
                <p>Detailed view of all ${projects.length} discovered MetaFold projects:</p>
            </div>
            
            <div class="projects-grid">
                ${sortedProjects.map((project, index) => `
                    <div class="project-card" id="project-${index}">
                        <div class="project-header">
                            <h3 class="project-name">🔬 ${project.name}</h3>
                            <div class="project-badges">
                                ${project.hasReadme ? '<span class="badge readme-badge">📖 README</span>' : ''}
                                <span class="badge complexity-badge">⚡ Complexity: ${project.exportEnhancements.complexity}</span>
                                <span class="badge completeness-badge" style="background: ${this.getCompletnessColor(project.exportEnhancements.completeness)}">
                                    ✅ ${project.exportEnhancements.completeness}% Complete
                                </span>
                            </div>
                        </div>
                        
                        <div class="project-info">
                            <div class="info-row">
                                <span class="info-label">📅 Created:</span>
                                <span class="info-value">${new Date(project.created).toLocaleString()}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📁 Location:</span>
                                <span class="info-value path-value">${project.path}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">💾 Size:</span>
                                <span class="info-value">${this.formatBytes(project.size)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">📊 Metadata Fields:</span>
                                <span class="info-value">${project.metadataFieldCount || 0}</span>
                            </div>
                        </div>
                        
                        ${this.renderProjectMetadata(project)}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
},

// Render individual project metadata
renderProjectMetadata(project) {
    if (!project.metadata || Object.keys(project.metadata).length === 0) {
        return `
            <div class="project-metadata">
                <h4>📝 Metadata</h4>
                <div class="no-metadata">No metadata available for this project</div>
            </div>
        `;
    }
    
    return `
        <div class="project-metadata">
            <h4>📝 Metadata (${Object.keys(project.metadata).length} fields)</h4>
            <div class="metadata-table">
                ${Object.entries(project.metadata).map(([key, field]) => `
                    <div class="metadata-row">
                        <div class="metadata-key">${key}</div>
                        <div class="metadata-type">${field.type || 'text'}</div>
                        <div class="metadata-value">
                            ${field.value ? (field.value.length > 100 ? 
                                field.value.substring(0, 100) + '...' : 
                                field.value) : 
                                '<span class="empty-value">(empty)</span>'}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
},

// Render metadata analysis
renderMetadataAnalysis(analysis) {
    return `
        <div class="metadata-analysis">
            <div class="analysis-overview">
                <h3>📊 Metadata Overview</h3>
                <div class="analysis-stats">
                    <div class="analysis-stat">
                        <strong>${analysis.totalFields}</strong> unique field names discovered
                    </div>
                    <div class="analysis-stat">
                        <strong>${Object.keys(analysis.fieldTypes).length}</strong> different field types used
                    </div>
                </div>
            </div>
            
            <div class="analysis-details">
                <div class="analysis-section">
                    <h4>🔤 Most Common Fields</h4>
                    <div class="frequency-chart">
                        ${Object.entries(analysis.fieldFrequency)
                            .sort(([,a], [,b]) => b - a)
                            .slice(0, 10)
                            .map(([field, count]) => `
                                <div class="frequency-item">
                                    <div class="field-name">${field}</div>
                                    <div class="frequency-bar">
                                        <div class="frequency-fill" style="width: ${(count / Math.max(...Object.values(analysis.fieldFrequency))) * 100}%"></div>
                                    </div>
                                    <div class="frequency-count">${count} projects</div>
                                </div>
                            `).join('')}
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h4>📝 Field Types Distribution</h4>
                    <div class="type-distribution">
                        ${Object.entries(analysis.fieldTypes).map(([type, count]) => `
                            <div class="type-item">
                                <span class="type-badge">${type}</span>
                                <span class="type-count">${count} fields</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="analysis-section">
                    <h4>📋 All Unique Fields</h4>
                    <div class="all-fields">
                        ${analysis.uniqueFields.sort().map(field => `
                            <span class="field-tag">${field}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
},

// Get color for completeness percentage
getCompletnessColor(percentage) {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 60) return '#f59e0b'; // Yellow
    if (percentage >= 40) return '#f97316'; // Orange
    return '#ef4444'; // Red
},


// Generate CSS inline (genau wie README.html)
generateNavigatorCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
            color: #e0e0e0;
            height: 100vh;
            overflow: hidden;
        }

        .navigator-container {
            display: flex;
            height: 100vh;
        }

        /* =================== NAVIGATION PANEL =================== */
        .nav-panel {
            width: 350px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 0 20px 20px 0;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }

        .nav-header {
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            padding: 25px;
            text-align: center;
            border-radius: 0 20px 0 0;
        }

        .nav-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        }

        .nav-subtitle {
            font-size: 0.95rem;
            opacity: 0.9;
            font-weight: 300;
        }

        .project-count {
            margin-top: 10px;
            font-size: 0.9rem;
            background: rgba(255, 255, 255, 0.2);
            padding: 5px 15px;
            border-radius: 15px;
            display: inline-block;
            border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .nav-content {
            padding: 20px;
        }

        .nav-section {
            margin-bottom: 25px;
        }

        .nav-section-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #a855f7;
            margin-bottom: 12px;
            padding: 8px 12px;
            background: rgba(168, 85, 247, 0.1);
            border-radius: 8px;
            border: 1px solid rgba(168, 85, 247, 0.2);
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 4px;
            border: 1px solid transparent;
        }

        .nav-item:hover {
            background: rgba(255, 255, 255, 0.1);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateX(4px);
        }

        .nav-item.active {
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            color: white;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4);
            transform: translateX(6px);
        }

        .project-item {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(168, 85, 247, 0.05));
            border-left: 4px solid #7c3aed;
        }

        .project-item.has-readme:hover {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.1));
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.2);
        }

        .project-item.no-readme {
            opacity: 0.6;
            border-left-color: #6b7280;
            cursor: not-allowed;
            background: rgba(107, 114, 128, 0.1);
        }

        .project-item.no-readme:hover {
            background: rgba(107, 114, 128, 0.15);
            transform: none;
            box-shadow: none;
        }

        .nav-icon {
            font-size: 1.2rem;
            min-width: 24px;
            text-align: center;
        }

        .project-info {
            flex: 1;
        }

        .project-name {
            font-weight: 500;
            font-size: 0.95rem;
            line-height: 1.3;
        }

        .project-meta {
            font-size: 0.8rem;
            opacity: 0.7;
            margin-top: 2px;
        }

        .no-readme-badge {
            font-size: 0.7rem;
            background: #6b7280;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-weight: 500;
        }

        /* =================== CONTENT PANEL =================== */
        .content-panel {
            flex: 1;
            position: relative;
            background: rgba(255, 255, 255, 0.02);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .welcome-screen {
            padding: 60px 40px;
            text-align: center;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, rgba(26, 26, 46, 0.8), rgba(15, 52, 96, 0.4));
        }

        .welcome-screen h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #7c3aed, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 700;
            text-shadow: 0 2px 20px rgba(124, 58, 237, 0.3);
        }

        .welcome-screen p {
            font-size: 1.2rem;
            margin-bottom: 15px;
            color: #9ca3af;
            max-width: 600px;
            line-height: 1.6;
        }

        .export-info {
            margin-top: 30px;
            padding: 20px 25px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 15px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            max-width: 500px;
        }

        .export-info div {
            margin-bottom: 8px;
            font-size: 0.95rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .export-info strong {
            color: #a855f7;
            margin-right: 10px;
        }

        .project-frame {
            width: 100%;
            height: 100%;
            border: none;
            background: white;
            transition: opacity 0.3s ease;
        }

        /* =================== LOADING STATES =================== */
        .loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(26, 26, 46, 0.9);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }

        .loading-overlay.active {
            opacity: 1;
            pointer-events: all;
        }

        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(168, 85, 247, 0.3);
            border-top: 3px solid #a855f7;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .loading-text {
            color: #a855f7;
            font-size: 1.1rem;
            font-weight: 500;
        }

        /* =================== RESPONSIVE DESIGN =================== */
        @media (max-width: 1200px) {
            .nav-panel {
                width: 300px;
            }
        }

        @media (max-width: 768px) {
            .navigator-container {
                flex-direction: column;
            }
            
            .nav-panel {
                width: 100%;
                height: 40vh;
                border-radius: 0;
                border-right: none;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .nav-header {
                border-radius: 0;
                padding: 20px;
            }
            
            .nav-title {
                font-size: 1.3rem;
            }
            
            .nav-content {
                padding: 15px;
            }
            
            .content-panel {
                height: 60vh;
                border-left: none;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .welcome-screen {
                padding: 30px 20px;
            }
            
            .welcome-screen h1 {
                font-size: 2rem;
            }
            
            .welcome-screen p {
                font-size: 1rem;
            }
            
            .export-info {
                padding: 15px;
                margin-top: 20px;
            }
            
            .nav-item {
                padding: 8px 10px;
            }
            
            .project-info {
                min-width: 0;
            }
        }

        @media (max-width: 480px) {
            .nav-header {
                padding: 15px;
            }
            
            .nav-title {
                font-size: 1.2rem;
            }
            
            .project-count {
                font-size: 0.8rem;
                padding: 4px 12px;
            }
            
            .welcome-screen h1 {
                font-size: 1.8rem;
            }
            
            .welcome-screen {
                padding: 20px 15px;
            }
        }
    `;
},

// ENTFERNEN: copyExportCSS Funktion nicht mehr benötigt
// async copyExportCSS(exportPath) {
//     // NICHT MEHR NÖTIG: CSS ist jetzt inline
//     console.log('✅ CSS is inline - no external file needed');
// },

// Generate navigation panel
generateNavigationPanel(exportData) {
    return `
        <div class="nav-header">
            <div class="nav-title">🔬 MetaFold</div>
            <div class="nav-subtitle">Project Navigator</div>
            <div class="project-count">${exportData.exportInfo.totalProjects} Projects</div>
        </div>
        
        <div class="nav-content">
            <div class="nav-section">
                <div class="nav-section-title">📊 Overview</div>
                <div class="nav-item" onclick="showWelcomeScreen()">
                    <span class="nav-icon">📈</span>
                    <span class="nav-label">Project Summary</span>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">🗂️ Projects</div>
                <div class="project-list">
                    ${this.generateProjectList(exportData.projects)}
                </div>
            </div>
        </div>
    `;
},

// Generate project list in navigation
generateProjectList(projects) {
    return projects.map(project => {
        const readmePath = this.getReadmePath(project.path);
        const fieldCount = project.metadataFieldCount || 0;
        const hasReadme = project.hasReadme;
        const createdDate = new Date(project.created).toLocaleDateString();
        
        return `
            <div class="nav-item project-item ${hasReadme ? 'has-readme' : 'no-readme'}" 
                 onclick="loadProject('${this.escapeForJS(readmePath)}', '${this.escapeForJS(project.name)}')"
                 title="${hasReadme ? 'Click to view project details' : 'No README.html found in this project'}">
                <span class="nav-icon">${hasReadme ? '🔬' : '📁'}</span>
                <div class="project-info">
                    <div class="project-name">${project.name}</div>
                    <div class="project-meta">${fieldCount} fields • ${createdDate}${hasReadme ? ' • README' : ''}</div>
                </div>
                ${!hasReadme ? '<span class="no-readme-badge">No README</span>' : ''}
            </div>
        `;
    }).join('');
},

// Generate enhanced navigation JavaScript
generateNavigationScript(exportData) {
    const projectPaths = exportData.projects.map(project => ({
        name: project.name,
        path: project.path,
        readmePath: this.getReadmePath(project.path),
        hasReadme: project.hasReadme,
        metadataFieldCount: project.metadataFieldCount || 0,
        created: project.created
    }));
    
    return `
        // Project data
        const projectData = ${JSON.stringify(projectPaths, null, 2)};
        let currentProject = null;
        
        // Show loading overlay
        function showLoading(show = true) {
            const overlay = document.getElementById('loading-overlay');
            if (show) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        }
        
        // Show welcome screen
        function showWelcomeScreen() {
            document.getElementById('welcome-screen').style.display = 'flex';
            document.getElementById('project-frame').style.display = 'none';
            showLoading(false);
            currentProject = null;
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('.nav-item[onclick="showWelcomeScreen()"]').classList.add('active');
            
            console.log('📊 Showing overview screen');
        }
        
        // Load project README
        function loadProject(readmePath, projectName) {
            const project = projectData.find(p => p.name === projectName);
            
            if (!project || !project.hasReadme) {
                alert('📄 No README.html file found for this project.\\n\\n' +
                      'To create a README file with experiment metadata:\\n' +
                      '1. Open MetaFold application\\n' +
                      '2. Use "Create Project" feature\\n' +
                      '3. Fill in metadata and create project\\n\\n' +
                      'This will generate a README.html file automatically.');
                return;
            }
            
            console.log('🔬 Loading project:', projectName);
            console.log('📄 README path:', readmePath);
            
            currentProject = project;
            showLoading(true);
            
            document.getElementById('welcome-screen').style.display = 'none';
            
            const frame = document.getElementById('project-frame');
            
            frame.onload = function() {
                console.log('✅ README loaded successfully');
                showLoading(false);
                frame.style.display = 'block';
            };
            
            frame.onerror = function() {
                console.error('❌ Failed to load README.html from:', readmePath);
                handleLoadError();
            };
            
            // Load README.html
            let finalPath = readmePath;
            if (!finalPath.startsWith('file://')) {
                finalPath = 'file://' + (finalPath.startsWith('/') ? '' : '/') + finalPath;
            }
            
            frame.src = finalPath;
            updateActiveNavigation(projectName);
        }
        
        // Handle load errors
        function handleLoadError() {
            showLoading(false);
            const errorHtml = \`
                <div style="padding: 40px; text-align: center; color: #e0e0e0; 
                            background: linear-gradient(135deg, #1a1a2e, #16213e); height: 100vh; 
                            display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
                    <h2 style="color: #ef4444; margin-bottom: 10px;">Failed to Load README</h2>
                    <p style="margin-bottom: 20px;">Could not load the README.html file for <strong>\${currentProject?.name || 'this project'}</strong></p>
                    
                    <button onclick="showWelcomeScreen()" 
                            style="background: linear-gradient(135deg, #7c3aed, #a855f7); border: none; 
                                   color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                                   font-size: 1rem; margin-top: 20px;">
                        ← Back to Overview
                    </button>
                </div>
            \`;
            
            const frame = document.getElementById('project-frame');
            frame.style.display = 'block';
            frame.srcdoc = errorHtml;
        }
        
        // Update navigation active state
        function updateActiveNavigation(projectName) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const clickedItem = Array.from(document.querySelectorAll('.project-item')).find(item => 
                item.textContent.includes(projectName)
            );
            if (clickedItem) {
                clickedItem.classList.add('active');
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                showWelcomeScreen();
            }
        });
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            showWelcomeScreen();
            console.log('🚀 MetaFold Project Navigator initialized');
            console.log('📊 Projects:', projectData.length);
            console.log('📄 With README:', projectData.filter(p => p.hasReadme).length);
            
            window.projectData = projectData;
            window.loadProjectByName = function(name) {
                const project = projectData.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
                if (project && project.hasReadme) {
                    loadProject(project.readmePath, project.name);
                } else {
                    console.log('Project not found or no README available:', name);
                }
            };
        });
    `;
},

// Helper functions
getReadmePath(projectPath) {
    const separator = projectPath.includes('\\') ? '\\' : '/';
    return projectPath + (projectPath.endsWith(separator) ? '' : separator) + 'README.html';
},

escapeForJS(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
},


// Generate simple navigation panel
generateNavigationPanel(exportData) {
    return `
        <div class="nav-header">
            <div class="nav-title">🔬 MetaFold</div>
            <div class="nav-subtitle">Project Navigator</div>
            <div class="project-count">${exportData.exportInfo.totalProjects} Projects</div>
        </div>
        
        <div class="nav-content">
            <div class="nav-section">
                <div class="nav-section-title">📊 Overview</div>
                <div class="nav-item" onclick="showWelcomeScreen()">
                    <span class="nav-icon">📈</span>
                    <span class="nav-label">Project Summary</span>
                </div>
            </div>
            
            <div class="nav-section">
                <div class="nav-section-title">🗂️ Projects</div>
                <div class="project-list">
                    ${this.generateProjectList(exportData.projects)}
                </div>
            </div>
        </div>
    `;
},

// Generate project list in navigation
generateProjectList(projects) {
    return projects.map(project => {
        const readmePath = this.getReadmePath(project.path);
        const fieldCount = project.metadataFieldCount || 0;
        const hasReadme = project.hasReadme;
        const createdDate = new Date(project.created).toLocaleDateString();
        
        return `
            <div class="nav-item project-item ${hasReadme ? 'has-readme' : 'no-readme'}" 
                 onclick="loadProject('${this.escapeForJS(readmePath)}', '${this.escapeForJS(project.name)}')"
                 title="${hasReadme ? 'Click to view project details' : 'No README.html found in this project'}">
                <span class="nav-icon">${hasReadme ? '🔬' : '📁'}</span>
                <div class="project-info">
                    <div class="project-name">${project.name}</div>
                    <div class="project-meta">${fieldCount} fields • ${createdDate}${hasReadme ? ' • README' : ''}</div>
                </div>
                ${!hasReadme ? '<span class="no-readme-badge">No README</span>' : ''}
            </div>
        `;
    }).join('');
},

// Generate enhanced navigation JavaScript with better error handling
generateNavigationScript(exportData) {
    // Create mapping of project paths for JavaScript
    const projectPaths = exportData.projects.map(project => ({
        name: project.name,
        path: project.path,
        readmePath: this.getReadmePath(project.path),
        hasReadme: project.hasReadme,
        metadataFieldCount: project.metadataFieldCount || 0,
        created: project.created
    }));
    
    return `
        // Project data
        const projectData = ${JSON.stringify(projectPaths, null, 2)};
        let currentProject = null;
        
        // Show loading overlay
        function showLoading(show = true) {
            const overlay = document.getElementById('loading-overlay');
            if (show) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        }
        
        // Show welcome screen
        function showWelcomeScreen() {
            document.getElementById('welcome-screen').style.display = 'flex';
            document.getElementById('project-frame').style.display = 'none';
            showLoading(false);
            currentProject = null;
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector('.nav-item[onclick="showWelcomeScreen()"]').classList.add('active');
            
            console.log('📊 Showing overview screen');
        }
        
        // Load project README with better error handling
        function loadProject(readmePath, projectName) {
            const project = projectData.find(p => p.name === projectName);
            
            if (!project || !project.hasReadme) {
                alert('📄 No README.html file found for this project.\\n\\n' +
                      'To create a README file with experiment metadata:\\n' +
                      '1. Open MetaFold application\\n' +
                      '2. Use "Create Project" feature\\n' +
                      '3. Fill in metadata and create project\\n\\n' +
                      'This will generate a README.html file automatically.');
                return;
            }
            
            console.log('🔬 Loading project:', projectName);
            console.log('📄 README path:', readmePath);
            
            currentProject = project;
            
            // Show loading
            showLoading(true);
            
            // Hide welcome screen
            document.getElementById('welcome-screen').style.display = 'none';
            
            // Prepare iframe
            const frame = document.getElementById('project-frame');
            
            // Set up iframe load handlers BEFORE setting src
            frame.onload = function() {
                console.log('✅ README loaded successfully');
                showLoading(false);
                frame.style.display = 'block';
            };
            
            frame.onerror = function() {
                console.error('❌ Failed to load README.html from:', readmePath);
                handleLoadError();
            };
            
            // Handle case where file doesn't exist (iframe doesn't trigger onerror for file:// URLs)
            setTimeout(() => {
                try {
                    // Check if iframe content is accessible (will throw if file doesn't exist)
                    if (frame.style.display === 'none') {
                        // Still loading after timeout, might be an issue
                        console.warn('⚠️ README taking long to load, checking...');
                    }
                } catch (error) {
                    console.error('❌ README load timeout:', error);
                    handleLoadError();
                }
            }, 3000);
            
            // Load README.html - try different path formats for cross-platform compatibility
            let finalPath = readmePath;
            
            // Ensure proper file:// protocol
            if (!finalPath.startsWith('file://')) {
                finalPath = 'file://' + (finalPath.startsWith('/') ? '' : '/') + finalPath;
            }
            
            frame.src = finalPath;
            
            // Update active state
            updateActiveNavigation(projectName);
        }
        
        // Handle load errors
        function handleLoadError() {
            showLoading(false);
            
            const errorHtml = \`
                <div style="padding: 40px; text-align: center; color: #e0e0e0; 
                            background: linear-gradient(135deg, #1a1a2e, #16213e); height: 100vh; 
                            display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 4rem; margin-bottom: 20px;">🚫</div>
                    <h2 style="color: #ef4444; margin-bottom: 10px;">Failed to Load README</h2>
                    <p style="margin-bottom: 20px;">Could not load the README.html file for <strong>\${currentProject?.name || 'this project'}</strong></p>
                    
                    <div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; margin: 20px 0; text-align: left;">
                        <strong>Possible causes:</strong><br>
                        • README.html file is missing<br>
                        • File path is incorrect<br>
                        • Browser security restrictions<br>
                        • File permissions issue
                    </div>
                    
                    <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); 
                                padding: 15px; border-radius: 10px; margin: 20px 0; text-align: left;">
                        <strong>💡 Solution:</strong><br>
                        Open the project folder manually and look for README.html:<br>
                        <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">\${currentProject?.path || 'Project Path'}</code>
                    </div>
                    
                    <button onclick="showWelcomeScreen()" 
                            style="background: linear-gradient(135deg, #7c3aed, #a855f7); border: none; 
                                   color: white; padding: 12px 24px; border-radius: 8px; cursor: pointer; 
                                   font-size: 1rem; margin-top: 20px;">
                        ← Back to Overview
                    </button>
                </div>
            \`;
            
            const frame = document.getElementById('project-frame');
            frame.style.display = 'block';
            frame.srcdoc = errorHtml;
        }
        
        // Update navigation active state
        function updateActiveNavigation(projectName) {
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Find and activate the clicked item
            const clickedItem = Array.from(document.querySelectorAll('.project-item')).find(item => 
                item.textContent.includes(projectName)
            );
            if (clickedItem) {
                clickedItem.classList.add('active');
            }
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {
            // Escape key to go back to overview
            if (e.key === 'Escape') {
                showWelcomeScreen();
            }
            
            // Arrow keys for navigation between projects
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                navigateProjects(e.key === 'ArrowUp' ? -1 : 1);
            }
        });
        
        // Navigate between projects with arrow keys
        function navigateProjects(direction) {
            const readmeProjects = projectData.filter(p => p.hasReadme);
            if (readmeProjects.length === 0) return;
            
            let currentIndex = readmeProjects.findIndex(p => p.name === currentProject?.name);
            
            if (currentIndex === -1) {
                currentIndex = 0;
            } else {
                currentIndex += direction;
                if (currentIndex < 0) currentIndex = readmeProjects.length - 1;
                if (currentIndex >= readmeProjects.length) currentIndex = 0;
            }
            
            const nextProject = readmeProjects[currentIndex];
            loadProject(nextProject.readmePath, nextProject.name);
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            showWelcomeScreen();
            console.log('🚀 MetaFold Project Navigator initialized');
            console.log('📊 Projects:', projectData.length);
            console.log('📄 With README:', projectData.filter(p => p.hasReadme).length);
            
            // Add some helpful console commands
            window.projectData = projectData;
            window.loadProjectByName = function(name) {
                const project = projectData.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
                if (project && project.hasReadme) {
                    loadProject(project.readmePath, project.name);
                } else {
                    console.log('Project not found or no README available:', name);
                }
            };
            
            console.log('💡 Console commands available:');
            console.log('   • loadProjectByName("project-name") - Load project by name');
            console.log('   • showWelcomeScreen() - Return to overview');
        });
    `;
},

// AKTUALISIERTE copyExportCSS Funktion um project-navigator.css zu kopieren
async copyExportCSS(exportPath) {
    // NICHT MEHR NÖTIG: CSS ist jetzt inline
    console.log('✅ CSS is inline - no external file needed');
    return true;
},

// Helper functions (unverändert)
getReadmePath(projectPath) {
    // Construct path to README.html in project directory
    // Normalize path separators for cross-platform compatibility
    const separator = projectPath.includes('\\') ? '\\' : '/';
    return projectPath + (projectPath.endsWith(separator) ? '' : separator) + 'README.html';
},

escapeForJS(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
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