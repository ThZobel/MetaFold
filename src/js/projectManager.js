// Project Manager for creating projects

const projectManager = {
    // Browse path
    async browsePath() {
        if (window.electronAPI) {
            try {
                const selectedPath = await window.electronAPI.selectFolder();
                if (selectedPath) {
                    document.getElementById('targetPath').value = selectedPath;
                    this.updatePathPreview();
                }
            } catch (error) {
                console.error('Error selecting folder:', error);
                alert('Error opening file dialog');
            }
        } else {
            const path = prompt('Enter the desired path:', this.getDefaultPath());
            if (path) {
                document.getElementById('targetPath').value = path;
                this.updatePathPreview();
            }
        }
    },

    // Create project - EXTENDED for metadata-only support
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
                    // Escape path for button (double backslashes for Windows)
                    const escapedPath = result.projectPath.replace(/\\/g, '\\\\');
                    
                    // Extended success message with content info
                    let contentInfo = '';
                    if (result.hasStructure && result.hasMetadata) {
                        contentInfo = '<br><small>📁 Folder structure + 📄 Metadata created</small>';
                    } else if (result.hasStructure && !result.hasMetadata) {
                        contentInfo = '<br><small>📁 Folder structure created</small>';
                    } else if (!result.hasStructure && result.hasMetadata) {
                        contentInfo = '<br><small>📄 Only metadata created</small>';
                    }
                    
                    const successMessage = `
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <strong>✅ Success!</strong><br>
                                ${result.message}<br>
                                Project "${projectName}" in "${basePath}"${contentInfo}
                            </div>
                            <button class="btn btn-secondary" onclick="projectManager.openCreatedFolder('${escapedPath}')" style="margin-left: 15px; padding: 8px 16px;">
                                📂 Open
                            </button>
                        </div>
                    `;
                    this.showSuccess(successMessage);
                } else {
                    this.showError(result.message);
                }
            } catch (error) {
                console.error('Error creating project:', error);
                this.showError('Unexpected error creating project.');
            }
        } else {
            // Browser fallback
            const fullPath = basePath + (window.electronAPI && window.electronAPI.platform === 'win32' ? '\\' : '/') + projectName;
            let contentInfo = '';
            if (!hasStructure && hasMetadata) {
                contentInfo = ' (metadata only)';
            }
            
            const successMessage = `
                <strong>ℹ️ Browser Mode</strong><br>
                Project would be created in "${fullPath}"${contentInfo}.<br>
                <small>Use the desktop app for actual project creation.</small>
            `;
            this.showSuccess(successMessage);
        }
    },

    // Show template information - NEW FUNCTION
    updateTemplateInfo() {
        const template = templateManager.currentTemplate;
        const infoElement = document.getElementById('templateInfo');
        
        if (!template || !infoElement) return;
        
        const hasStructure = template.structure && template.structure.trim() !== '';
        const hasMetadata = template.type === 'experiment' && template.metadata && Object.keys(template.metadata).length > 0;
        
        let infoText = '';
        let infoClass = 'template-info';
        
        if (template.type === 'experiment') {
            if (hasStructure && hasMetadata) {
                infoText = '📁 Folder structure + 📄 Metadata';
                infoClass = 'template-info success';
            } else if (hasStructure && !hasMetadata) {
                infoText = '📁 Folder structure only';
                infoClass = 'template-info warning';
            } else if (!hasStructure && hasMetadata) {
                infoText = '📄 Metadata only (no folders)';
                infoClass = 'template-info info';
            } else {
                infoText = '⚠️ Empty template';
                infoClass = 'template-info error';
            }
        } else {
            if (hasStructure) {
                infoText = '📁 Folder structure';
                infoClass = 'template-info success';
            } else {
                infoText = '⚠️ No structure defined';
                infoClass = 'template-info error';
            }
        }
        
        infoElement.textContent = infoText;
        infoElement.className = infoClass;
    },

    // Default path based on platform (local copy)
    getDefaultPath() {
        if (window.utils) {
            return window.utils.getDefaultBasePath();
        }
        return 'C:\\Projects\\';
    },

    // Update path preview (local copy)
    updatePathPreview() {
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        const preview = document.getElementById('fullPathPreview');
        
        if (basePath && projectName) {
            const separator = window.electronAPI && window.electronAPI.platform === 'win32' ? '\\' : '/';
            preview.textContent = basePath + separator + projectName;
            preview.style.color = '#10b981';
        } else {
            preview.textContent = 'Choose directory and project name';
            preview.style.color = '#9ca3af';
        }
    },

    // Show info message - NEW FUNCTION
    showInfo(message) {
        const infoMessage = document.getElementById('infoMessage');
        if (infoMessage) {
            infoMessage.innerHTML = message;
            infoMessage.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                infoMessage.style.display = 'none';
            }, 5000);
        }
    },

    // Show error message (local copy)
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = `<strong>❌ Error!</strong><br>${message}`;
        errorMessage.style.display = 'block';
        
        // Hide after 8 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 8000);
    },

    // Show success message (local copy)
    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        
        // Hide after 8 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 8000);
    },

    // Hide messages (local copy)
    hideMessages() {
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        
        // Also hide info message if present
        const infoMessage = document.getElementById('infoMessage');
        if (infoMessage) {
            infoMessage.style.display = 'none';
        }
    },

    // Open folder (local copy)
    async openCreatedFolder(folderPath) {
        if (window.electronAPI) {
            try {
                await window.electronAPI.openFolder(folderPath);
            } catch (error) {
                console.error('Error opening folder:', error);
            }
        }
    },

    // Initialization
    init() {
        // Set default path if Electron is available
        if (window.utils) {
            document.getElementById('targetPath').value = window.utils.getDefaultBasePath();
        }
        
        // Path Preview Update Event Listeners
        document.getElementById('targetPath').addEventListener('input', () => this.updatePathPreview());
        document.getElementById('projectName').addEventListener('input', () => this.updatePathPreview());
        
        // Template Info Update Event Listener
        // This will be called by templateManager when a template is selected
        if (window.templateManager) {
            // Monkey-patch the select method to update template info
            const originalSelect = window.templateManager.select;
            window.templateManager.select = function(index) {
                const result = originalSelect.call(this, index);
                if (window.projectManager) {
                    window.projectManager.updateTemplateInfo();
                }
                return result;
            };
        }
    }
};

// Make globally available
window.projectManager = projectManager;