// Project Manager - FIXED elabFTW Auto-sync Logic + MetaFold Links Integration

const projectManager = {
    // Initialize project manager
    init() {
        this.updatePathPreview();
        this.setupEventListeners();
        console.log('ProjectManager initialized');
    },

    // Setup event listeners
    setupEventListeners() {
        // Listen for path and name changes
        const targetPath = document.getElementById('targetPath');
        const projectName = document.getElementById('projectName');
        
        if (targetPath) {
            targetPath.addEventListener('input', () => this.updatePathPreview());
        }
        if (projectName) {
            projectName.addEventListener('input', () => this.updatePathPreview());
        }
    },

    // Browse for target directory
    async browsePath() {
        if (window.electronAPI && window.electronAPI.selectFolder) {
            try {
                const selectedPath = await window.electronAPI.selectFolder();
                if (selectedPath) {
                    document.getElementById('targetPath').value = selectedPath;
                    this.updatePathPreview();
                }
            } catch (error) {
                this.showError('Error selecting folder: ' + error.message);
            }
        } else {
            this.showError('Folder selection not available in browser mode');
        }
    },

    // Update path preview
    updatePathPreview() {
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        const preview = document.getElementById('fullPathPreview');
        
        if (preview) {
            if (basePath && projectName) {
                // Use platform-appropriate path separator
                const separator = window.utils && window.utils.getPathSeparator ? 
                    window.utils.getPathSeparator() : '/';
                preview.textContent = basePath + separator + projectName;
            } else {
                preview.textContent = 'Choose directory and project name';
            }
        }
    },

    
	// Create project - FIXED Browser Mode Detection + MetaFold Links Integration
	
	
	async createProject() {
		if (!templateManager.currentTemplate) return;
		
		const basePath = document.getElementById('targetPath').value.trim();
		const projectName = document.getElementById('projectName').value.trim();
		
		if (!basePath || !projectName) {
			this.showError('Please choose a base directory and enter a project name!');
			return;
		}
		
		// ✅ FIXED: Verbesserte Electron-Erkennung mit Debug-Ausgabe
		console.log('🔍 Checking electronAPI availability...');
		console.log('📋 window.electronAPI exists:', !!window.electronAPI);
		console.log('📋 window.electronAPI.createProject exists:', !!(window.electronAPI && window.electronAPI.createProject));
		
		// Prüfe explizit auf Browser vs Electron
		const isElectron = !!(window.electronAPI && window.electronAPI.createProject);
		
		if (!isElectron) {
			console.error('❌ Not running in Electron mode!');
			console.log('🔍 Available window objects:', Object.keys(window));
			this.showError('Project creation is only available in the Electron app, not in browser mode.');
			return;
		}
		
		
        try {
        // Get template info with FIXED structure handling
        const template = templateManager.currentTemplate;
        
        // ✅ FIXED: Handle both string and array template structures
        let templateStructure = template.folderStructure || template.structure || '';
        if (Array.isArray(templateStructure)) {
            templateStructure = templateStructure.join('\n');
        }
        templateStructure = String(templateStructure || '');
        
        console.log('📋 templateStructure (processed):', templateStructure);
        console.log('📋 templateStructure type:', typeof templateStructure);
        console.log('📋 templateStructure length:', templateStructure.length);
        
        // ✅ FIXED: Check if metadata exists
        const hasMetadata = template.type === 'experiment' && 
                        template.metadata && 
                        Object.keys(template.metadata).length > 0;
        
        // ✅ FIXED: Define experimentMetadata BEFORE any usage
        const experimentMetadata = window.experimentForm && window.experimentForm.collectData ? 
            window.experimentForm.collectData() : null;
        
        console.log('🚀 Starting project creation...');
        console.log('📁 basePath:', basePath);
        console.log('📁 projectName:', projectName);
        console.log('📋 templateStructure:', templateStructure);
        console.log('📋 experimentMetadata:', experimentMetadata);
        console.log('📋 hasMetadata:', hasMetadata);
        
        // ✅ FIXED: Call with correct API signature
        const result = await window.electronAPI.createProject(
            basePath,
            projectName,
            templateStructure,
            experimentMetadata
        );
        
        console.log('✅ Project creation result:', result);
        
        if (result && result.success) {
            // Initialize links array for success message
            const links = [];
            
            // Check if integrations are enabled and attempt uploads
            let successMessage = result.message;
            let elabFTWResult = null;
            let omeroResult = null;
            
            // ✅ FIXED: elabFTW Integration - experimentMetadata ist jetzt verfügbar
            if (template.type === 'experiment' && hasMetadata && await settingsManager.get('elabftw.enabled')) {
                console.log('🧪 Starting elabFTW integration...');
                
                // Check if should sync to elabFTW
                const shouldSyncToElabFTW = await this.shouldSyncToElabFTW();
                
                if (shouldSyncToElabFTW) {
                    try {
                        // ✅ FIX: Better check for existing experiment ID
                        const existingExpIdElement = document.getElementById('existingExperimentId');
                        const existingExpId = existingExpIdElement?.value?.trim();
                        
                        console.log('🔧 DEBUG: Experiment ID check:', {
                            element: !!existingExpIdElement,
                            rawValue: existingExpIdElement?.value,
                            trimmedValue: existingExpId,
                            isEmpty: !existingExpId,
                            length: existingExpId?.length || 0
                        });
                        
                        // ✅ FIX: Strict empty check
                        if (existingExpId && existingExpId.length > 0) {
                            // Update existing experiment (with merge logic)
                            console.log('🧪 Updating existing elabFTW experiment:', existingExpId);
                            elabFTWResult = await settingsManager.updateExistingElabFTWExperiment(
                                existingExpId,
                                experimentMetadata  // ✅ Jetzt korrekt definiert
                            );
                        } else {
                            // ✅ FIX: Create new experiment (DEFAULT PATH)
                            console.log('🧪 Creating new elabFTW experiment (no existing ID provided)');
                            console.log('🔧 DEBUG: Creating with metadata:', {
                                projectName: projectName,
                                metadataKeys: experimentMetadata ? Object.keys(experimentMetadata) : 'undefined',
                                metadataType: typeof experimentMetadata,
                                structure: templateStructure || 'empty'
                            });
                            
                            elabFTWResult = await settingsManager.createElabFTWExperiment(
                                projectName, 
                                experimentMetadata,  // ✅ Jetzt korrekt definiert
                                templateStructure
                            );
                        }
                        
                        console.log('🧪 elabFTW result:', elabFTWResult);
                        
                        // ✅ FIXED: Add link to success message
                        if (elabFTWResult && elabFTWResult.success) {
                            successMessage += ' (Synced to elabFTW)';
                            links.push({
                                type: 'elabFTW',
                                url: elabFTWResult.url,
                                text: '🧪 Open in elabFTW'
                            });
                        }
                        
                    } catch (elabFTWError) {
                        console.error('❌ elabFTW integration failed:', elabFTWError);
                        elabFTWResult = {
                            success: false,
                            message: elabFTWError.message || 'Unknown elabFTW error'
                        };
                    }
                } else {
                    console.log('🧪 elabFTW sync skipped (not enabled or not requested)');
                }
            }
            
            // ✅ FIXED: OMERO Integration - experimentMetadata ist jetzt verfügbar
            if (template.type === 'experiment' && hasMetadata && await settingsManager.get('omero.enabled')) {
                const shouldSyncToOMERO = await this.shouldSyncToOMERO();
                
                if (shouldSyncToOMERO) {
                    console.log('🔬 Starting OMERO upload...');
                    try {
                        const omeroOptions = this.getOMEROOptions();
                        
                        omeroResult = await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(
                            projectName,
                            experimentMetadata,  // ✅ Jetzt korrekt definiert
                            omeroOptions
                        );
                        
                        console.log('🔬 OMERO result:', omeroResult);
                        
                        if (omeroResult && omeroResult.success) {
                            successMessage += ' (Synced to OMERO)';
                            links.push({
                                type: 'OMERO',
                                url: omeroResult.url,
                                text: '🔬 Open in OMERO'
                            });
                        }
                    } catch (error) {
                        console.error('❌ OMERO upload failed:', error);
                        omeroResult = { success: false, message: error.message };
                    }
                } else {
                    console.log('🔬 OMERO sync not requested');
                }
            }
            
            // 🔗 Process integration links after successful uploads
            try {
                const uploadResults = {
                    elabftw: elabFTWResult,
                    omero: omeroResult
                };

                const projectData = {
                    metadata: experimentMetadata || {},  // ✅ Jetzt korrekt definiert
                    projectName: projectName,
                    basePath: basePath,
                    template: template
                };

                await this.processIntegrationLinksPostUpload(projectData, result.projectPath, uploadResults);
            } catch (linkError) {
                console.error('❌ Error processing integration links (non-critical):', linkError);
            }

            // Show enhanced success message
            this.showEnhancedSuccess(successMessage, result.projectPath, links);
            
        } else {
            this.showError(result ? result.message : 'Unknown error occurred during project creation');
        }
    } catch (error) {
        console.error('❌ Error creating project:', error);
        this.showError('Error creating project: ' + error.message);
    }

	},

    // ==========================================
    // FIXED elabFTW Helper Function
    // ==========================================

    // Check if should sync to elabFTW - FIXED LOGIC
    async shouldSyncToElabFTW() {
        // Auto-sync enabled?
        const autoSync = await settingsManager.get('elabftw.auto_sync');
        if (autoSync) {
            console.log('🧪 elabFTW auto-sync is enabled');
            return true;
        }
        
        // Manual checkbox checked?
        const sendToElabFTW = document.getElementById('sendToElabFTW');
        if (sendToElabFTW && sendToElabFTW.checked) {
            console.log('🧪 elabFTW manual sync checkbox is checked');
            return true;
        }
        
        console.log('🧪 elabFTW sync not requested');
        return false;
    },

    // ==========================================
    // OMERO HELPER FUNCTIONS (unchanged)
    // ==========================================

	// Check if should sync to OMERO - FIXED ASYNC
	async shouldSyncToOMERO() {
		// Auto-sync enabled?
		const autoSync = await settingsManager.get('omero.auto_sync');
		if (autoSync) {
			console.log('🔬 OMERO auto-sync is enabled');
			return true;
		}
		
		// Manual checkbox checked?
		const sendToOMERO = document.getElementById('sendToOMERO');
		if (sendToOMERO && sendToOMERO.checked) {
			console.log('🔬 OMERO manual sync checkbox is checked');
			return true;
		}
		
		console.log('🔬 OMERO sync not requested');
		return false;
	},

    // Get OMERO options from UI
    getOMEROOptions() {
        const options = {};
        
        // ✅ Group ID übernehmen (unverändert)
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (groupSelect && groupSelect.value && groupSelect.value !== '' && groupSelect.value !== 'refresh' && groupSelect.value !== 'all') {
            options.groupId = groupSelect.value;
            console.log('🔬 OMERO group selected:', options.groupId);
        } else {
            console.log('🔬 OMERO group: Using default (no specific group selected)');
        }
        
        // ✅ NEUE LÖSUNG: Project-Auswahl ERMÖGLICHEN statt ignorieren
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (projectSelect && projectSelect.value && projectSelect.value !== '' && projectSelect.value !== 'refresh') {
            options.projectId = projectSelect.value;
            console.log('🔬 OMERO project selected:', options.projectId);
            console.log('🔬 Mode: Dataset will be linked to existing project');
        } else {
            console.log('🔬 OMERO project: Creating standalone dataset (no project selected)');
            // options.projectId bleibt undefined für standalone dataset
        }
        
        // ✅ Namespace beibehalten (unverändert)
        const namespaceInput = document.getElementById('omeroNamespace');
        if (namespaceInput && namespaceInput.value.trim()) {
            options.namespace = namespaceInput.value.trim();
        } else {
            options.namespace = 'NFDI4BioImage.MetaFold.ExperimentMetadata';
        }
        
        // ✅ NEUES Debug Output - zeigt beide Modi
        if (options.projectId) {
            console.log('🔬 Complete OMERO options (PROJECT LINKING MODE):', {
                groupId: options.groupId || 'default',
                projectId: options.projectId,
                namespace: options.namespace,
                mode: 'PROJECT_LINKING'
            });
        } else {
            console.log('🔬 Complete OMERO options (STANDALONE MODE):', {
                groupId: options.groupId || 'default',
                projectId: 'none - standalone dataset',
                namespace: options.namespace,
                mode: 'STANDALONE'
            });
        }
        
        return options;
    },

    // ==========================================
    // ENHANCED SUCCESS MESSAGE DISPLAY (unchanged)
    // ==========================================


    // KORRIGIERTE Link-Erstellung aus Integrationsergebnissen:
    buildLinksFromResults(uploadResults) {
        const links = [];
        
        // ✅ KORRIGIERTE elabFTW Link-Erstellung
        if (uploadResults.elabftw && uploadResults.elabftw.success) {
            let elabUrl = null;
            
            // Verschiedene mögliche URL-Formate prüfen
            if (uploadResults.elabftw.experimentUrl) {
                elabUrl = uploadResults.elabftw.experimentUrl;
            } else if (uploadResults.elabftw.url) {
                elabUrl = uploadResults.elabftw.url;
            } else if (uploadResults.elabftw.experiment && uploadResults.elabftw.experiment.url) {
                elabUrl = uploadResults.elabftw.experiment.url;
            }
            
            if (elabUrl) {
                links.push({
                    type: 'elabFTW',
                    url: elabUrl,
                    text: '🧪 Open in elabFTW'
                });
            }
        }
        
        // ✅ KORRIGIERTE OMERO Link-Erstellung
        if (uploadResults.omero && uploadResults.omero.success) {
            let omeroUrl = null;
            
            // Verschiedene mögliche URL-Formate prüfen
            if (uploadResults.omero.dataset && uploadResults.omero.dataset.omeroWebUrl) {
                omeroUrl = uploadResults.omero.dataset.omeroWebUrl;
            } else if (uploadResults.omero.omeroWebUrl) {
                omeroUrl = uploadResults.omero.omeroWebUrl;
            } else if (uploadResults.omero.url) {
                omeroUrl = uploadResults.omero.url;
            } else if (uploadResults.omero.dataset && uploadResults.omero.dataset.id) {
                // Fallback: URL aus Dataset-ID konstruieren
                const datasetId = uploadResults.omero.dataset.id;
                omeroUrl = `https://omero-imaging.uni-muenster.de/webclient/?show=dataset-${datasetId}`;
            }
            
            if (omeroUrl) {
                links.push({
                    type: 'OMERO',
                    url: omeroUrl,
                    text: '🔬 Open in OMERO'
                });
            } else {
                // Debug: URL nicht gefunden
                console.warn('⚠️ OMERO URL not found in result:', uploadResults.omero);
            }
        }
        
        return links;
    },


    // Show enhanced success message with multiple links
    function showEnhancedSuccess(message, projectPath = null, links = []) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            let content = message;
            
            // Add action buttons container
            let buttonsHtml = '';
            
            // Add "Open Folder" button if path is provided
            if (projectPath) {
                const escapedPath = projectPath.replace(/\\/g, '\\\\');
                buttonsHtml += `<button class="btn btn-secondary" onclick="projectManager.openCreatedFolder('${escapedPath}')" style="margin-top: 8px; margin-right: 8px;">📂 Open Folder</button>`;
            }
            
            // Add external links (ROBUSTE Version)
            links.forEach((link, index) => {
                try {
                    // SICHERHEITSPRÜFUNG: Stelle sicher, dass link.url existiert und behandelbar ist
                    let urlToUse = '';
                    
                    if (typeof link.url === 'string') {
                        // URL ist bereits ein String
                        urlToUse = link.url;
                    } else if (link.url && typeof link.url === 'object') {
                        // URL ist ein Object - verwende main property oder andere verfügbare
                        urlToUse = link.url.main || link.url.web || link.url.url || link.url.omeroWebUrl || '';
                    } else {
                        // Fallback für unerwartete Formate
                        console.warn(`⚠️ Link ${index} URL format not recognized:`, link);
                        urlToUse = String(link.url || '');
                    }
                    
                    // Nur weitermachen wenn wir eine gültige URL haben
                    if (!urlToUse || urlToUse.trim() === '') {
                        console.warn(`⚠️ Empty URL for link ${index}:`, link);
                        return; // Skip diesen Link
                    }
                    
                    // URL escapen für JavaScript onclick
                    const escapedUrl = urlToUse.replace(/'/g, "\\'").replace(/"/g, '\\"');
                    const linkText = link.text || 'Open Link';
                    
                    buttonsHtml += `<button class="btn btn-secondary" onclick="projectManager.openExternalLink('${escapedUrl}')" style="margin-top: 8px; margin-right: 8px;">${linkText}</button>`;
                    
                    console.log(`✅ Added link ${index}: ${linkText} -> ${urlToUse}`);
                    
                } catch (error) {
                    console.error(`❌ Error processing link ${index}:`, link, error);
                    // Skip fehlerhaften Link und weitermachen
                }
            });
            
            if (buttonsHtml) {
                content += `<br>${buttonsHtml}`;
            }
            
            successDiv.innerHTML = content;
            successDiv.style.display = 'block';
            
            // Hide other messages
            this.hideOtherMessages('successMessage');
            
            // Auto-hide after 20 seconds (longer for success with multiple buttons)
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 20000);
        }
    },


    // Open external link (unified method)
    async openExternalLink(url) {
        try {
            console.log('Attempting to open URL:', url);
            
            if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
                // Use Electron's openExternal via IPC
                console.log('Using Electron openExternal via IPC');
                const result = await window.electronAPI.openExternal(url);
                if (result && !result.success) {
                    throw new Error(result.error || 'Failed to open URL');
                }
            } else {
                // Fallback to window.open for browser
                console.log('Using fallback window.open');
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Error opening external link:', error);
            // Final fallback - copy URL to clipboard or show it to user
            this.showError(`Cannot open link automatically. Please open this URL manually: ${url}`);
        }
    },

    // ==========================================
    // EXISTING METHODS (unchanged)
    // ==========================================

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            
            // Hide other messages
            this.hideOtherMessages('errorMessage');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        }
    },

    // Show success message with optional elabFTW link (LEGACY - for backward compatibility)
    showSuccess(message, projectPath = null, elabFTWUrl = null) {
        const links = [];
        if (elabFTWUrl) {
            links.push({
                type: 'elabFTW',
                url: elabFTWUrl,
                text: '🧪 Open in elabFTW'
            });
        }
        this.showEnhancedSuccess(message, projectPath, links);
    },

    // Show info message
    showInfo(message) {
        const infoDiv = document.getElementById('infoMessage');
        if (infoDiv) {
            infoDiv.textContent = message;
            infoDiv.style.display = 'block';
            
            // Hide other messages
            this.hideOtherMessages('infoMessage');
            
            // Auto-hide after 4 seconds
            setTimeout(() => {
                infoDiv.style.display = 'none';
            }, 4000);
        }
    },

    // Hide all messages
    hideMessages() {
        const messageIds = ['errorMessage', 'successMessage', 'infoMessage'];
        messageIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
    },

    // Hide other messages except the specified one
    hideOtherMessages(keepVisible) {
        const messageIds = ['errorMessage', 'successMessage', 'infoMessage'];
        messageIds.forEach(id => {
            if (id !== keepVisible) {
                const element = document.getElementById(id);
                if (element) {
                    element.style.display = 'none';
                }
            }
        });
    },

    // Open created folder in explorer
    async openCreatedFolder(folderPath) {
        if (window.electronAPI && window.electronAPI.openFolder) {
            try {
                await window.electronAPI.openFolder(folderPath);
            } catch (error) {
                this.showError('Error opening folder: ' + error.message);
            }
        } else {
            this.showError('Cannot open folder in browser mode');
        }
    },

    // Open elabFTW experiment in browser (LEGACY - kept for backward compatibility)
    async openElabFTWExperiment(url) {
        return this.openExternalLink(url);
    },
	
	// =================== NEW: METADATA LINKS MANAGEMENT ===================
    
    /**
     * Handle enhanced metadata upload with integration links
     * This function is called AFTER successful initial uploads to add links back to the metadata
     * @param {Object} originalMetadata - Original project metadata
     * @param {string} projectPath - Full path to created project
     * @param {Object} uploadResults - Results from elabFTW and OMERO uploads
     */
    async handleEnhancedMetadataUpload(originalMetadata, projectPath, uploadResults) {
        console.log('🔗 projectManager: Starting enhanced metadata upload with integration links');
        
        try {
            // Check if we have any successful uploads to process
            if (!window.metadataLinksManager || !window.metadataLinksManager.shouldAddIntegrationInfo(uploadResults.elabftw, uploadResults.omero)) {
                console.log('🔗 projectManager: No successful uploads to process - skipping enhanced upload');
                return;
            }
            
            // Step 1: Add integration info to metadata and update local file
            const enhancedMetadata = await window.metadataLinksManager.addIntegrationInfo(
                originalMetadata,
                projectPath,
                uploadResults.elabftw,
                uploadResults.omero
            );
            
            // Step 2: Create integration fields for external upload
            const integrationFields = window.metadataLinksManager.createIntegrationFields(
                enhancedMetadata.metafold_integration
            );
            
            // Step 3: Upload enhanced metadata to external services
            await this.uploadIntegrationFieldsToExternalServices(integrationFields, uploadResults);
            
            console.log('✅ projectManager: Enhanced metadata upload completed successfully');
            
        } catch (error) {
            console.error('❌ projectManager: Error in enhanced metadata upload:', error);
            // Don't throw - this is a non-critical enhancement
        }
    },
    
    /**
     * Upload integration fields to external services that were successfully used
     * @param {Object} integrationFields - Additional metadata fields with links
     * @param {Object} uploadResults - Results from initial uploads
     */
    async uploadIntegrationFieldsToExternalServices(integrationFields, uploadResults) {
        console.log('🔄 projectManager: Uploading integration fields to external services');
        console.log(`🔄 projectManager: ${Object.keys(integrationFields).length} integration fields to upload`);
        
       // Upload to elabFTW if it was successful initially
		if (uploadResults.elabftw && uploadResults.elabftw.success && (uploadResults.elabftw.experimentId || uploadResults.elabftw.id)) {
			console.log('🧪 projectManager: Adding integration fields to elabFTW experiment');
			
			try {
				// Use experimentId if available, otherwise use id field
				const experimentId = uploadResults.elabftw.experimentId || uploadResults.elabftw.id;
				await this.addIntegrationFieldsToElabFTW(experimentId, integrationFields);
				console.log('✅ projectManager: Integration fields added to elabFTW successfully');
			} catch (error) {
				console.error('❌ projectManager: Error adding integration fields to elabFTW:', error);
			}
		}
		
        // Upload to OMERO if it was successful initially
        if (uploadResults.omero && uploadResults.omero.success && uploadResults.omero.dataset?.id) {
            console.log('🔬 projectManager: Adding integration fields to OMERO dataset');
            
            try {
                await this.addIntegrationFieldsToOMERO(uploadResults.omero.dataset.id, integrationFields);
                console.log('✅ projectManager: Integration fields added to OMERO successfully');
            } catch (error) {
                console.error('❌ projectManager: Error adding integration fields to OMERO:', error);
            }
        }
    },
    
    /**
     * Add integration fields to existing elabFTW experiment
     * @param {string|number} experimentId - elabFTW experiment ID
     * @param {Object} integrationFields - Additional metadata fields to add
     */

	async addIntegrationFieldsToElabFTW(experimentId, integrationFields) {
		console.log(`🧪 projectManager: Adding integration fields to elabFTW experiment ${experimentId}`);
		
		if (!window.settingsManager || typeof window.settingsManager.updateExistingElabFTWExperiment !== 'function') {
			throw new Error('settingsManager.updateExistingElabFTWExperiment not available');
		}
		
		try {
			// ✅ KORREKTUR: Verwende die korrekte Funktion mit nur 2 Parametern
			const result = await window.settingsManager.updateExistingElabFTWExperiment(
				experimentId,
				integrationFields
			);
			
			if (!result.success) {
				throw new Error(result.message || 'Failed to update elabFTW experiment');
			}
			
			console.log('✅ projectManager: Integration fields successfully added to elabFTW');
			return result;
			
		} catch (error) {
			console.error('❌ projectManager: Error in addIntegrationFieldsToElabFTW:', error);
			throw error;
		}
	},

    /**
     * Add integration fields to existing OMERO dataset as map annotations
     * @param {string|number} datasetId - OMERO dataset ID
     * @param {Object} integrationFields - Additional metadata fields to add
     */
    async addIntegrationFieldsToOMERO(datasetId, integrationFields) {
        console.log(`🔬 projectManager: Adding integration fields to OMERO dataset ${datasetId}`);
        
        if (!window.metaFoldOMEROIntegration || typeof window.metaFoldOMEROIntegration.addWorkingMapAnnotations !== 'function') {
            throw new Error('metaFoldOMEROIntegration.addWorkingMapAnnotations not available');
        }
        
        try {
            // Convert integration fields to OMERO map annotation format
            const mapAnnotationData = this.convertIntegrationFieldsToOMEROFormat(integrationFields);
            
            // Add map annotations to the dataset
            const result = await window.metaFoldOMEROIntegration.addWorkingMapAnnotations(
                datasetId,
                mapAnnotationData,
                'NFDI4BioImage.MetaFold.IntegrationLinks' // Different namespace for integration info
            );
            
            if (!result.success) {
                throw new Error(result.message || 'Failed to add map annotations to OMERO');
            }
            
            console.log('✅ projectManager: Integration fields successfully added to OMERO');
            return result;
            
        } catch (error) {
            console.error('❌ projectManager: Error in addIntegrationFieldsToOMERO:', error);
            throw error;
        }
    },
    
    /**
     * Convert integration fields to OMERO map annotation format
     * @param {Object} integrationFields - Integration fields in MetaFold format
     * @returns {Object} Metadata in format expected by OMERO integration
     */
    convertIntegrationFieldsToOMEROFormat(integrationFields) {
        console.log('🔄 projectManager: Converting integration fields to OMERO format');
        
        const omeroFormat = {};
        
        Object.entries(integrationFields).forEach(([key, field]) => {
            omeroFormat[key] = {
                type: field.type || 'text',
                value: field.value || '',
                description: field.description || ''
            };
        });
        
        console.log(`🔄 projectManager: Converted ${Object.keys(omeroFormat).length} fields to OMERO format`);
        return omeroFormat;
    },
    
    /**
     * Enhanced createProject function integration point
     * Call this method right after the successful uploads in the existing createProject function
     * @param {Object} projectData - Original project data
     * @param {string} projectPath - Full path to created project  
     * @param {Object} uploadResults - Results from integration uploads
     */
    async processIntegrationLinksPostUpload(projectData, projectPath, uploadResults) {
        console.log('🔗 projectManager: Processing integration links post-upload');
        
        try {
            // Only proceed if we have successful uploads and the link manager is available
            if (!window.metadataLinksManager) {
                console.warn('⚠️ projectManager: metadataLinksManager not available - skipping link processing');
                return;
            }
            
            // Check if any uploads were successful
            const hasSuccessfulUploads = window.metadataLinksManager.shouldAddIntegrationInfo(
                uploadResults.elabftw, 
                uploadResults.omero
            );
            
            if (!hasSuccessfulUploads) {
                console.log('🔗 projectManager: No successful uploads - skipping link processing');
                return;
            }
            
            // Process enhanced metadata upload
            await this.handleEnhancedMetadataUpload(
                projectData.metadata,
                projectPath,
                uploadResults
            );
            
            console.log('✅ projectManager: Integration links processing completed');
            
        } catch (error) {
            console.error('❌ projectManager: Error processing integration links:', error);
            // Don't throw - this is an enhancement, not critical functionality
        }
    }
};

// Make globally available
window.projectManager = projectManager;