// Enhanced Visualization Manager - Modern JSONCrack iframe Integration for MetaFold
// Handles interactive metadata visualization using JSONCrack iframe, D3.js, and Tree views

const visualizationManager = {
    initialized: false,
    currentData: null,
    currentVisualizationType: 'jsoncrack', // Default to JSONCrack
    usesFallback: false,
    
    // Available visualization types
    visualizationTypes: {
        jsoncrack: {
            name: 'JSONCrack',
            icon: '🕸️',
            description: 'Interactive JSONCrack graph visualization',
            requiresLibrary: 'JSONCrackViewer'
        },
        d3graph: {
            name: 'D3 Graph',
            icon: '🌐',
            description: 'D3.js force-directed graph',
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
            this.currentVisualizationType = 'd3graph';
            console.log('⚠️ React not available - using D3.js mode');
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
            availableTypes.push('d3graph');
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
    
    // NEW: Load data from scanned projects
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
            complexity: this.calculateProjectComplexity(project),
            completeness: this.calculateProjectCompleteness(project)
        };
    },

    // Helper functions for project scanner integration
    generateProjectId(projectPath) {
        return 'project_' + btoa(projectPath).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
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

            // Clear container
            container.innerHTML = '';

            // Route to appropriate visualization method
            switch (this.currentVisualizationType) {
                case 'jsoncrack':
                    this.renderJSONCrackVisualization(data);
                    break;
                case 'd3graph':
                    this.renderD3GraphVisualization(data);
                    break;
                case 'tree':
                    this.renderTreeVisualization(data);
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
            if (event.data.type === 'widget-ready' || event.data === 'ready' || event.data.ready) {
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
                        <button class="btn btn-secondary btn-small" onclick="visualizationManager.setVisualizationType('d3graph')" style="padding: 6px 12px; font-size: 12px;">
                            🌐 D3.js
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
                    <button class="btn btn-secondary" onclick="visualizationManager.setVisualizationType('d3graph')">
                        🌐 Try D3.js Graph
                    </button>
                    <button class="btn btn-secondary" onclick="visualizationManager.setVisualizationType('tree')">
                        🌳 Try Tree View
                    </button>
                </div>
            </div>
        `;
    },

    // Render D3.js force-directed graph visualization (PRESERVED from original)
    renderD3GraphVisualization(data) {
        console.log('🌐 Rendering D3.js graph visualization...');
        
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

        container.innerHTML = `
            <div style="height: 100vh; display: flex; flex-direction: column; min-height: 600px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); flex-shrink: 0;">
                    <div>
                        <h4 style="margin: 0; color: #e0e0e0;">🌐 D3.js Force Graph</h4>
                        <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 12px;">Interactive force-directed graph visualization</p>
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
                <div style="flex: 1; overflow: hidden; position: relative; min-height: 500px;">
                    <div id="d3GraphContainer" style="width: 100%; height: 100%; min-height: 500px;"></div>
                </div>
            </div>
        `;

        // Render the D3.js graph
        this.renderD3Graph(data);
    },

    // Render tree visualization (PRESERVED from original)
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

// CRITICAL: Make globally available
window.visualizationManager = visualizationManager;