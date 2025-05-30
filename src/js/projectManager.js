// Project Manager - Handles project creation

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

    // Create project - EXTENDED for metadata-only support + elabFTW integration
    async createProject() {
        if (!templateManager.currentTemplate) return;
        
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        
        if (!basePath || !projectName) {
            this.showError('Please choose a base directory and enter a project name!');
            return;
        }

        // Evaluate template information
        const template = templateManager.currentTemplate;
        const hasStructure = template.structure && template.structure.trim() !== '';
        const hasMetadata = template.type === 'experiment' && template.metadata && Object.keys(template.metadata).length > 0;

        // Validate experiment fields (if present)
        let experimentMetadata = null;
        if (template.type === 'experiment' && hasMetadata) {
            const validationResult = experimentForm.validate();
            if (!validationResult.valid) {
                this.showError(validationResult.message);
                return;
            }
            experimentMetadata = experimentForm.collectData();
        }

        // Inform user if only metadata will be created
        if (!hasStructure && hasMetadata) {
            this.showInfo('ℹ️ This template creates only metadata files (no folder structure).');
        }

        // Hide previous messages
        this.hideMessages();
        
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.createProject(
                    basePath, 
                    projectName, 
                    template.structure || '',
                    experimentMetadata
                );
                
                if (result.success) {
                    // Handle elabFTW integration for experiments
                    let elabFTWResult = null;
                    if (template.type === 'experiment' && hasMetadata && settingsManager.get('elabftw.enabled')) {
                        // Check for existing experiment ID
                        const existingExpId = document.getElementById('existingExperimentId')?.value?.trim();
                        
                        if (existingExpId) {
                            // Update existing experiment
                            elabFTWResult = await settingsManager.updateExistingElabFTWExperiment(
                                existingExpId,
                                experimentMetadata
                            );
                        } else if (settingsManager.get('elabftw.auto_sync')) {
                            // Auto-sync to elabFTW (create new)
                            elabFTWResult = await settingsManager.createElabFTWExperiment(
                                projectName, 
                                experimentMetadata, 
                                template.structure
                            );
                        } else {
                            // Check manual checkbox
                            const sendToElabFTW = document.getElementById('sendToElabFTW');
                            if (sendToElabFTW && sendToElabFTW.checked) {
                                // Manual sync selected
                                elabFTWResult = await settingsManager.createElabFTWExperiment(
                                    projectName, 
                                    experimentMetadata, 
                                    template.structure
                                );
                            }
                        }
                    }

                    // Show success message with elabFTW link
                    let successMessage = result.message;
                    if (elabFTWResult && elabFTWResult.success) {
                        successMessage += ' Experiment also created in elabFTW!';
                        this.showSuccess(successMessage, result.projectPath, elabFTWResult.url);
                    } else if (elabFTWResult && !elabFTWResult.success) {
                        successMessage += ` (elabFTW sync failed: ${elabFTWResult.message})`;
                        this.showSuccess(successMessage, result.projectPath);
                    } else {
                        this.showSuccess(successMessage, result.projectPath);
                    }
                } else {
                    this.showError(result.message);
                }
            } catch (error) {
                this.showError('Error creating project: ' + error.message);
            }
        } else {
            this.showError('Project creation not available in browser mode');
        }
    },

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

    // Show success message with optional elabFTW link
    showSuccess(message, projectPath = null, elabFTWUrl = null) {
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
            
            // Add "Open in elabFTW" button if URL is provided
            if (elabFTWUrl) {
                buttonsHtml += `<button class="btn btn-secondary" onclick="projectManager.openElabFTWExperiment('${elabFTWUrl}')" style="margin-top: 8px;">🧪 Open in elabFTW</button>`;
            }
            
            if (buttonsHtml) {
                content += `<br>${buttonsHtml}`;
            }
            
            successDiv.innerHTML = content;
            successDiv.style.display = 'block';
            
            // Hide other messages
            this.hideOtherMessages('successMessage');
            
            // Auto-hide after 15 seconds (longer for success with buttons)
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 15000);
        }
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

    // Open elabFTW experiment in browser
    async openElabFTWExperiment(url) {
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
            console.error('Error opening elabFTW experiment:', error);
            // Final fallback - copy URL to clipboard or show it to user
            this.showError(`Cannot open elabFTW experiment automatically. Please open this URL manually: ${url}`);
        }
    }
};

// Make globally available
window.projectManager = projectManager;