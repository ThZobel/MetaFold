// Enhanced Visualization Manager - Working Version with Project Scanner Integration
// Handles interactive metadata visualization using JSONCrack iframe, D3.js, and Tree views

const visualizationManager = {
    initialized: false,
    currentData: null,
    currentVisualizationType: 'jsoncrack', // Default to JSONCrack
    usesFallback: false,
    activeFilters: null, // Store active filters from search
    
    
    // Available visualization types
    visualizationTypes: {
        jsoncrack: {
            name: 'JSONCrack',
            icon: '🕸️',
            description: 'Interactive JSONCrack graph visualization',
            requiresLibrary: 'JSONCrackViewer'
        },
        dashboard: {
            name: 'Analytics Dashboard',
            icon: '📊',
            description: 'D3.js charts for metadata analysis',
            requiresLibrary: 'd3'
        },
        lineagetree: {
            name: 'Lineage Tree',
            icon: '??',
            description: 'D3.js hierarchical tree',
            requiresLibrary: 'd3'
        },
        knowledgegraph: {
            name: 'Knowledge Graph',
            icon: '🌌',
            description: 'D3.js semantic graph',
            requiresLibrary: 'd3'
        },
        metadatatree: {
            name: 'Metadata Tree',
            icon: '🏷️',
            description: 'Legacy metadata graph',
            requiresLibrary: 'd3'
        },
        tree: {
            name: 'Tree View',
            icon: '🌳',
            description: 'Collapsible tree view',
            requiresLibrary: null
        }
    },

    // Initialize the visualization manager
    init() {
        if (this.initialized) return;
        
        console.log('📊 Initializing Enhanced Visualization Manager with Modern JSONCrack...');
        
        try {
            this.setupVisualizationContainer();
            this.checkAvailableLibraries();
            this.updateVisualizationTypeButtons();
            this.initialized = true;
            console.log('✅ Enhanced Visualization Manager initialized');
            console.log('📊 Available visualizations:', this.getAvailableTypes());
        } catch (error) {
            console.error('❌ Error initializing Visualization Manager:', error);
        }
    },

    // ENHANCED: Modern library availability check
    checkAvailableLibraries() {
        const availability = {
            react: typeof React !== 'undefined',
            reactDOM: typeof ReactDOM !== 'undefined',
            jsonCrackViewer: typeof window.JSONCrackViewer !== 'undefined',
            d3: typeof d3 !== 'undefined'
        };
        
        console.log('📊 Library availability check:', availability);
        
        // ENHANCED: Modern JSONCrack is always available via iframe (no dependencies needed)
        if (availability.react && availability.reactDOM) {
            this.usesFallback = false;
            console.log('✅ Modern JSONCrack available - using iframe-based graph visualization');
        } else if (availability.d3) {
            this.usesFallback = false;
            this.currentVisualizationType = 'dashboard';
            console.log('⚠️ React not available - using D3.js dashboard mode');
        } else {
            this.usesFallback = true;
            this.currentVisualizationType = 'tree';
            console.log('⚠️ Advanced libraries not available - using tree view fallback');
        }
        
        return availability;
    },

    // Get available visualization types based on loaded libraries
    getAvailableTypes() {
        const availability = this.checkAvailableLibraries();
        const availableTypes = [];
        
        // ENHANCED: JSONCrack availability - now depends only on React/ReactDOM
        if (availability.react && availability.reactDOM) {
            availableTypes.push('jsoncrack');
        }
        
        // D3.js availability
        if (availability.d3) {
            availableTypes.push('dashboard');
            availableTypes.push('lineagetree');
            availableTypes.push('knowledgegraph');
            availableTypes.push('metadatatree');
        }
        
        // Tree view always available
        availableTypes.push('tree');
        
        return availableTypes;
    },

    // Set the current visualization type
    setVisualizationType(type) {
        const availableTypes = this.getAvailableTypes();
        
        if (!availableTypes.includes(type)) {
            console.warn(`⚠️ Visualization type "${type}" not available. Available: ${availableTypes.join(', ')}`);
            // Fallback to first available type
            type = availableTypes[0] || 'tree';
        }
        
        // ENHANCED: Cleanup previous visualization
        if (this.currentVisualizationType === 'jsoncrack') {
            this.cleanupJSONCrack();
        }
        
        this.currentVisualizationType = type;
        console.log(`📊 Visualization type set to: ${type}`);
        
        // Update UI buttons
        this.updateVisualizationTypeButtons();
        
        // Re-render current data if available
        if (this.currentData) {
            this.renderVisualization(this.currentData);
        }
    },

    // Update visualization type buttons in UI
    updateVisualizationTypeButtons() {
        const availableTypes = this.getAvailableTypes();
        
        // Update button states
        Object.keys(this.visualizationTypes).forEach(type => {
            const button = document.getElementById(type + 'TypeBtn');
            if (button) {
                if (availableTypes.includes(type)) {
                    button.style.display = 'inline-block';
                    button.disabled = false;
                    button.classList.toggle('active', type === this.currentVisualizationType);
                } else {
                    button.style.display = 'none';
                    button.disabled = true;
                    button.classList.remove('active');
                }
            }
        });
    },

    renderActiveFilters() {
        const sidebar = document.getElementById('vizSidebar');
        const content = document.getElementById('vizSidebarContent');
        const countBadge = document.getElementById('vizFilterCount');
        
        if (!sidebar || !content) return;
        
        if (!this.activeFilters || Object.keys(this.activeFilters).length === 0) {
            sidebar.style.display = 'none';
            return;
        }
        
        sidebar.style.display = 'block';
        content.innerHTML = '';
        
        let totalFilters = 0;
        
        for (let key in this.activeFilters) {
            const values = this.activeFilters[key];
            if (!values || values.length === 0) continue;
            
            totalFilters += values.length;
            
            const groupDiv = document.createElement('div');
            groupDiv.style.marginBottom = '10px';
            
            const title = document.createElement('div');
            title.style.color = '#9ca3af';
            title.style.fontSize = '12px';
            title.style.marginBottom = '4px';
            title.textContent = key.split('.').pop().replace(/_/g, ' ');
            groupDiv.appendChild(title);
            
            values.forEach(val => {
                const chip = document.createElement('div');
                chip.style.display = 'inline-block';
                chip.style.background = 'rgba(59, 130, 246, 0.2)';
                chip.style.border = '1px solid rgba(59, 130, 246, 0.4)';
                chip.style.color = '#93c5fd';
                chip.style.borderRadius = '4px';
                chip.style.padding = '2px 6px';
                chip.style.fontSize = '11px';
                chip.style.margin = '0 4px 4px 0';
                
                let displayVal = val.toString();
                if (displayVal.length > 25) displayVal = displayVal.substring(0, 25) + '...';
                chip.textContent = displayVal;
                
                groupDiv.appendChild(chip);
            });
            
            content.appendChild(groupDiv);
        }
        
        if (countBadge) countBadge.textContent = totalFilters;
    },

    // Check JSONCrack availability (legacy function for compatibility)
    checkJSONCrackAvailability() {
        return this.checkAvailableLibraries();
    },

    // Setup the visualization container
    setupVisualizationContainer() {
        const container = document.getElementById('visualizationContent');
        if (!container) {
            console.warn('⚠️ Visualization container not found');
            return;
        }

        // Initialize with placeholder content
        this.showPlaceholder();
    },

    // Show placeholder when no data is loaded
    showPlaceholder() {
        const container = document.getElementById('visualizationContent');
        if (!container) return;

        const availableTypes = this.getAvailableTypes();
        const currentType = this.visualizationTypes[this.currentVisualizationType];
        
        const availableLibraries = [];
        if (typeof React !== 'undefined') availableLibraries.push('React');
        if (typeof window.JSONCrackViewer !== 'undefined') availableLibraries.push('JSONCrack');
        if (typeof d3 !== 'undefined') availableLibraries.push('D3.js');
        
        const libraryStatus = availableLibraries.length > 0 ? 
            `Available: ${availableLibraries.join(', ')}` : 
            'No visualization libraries detected';

        container.innerHTML = `
            <div class="visualization-placeholder">
                <svg fill="currentColor" viewBox="0 0 24 24" style="width: 80px; height: 80px; margin-bottom: 20px; opacity: 0.5;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM7 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM12 7.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM17 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
                <h4>Ready for ${currentType ? currentType.name : 'Visualization'}</h4>
                <p>Select a template or load a JSON file to see the interactive visualization</p>
                <div style="margin-top: 10px; font-size: 12px; color: #6b7280;">
                    ${libraryStatus}<br>
                    Available types: ${availableTypes.map(t => this.visualizationTypes[t]?.name || t).join(', ')}
                </div>
                <div style="margin-top: 20px;">
                    <button class="btn btn-secondary" onclick="visualizationManager.showSampleData()">
                        🎯 Show Sample
                    </button>
                </div>
            </div>
        `;
    },

    // Load metadata from current template
    async loadFromTemplate() {
        try {
            console.log('📊 Loading data from current template...');

            if (!window.templateManager || !window.templateManager.currentTemplate) {
                this.showError('No template selected. Please select a template first.');
                return;
            }

            const template = window.templateManager.currentTemplate;
            
            // Check if template has metadata
            if (template.type !== 'experiment' || !template.metadata || Object.keys(template.metadata).length === 0) {
                this.showError('Selected template has no metadata to visualize. Please select an experiment template with metadata fields.');
                return;
            }

            // Collect current form data if available
            let currentData = {};
            if (window.experimentForm && typeof window.experimentForm.collectData === 'function') {
                try {
                    currentData = window.experimentForm.collectData();
                    console.log('📊 Collected current form data:', currentData);
                } catch (formError) {
                    console.warn('⚠️ Could not collect form data:', formError);
                }
            }

            // Create visualization data structure
            const visualizationData = {
                templateInfo: {
                    name: template.name,
                    description: template.description || 'No description',
                    type: template.type,
                    createdBy: template.createdBy || 'Unknown',
                    createdAt: template.createdAt || new Date().toISOString()
                },
                metadataSchema: template.metadata,
                currentValues: currentData,
                statistics: this.generateStatistics(template.metadata, currentData)
            };

            this.currentData = visualizationData;
            this.renderVisualization(visualizationData);
            this.showSuccess(`Loaded metadata from template: ${template.name}`);

        } catch (error) {
            console.error('❌ Error loading template data:', error);
            this.showError('Error loading template data: ' + error.message);
        }
    },
    
    // NEW: Load data from scanned projects (PROJECT SCANNER INTEGRATION)
    loadFromScannedProjects() {
        try {
            console.log('📁 Loading data from Project Scanner...');
            
            if (!window.projectScanner || !window.projectScanner.projects || window.projectScanner.projects.length === 0) {
                this.showError('No scanned projects available. Go to Discovery tab and scan a directory first.');
                return;
            }
            
            const projects = window.projectScanner.projects;
            const statistics = window.projectScanner.statistics;
            
            console.log(`📊 Processing ${projects.length} scanned projects for visualization...`);
            
            // Create comprehensive visualization data structure
            const visualizationData = this.createProjectNetworkData(projects, statistics);
            
            this.currentData = visualizationData;
            this.renderVisualization(visualizationData);
            this.showSuccess(`Loaded ${projects.length} MetaFold projects for visualization`);
            
        } catch (error) {
            console.error('❌ Error loading scanned projects:', error);
            this.showError('Error loading scanned projects: ' + error.message);
        }
    },

    // NEW: Visualize filtered projects from Facet Search
    visualizeFilteredProjects(filteredProjects, filters) {
        try {
            console.log(`📁 Visualizing ${filteredProjects.length} filtered projects...`, filters);
            
            // Rebuild the network data using ONLY the filtered projects
            // We use the global statistics if available since statistics are overall
            const statistics = window.projectScanner ? window.projectScanner.statistics : {};
            
            const visualizationData = this.createProjectNetworkData(filteredProjects, statistics);
            
            this.currentData = visualizationData;
            this.activeFilters = filters;
            
            // Set type to knowledge graph if currently on an incompatible view
            if (this.currentVisualizationType === 'dashboard' || this.currentVisualizationType === 'jsoncrack') {
                this.currentVisualizationType = 'knowledgegraph';
            }
            
            this.renderVisualization(visualizationData);
            this.updateVisualizationTypeButtons();
            
            this.showSuccess(`Visualizing subset of ${filteredProjects.length} projects`);
        } catch (error) {
            console.error('❌ Error visualizing filtered projects:', error);
            this.showError('Error: ' + error.message);
        }
    },

    focusNode(nodeId) {
        if (this.currentVisualizationType === 'lineagetree' && window.lineageTreeFocusNode) {
            window.lineageTreeFocusNode(nodeId);
        }
    },

    resetFilters() {
        this.activeFilters = null;
        if (window.projectScanner && window.projectScanner.projects) {
            const data = this.createProjectNetworkData(window.projectScanner.projects, window.projectScanner.statistics);
            this.currentData = data;
            this.renderVisualization(data);
            this.showSuccess('Filters reset. Visualizing all projects.');
        } else {
            this.renderActiveFilters(); // Will hide the sidebar if no data
        }
    },

    // Create network data structure from scanned projects
    createProjectNetworkData(projects, statistics) {
        console.log('🔗 Creating project network data structure...');
        
        const networkData = {
            overview: {
                totalProjects: projects.length,
                scannedPath: window.projectScanner.currentScannedPath,
                scanTimestamp: new Date().toISOString(),
                metafoldVersion: '1.1.0'
            },
            projects: projects.map(project => this.transformProjectForVisualization(project)),
            statistics: statistics || {},
            relationships: this.analyzeProjectRelationships(projects),
            metadataAnalysis: this.analyzeAggregatedMetadata(projects)
        };
        
        console.log('✅ Project network data created:', networkData);
        return networkData;
    },

    // Transform individual project for visualization
    transformProjectForVisualization(project) {
        return {
            id: this.generateProjectId(project.path),
            name: project.name,
            displayName: this.formatProjectDisplayName(project.name),
            path: project.path,
            type: 'metafold-project',
            created: project.created,
            metadata: project.metadata,
            metadataFieldCount: project.metadataFieldCount || 0,
            lineage: project.lineage,
            complexity: this.calculateProjectComplexity(project),
            completeness: this.calculateProjectCompleteness(project)
        };
    },

    // Helper functions for project scanner integration
    generateProjectId(projectPath) {
        return 'project_' + btoa(projectPath).replace(/[^a-zA-Z0-9]/g, '');
    },

    formatProjectDisplayName(projectName) {
        return projectName
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, l => l.toUpperCase());
    },

    calculateProjectComplexity(project) {
        let complexity = 0;
        complexity += (project.metadataFieldCount || 0) * 0.1;
        if (project.hasReadme) complexity += 0.3;
        return Math.min(complexity, 5);
    },

    calculateProjectCompleteness(project) {
        if (!project.metadata || !project.metadata.extra_fields) return 0;
        const fields = project.metadata.extra_fields;
        const totalFields = Object.keys(fields).length;
        if (totalFields === 0) return 0;
        const completedFields = Object.values(fields).filter(field => 
            field.value && field.value.toString().trim() !== ''
        ).length;
        return (completedFields / totalFields) * 100;
    },

    analyzeProjectRelationships(projects) {
        // Simplified relationship analysis
        return {
            hierarchical: [],
            metadata: [],
            temporal: []
        };
    },

    analyzeAggregatedMetadata(projects) {
        const analysis = {
            fieldFrequency: {},
            fieldTypes: {},
            commonFields: []
        };
        
        projects.forEach(project => {
            if (project.metadata && project.metadata.extra_fields) {
                Object.entries(project.metadata.extra_fields).forEach(([fieldName, fieldData]) => {
                    analysis.fieldFrequency[fieldName] = (analysis.fieldFrequency[fieldName] || 0) + 1;
                    const type = fieldData.type || 'unknown';
                    analysis.fieldTypes[type] = (analysis.fieldTypes[type] || 0) + 1;
                });
            }
        });
        
        return analysis;
    },

    // Load data from JSON file
    async loadFromFile() {
        try {
            console.log('📊 Loading data from JSON file...');

            // Create file input
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;

                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    console.log('📊 Loaded JSON data:', data);
                    
                    this.currentData = data;
                    this.renderVisualization(data);
                    this.showSuccess(`Loaded data from file: ${file.name}`);
                    
                } catch (parseError) {
                    console.error('❌ Error parsing JSON file:', parseError);
                    this.showError('Invalid JSON file: ' + parseError.message);
                }
            };

            input.click();

        } catch (error) {
            console.error('❌ Error loading file:', error);
            this.showError('Error loading file: ' + error.message);
        }
    },

    // Show sample data for demonstration
    showSampleData() {
        console.log('📊 Showing sample data...');

        const sampleData = {
            experimentInfo: {
                name: "Cell Migration Study",
                researcher: "Dr. Sarah Johnson",
                date: "2025-06-10",
                institution: "NFDI4BioImage Lab"
            },
            experimentParameters: {
                cellLine: "HeLa",
                treatment: "Compound XYZ-123",
                concentration: "10 µM",
                duration: "24 hours",
                temperature: 37,
                co2Percentage: 5
            },
            measurements: {
                cellCount: 10000,
                viability: 95.2,
                migrationDistance: 150.5,
                averageSpeed: 0.25
            },
            metadata: {
                microscope: "Leica DMi8",
                objective: "20x",
                imageFormat: "TIFF",
                acquisitionSoftware: "LAS X",
                analysisMethod: "ImageJ"
            },
            results: {
                successful: true,
                notes: "Treatment significantly reduced cell migration",
                significanceLevel: 0.001,
                dataFiles: ["migration_tracks.csv", "cell_counts.xlsx", "images.zip"]
            }
        };

        this.currentData = sampleData;
        this.renderVisualization(sampleData);
        this.showSuccess('Loaded sample experiment data');
    },

    // Main render function that chooses appropriate visualization method
    renderVisualization(data) {
        const container = document.getElementById('visualizationContent');
        if (!container) {
            console.error('❌ Visualization container not found');
            return;
        }

        try {
            console.log('📊 Rendering visualization with data:', data);
            console.log('📊 Using visualization type:', this.currentVisualizationType);
            
            // CRITICAL: Save data for re-rendering when switching types
            this.currentData = data;
            
            this.renderActiveFilters();

            // Clear container
            container.innerHTML = '';

            // Route to appropriate visualization method
            switch (this.currentVisualizationType) {
                case 'jsoncrack':
                    this.renderJSONCrackVisualization(data);
                    break;
                case 'dashboard':
                    this.renderDashboardVisualization(data);
                    break;
                case 'tree':
                    this.renderTreeVisualization(data);
                    break;
                case 'lineagetree':
                    this.renderLineageTreeVisualization(data);
                    break;
                case 'metadatatree':
                    this.renderMetadataTreeVisualization(data);
                    break;
                case 'knowledgegraph':
                    this.renderKnowledgeGraphVisualization(data);
                    break;
                default:
                    console.warn('⚠️ Unknown visualization type:', this.currentVisualizationType);
                    this.renderTreeVisualization(data); // Fallback
            }

        } catch (error) {
            console.error('❌ Error rendering visualization:', error);
            this.showError('Error rendering visualization: ' + error.message);
            
            // Try fallback on error
            if (this.currentVisualizationType !== 'tree') {
                console.log('📊 Attempting fallback to tree visualization...');
                this.setVisualizationType('tree');
                this.renderTreeVisualization(data);
            }
        }
    },

    // FIXED: Real JSONCrack with MessagePort API (Official Method)
    renderJSONCrackVisualization(data) {
        console.log('🕸️ Rendering JSONCrack visualization with MessagePort API...');
        
        const container = document.getElementById('visualizationContent');
        if (!container) {
            console.error('❌ Visualization container not found');
            return;
        }

        try {
            // Create container for JSONCrack
            container.innerHTML = `
                <div style="height: 100%; display: flex; flex-direction: column;">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02);">
                        <div>
                            <h4 style="margin: 0; color: #e0e0e0;">🕸️ JSONCrack Interactive Graph</h4>
                            <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Real JSONCrack iframe integration with MessagePort API</p>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-secondary btn-small" onclick="visualizationManager.copyToClipboard()" title="Copy JSON">
                                📋 Copy
                            </button>
                            <button class="btn btn-secondary btn-small" onclick="visualizationManager.exportVisualization()" title="Export">
                                💾 Export
                            </button>
                        </div>
                    </div>
                    <div id="jsoncrackContainer" class="jsoncrack-container" style="flex: 1; position: relative;">
                        <div id="jsoncrackContent" style="width: 100%; height: 100%;">
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">
                                <div style="text-align: center;">
                                    <div style="
                                        width: 40px; height: 40px;
                                        border: 3px solid rgba(124, 58, 237, 0.3);
                                        border-top: 3px solid #7c3aed;
                                        border-radius: 50%;
                                        animation: spin 1s linear infinite;
                                        margin: 0 auto 15px;
                                    "></div>
                                    <p>Preparing JSONCrack visualization...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;

            // Create JSONCrack iframe with MessagePort
            this.createJSONCrackIframe(data);

        } catch (error) {
            console.error('❌ Error in JSONCrack visualization:', error);
            this.renderJSONCrackError(container, error.message);
        }
    },

    // ENHANCED: Real JSONCrack iframe with MessagePort API
    createJSONCrackIframe(data) {
        const jsoncrackContent = document.getElementById('jsoncrackContent');
        if (!jsoncrackContent) return;

        try {
            const jsonString = JSON.stringify(data);
            
            console.log(`🔍 Data size: ${jsonString.length} chars`);
            console.log('📊 Using MessagePort API for JSONCrack (official method)');
            console.log('📊 Data to send:', data);
            
            // Store data for MessagePort transmission
            this.pendingJSONCrackData = data;
            
            // Create JSONCrack iframe WITHOUT data (loads faster)
            const baseUrl = 'https://jsoncrack.com/widget?theme=dark&direction=DOWN';
            
            jsoncrackContent.innerHTML = `
                <div style="position: relative; width: 100%; height: 100%; min-height: 500px;">
                    <iframe
                        id="jsoncrackMessagePortIframe"
                        src="${baseUrl}"
                        width="100%"
                        height="100%"
                        style="border: none; background: transparent; min-height: 500px; height: 100%;"
                        title="JSONCrack Interactive Graph"
                        allow="clipboard-write"
                        sandbox="allow-scripts allow-same-origin allow-popups"
                    ></iframe>
                    <div id="jsoncrackLoadingOverlay" style="
                        position: absolute; 
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(30, 30, 46, 0.9);
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center;
                        color: #9ca3af;
                        z-index: 10;
                        min-height: 500px;
                    ">
                        <div style="
                            width: 40px; height: 40px;
                            border: 3px solid rgba(124, 58, 237, 0.3);
                            border-top: 3px solid #7c3aed;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                            margin-bottom: 15px;
                        "></div>
                        <h4>Loading JSONCrack...</h4>
                        <p style="font-size: 12px;">Preparing your data for visualization</p>
                        <p style="font-size: 10px; color: #6b7280; margin-top: 10px;">Using MessagePort API</p>
                    </div>
                </div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;

            // Setup MessagePort communication
            this.setupJSONCrackMessagePort();

        } catch (error) {
            console.error('❌ Error creating JSONCrack with MessagePort:', error);
            this.renderJSONCrackError(jsoncrackContent, error.message);
        }
    },

    // Setup MessagePort communication with JSONCrack
    setupJSONCrackMessagePort() {
        console.log('📨 Setting up MessagePort communication with JSONCrack...');
        
        const iframe = document.getElementById('jsoncrackMessagePortIframe');
        const overlay = document.getElementById('jsoncrackLoadingOverlay');
        
        if (!iframe || !this.pendingJSONCrackData) {
            console.error('❌ MessagePort setup failed - missing iframe or data');
            return;
        }
        
        let messagePortReady = false;
        let dataTransmitted = false;
        
        // Setup message listener for iframe communication
        const handleMessage = (event) => {
            // Security check - only accept messages from jsoncrack.com
            if (event.origin !== 'https://jsoncrack.com') {
                console.warn('🔒 Rejected message from unauthorized origin:', event.origin);
                return;
            }
            
            console.log('📨 Received message from JSONCrack:', event.data);
            
            // Handle different message types
            if (event.data && (event.data.type === 'widget-ready' || event.data === 'ready' || event.data.ready)) {
                console.log('✅ JSONCrack widget is ready for data');
                messagePortReady = true;
                this.sendDataToJSONCrack();
                
            } else if (event.data.type === 'error') {
                console.error('❌ JSONCrack widget error:', event.data.message);
                this.handleJSONCrackError(event.data.message || 'JSONCrack visualization error');
                
            } else if (event.data.type === 'loaded' || event.data.loaded) {
                console.log('🎉 JSONCrack successfully loaded data');
                dataTransmitted = true;
                
                // Hide loading overlay
                if (overlay) {
                    overlay.style.display = 'none';
                }
                
            } else {
                console.log('📋 JSONCrack message (unknown type):', event.data);
            }
        };
        
        // Add message listener
        window.addEventListener('message', handleMessage);
        
        // Cleanup function
        this.jsoncrackCleanup = () => {
            window.removeEventListener('message', handleMessage);
            this.pendingJSONCrackData = null;
        };
        
        // Try to send data after iframe loads
        iframe.onload = () => {
            console.log('📨 JSONCrack iframe loaded, attempting initial data transmission...');
            setTimeout(() => {
                if (!messagePortReady) {
                    console.log('🔄 Attempting to trigger JSONCrack ready state...');
                    this.sendDataToJSONCrack();
                }
            }, 1000);
            
            // Fallback timeout
            setTimeout(() => {
                if (!dataTransmitted) {
                    console.log('⚠️ JSONCrack loading timeout, trying fallback...');
                    this.sendDataToJSONCrack(true); // Force send
                }
            }, 5000);
            
            // Final timeout - show error if nothing worked
            setTimeout(() => {
                if (!dataTransmitted && overlay && overlay.style.display !== 'none') {
                    console.error('❌ JSONCrack MessagePort timeout');
                    this.handleJSONCrackError('JSONCrack loading timeout - the widget may not support MessagePort API properly');
                }
            }, 10000);
        };
    },

    // Send data to JSONCrack via MessagePort
    sendDataToJSONCrack(force = false) {
        const iframe = document.getElementById('jsoncrackMessagePortIframe');
        
        if (!iframe || !this.pendingJSONCrackData) {
            console.error('❌ Cannot send data - missing iframe or data');
            return;
        }
        
        try {
            const jsonString = JSON.stringify(this.pendingJSONCrackData);
            
            // Prepare message according to JSONCrack documentation
            const message = {
                json: jsonString,
                options: {
                    theme: 'dark',
                    direction: 'DOWN'
                }
            };
            
            console.log('📨 Sending data to JSONCrack via MessagePort...');
            console.log('📨 Message size:', jsonString.length, 'characters');
            console.log('📨 Message preview:', jsonString.substring(0, 100) + '...');
            
            // Send message to iframe
            iframe.contentWindow.postMessage(message, 'https://jsoncrack.com');
            
            console.log('✅ Data sent to JSONCrack successfully');
            
            // If forced, assume success after delay
            if (force) {
                setTimeout(() => {
                    const overlay = document.getElementById('jsoncrackLoadingOverlay');
                    if (overlay) {
                        overlay.style.display = 'none';
                    }
                    console.log('✅ Forced data transmission completed');
                }, 2000);
            }
            
        } catch (error) {
            console.error('❌ Error sending data to JSONCrack:', error);
            this.handleJSONCrackError('Failed to send data: ' + error.message);
        }
    },

    // Handle JSONCrack errors
    handleJSONCrackError(errorMessage) {
        console.error('❌ JSONCrack MessagePort error:', errorMessage);
        
        const overlay = document.getElementById('jsoncrackLoadingOverlay');
        if (overlay) {
            overlay.innerHTML = `
                <div style="text-align: center; color: #ef4444;">
                    <svg fill="currentColor" viewBox="0 0 24 24" style="width: 48px; height: 48px; margin-bottom: 15px;">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                    </svg>
                    <h4>JSONCrack Communication Error</h4>
                    <p style="font-size: 12px; max-width: 300px; margin: 10px auto;">${errorMessage}</p>
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.retryJSONCrack()" style="padding: 6px 12px; font-size: 12px;">
                            🔄 Retry
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.setVisualizationType('dashboard')" style="padding: 6px 12px; font-size: 12px;">
                            📊 D3 Dashboard
                        </button>
                    </div>
                </div>
            `;
        }
    },

    // Retry JSONCrack
    retryJSONCrack() {
        console.log('🔄 Retrying JSONCrack visualization...');
        if (this.currentData) {
            this.renderJSONCrackVisualization(this.currentData);
        }
    },

    // Cleanup when switching away from JSONCrack
    cleanupJSONCrack() {
        if (this.jsoncrackCleanup) {
            this.jsoncrackCleanup();
            this.jsoncrackCleanup = null;
        }
    },

    // Error display for JSONCrack failures
    renderJSONCrackError(container, errorMessage) {
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #ef4444; text-align: center; flex-direction: column; padding: 40px;">
                <svg fill="currentColor" viewBox="0 0 24 24" style="width: 64px; height: 64px; margin-bottom: 20px;">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM13 17h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <h4>JSONCrack Rendering Error</h4>
                <p><strong>Error:</strong> ${errorMessage}</p>
                <div style="margin-top: 20px; display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="visualizationManager.setVisualizationType('dashboard')">
                        📊 Try D3 Dashboard
                    </button>
                    <button class="btn btn-secondary" onclick="visualizationManager.setVisualizationType('tree')">
                        🌳 Try Tree View
                    </button>
                </div>
            </div>
        `;
    },

    // =================== DASHBOARD HELPERS ===================

    // Draw a donut chart into a selector
    drawDonutChart(selector, chartData, colorPalette) {
        const container = document.querySelector(selector);
        if (!container || chartData.length === 0) return;
        container.innerHTML = '';

        const w = container.clientWidth || 260;
        const h = container.clientHeight || 220;
        const radius = Math.min(w, h) / 2 - 10;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', w).attr('height', h)
            .append('g')
            .attr('transform', `translate(${w / 2},${h / 2})`);

        const color = d3.scaleOrdinal().domain(chartData.map(d => d.key)).range(colorPalette);
        const pie = d3.pie().value(d => d.value).sort(null);
        const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);

        let tooltip = d3.select('body').select('.metafold-d3-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'metafold-d3-tooltip')
                .style('opacity', 0).style('position', 'absolute')
                .style('background', 'rgba(15, 15, 30, 0.95)').style('border', '1px solid #4b5563')
                .style('color', '#fff').style('padding', '8px 12px').style('border-radius', '6px')
                .style('font-size', '12px').style('pointer-events', 'none')
                .style('z-index', 10000).style('box-shadow', '0 4px 12px rgba(0,0,0,0.5)');
        }

        const total = d3.sum(chartData, d => d.value);

        svg.selectAll('path')
            .data(pie(chartData))
            .enter().append('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data.key))
            .attr('stroke', '#1e1e2e').attr('stroke-width', 2)
            .style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this).transition().duration(150)
                    .attr('d', d3.arc().innerRadius(radius * 0.50).outerRadius(radius + 6));
                const pct = ((d.data.value / total) * 100).toFixed(1);
                tooltip.transition().duration(150).style('opacity', 1);
                tooltip.html(`<strong>${d.data.key}</strong><br/>Count: ${d.data.value} (${pct}%)`)
                    .style('left', (event.pageX + 12) + 'px').style('top', (event.pageY - 30) + 'px');
            })
            .on('mousemove', function (event) {
                tooltip.style('left', (event.pageX + 12) + 'px').style('top', (event.pageY - 30) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).transition().duration(150).attr('d', arc);
                tooltip.transition().duration(300).style('opacity', 0);
            });

        // Center label
        svg.append('text').attr('text-anchor', 'middle').attr('dy', '-0.1em')
            .attr('fill', '#e0e0e0').attr('font-size', '22px').attr('font-weight', 'bold').text(total);
        svg.append('text').attr('text-anchor', 'middle').attr('dy', '1.3em')
            .attr('fill', '#9ca3af').attr('font-size', '11px').text('total');
    },

    // Draw a horizontal bar chart
    drawHorizontalBarChart(selector, chartData, color) {
        const container = document.querySelector(selector);
        if (!container || chartData.length === 0) return;
        container.innerHTML = '';

        const margin = { top: 10, right: 40, bottom: 20, left: 120 };
        const w = (container.clientWidth || 400) - margin.left - margin.right;
        const h = Math.max(chartData.length * 28, 100);

        const svg = d3.select(container)
            .append('svg').attr('width', w + margin.left + margin.right).attr('height', h + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const y = d3.scaleBand().range([0, h]).padding(0.25).domain(chartData.map(d => d.key));
        const x = d3.scaleLinear().range([0, w]).domain([0, d3.max(chartData, d => d.value) * 1.1]);

        svg.append('g').call(d3.axisLeft(y)).selectAll('text').attr('fill', '#d1d5db').style('font-size', '11px');
        svg.selectAll('.domain, .tick line').attr('stroke', '#374151');

        svg.selectAll('.bar').data(chartData).enter().append('rect')
            .attr('y', d => y(d.key)).attr('height', y.bandwidth())
            .attr('x', 0).attr('width', d => x(d.value))
            .attr('fill', color).attr('rx', 3)
            .on('mouseover', function () { d3.select(this).transition().duration(150).attr('fill', d3.color(color).brighter(0.4)); })
            .on('mouseout', function () { d3.select(this).transition().duration(150).attr('fill', color); });

        svg.selectAll('.bar-label').data(chartData).enter().append('text')
            .attr('x', d => x(d.value) + 5).attr('y', d => y(d.key) + y.bandwidth() / 2)
            .attr('dy', '0.35em').attr('fill', '#9ca3af').attr('font-size', '11px').text(d => d.value);
    },

    // Draw a timeline scatter chart
    drawTimelineChart(selector, projects) {
        const container = document.querySelector(selector);
        if (!container || projects.length === 0) return;
        container.innerHTML = '';

        const margin = { top: 20, right: 30, bottom: 40, left: 50 };
        const w = (container.clientWidth || 600) - margin.left - margin.right;
        const h = (container.clientHeight || 200) - margin.top - margin.bottom;
        if (w <= 0 || h <= 0) return;

        const timeData = projects
            .filter(p => p.created)
            .map(p => ({ name: p.displayName || p.name, date: new Date(p.created), completeness: p.completeness || 0 }))
            .sort((a, b) => a.date - b.date);
        if (timeData.length === 0) return;

        const svg = d3.select(container)
            .append('svg').attr('width', w + margin.left + margin.right).attr('height', h + margin.top + margin.bottom)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleTime().range([0, w]).domain(d3.extent(timeData, d => d.date));
        const y = d3.scaleLinear().range([h, 0]).domain([0, 100]);

        svg.append('g').attr('transform', `translate(0,${h})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%b %d')))
            .selectAll('text').attr('fill', '#9ca3af').style('font-size', '10px');
        svg.append('g').call(d3.axisLeft(y).ticks(5)).selectAll('text').attr('fill', '#9ca3af').style('font-size', '10px');
        svg.selectAll('.domain, .tick line').attr('stroke', '#374151');

        // Y axis label
        svg.append('text').attr('transform', 'rotate(-90)').attr('y', -38).attr('x', -h / 2)
            .attr('fill', '#6b7280').attr('font-size', '10px').attr('text-anchor', 'middle').text('Completeness %');

        let tooltip = d3.select('body').select('.metafold-d3-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'metafold-d3-tooltip')
                .style('opacity', 0).style('position', 'absolute')
                .style('background', 'rgba(15,15,30,0.95)').style('border', '1px solid #4b5563')
                .style('color', '#fff').style('padding', '8px 12px').style('border-radius', '6px')
                .style('font-size', '12px').style('pointer-events', 'none')
                .style('z-index', 10000);
        }

        svg.selectAll('.dot').data(timeData).enter().append('circle')
            .attr('cx', d => x(d.date)).attr('cy', d => y(d.completeness))
            .attr('r', 6).attr('fill', d => d.completeness > 80 ? '#10b981' : d.completeness > 40 ? '#fbbf24' : '#ef4444')
            .attr('stroke', '#1e1e2e').attr('stroke-width', 2).style('cursor', 'pointer')
            .on('mouseover', function (event, d) {
                d3.select(this).transition().duration(150).attr('r', 9);
                tooltip.transition().duration(150).style('opacity', 1);
                tooltip.html(`<strong>${d.name}</strong><br/>Created: ${d.date.toLocaleDateString()}<br/>Completeness: ${d.completeness}%`)
                    .style('left', (event.pageX + 12) + 'px').style('top', (event.pageY - 30) + 'px');
            })
            .on('mouseout', function () {
                d3.select(this).transition().duration(150).attr('r', 6);
                tooltip.transition().duration(300).style('opacity', 0);
            });
    },

    // Color palettes for donut charts
    _chartPalettes: [
        ['#7c3aed', '#a78bfa', '#c4b5fd', '#6d28d9', '#5b21b6', '#4c1d95', '#ddd6fe'],
        ['#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e40af', '#bfdbfe'],
        ['#10b981', '#34d399', '#6ee7b7', '#059669', '#047857', '#065f46', '#a7f3d0'],
        ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309', '#92400e', '#fde68a'],
        ['#ef4444', '#f87171', '#fca5a5', '#dc2626', '#b91c1c', '#991b1b', '#fecaca'],
        ['#ec4899', '#f472b6', '#f9a8d4', '#db2777', '#be185d', '#9d174d', '#fbcfe8'],
        ['#06b6d4', '#22d3ee', '#67e8f9', '#0891b2', '#0e7490', '#155e75', '#a5f3fc'],
        ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9', '#5b21b6', '#ddd6fe']
    ],

    // =================== DASHBOARD MAIN RENDER ===================

    // Render Analytics Dashboard Visualization
    renderDashboardVisualization(data) {
        console.log('📊 Rendering Analytics Dashboard visualization...');
        
        const container = document.getElementById('visualizationContent');
        if (!container) {
            console.error('❌ Visualization container not found');
            return;
        }

        // Check if D3.js is available
        if (typeof d3 === 'undefined') {
            console.warn('⚠️ D3.js not available, falling back to tree view');
            this.setVisualizationType('tree');
            return;
        }

        const isProjectData = data.projects && data.metadataAnalysis;

        // ---- Gather aggregated value-frequency data for all categorical fields ----
        const categoricalCharts = []; // { fieldKey, label, chartData: [{key,value}] }
        if (isProjectData && data.projects) {
            const categoricalTypes = new Set(['dropdown', 'multicheckbox']);
            // Discover which fields are categorical by inspecting project metadata
            const fieldTypeMap = {}; // fieldKey -> type
            data.projects.forEach(p => {
                if (!p.metadata) return;
                Object.entries(p.metadata).forEach(([key, field]) => {
                    if (field && typeof field === 'object' && field.type && !fieldTypeMap[key]) {
                        fieldTypeMap[key] = field.type;
                    }
                });
            });

            // For each categorical field, aggregate value counts
            Object.entries(fieldTypeMap).forEach(([fieldKey, fieldType]) => {
                if (!categoricalTypes.has(fieldType) || fieldKey === 'System.Level') return;
                const valueCounts = {};
                data.projects.forEach(p => {
                    if (!p.metadata || !p.metadata[fieldKey]) return;
                    const fieldData = p.metadata[fieldKey];
                    let rawVal = fieldData;
                    if (fieldData && typeof fieldData === 'object' && fieldData.value !== undefined) rawVal = fieldData.value;
                    const addCount = (v) => {
                        const s = (v === null || v === undefined || v === '') ? '(empty)' : String(v);
                        valueCounts[s] = (valueCounts[s] || 0) + 1;
                    };
                    if (Array.isArray(rawVal)) rawVal.forEach(addCount); else addCount(rawVal);
                });
                const chartData = Object.entries(valueCounts)
                    .map(([k, v]) => ({ key: k, value: v }))
                    .filter(d => d.key !== '(empty)')
                    .sort((a, b) => b.value - a.value);
                if (chartData.length > 0) {
                    const label = (data.projects.find(p => p.metadata && p.metadata[fieldKey] && p.metadata[fieldKey].label) || {}).metadata?.[fieldKey]?.label || fieldKey;
                    categoricalCharts.push({ fieldKey, label, chartData });
                }
            });
        }

        // ---- Compute summary KPIs ----
        let totalProjects = 0, totalFields = 0, avgCompleteness = 0, totalSize = 0;
        let topOrganism = '–', topMode = '–';
        if (isProjectData && data.projects) {
            totalProjects = data.projects.length;
            totalFields = data.projects.reduce((s, p) => s + (p.metadataFieldCount || 0), 0);
            avgCompleteness = totalProjects > 0 ? Math.round(data.projects.reduce((s, p) => s + (p.completeness || 0), 0) / totalProjects) : 0;
            // Find top organism and mode from categorical charts
            const orgChart = categoricalCharts.find(c => c.fieldKey === 'organism');
            if (orgChart && orgChart.chartData.length > 0) topOrganism = orgChart.chartData[0].key;
            const modeChart = categoricalCharts.find(c => c.fieldKey === 'mode');
            if (modeChart && modeChart.chartData.length > 0) topMode = modeChart.chartData[0].key;
        }
        // Format size
        const formatSize = (bytes) => {
            if (!bytes || bytes === 0) return '0 B';
            const units = ['B', 'KB', 'MB', 'GB'];
            let i = 0; let v = bytes;
            while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
            return v.toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
        };
        if (isProjectData && data.overview) totalSize = data.overview.totalSize || 0;

        const completenessColor = avgCompleteness > 80 ? '#10b981' : avgCompleteness > 40 ? '#fbbf24' : '#ef4444';

        // ---- Compute Field Type Distribution ----
        let fieldTypeDistData = [];
        if (isProjectData && data.metadataAnalysis && data.metadataAnalysis.fieldTypes) {
            fieldTypeDistData = Object.entries(data.metadataAnalysis.fieldTypes)
                .map(([k, v]) => ({ key: k, value: v }))
                .sort((a, b) => b.value - a.value);
        }

        // ---- Build categorical charts HTML grid ----
        const categoricalChartsHtml = categoricalCharts.map((c, i) => `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px; display: flex; flex-direction: column;">
                <h5 style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 13px; font-weight: 600;">${this.escapeHtml(c.label)}</h5>
                <div id="dashDonut_${i}" style="width: 100%; flex: 1; min-height: 200px;"></div>
                <div id="dashDonutLegend_${i}" style="margin-top: 8px;"></div>
            </div>
        `).join('');

        container.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; min-height: 600px; background-color: #1e1e2e;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(59,130,246,0.05)); flex-shrink: 0;">
                    <div>
                        <h4 style="margin: 0; color: #e0e0e0; font-size: 18px;">📊 Metadata Analytics Dashboard</h4>
                        <p style="margin: 4px 0 0 0; color: #9ca3af; font-size: 12px;">Visual insights into your ${isProjectData ? totalProjects + ' scanned projects' : 'template metadata'}</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.copyToClipboard()" title="Copy JSON">📋 Copy JSON</button>
                    </div>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 20px; position: relative;" id="dashboardScrollContainer">
                    ${!isProjectData ? `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">
                            <svg fill="currentColor" viewBox="0 0 24 24" style="width: 64px; height: 64px; margin-bottom: 20px; opacity: 0.5;">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                            </svg>
                            <h4>Template Schema Loaded</h4>
                            <p>The dashboard is best used with scanned projects to analyze metadata values across multiple projects.</p>
                            <p style="margin-top: 5px; font-size: 13px;">Use the <strong>Tree View</strong> to inspect the single template schema.</p>
                        </div>
                    ` : `
                        <!-- ====== SUMMARY CARDS ====== -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 24px;">
                            <div style="background: linear-gradient(135deg, rgba(124,58,237,0.15), rgba(124,58,237,0.05)); border: 1px solid rgba(124,58,237,0.3); border-radius: 10px; padding: 16px; text-align: center;">
                                <div style="font-size: 28px; font-weight: 700; color: #a78bfa;">${totalProjects}</div>
                                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Projects</div>
                            </div>
                            <div style="background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05)); border: 1px solid rgba(59,130,246,0.3); border-radius: 10px; padding: 16px; text-align: center;">
                                <div style="font-size: 28px; font-weight: 700; color: #60a5fa;">${totalFields}</div>
                                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Total Fields</div>
                            </div>
                            <div style="background: linear-gradient(135deg, ${completenessColor}22, ${completenessColor}0a); border: 1px solid ${completenessColor}55; border-radius: 10px; padding: 16px; text-align: center;">
                                <div style="font-size: 28px; font-weight: 700; color: ${completenessColor};">${avgCompleteness}%</div>
                                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Avg Completeness</div>
                            </div>
                            <div style="background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05)); border: 1px solid rgba(16,185,129,0.3); border-radius: 10px; padding: 16px; text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; color: #34d399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(topOrganism)}">${this.escapeHtml(topOrganism)}</div>
                                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Top Organism</div>
                            </div>
                            <div style="background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05)); border: 1px solid rgba(245,158,11,0.3); border-radius: 10px; padding: 16px; text-align: center;">
                                <div style="font-size: 14px; font-weight: 600; color: #fbbf24; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${this.escapeHtml(topMode)}">${this.escapeHtml(topMode)}</div>
                                <div style="font-size: 11px; color: #9ca3af; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Top Mode</div>
                            </div>
                        </div>

                        <!-- ====== AUTOMATIC VALUE-FREQUENCY DONUTS ====== -->
                        <h5 style="color: #d1d5db; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">📈 Metadata Value Frequencies</h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px;">
                            ${categoricalChartsHtml}
                        </div>

                        <!-- ====== FIELD TYPE DISTRIBUTION + TIMELINE ====== -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
                                <h5 style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 13px;">Field Type Distribution</h5>
                                <div id="dashFieldTypeDonut" style="width: 100%; height: 220px;"></div>
                            </div>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
                                <h5 style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 13px;">Project Timeline</h5>
                                <div id="dashTimelineChart" style="width: 100%; height: 220px;"></div>
                            </div>
                        </div>

                        <!-- ====== COMPLETENESS DISTRIBUTION ====== -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
                                <h5 style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 13px;">Completeness Distribution</h5>
                                <div id="dashCompletenessDonut" style="width: 100%; height: 220px;"></div>
                            </div>
                            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
                                <h5 style="margin: 0 0 10px 0; color: #e0e0e0; font-size: 13px;">Top Metadata Fields</h5>
                                <div id="dashFieldFreqBar" style="width: 100%; height: 220px;"></div>
                            </div>
                        </div>

                        <!-- ====== PROJECT TABLE ====== -->
                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 16px;">
                            <h5 style="margin: 0 0 12px 0; color: #e0e0e0; font-size: 13px;">Scanned Projects (${totalProjects})</h5>
                            <div style="max-height: 350px; overflow-y: auto; border-radius: 6px;">
                                <table style="width: 100%; text-align: left; border-collapse: collapse;">
                                    <thead style="position: sticky; top: 0; background: #1a1a2e; z-index: 10;">
                                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.12); color: #9ca3af; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            <th style="padding: 10px 12px;">Project</th>
                                            <th style="padding: 10px 12px;">Path</th>
                                            <th style="padding: 10px 12px; text-align: center;">Fields</th>
                                            <th style="padding: 10px 12px;">Completeness</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${data.projects ? data.projects.map((p, idx) => `
                                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); ${idx % 2 === 0 ? 'background: rgba(255,255,255,0.015);' : ''}">
                                                <td style="padding: 9px 12px; color: #e0e0e0; font-weight: 500;">${p.displayName || p.name}</td>
                                                <td style="padding: 9px 12px; color: #6b7280; font-size: 11px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.path}">${p.path}</td>
                                                <td style="padding: 9px 12px; color: #fbbf24; text-align: center; font-weight: 600;">${p.metadataFieldCount || 0}</td>
                                                <td style="padding: 9px 12px;">
                                                    <div style="display: flex; align-items: center; gap: 8px;">
                                                        <div style="flex: 1; background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; min-width: 60px;">
                                                            <div style="width: ${p.completeness || 0}%; background: ${(p.completeness || 0) > 80 ? '#10b981' : (p.completeness || 0) > 40 ? '#fbbf24' : '#ef4444'}; height: 100%; border-radius: 3px; transition: width 0.3s ease;"></div>
                                                        </div>
                                                        <span style="font-size: 11px; color: #9ca3af; min-width: 32px; text-align: right;">${p.completeness || 0}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        `).join('') : ''}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `}
                </div>
            </div>
        `;

        if (isProjectData) {
            setTimeout(() => this.renderDashboardCharts(data, categoricalCharts, fieldTypeDistData), 50);
        }
    },

    renderDashboardCharts(data, categoricalCharts, fieldTypeDistData) {
        if (typeof d3 === 'undefined') return;

        try {
            // 1. Render all categorical donut charts
            categoricalCharts.forEach((c, i) => {
                const palette = this._chartPalettes[i % this._chartPalettes.length];
                this.drawDonutChart(`#dashDonut_${i}`, c.chartData, palette);
                // Add legend below the donut
                const legendEl = document.getElementById(`dashDonutLegend_${i}`);
                if (legendEl && c.chartData.length > 0) {
                    const color = d3.scaleOrdinal().domain(c.chartData.map(d => d.key)).range(palette);
                    legendEl.innerHTML = c.chartData.slice(0, 6).map(d => `
                        <span style="display: inline-flex; align-items: center; gap: 4px; margin-right: 10px; font-size: 11px; color: #d1d5db;">
                            <span style="width: 8px; height: 8px; border-radius: 2px; background: ${color(d.key)}; display: inline-block;"></span>
                            ${this.escapeHtml(d.key)} <span style="color: #6b7280;">(${d.value})</span>
                        </span>
                    `).join('');
                }
            });

            // 2. Field Type Distribution donut
            if (fieldTypeDistData.length > 0) {
                this.drawDonutChart('#dashFieldTypeDonut', fieldTypeDistData, this._chartPalettes[5]);
            }

            // 3. Completeness Distribution donut
            const compBuckets = [
                { key: '0–20%', value: 0 }, { key: '21–40%', value: 0 },
                { key: '41–60%', value: 0 }, { key: '61–80%', value: 0 }, { key: '81–100%', value: 0 }
            ];
            data.projects.forEach(p => {
                const c = p.completeness || 0;
                if (c <= 20) compBuckets[0].value++;
                else if (c <= 40) compBuckets[1].value++;
                else if (c <= 60) compBuckets[2].value++;
                else if (c <= 80) compBuckets[3].value++;
                else compBuckets[4].value++;
            });
            this.drawDonutChart('#dashCompletenessDonut', compBuckets.filter(b => b.value > 0),
                ['#ef4444', '#f59e0b', '#fbbf24', '#10b981', '#059669']);

            // 4. Top Metadata Fields horizontal bar
            if (data.metadataAnalysis && data.metadataAnalysis.fieldFrequency) {
                const fieldFreqData = Object.entries(data.metadataAnalysis.fieldFrequency)
                    .map(([k, v]) => ({ key: k, value: v }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);
                this.drawHorizontalBarChart('#dashFieldFreqBar', fieldFreqData, '#7c3aed');
            }

            // 5. Timeline
            this.drawTimelineChart('#dashTimelineChart', data.projects);

        } catch (error) {
            console.error('❌ Error rendering Dashboard charts:', error);
        }
    },

    // Legacy drawBarChart kept for compatibility with other code paths
    drawBarChart(selector, data, xKey, yKey, color, rotateLabels = false) {
        const container = document.querySelector(selector);
        if (!container || data.length === 0) return;
        container.innerHTML = '';

        const margin = { top: 20, right: 20, bottom: rotateLabels ? 90 : 30, left: 50 };
        const width = container.clientWidth - margin.left - margin.right;
        const height = container.clientHeight - margin.top - margin.bottom;
        if (width <= 0 || height <= 0) return;

        let tooltip = d3.select('body').select('.metafold-d3-tooltip');
        if (tooltip.empty()) {
            tooltip = d3.select('body').append('div')
                .attr('class', 'metafold-d3-tooltip')
                .style('opacity', 0).style('position', 'absolute')
                .style('background', 'rgba(15,15,30,0.95)').style('border', '1px solid #4b5563')
                .style('color', '#fff').style('padding', '8px 12px').style('border-radius', '6px')
                .style('font-size', '12px').style('pointer-events', 'none')
                .style('z-index', 10000);
        }

        const svg = d3.select(container).append('svg')
            .attr('width', container.clientWidth).attr('height', container.clientHeight)
            .append('g').attr('transform', `translate(${margin.left},${margin.top})`);

        const x = d3.scaleBand().range([0, width]).padding(0.3).domain(data.map(d => d[xKey]));
        const y = d3.scaleLinear().range([height, 0]).domain([0, d3.max(data, d => d[yKey]) * 1.1]);

        const xAxis = svg.append('g').attr('transform', `translate(0,${height})`).call(d3.axisBottom(x)).selectAll('text').attr('fill', '#9ca3af');
        if (rotateLabels) xAxis.attr('transform', 'translate(-10,0)rotate(-45)').style('text-anchor', 'end').style('font-size', '11px');
        else xAxis.style('font-size', '11px');
        svg.selectAll('.domain, .tick line').attr('stroke', '#4b5563');

        svg.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('d'))).selectAll('text').attr('fill', '#9ca3af').style('font-size', '11px');
        svg.selectAll('.domain, .tick line').attr('stroke', '#4b5563');

        svg.selectAll('.bar').data(data).enter().append('rect')
            .attr('class', 'bar').attr('x', d => x(d[xKey])).attr('width', x.bandwidth())
            .attr('y', d => y(d[yKey])).attr('height', d => height - y(d[yKey]))
            .attr('fill', color).attr('rx', 3)
            .on('mouseover', function(event, d) {
                d3.select(this).transition().duration(200).attr('fill', d3.color(color).brighter(0.5));
                tooltip.transition().duration(200).style('opacity', 1);
                tooltip.html(`<strong>${d[xKey]}</strong><br/>Count: ${d[yKey]}`)
                    .style('left', (event.pageX + 10) + 'px').style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).transition().duration(200).attr('fill', color);
                tooltip.transition().duration(500).style('opacity', 0);
            });
    },

    // Legacy toggleView function for backward compatibility
    toggleView(viewType) {
        // Map legacy view types to new visualization types
        const typeMapping = {
            'graph': 'jsoncrack',
            'tree': 'tree',
            'raw': 'tree' // Raw view is handled within tree view now
        };
        
        const newType = typeMapping[viewType] || viewType;
        this.setVisualizationType(newType);
    },

    // Create interactive JSON tree HTML (PRESERVED from original with enhancements)
    createJsonTreeHTML(obj, level = 0) {
        let html = '';
        const indent = '  '.repeat(level);
        
        if (Array.isArray(obj)) {
            html += `<div class="json-array" style="margin-left: ${level * 20}px;">`;
            html += `<span class="json-bracket">[</span>`;
            obj.forEach((item, index) => {
                html += `<div class="json-item">`;
                html += `<span class="json-index">${index}:</span> `;
                if (typeof item === 'object' && item !== null) {
                    html += this.createJsonTreeHTML(item, level + 1);
                } else {
                    html += `<span class="json-value json-${typeof item}">${this.formatValue(item)}</span>`;
                }
                if (index < obj.length - 1) html += '<span class="json-comma">,</span>';
                html += `</div>`;
            });
            html += `<span class="json-bracket">]</span>`;
            html += `</div>`;
        } else if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            html += `<div class="json-object" style="margin-left: ${level * 20}px;">`;
            
            if (level > 0) {
                html += `<div class="json-toggle" onclick="visualizationManager.toggleNode(this)" data-expanded="true">`;
                html += `<span class="json-expand-icon">▼</span>`;
                html += `<span class="json-bracket">{</span>`;
                html += `<span class="json-object-info"> ${keys.length} ${keys.length === 1 ? 'property' : 'properties'}</span>`;
                html += `</div>`;
                html += `<div class="json-content">`;
            } else {
                html += `<span class="json-bracket">{</span>`;
            }
            
            keys.forEach((key, index) => {
                html += `<div class="json-property" style="margin-left: ${level > 0 ? 20 : 0}px;">`;
                html += `<span class="json-key">"${key}"</span><span class="json-colon">: </span>`;
                
                const value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    html += this.createJsonTreeHTML(value, level + 1);
                } else {
                    html += `<span class="json-value json-${typeof value}">${this.formatValue(value)}</span>`;
                }
                
                if (index < keys.length - 1) html += '<span class="json-comma">,</span>';
                html += `</div>`;
            });
            
            if (level > 0) {
                html += `</div>`;
            }
            html += `<span class="json-bracket">}</span>`;
            html += `</div>`;
        } else {
            html += `<span class="json-value json-${typeof obj}">${this.formatValue(obj)}</span>`;
        }
        
        return html;
    },

    // Format individual values for display (PRESERVED from original)
    formatValue(value) {
        if (typeof value === 'string') {
            return `"${this.escapeHtml(value)}"`;
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (typeof value === 'boolean') {
            return value.toString();
        } else if (value === null) {
            return 'null';
        } else if (value === undefined) {
            return 'undefined';
        }
        return this.escapeHtml(String(value));
    },

    // Escape HTML for safe display (PRESERVED from original)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Setup tree interaction (PRESERVED from original)
    setupTreeInteraction() {
        if (!document.getElementById('jsonTreeStyles')) {
            const style = document.createElement('style');
            style.id = 'jsonTreeStyles';
            style.textContent = `
                .json-key { color: #7dd3fc; font-weight: bold; }
                .json-string { color: #86efac; }
                .json-number { color: #fbbf24; }
                .json-boolean { color: #f472b6; }
                .json-null { color: #9ca3af; }
                .json-bracket { color: #e0e0e0; font-weight: bold; }
                .json-colon { color: #e0e0e0; }
                .json-comma { color: #e0e0e0; }
                .json-toggle { cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 2px 0; }
                .json-toggle:hover { background: rgba(255,255,255,0.05); border-radius: 4px; }
                .json-expand-icon { font-size: 10px; transition: transform 0.2s; }
                .json-expand-icon.collapsed { transform: rotate(-90deg); }
                .json-object-info { color: #9ca3af; font-size: 12px; }
                .json-property { margin: 2px 0; }
                .json-content { transition: all 0.3s ease; }
                .json-content.collapsed { display: none; }
            `;
            document.head.appendChild(style);
        }
    },

    // Toggle tree node expansion (PRESERVED from original)
    toggleNode(element) {
        const icon = element.querySelector('.json-expand-icon');
        const content = element.nextElementSibling;
        const isExpanded = element.getAttribute('data-expanded') === 'true';
        
        if (isExpanded) {
            icon.classList.add('collapsed');
            content.classList.add('collapsed');
            element.setAttribute('data-expanded', 'false');
        } else {
            icon.classList.remove('collapsed');
            content.classList.remove('collapsed');
            element.setAttribute('data-expanded', 'true');
        }
    },

    // Copy current data to clipboard (PRESERVED from original)
    async copyToClipboard() {
        if (!this.currentData) {
            this.showError('No data to copy');
            return;
        }

        try {
            const jsonString = JSON.stringify(this.currentData, null, 2);
            await navigator.clipboard.writeText(jsonString);
            this.showSuccess('JSON data copied to clipboard');
        } catch (error) {
            console.error('❌ Error copying to clipboard:', error);
            this.showError('Failed to copy to clipboard');
        }
    },

    // Export visualization (PRESERVED from original)
    exportVisualization() {
        if (!this.currentData) {
            this.showError('No data to export');
            return;
        }

        try {
            const jsonString = JSON.stringify(this.currentData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `metafold-visualization-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showSuccess('Visualization data exported successfully');
            
        } catch (error) {
            console.error('❌ Error exporting visualization:', error);
            this.showError('Failed to export visualization');
        }
    },

    // Render tree visualization (PRESERVED from original)
    renderMetadataTreeVisualization(data) {
        console.log('🏷️ Rendering Metadata Tree visualization...');
        
        const container = document.getElementById('visualizationContent');
        if (!container) return;

        container.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; min-height: 600px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); flex-shrink: 0;">
                    <div>
                        <h4 style="margin: 0; color: #e0e0e0;">🏷️ Metadata Tree</h4>
                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Hierarchical view grouping projects by metadata attributes</p>
                    </div>
                </div>
                <div id="metadataGraphContainer" style="flex: 1; position: relative; overflow: hidden; background: #111827; min-height: 500px;"></div>
            </div>
        `;

        if (typeof window.renderMetaFoldMetadataGraph === 'function') {
            window.renderMetaFoldMetadataGraph('metadataGraphContainer', data);
        } else {
            document.getElementById('metadataGraphContainer').innerHTML = '<div style="color:red; padding: 20px;">Metadata Graph module not loaded.</div>';
        }
    },

    renderTreeVisualization(data) {
        console.log('🌳 Rendering tree visualization...');
        
        const container = document.getElementById('visualizationContent');
        if (!container) {
            console.error('❌ Visualization container not found');
            return;
        }

        container.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; min-height: 600px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); flex-shrink: 0;">
                    <div>
                        <h4 style="margin: 0; color: #e0e0e0;">🌳 Tree View</h4>
                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Collapsible tree structure of your JSON data</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.copyToClipboard()" title="Copy JSON">
                            📋 Copy
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.exportVisualization()" title="Export">
                            💾 Export
                        </button>
                    </div>
                </div>
                <div style="flex: 1; overflow: auto; position: relative; min-height: 500px;">
                    <div id="jsonTreeView" style="height: 100%; overflow: auto; padding: 20px; min-height: 500px;">
                        ${this.createJsonTreeHTML(data)}
                    </div>
                </div>
            </div>
        `;

        // Setup tree interaction
        this.setupTreeInteraction();
    },

    // Render D3.js force-directed graph (PRESERVED from original)
    renderD3Graph(data) {
        // CRITICAL: Check if D3.js is available before proceeding
        if (typeof d3 === 'undefined') {
            console.error('❌ D3.js not available, cannot render graph');
            return;
        }

        const container = document.getElementById('d3GraphContainer');
        if (!container) {
            console.warn('⚠️ D3 graph container not found');
            return;
        }

        // Clear previous content
        container.innerHTML = '';

        try {
            // Convert JSON to nodes and links
            const { nodes, links } = this.convertJSONToGraph(data);
            
            const width = container.clientWidth;
            const height = container.clientHeight;

            if (width <= 0 || height <= 0) {
                console.warn('⚠️ Container has invalid dimensions:', { width, height });
                return;
            }

            // Create SVG
            const svg = d3.select(container)
                .append('svg')
                .attr('width', width)
                .attr('height', height)
                .style('background', 'linear-gradient(135deg, #1e1e2e, #2a2a40)');

            // Add zoom behavior
            const g = svg.append('g');
            const zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });
            svg.call(zoom);

            // Create force simulation
            const simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(100))
                .force('charge', d3.forceManyBody().strength(-300))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collision', d3.forceCollide().radius(30));

            // Add links
            const link = g.append('g')
                .selectAll('line')
                .data(links)
                .enter().append('line')
                .attr('stroke', '#666')
                .attr('stroke-opacity', 0.6)
                .attr('stroke-width', 2);

            // Add nodes
            const node = g.append('g')
                .selectAll('circle')
                .data(nodes)
                .enter().append('circle')
                .attr('r', d => d.type === 'object' ? 20 : d.type === 'array' ? 15 : 10)
                .attr('fill', d => this.getNodeColor(d.type))
                .attr('stroke', '#fff')
                .attr('stroke-width', 2)
                .call(d3.drag()
                    .on('start', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0.3).restart();
                        d.fx = d.x;
                        d.fy = d.y;
                    })
                    .on('drag', (event, d) => {
                        d.fx = event.x;
                        d.fy = event.y;
                    })
                    .on('end', (event, d) => {
                        if (!event.active) simulation.alphaTarget(0);
                        d.fx = null;
                        d.fy = null;
                    }));

            // Add labels
            const label = g.append('g')
                .selectAll('text')
                .data(nodes)
                .enter().append('text')
                .text(d => d.label)
                .attr('font-size', '12px')
                .attr('fill', '#e0e0e0')
                .attr('text-anchor', 'middle')
                .attr('dy', 35);

            // Add tooltips
            node.append('title')
                .text(d => `${d.label}\nType: ${d.type}\nValue: ${d.value || 'N/A'}`);

            // Update positions on simulation tick
            simulation.on('tick', () => {
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);

                node
                    .attr('cx', d => d.x)
                    .attr('cy', d => d.y);

                label
                    .attr('x', d => d.x)
                    .attr('y', d => d.y);
            });

            console.log('✅ D3.js graph rendered with', nodes.length, 'nodes and', links.length, 'links');

        } catch (error) {
            console.error('❌ Error rendering D3 graph:', error);
            container.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #9ca3af;">Error rendering graph visualization</div>';
        }
    },

    // Convert JSON data to graph nodes and links (PRESERVED from original)
    convertJSONToGraph(data, parentId = null, path = '') {
        let nodes = [];
        let links = [];
        let nodeId = 0;

        function traverse(obj, parent = null, currentPath = '') {
            const id = `node_${nodeId++}`;
            const type = Array.isArray(obj) ? 'array' : typeof obj === 'object' && obj !== null ? 'object' : 'primitive';
            
            let label, value;
            if (type === 'primitive') {
                label = currentPath.split('.').pop() || 'root';
                value = obj;
            } else if (type === 'array') {
                label = currentPath.split('.').pop() || 'array';
                value = `Array[${obj.length}]`;
            } else {
                label = currentPath.split('.').pop() || 'object';
                value = `Object{${Object.keys(obj).length}}`;
            }

            nodes.push({
                id,
                label: label.length > 15 ? label.substring(0, 12) + '...' : label,
                type,
                value,
                fullPath: currentPath
            });

            if (parent) {
                links.push({
                    source: parent,
                    target: id
                });
            }

            if (type === 'object' && obj !== null) {
                Object.keys(obj).forEach(key => {
                    const newPath = currentPath ? `${currentPath}.${key}` : key;
                    traverse(obj[key], id, newPath);
                });
            } else if (type === 'array') {
                obj.forEach((item, index) => {
                    const newPath = `${currentPath}[${index}]`;
                    traverse(item, id, newPath);
                });
            }
        }

        traverse(data, parentId, path);
        return { nodes, links };
    },

    // Get color for node type (PRESERVED from original)
    getNodeColor(type) {
        const colors = {
            object: '#7c3aed',   // Purple for objects
            array: '#3b82f6',    // Blue for arrays
            primitive: '#10b981', // Green for primitives
            string: '#10b981',   // Green for strings
            number: '#f59e0b',   // Yellow for numbers
            boolean: '#ef4444'   // Red for booleans
        };
        return colors[type] || '#6b7280';
    },

    // Legacy toggleView function for backward compatibility
    toggleView(viewType) {
        // Map legacy view types to new visualization types
        const typeMapping = {
            'graph': 'jsoncrack',
            'tree': 'tree',
            'raw': 'tree' // Raw view is handled within tree view now
        };
        
        const newType = typeMapping[viewType] || viewType;
        this.setVisualizationType(newType);
    },

    // Create interactive JSON tree HTML (PRESERVED from original with enhancements)
    createJsonTreeHTML(obj, level = 0) {
        let html = '';
        const indent = '  '.repeat(level);
        
        if (Array.isArray(obj)) {
            html += `<div class="json-array" style="margin-left: ${level * 20}px;">`;
            html += `<span class="json-bracket">[</span>`;
            obj.forEach((item, index) => {
                html += `<div class="json-item">`;
                html += `<span class="json-index">${index}:</span> `;
                if (typeof item === 'object' && item !== null) {
                    html += this.createJsonTreeHTML(item, level + 1);
                } else {
                    html += `<span class="json-value json-${typeof item}">${this.formatValue(item)}</span>`;
                }
                if (index < obj.length - 1) html += '<span class="json-comma">,</span>';
                html += `</div>`;
            });
            html += `<span class="json-bracket">]</span>`;
            html += `</div>`;
        } else if (typeof obj === 'object' && obj !== null) {
            const keys = Object.keys(obj);
            html += `<div class="json-object" style="margin-left: ${level * 20}px;">`;
            
            if (level > 0) {
                html += `<div class="json-toggle" onclick="visualizationManager.toggleNode(this)" data-expanded="true">`;
                html += `<span class="json-expand-icon">▼</span>`;
                html += `<span class="json-bracket">{</span>`;
                html += `<span class="json-object-info"> ${keys.length} ${keys.length === 1 ? 'property' : 'properties'}</span>`;
                html += `</div>`;
                html += `<div class="json-content">`;
            } else {
                html += `<span class="json-bracket">{</span>`;
            }
            
            keys.forEach((key, index) => {
                html += `<div class="json-property" style="margin-left: ${level > 0 ? 20 : 0}px;">`;
                html += `<span class="json-key">"${key}"</span><span class="json-colon">: </span>`;
                
                const value = obj[key];
                if (typeof value === 'object' && value !== null) {
                    html += this.createJsonTreeHTML(value, level + 1);
                } else {
                    html += `<span class="json-value json-${typeof value}">${this.formatValue(value)}</span>`;
                }
                
                if (index < keys.length - 1) html += '<span class="json-comma">,</span>';
                html += `</div>`;
            });
            
            if (level > 0) {
                html += `</div>`;
            }
            html += `<span class="json-bracket">}</span>`;
            html += `</div>`;
        } else {
            html += `<span class="json-value json-${typeof obj}">${this.formatValue(obj)}</span>`;
        }
        
        return html;
    },

    // Format individual values for display (PRESERVED from original)
    formatValue(value) {
        if (typeof value === 'string') {
            return `"${this.escapeHtml(value)}"`;
        } else if (typeof value === 'number') {
            return value.toString();
        } else if (typeof value === 'boolean') {
            return value.toString();
        } else if (value === null) {
            return 'null';
        } else if (value === undefined) {
            return 'undefined';
        }
        return this.escapeHtml(String(value));
    },

    // Escape HTML for safe display (PRESERVED from original)
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Setup tree interaction (PRESERVED from original)
    setupTreeInteraction() {
        if (!document.getElementById('jsonTreeStyles')) {
            const style = document.createElement('style');
            style.id = 'jsonTreeStyles';
            style.textContent = `
                .json-key { color: #7dd3fc; font-weight: bold; }
                .json-string { color: #86efac; }
                .json-number { color: #fbbf24; }
                .json-boolean { color: #f472b6; }
                .json-null { color: #9ca3af; }
                .json-bracket { color: #e0e0e0; font-weight: bold; }
                .json-colon { color: #e0e0e0; }
                .json-comma { color: #e0e0e0; }
                .json-toggle { cursor: pointer; display: flex; align-items: center; gap: 5px; padding: 2px 0; }
                .json-toggle:hover { background: rgba(255,255,255,0.05); border-radius: 4px; }
                .json-expand-icon { font-size: 10px; transition: transform 0.2s; }
                .json-expand-icon.collapsed { transform: rotate(-90deg); }
                .json-object-info { color: #9ca3af; font-size: 12px; }
                .json-property { margin: 2px 0; }
                .json-content { transition: all 0.3s ease; }
                .json-content.collapsed { display: none; }
            `;
            document.head.appendChild(style);
        }
    },

    // Toggle tree node expansion (PRESERVED from original)
    toggleNode(element) {
        const icon = element.querySelector('.json-expand-icon');
        const content = element.nextElementSibling;
        const isExpanded = element.getAttribute('data-expanded') === 'true';
        
        if (isExpanded) {
            icon.classList.add('collapsed');
            content.classList.add('collapsed');
            element.setAttribute('data-expanded', 'false');
        } else {
            icon.classList.remove('collapsed');
            content.classList.remove('collapsed');
            element.setAttribute('data-expanded', 'true');
        }
    },

    // Copy current data to clipboard (PRESERVED from original)
    async copyToClipboard() {
        if (!this.currentData) {
            this.showError('No data to copy');
            return;
        }

        try {
            const jsonString = JSON.stringify(this.currentData, null, 2);
            await navigator.clipboard.writeText(jsonString);
            this.showSuccess('JSON data copied to clipboard');
        } catch (error) {
            console.error('❌ Error copying to clipboard:', error);
            this.showError('Failed to copy to clipboard');
        }
    },

    // Export visualization (PRESERVED from original)
    exportVisualization() {
        if (!this.currentData) {
            this.showError('No data to export');
            return;
        }

        try {
            const jsonString = JSON.stringify(this.currentData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `metafold-visualization-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            
            URL.revokeObjectURL(url);
            this.showSuccess('Visualization data exported successfully');
            
        } catch (error) {
            console.error('❌ Error exporting visualization:', error);
            this.showError('Failed to export visualization');
        }
    },


    // =================== KNOWLEDGE GRAPH (Hierarchical Tidy-Tree) ===================

    // Render Knowledge Graph visualization
    renderKnowledgeGraphVisualization(data) {
        console.log('🌌 Rendering Knowledge Graph (Tidy-Tree) visualization...');
        
        const container = document.getElementById('visualizationContent');
        if (!container) return;

        if (typeof d3 === 'undefined') {
            console.warn('⚠️ D3.js not available, falling back to tree view');
            this.setVisualizationType('tree');
            return;
        }

        container.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; min-height: 600px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05)); flex-shrink: 0;">
                    <div>
                        <h4 style="margin: 0; color: #e0e0e0;">🌌 Knowledge Graph</h4>
                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Hierarchical tree: Metadata Categories → Values → Projects &nbsp;|&nbsp; Scroll to zoom, drag to pan, click nodes to collapse</p>
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center;">
                        <div id="kg-action-bar" style="display: flex; gap: 10px; align-items: center;"></div>
                        <div id="kgLegend" style="display: flex; gap: 12px; font-size: 11px; color: #9ca3af;"></div>
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.copyToClipboard()" title="Copy JSON">📋 Copy</button>
                    </div>
                </div>
                <div style="flex: 1; overflow: hidden; position: relative; min-height: 500px;">
                    <div id="knowledgeGraphContainer" style="width: 100%; height: 100%; min-height: 500px;"></div>
                </div>
            </div>
        `;

        setTimeout(() => this.renderKnowledgeGraph(data), 50);
    },

    // Render the actual D3 Hierarchical Tidy-Tree Knowledge Graph
    renderLineageTreeVisualization(data) {
        const container = document.getElementById('visualizationContent');
        if (!container) return;
        container.innerHTML = `<div style="height: 100vh; display: flex; flex-direction: column; min-height: 600px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); flex-shrink: 0;">
                <div>
                    <h4 style="margin: 0; color: #e0e0e0;">🌱 Lineage Tree</h4>
                    <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Collapsible Data Lineage</p>
                </div>
                <div id="lineage-action-bar" style="display:flex; gap:10px;"></div>
            </div>
            <div style="flex: 1; overflow: hidden; position: relative; min-height: 500px;">
                <div id="lineageTreeContainer" style="width: 100%; height: 100%; min-height: 500px;"></div>
            </div>
        </div>`;
        setTimeout(() => {
            if (window.renderMetaFoldLineageTree) {
                window.renderMetaFoldLineageTree('lineageTreeContainer', data);
            } else {
                console.error('Lineage Tree module not loaded!');
            }
        }, 50);
    },

    // Render the actual D3 Hierarchical Tidy-Tree Knowledge Graph
    renderKnowledgeGraph(data) {
        if (window.renderMetaFoldKnowledgeGraph) {
            window.renderMetaFoldKnowledgeGraph('knowledgeGraphContainer', data);
        } else {
            console.error('Knowledge Graph module not loaded!');
        }
    },


    // Generate statistics for metadata (PRESERVED from original)
    generateStatistics(metadataSchema, currentValues) {
        const stats = {
            totalFields: 0,
            filledFields: 0,
            fieldTypes: {},
            completionPercentage: 0
        };

        if (!metadataSchema) return stats;

        stats.totalFields = Object.keys(metadataSchema).length;
        
        Object.values(metadataSchema).forEach(field => {
            const type = field.type || 'unknown';
            stats.fieldTypes[type] = (stats.fieldTypes[type] || 0) + 1;
        });

        if (currentValues) {
            stats.filledFields = Object.keys(currentValues).filter(key => 
                currentValues[key] !== null && 
                currentValues[key] !== undefined && 
                currentValues[key] !== ''
            ).length;
        }

        stats.completionPercentage = stats.totalFields > 0 ? 
            Math.round((stats.filledFields / stats.totalFields) * 100) : 0;

        return stats;
    },

    // Show success message (PRESERVED from original)
    showSuccess(message) {
        console.log('✅ Visualization:', message);
        if (window.projectManager && typeof window.projectManager.showSuccess === 'function') {
            window.projectManager.showSuccess(message);
        }
    },

    // Show error message (PRESERVED from original)
    showError(message) {
        console.error('❌ Visualization:', message);
        if (window.projectManager && typeof window.projectManager.showError === 'function') {
            window.projectManager.showError(message);
        }
    }
};

// CRITICAL: Make globally available - this was missing!
window.visualizationManager = visualizationManager;

// Export Lineage function for use by Knowledge Graph and Lineage Tree context menus
window.generateLineageHtml = function(exportData) {
    const rootName = exportData.rootProject;
    const timestamp = new Date(exportData.timestamp).toLocaleString();
    
    // --- Topological Sort ---
    const projMap = new Map();
    const adjList = new Map();
    const inDegree = new Map();
    
    exportData.projects.forEach(p => {
        projMap.set(p.path, p);
        adjList.set(p.path, []);
        inDegree.set(p.path, 0);
    });

    exportData.projects.forEach(p => {
        const parents = p.lineage?.lineage_links?.map(link => link.source_path) || [];
        parents.forEach(parentPath => {
            if (adjList.has(parentPath)) {
                adjList.get(parentPath).push(p.path);
                inDegree.set(p.path, inDegree.get(p.path) + 1);
            }
        });
    });

    // Kahn's Algorithm
    const queue = [];
    for (const [path, deg] of inDegree.entries()) {
        if (deg === 0) queue.push(path);
    }

    const sortedProjects = [];
    while (queue.length > 0) {
        const curr = queue.shift();
        sortedProjects.push(projMap.get(curr));
        
        adjList.get(curr).forEach(neighbor => {
            inDegree.set(neighbor, inDegree.get(neighbor) - 1);
            if (inDegree.get(neighbor) === 0) {
                queue.push(neighbor);
            }
        });
    }

    // Append any disconnected components (should not happen in a valid lineage)
    if (sortedProjects.length < exportData.projects.length) {
        exportData.projects.forEach(p => {
            if (!sortedProjects.find(sp => sp.path === p.path)) sortedProjects.push(p);
        });
    }

    // --- Generate Mermaid Graph ---
    let mermaidGraph = `graph TD;\n`;
    
    // Define CSS Classes
    mermaidGraph += `    classDef root fill:#cba6f7,stroke:#11111b,stroke-width:2px,color:#11111b,font-weight:bold;\n`;
    mermaidGraph += `    classDef direct fill:#89b4fa,stroke:#11111b,stroke-width:1px,color:#11111b;\n`;
    mermaidGraph += `    classDef indirect fill:#313244,stroke:#1e1e2e,stroke-width:1px,color:#cdd6f4;\n\n`;

    exportData.projects.forEach(p => {
        const cleanName = p.name.replace(/[^a-zA-Z0-9]/g, '_');
        
        let nodeClass = "indirect";
        if (p.path === exportData.rootProjectPath || p.name === exportData.rootProject) {
            nodeClass = "root";
        } else if (exportData.directLineagePaths && exportData.directLineagePaths.includes(p.path)) {
            nodeClass = "direct";
        }
        
        mermaidGraph += `    node_${cleanName}["${p.name}"]:::${nodeClass}\n`;
        const parents = p.lineage?.lineage_links?.map(link => link.source_path) || [];
        parents.forEach(parentPath => {
            const parent = projMap.get(parentPath);
            if (parent) {
                const parentClean = parent.name.replace(/[^a-zA-Z0-9]/g, '_');
                mermaidGraph += `    node_${parentClean} --> node_${cleanName}\n`;
            }
        });
        
        // Add click event for navigation
        mermaidGraph += `    click node_${cleanName} href "#card_${cleanName}" "Go to project details"\n`;
    });
    
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lineage Export - ${rootName}</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
            });
        </script>
        <style>
            html { scroll-behavior: smooth; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #1e1e2e; color: #cdd6f4; margin: 0; padding: 20px; }
            h1 { color: #89b4fa; text-align: center; border-bottom: 2px solid #313244; padding-bottom: 10px; }
            .meta { text-align: center; color: #a6adc8; margin-bottom: 30px; font-size: 0.9em; }
            .container { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; }
            .mermaid-container { background: #181825; border: 1px solid #313244; border-radius: 8px; padding: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.3); overflow-x: auto; margin-bottom: 20px; }
            .project-card { background: #181825; border: 1px solid #313244; border-radius: 8px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); scroll-margin-top: 20px; }
            .project-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #313244; padding-bottom: 15px; margin-bottom: 15px; }
            .project-title { font-size: 1.4em; font-weight: bold; color: #cba6f7; margin: 0; }
            .project-id { font-size: 0.8em; color: #6c7086; font-family: monospace; margin-top: 5px; }
            .section-title { font-weight: bold; color: #89b4fa; margin-top: 15px; margin-bottom: 5px; font-size: 1.1em; }
            .actions { display: flex; gap: 10px; margin-top: 15px; flex-wrap: wrap; }
            .btn { display: inline-flex; align-items: center; padding: 6px 12px; background: #313244; color: #cdd6f4; text-decoration: none; border-radius: 4px; font-size: 0.9em; transition: background 0.2s; border: 1px solid #45475a; cursor: pointer; }
            .btn:hover { background: #45475a; }
            .btn-omero { background: #1e3a8a; border-color: #1d4ed8; color: #bfdbfe; }
            .btn-omero:hover { background: #1d4ed8; }
            .btn-elab { background: #14532d; border-color: #15803d; color: #bbf7d0; }
            .btn-elab:hover { background: #15803d; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 0.9em; table-layout: fixed; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #313244; }
            th { color: #a6adc8; font-weight: normal; width: 30%; vertical-align: top; }
            td { color: #cdd6f4; word-wrap: break-word; }
            .lineage-info { background: #11111b; padding: 12px; border-radius: 6px; margin-top: 15px; font-size: 0.9em; border: 1px solid #313244; }
            .badge { display: inline-block; background: #45475a; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; margin-right: 5px; margin-bottom: 5px; border: 1px solid #585b70; color: #f5e0dc; }
        </style>
    </head>
    <body>
        <h1>MetaFold Lineage Export</h1>
        <div class="meta">Root Project: <strong style="color: #cba6f7;">${rootName}</strong> | Exported on: ${timestamp}</div>
        <div class="container">
            <div class="mermaid-container">
                <div class="section-title" style="margin-top: 0; text-align: left;">Lineage Flowchart</div>
                <div class="mermaid">
${mermaidGraph}
                </div>
            </div>
    `;

    sortedProjects.forEach((proj, index) => {
        let omeroUrl = '';
        let elabUrl = '';
        
        if (proj.integrations) {
            const o = proj.integrations.omero || proj.integrations.OMERO || {};
            omeroUrl = o.url || o.link || o.webUrl || '';
            const e = proj.integrations.elabftw || proj.integrations.elabFTW || {};
            elabUrl = e.url || e.link || '';
        }

        if (!omeroUrl || !elabUrl) {
            if (proj.metadata) {
                for (const [key, val] of Object.entries(proj.metadata)) {
                    if (val && typeof val.value === 'string' && val.value.startsWith('http')) {
                        const kl = key.toLowerCase();
                        if (!omeroUrl && kl.includes('omero')) omeroUrl = val.value;
                        if (!elabUrl && kl.includes('elab')) elabUrl = val.value;
                    }
                }
            }
        }

        let metadataHtml = '';
        
        const formatExportMetadata = (val) => {
            if (val === null || val === undefined) return '';
            if (Array.isArray(val)) return val.map(formatExportMetadata).join(', ');
            if (typeof val === 'object') {
                if (val.type && !val.value) return ''; // Skip empty metafold fields
                if (val.value !== undefined) {
                    if (val.type === 'url' || (typeof val.value === 'string' && (val.value.startsWith('http://') || val.value.startsWith('https://')))) {
                        return `<a href="${val.value}" target="_blank" style="color: #89b4fa; text-decoration: underline;">${val.value}</a>`;
                    }
                    return formatExportMetadata(val.value);
                }
                
                // Group or custom object
                let subHtml = '<div style="margin-top: 4px; border-left: 2px solid #45475a; padding-left: 10px;">';
                for (const [sk, sv] of Object.entries(val)) {
                    if (sk === 'type' || sk === 'position' || sk === 'templateName' || sk === 'label' || sk === 'required' || sk === 'lastUpdatedBy' || sk === 'lastUpdatedAt') continue;
                    const subLabel = sv?.label || sk;
                    const subV = formatExportMetadata(sv);
                    if (subV) subHtml += `<div style="margin-bottom: 4px;"><strong style="color: #a6adc8;">${subLabel}:</strong> <span style="color: #cdd6f4;">${subV}</span></div>`;
                }
                subHtml += '</div>';
                return subHtml;
            }
            if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) {
                return `<a href="${val}" target="_blank" style="color: #89b4fa; text-decoration: underline;">${val}</a>`;
            }
            return String(val);
        };

        if (proj.metadata) {
            for (const [k, v] of Object.entries(proj.metadata)) {
                if (k === 'provenance' || k === 'System.UpdateHistory' || k === 'System.Level' || k === 'metafold_project_id' || k === 'projectName') continue;
                
                let label = k;
                if (v !== null && typeof v === 'object' && v.label) {
                    label = v.label;
                }
                
                const displayVal = formatExportMetadata(v);
                if (displayVal && displayVal !== '<div style="margin-top: 4px; border-left: 2px solid #45475a; padding-left: 10px;"></div>') {
                    metadataHtml += `<tr><th>${label}</th><td>${displayVal}</td></tr>`;
                }
            }
        }

        let derivedFrom = '';
        if (proj.lineage && proj.lineage.derived_from_ids && proj.lineage.derived_from_ids.length > 0) {
            derivedFrom = proj.lineage.derived_from_ids.map(id => `<span class="badge">${id}</span>`).join('');
        } else {
            derivedFrom = '<span style="color:#6c7086; font-style: italic;">None (Root/Origin)</span>';
        }

        let provides = '';
        if (proj.lineage && proj.lineage.provides_ids && proj.lineage.provides_ids.length > 0) {
            provides = proj.lineage.provides_ids.map(id => `<span class="badge">${id}</span>`).join('');
        } else {
            provides = '<span style="color:#6c7086; font-style: italic;">None</span>';
        }

        let localPath = proj.metadata && proj.metadata['System.ProjectAbsolutePath'] 
            ? proj.metadata['System.ProjectAbsolutePath'].value 
            : proj.path;

        const stepIndex = index + 1;
        const cleanName = proj.name.replace(/[^a-zA-Z0-9]/g, '_');
        
        let pathDisplay = `Path: ${localPath}`;
        if (exportData.isHarvest) {
            pathDisplay = `Relative Path: ./${cleanName} <br><span style="font-size: 0.8em; color: #6c7086;">Original: ${localPath}</span>`;
            localPath = `./${cleanName}`;
        }
        
        const escapedPath = localPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        
        let readmeBtn = '';
        if (proj.hasReadme && proj.readmeFilename) {
            let readmePath;
            if (exportData.isHarvest) {
                readmePath = `${localPath}/${proj.readmeFilename}`;
            } else {
                readmePath = `file:///${localPath}\\${proj.readmeFilename}`.replace(/\\/g, '/');
            }
            readmeBtn = `<a href="${readmePath}" class="btn" target="_blank" style="background: #89b4fa; color: #11111b; font-weight: bold; border: none;">📄 Open README</a>`;
        }

        html += `
            <div class="project-card" id="card_${cleanName}">
                <div class="project-header">
                    <div style="flex: 1;">
                        <h2 class="project-title"><span style="color:#6c7086; font-size:0.8em; margin-right:8px;">#${stepIndex}</span>${proj.name}</h2>
                        <div class="project-id">${pathDisplay}</div>
                    </div>
                    <div style="text-align: right; font-size: 0.85em; color: #a6adc8; min-width: 150px;">
                        Created: ${new Date(proj.created).toLocaleString()}
                    </div>
                </div>
                
                <div class="actions">
                    <button class="btn" onclick="navigator.clipboard.writeText('${escapedPath}').then(() => { const o=this.innerText; this.innerText='✅ Copied!'; setTimeout(()=>{this.innerText=o},2000); })">📋 Copy Path</button>
                    <a href="${exportData.isHarvest ? localPath : 'file:///' + localPath.replace(/\\/g, '/')}" class="btn" target="_blank">📂 Open in Browser</a>
                    ${readmeBtn}
                    ${omeroUrl ? `<a href="${omeroUrl}" class="btn btn-omero" target="_blank">🔵 Open in OMERO</a>` : ''}
                    ${elabUrl ? `<a href="${elabUrl}" class="btn btn-elab" target="_blank">🟢 Open in eLabFTW</a>` : ''}
                </div>

                <div class="lineage-info">
                    <div style="margin-bottom: 8px;"><strong>Provides IDs (Outputs):</strong> ${provides}</div>
                    <div><strong>Derived From (Inputs):</strong> ${derivedFrom}</div>
                </div>

                <div class="section-title">Project Metadata</div>
                <table>
                    <tbody>
                        ${metadataHtml}
                    </tbody>
                </table>
            </div>
        `;
    });

    html += `
        </div>
    </body>
    </html>
    `;

    return html;
};

// Export Lineage function for use by Knowledge Graph and Lineage Tree context menus
window.exportLineage = async (projectPath) => {
    try {
        if (!window.projectScanner || !window.projectScanner.projects) {
            console.error("Scanner projects not available.");
            return;
        }
        
        const allProjects = window.projectScanner.projects;
        const rootProject = allProjects.find(p => p.path.replace(/\\/g, '\\\\') === projectPath.replace(/\\/g, '\\\\') || p.path === projectPath);
        
        if (!rootProject) {
            console.error("Project not found: " + projectPath);
            return;
        }

        // 1. Calculate Direct Lineage (Ancestors & Descendants)
        const ancestorsSet = new Set();
        const descendantsSet = new Set();
        
        const collectAncestors = (proj) => {
            if (ancestorsSet.has(proj.path)) return;
            ancestorsSet.add(proj.path);
            const parentPaths = proj.lineage?.lineage_links?.map(l => l.source_path) || [];
            parentPaths.forEach(path => {
                const parent = allProjects.find(p => p.path === path);
                if (parent) collectAncestors(parent);
            });
        };
        
        const collectDescendants = (proj) => {
            if (descendantsSet.has(proj.path)) return;
            descendantsSet.add(proj.path);
            allProjects.forEach(child => {
                if (child.lineage?.lineage_links?.some(l => l.source_path === proj.path)) {
                    collectDescendants(child);
                }
            });
        };
        
        collectAncestors(rootProject);
        collectDescendants(rootProject);
        const directLineageSet = new Set([...ancestorsSet, ...descendantsSet]);

        // 2. Calculate Full Connected Graph (Flood Fill)
        const fullSet = new Set();
        const collectDependencies = (proj) => {
            if (fullSet.has(proj.path)) return;
            fullSet.add(proj.path);
            
            const parentPaths = proj.lineage?.lineage_links?.map(l => l.source_path) || [];
            parentPaths.forEach(path => {
                const parent = allProjects.find(p => p.path === path);
                if (parent) collectDependencies(parent);
            });

            allProjects.forEach(child => {
                if (child.lineage?.lineage_links?.some(l => l.source_path === proj.path)) {
                    collectDependencies(child);
                }
            });
        };
        
        collectDependencies(rootProject);

        // --- EXPORT OPTIONS MODAL ---
        const exportOptions = await new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0'; overlay.style.left = '0';
            overlay.style.width = '100vw'; overlay.style.height = '100vh';
            overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
            overlay.style.zIndex = '9999';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.backdropFilter = 'blur(4px)';

            const modal = document.createElement('div');
            modal.style.backgroundColor = '#1e1e2e';
            modal.style.padding = '30px';
            modal.style.borderRadius = '12px';
            modal.style.width = '550px';
            modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            modal.style.color = '#cdd6f4';
            modal.style.fontFamily = 'Inter, sans-serif';

            let html = '<h2 style="color: #89b4fa; margin-top: 0; margin-bottom: 5px;">Lineage Export Options</h2>';
            html += '<p style="color: #a6adc8; font-size: 0.9em; margin-bottom: 25px;">Configure how you want to export this lineage.</p>';

            // Export Scope
            html += '<h3 style="color: #cba6f7; font-size: 1.05em; margin-bottom: 10px;">1. Export Scope</h3>';
            html += `
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px;">
                    <label style="display: flex; align-items: flex-start; cursor: pointer; background: #181825; padding: 12px; border-radius: 8px; border: 1px solid #313244;">
                        <input type="radio" name="exportScope" value="direct" checked style="margin-top: 4px; margin-right: 12px;">
                        <div>
                            <div style="font-weight: 500; color: #cdd6f4;">Direct Lineage Only</div>
                            <div style="font-size: 0.85em; color: #6c7086; margin-top: 4px;">Includes only direct ancestors and descendants of the selected project.</div>
                        </div>
                    </label>
                    <label style="display: flex; align-items: flex-start; cursor: pointer; background: #181825; padding: 12px; border-radius: 8px; border: 1px solid #313244;">
                        <input type="radio" name="exportScope" value="full" style="margin-top: 4px; margin-right: 12px;">
                        <div>
                            <div style="font-weight: 500; color: #cdd6f4;">Entire Connected Graph</div>
                            <div style="font-size: 0.85em; color: #6c7086; margin-top: 4px;">Includes siblings, cousins, and all other indirectly connected projects.</div>
                        </div>
                    </label>
                </div>
            `;

            // Export Mode
            html += '<h3 style="color: #cba6f7; font-size: 1.05em; margin-bottom: 10px;">2. Export Mode</h3>';
            html += `
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 30px;">
                    <label style="display: flex; align-items: flex-start; cursor: pointer; background: #181825; padding: 12px; border-radius: 8px; border: 1px solid #313244;">
                        <input type="radio" name="exportMode" value="metadata" checked style="margin-top: 4px; margin-right: 12px;">
                        <div>
                            <div style="font-weight: 500; color: #cdd6f4;">Metadata Only (Fast)</div>
                            <div style="font-size: 0.85em; color: #6c7086; margin-top: 4px;">Creates a portable JSON/HTML dashboard linking to original files.</div>
                        </div>
                    </label>
                    <label style="display: flex; align-items: flex-start; cursor: pointer; background: #181825; padding: 12px; border-radius: 8px; border: 1px solid #313244;">
                        <input type="radio" name="exportMode" value="harvest" style="margin-top: 4px; margin-right: 12px;">
                        <div>
                            <div style="font-weight: 500; color: #cdd6f4;">Full Data Harvest (Copy Files)</div>
                            <div style="font-size: 0.85em; color: #6c7086; margin-top: 4px;">Copies all actual data files into a standalone, portable folder.</div>
                        </div>
                    </label>
                </div>
            `;

            html += `
                <div style="display: flex; justify-content: flex-end; gap: 10px;">
                    <button id="opt-cancel" style="padding: 10px 20px; border-radius: 6px; border: none; background: #313244; color: #cdd6f4; cursor: pointer; font-weight: 600;">Cancel</button>
                    <button id="opt-continue" style="padding: 10px 20px; border-radius: 6px; border: none; background: #89b4fa; color: #11111b; cursor: pointer; font-weight: 600;">Continue</button>
                </div>
            `;

            modal.innerHTML = html;
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            document.getElementById('opt-cancel').onclick = () => {
                document.body.removeChild(overlay);
                resolve(null);
            };

            document.getElementById('opt-continue').onclick = () => {
                const scope = overlay.querySelector('input[name="exportScope"]:checked').value;
                const mode = overlay.querySelector('input[name="exportMode"]:checked').value;
                document.body.removeChild(overlay);
                resolve({ scope, mode });
            };
        });

        if (!exportOptions) {
            console.log('Export cancelled by user (dialog)');
            return;
        }

        let exportProjects = [];
        if (exportOptions.scope === 'direct') {
            exportProjects = Array.from(directLineageSet).map(path => allProjects.find(p => p.path === path));
        } else {
            exportProjects = Array.from(fullSet).map(path => allProjects.find(p => p.path === path));
        }

        const isHarvestMode = exportOptions.mode === 'harvest';
        let harvestData = null;

        if (isHarvestMode) {
            if (window.projectScanner && window.projectScanner.showSuccess) {
                window.projectScanner.showSuccess("Scanning project folders...");
            }

            // Fetch subfolders
            const paths = exportProjects.map(p => p.path);
            const subfoldersRes = await window.electronAPI.getSubfolders(paths);
            const subfolders = subfoldersRes.success ? subfoldersRes.subfolders : {};

            harvestData = await new Promise((resolve) => {
                // Build DOM Modal
                const overlay = document.createElement('div');
                overlay.style.position = 'fixed';
                overlay.style.top = '0'; overlay.style.left = '0';
                overlay.style.width = '100vw'; overlay.style.height = '100vh';
                overlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
                overlay.style.zIndex = '9999';
                overlay.style.display = 'flex';
                overlay.style.alignItems = 'center';
                overlay.style.justifyContent = 'center';

                const modal = document.createElement('div');
                modal.style.backgroundColor = '#1e1e2e';
                modal.style.padding = '30px';
                modal.style.borderRadius = '10px';
                modal.style.width = '600px';
                modal.style.maxHeight = '80vh';
                modal.style.overflowY = 'auto';
                modal.style.color = '#cdd6f4';
                modal.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';

                let html = '<h2 style="color: #89b4fa; margin-top: 0;">Select Data to Harvest</h2>';
                html += '<p style="color: #a6adc8; font-size: 0.9em; margin-bottom: 20px;">Uncheck subfolders that are not relevant to this lineage to save disk space. Files in the root of the project are always copied.</p>';

                html += '<div style="display: flex; flex-direction: column; gap: 15px;">';
                exportProjects.forEach(p => {
                    const subs = subfolders[p.path] || [];
                    html += `<div style="background: #181825; padding: 15px; border-radius: 8px; border: 1px solid #313244;">`;
                    html += `<h3 style="margin: 0 0 10px 0; color: #cba6f7; font-size: 1.1em;">${p.name}</h3>`;
                    
                    if (subs.length === 0) {
                        html += `<div style="color: #6c7086; font-size: 0.9em; font-style: italic;">No subfolders found. Root files will be copied.</div>`;
                    } else {
                        subs.forEach(sub => {
                            const id = `chk_${p.name}_${sub}`.replace(/[^a-zA-Z0-9]/g, '_');
                            html += `
                                <label style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;">
                                    <input type="checkbox" data-project="${p.path}" data-folder="${sub}" checked style="margin-right: 10px;">
                                    ${sub}
                                </label>
                            `;
                        });
                    }
                    html += `</div>`;
                });
                html += '</div>';

                html += `
                    <div style="margin-top: 25px; display: flex; justify-content: flex-end; gap: 10px;">
                        <button id="harvest-cancel" style="padding: 10px 20px; background: #313244; color: #cdd6f4; border: none; border-radius: 5px; cursor: pointer;">Cancel</button>
                        <button id="harvest-confirm" style="padding: 10px 20px; background: #89b4fa; color: #11111b; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">Select Destination</button>
                    </div>
                `;

                modal.innerHTML = html;
                overlay.appendChild(modal);
                document.body.appendChild(overlay);

                document.getElementById('harvest-cancel').onclick = () => {
                    document.body.removeChild(overlay);
                    resolve(null);
                };

                document.getElementById('harvest-confirm').onclick = () => {
                    const data = exportProjects.map(p => {
                        const checkboxes = overlay.querySelectorAll(`input[data-project="${p.path.replace(/\\/g, '\\\\')}"]`);
                        const selectedFolders = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.getAttribute('data-folder'));
                        return {
                            path: p.path,
                            name: p.name.replace(/[^a-zA-Z0-9]/gi, '_'), // safe name for subfolder
                            selectedFolders
                        };
                    });
                    document.body.removeChild(overlay);
                    resolve(data);
                };
            });

            if (!harvestData) {
                console.log('Harvest cancelled by user (modal)');
                return; // user clicked cancel in the folder selection modal
            }
        }

        const safeName = rootProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Use showSaveDialog to let user choose filename and directory
        const savePath = await window.electronAPI.showSaveDialog({
            title: isHarvestMode ? 'Select Harvest Destination' : 'Export Lineage JSON & HTML',
            defaultPath: `Lineage-Export-${safeName}`,
            filters: [
                { name: isHarvestMode ? 'Export Folder Name (Will be created)' : 'Export Base Name', extensions: ['json', '*'] }
            ]
        });

        if (!savePath) {
            console.log('Export cancelled by user');
            return;
        }
        
        // Strip .json or .html if the user typed it, to get the base path
        let basePath = savePath;
        if (basePath.toLowerCase().endsWith('.json')) basePath = basePath.substring(0, basePath.length - 5);
        if (basePath.toLowerCase().endsWith('.html')) basePath = basePath.substring(0, basePath.length - 5);

        const exportData = {
            exportType: 'Lineage',
            isHarvest: isHarvestMode,
            rootProject: rootProject.name,
            rootProjectPath: rootProject.path,
            directLineagePaths: Array.from(directLineageSet),
            timestamp: new Date().toISOString(),
            projects: exportProjects
        };

        let jsonPath, htmlPath, finalExportDir;

        if (isHarvestMode) {
            // For harvest, basePath is the new master folder
            finalExportDir = basePath;
            const dirName = basePath.substring(Math.max(basePath.lastIndexOf('\\'), basePath.lastIndexOf('/')) + 1);
            jsonPath = basePath + '/' + dirName + '.json';
            htmlPath = basePath + '/' + dirName + '.html';
            
            if (window.projectScanner && window.projectScanner.showSuccess) {
                window.projectScanner.showSuccess("Copying data... This may take a while depending on size.");
            }
            
            const harvestResult = await window.electronAPI.harvestProjects(basePath, harvestData);
            if (!harvestResult.success) {
                console.error("Harvest failed:", harvestResult.message);
                if (window.projectScanner && window.projectScanner.showError) {
                    window.projectScanner.showError("Failed to copy data: " + harvestResult.message);
                }
                return;
            }
        } else {
            finalExportDir = savePath.substring(0, Math.max(savePath.lastIndexOf('\\'), savePath.lastIndexOf('/')));
            jsonPath = basePath + '.json';
            htmlPath = basePath + '.html';
        }

        const jsonContent = JSON.stringify(exportData, null, 2);
        const htmlContent = window.generateLineageHtml(exportData);
        
        const jsonResult = await window.electronAPI.writeFile(jsonPath, jsonContent);
        const htmlResult = await window.electronAPI.writeFile(htmlPath, htmlContent);

        if (jsonResult.success && htmlResult.success) {
            if (window.projectManager && window.projectManager.showSuccess) {
                window.projectManager.showSuccess(`Lineage exported successfully!\n\nFiles saved:\n- ${jsonPath}\n- ${htmlPath}\n\nProjects Included: ${exportProjects.length}`, finalExportDir);
            } else if (window.projectScanner && window.projectScanner.showSuccess) {
                window.projectScanner.showSuccess(`Lineage exported successfully!\n\nFiles saved:\n- ${jsonPath}\n- ${htmlPath}\n\nProjects Included: ${exportProjects.length}`);
            } else {
                alert(`Lineage exported to:\n${jsonPath}\n${htmlPath}`);
            }
        } else {
            console.error('Failed to write lineage export files:', jsonResult.message, htmlResult.message);
            if (window.projectScanner && window.projectScanner.showError) {
                window.projectScanner.showError(`Failed to save export. JSON: ${jsonResult.success ? 'OK' : 'Failed'}, HTML: ${htmlResult.success ? 'OK' : 'Failed'}`);
            }
        }
    } catch (error) {
        console.error('Error during lineage export:', error);
        if (window.projectScanner && window.projectScanner.showError) {
            window.projectScanner.showError(`Export Error: ${error.message}`);
        }
    }
};


