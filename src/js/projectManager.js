// Project Manager - FUNKTIONSFÄHIGE KORRIGIERTE VERSION

/**
 * Get OMERO Server URL from settings - NO FALLBACK!
 */
async function getConfiguredOMEROServerUrl() {
    if (!window.settingsManager) {
        throw new Error('Settings manager not available - cannot get OMERO server URL');
    }

    const serverUrl = await window.settingsManager.get('omero.server_url');

    if (!serverUrl || serverUrl.trim() === '') {
        throw new Error('No OMERO server URL configured in settings');
    }

    return serverUrl.trim().endsWith('/') ? serverUrl.trim() : serverUrl.trim() + '/';
}

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

    // NEW: Multi-Folder Target Array
    multiFolderTargetPaths: [],

    // NEW: Add a folder to the multi-folder list
    async addMultiFolder() {
        if (window.electronAPI && window.electronAPI.selectFolders) {
            try {
                const selectedPaths = await window.electronAPI.selectFolders();
                if (selectedPaths && selectedPaths.length > 0) {
                    let added = false;
                    for (const path of selectedPaths) {
                        if (!this.multiFolderTargetPaths.includes(path)) {
                            this.multiFolderTargetPaths.push(path);
                            added = true;
                        }
                    }
                    if (added) {
                        this.renderMultiFolderList();
                    } else {
                        this.showInfo('Selected folders are already in the list.');
                    }
                }
            } catch (error) {
                this.showError('Error selecting folders: ' + error.message);
            }
        }
    },

    // NEW: Remove a folder from the list
    removeMultiFolder(index) {
        if (index >= 0 && index < this.multiFolderTargetPaths.length) {
            this.multiFolderTargetPaths.splice(index, 1);
            this.renderMultiFolderList();
        }
    },

    // NEW: Render the multi-folder list
    renderMultiFolderList() {
        const listDiv = document.getElementById('multiFolderList');
        if (!listDiv) return;

        if (this.multiFolderTargetPaths.length === 0) {
            listDiv.innerHTML = `<div class="multi-folder-empty">
                No folders selected. Click "Add Folder" to start.
            </div>`;
            return;
        }

        listDiv.innerHTML = this.multiFolderTargetPaths.map((path, index) => `
            <div class="multi-folder-item">
                <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
                    <span style="font-size: 1.1em;">📁</span>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: monospace;" title="${path}">
                        ${path}
                    </span>
                </div>
                <button onclick="projectManager.removeMultiFolder(${index})" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;" title="Remove">
                    <span style="font-size: 1.2em;">×</span>
                </button>
            </div>
        `).join('');
    },


    // Update path preview
    updatePathPreview() {
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        const preview = document.getElementById('fullPathPreview');
        const sidebarProjectName = document.getElementById('rsProjectName');

        if (sidebarProjectName) {
            sidebarProjectName.textContent = projectName || '-';
        }

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
        
        // Auto-save project defaults to the current template if active
        if (window.templateManager && typeof window.templateManager.saveCurrentTemplateWithElabFTWCategory === 'function') {
            // Debounce to prevent too many saves while typing
            clearTimeout(window._projectDefaultsSaveTimeout);
            window._projectDefaultsSaveTimeout = setTimeout(() => {
                window.templateManager.saveCurrentTemplateWithElabFTWCategory();
            }, 800);
        }
    },

    // Toggle Skip Project Folder Creation Mode
    toggleIntegrationsOnlyMode() {
        const checkbox = document.getElementById('onlyIntegrations');
        const targetPath = document.getElementById('targetPath');
        const pathPreview = document.getElementById('fullPathPreview');
        const pathStatus = document.getElementById('pathStatus');
        const projectNameSection = document.getElementById('projectNameSection');

        if (!checkbox || !targetPath) return;

        if (checkbox.checked) {
            // Enable "Skip Folder" mode:
            // Base Directory stays ACTIVE (user picks target folder for JSON)
            // Project Name becomes "Metadata Filename"

            // Update Project Name section labels
            if (projectNameSection) {
                const titleElement = projectNameSection.querySelector('h4');
                const subtitleElement = projectNameSection.querySelector('.section-subtitle');
                const inputElement = document.getElementById('projectName');

                if (titleElement) titleElement.textContent = 'Metadata Filename';
                if (subtitleElement) subtitleElement.textContent = 'Name for the metadata JSON file (saved as {name}-metadata.json)';
                if (inputElement) {
                    inputElement.placeholder = 'Experiment_Feedback';
                    inputElement.title = 'Enter a name for the metadata file';
                }
            }

            // Update path preview to show JSON file path
            if (pathPreview) {
                const basePath = targetPath.value.trim();
                const fileName = document.getElementById('projectName')?.value?.trim() || 'Experiment_Feedback';
                const sep = window.utils && window.utils.getPathSeparator ? window.utils.getPathSeparator() : '/';
                if (basePath) {
                    pathPreview.textContent = `${basePath}${sep}${fileName}-metadata.json`;
                } else {
                    pathPreview.textContent = '(Select a folder and enter a filename)';
                }
                pathPreview.style.fontStyle = 'italic';
                pathPreview.style.color = '#a855f7';
            }

            if (pathStatus) pathStatus.textContent = '';

            console.log('📄 Skip Project Folder Mode ENABLED');
        } else {
            // Disable mode: Restore normal Project Name labels

            if (projectNameSection) {
                const titleElement = projectNameSection.querySelector('h4');
                const subtitleElement = projectNameSection.querySelector('.section-subtitle');
                const inputElement = document.getElementById('projectName');

                if (titleElement) titleElement.textContent = 'Project Name';
                if (subtitleElement) subtitleElement.textContent = 'Name for your experiment/project';
                if (inputElement) {
                    inputElement.placeholder = 'My_Experiment_2024...';
                    inputElement.title = 'Enter a name for your project';
                }
            }

            if (pathPreview) {
                this.updatePathPreview();
                pathPreview.style.fontStyle = 'normal';
                pathPreview.style.color = '';
            }

            console.log('📄 Skip Project Folder Mode DISABLED');
        }
    },

    // NEW: Execute batch file write logic
    async executeBatchFileWrite(template) {
        let targetPaths = [];

        if (template.options?.multipleFolders) {
            targetPaths = [...this.multiFolderTargetPaths];
            if (targetPaths.length === 0) {
                this.showError('Please select at least one folder!');
                return;
            }
        } else {
            // Only writeFilesOnly is true
            const basePath = document.getElementById('targetPath').value.trim();
            if (!basePath) {
                this.showError('Please choose a base directory!');
                return;
            }
            targetPaths = [basePath];
        }

        // Get metadata
        const hasMetadata = template.type === 'experiment' &&
            template.metadata &&
            Object.keys(template.metadata).length > 0;

        let experimentMetadata = null;
        if (hasMetadata && window.experimentForm && window.experimentForm.collectData) {
            const validationResult = window.experimentForm.validate ? window.experimentForm.validate() : { valid: true };
            if (!validationResult.valid) {
                this.showError(validationResult.message);
                return;
            }
            experimentMetadata = window.experimentForm.collectData();
        }

        if (!experimentMetadata) {
            this.showError('No metadata available to write!');
            return;
        }

        // Inject provenance block (creator, group, ISA-compatible metadata)
        if (window.profileManager && window.profileManager.isInitialized) {
            const currentUsername = window.userManager ? window.userManager.getCurrentUser() : null;
            if (currentUsername) {
                experimentMetadata.provenance = window.profileManager.getProvenanceBlock(currentUsername);
                console.log('📋 Provenance block injected into batch metadata');
            }
        }

        const metadataStr = JSON.stringify(experimentMetadata, null, 2);

        if (!window.electronAPI || !window.electronAPI.writeFile) {
            this.showError('File writing is not available in browser mode.');
            return;
        }

        let successCount = 0;
        let errors = [];

        // Use custom filename if provided, otherwise default to ReadyToImport.json
        let customFileName = document.getElementById('projectName').value.trim();
        if (!customFileName) {
            customFileName = 'ReadyToImport.json';
        }

        for (const targetPath of targetPaths) {
            try {
                const filePath = targetPath + (targetPath.includes('\\') ? '\\' : '/') + customFileName;
                await window.electronAPI.writeFile(filePath, metadataStr);
                successCount++;
            } catch (err) {
                console.error(`Failed to write to ${targetPath}:`, err);
                errors.push(err.message);
            }
        }

        if (errors.length > 0) {
            this.showError(`Failed to write to ${errors.length} folder(s). First error: ${errors[0]}`);
        } else {
            this.showSuccess(`Successfully wrote metadata to ${successCount} folder(s)!`);
            
            // Clear selections if it was multiple folders
            if (template.options?.multipleFolders) {
                this.multiFolderTargetPaths = [];
                this.renderMultiFolderList();
            }
        }
    },
    async createProject() {
        if (!templateManager.currentTemplate) return;

        const template = templateManager.currentTemplate;
        
        // NEW: Batch file writer mode
        if (template.options?.multipleFolders || template.options?.writeFilesOnly) {
            return this.executeBatchFileWrite(template);
        }

        const onlyIntegrations = document.getElementById('onlyIntegrations')?.checked || false;

        // Base Path is required only if NOT in integrations-only mode
        const basePath = document.getElementById('targetPath').value.trim();
        const originalProjectName = document.getElementById('projectName').value.trim();

        if (!originalProjectName) {
            this.showError('Please enter a project name!');
            return;
        }

        if (!onlyIntegrations && !basePath) {
            this.showError('Please choose a base directory (or enable "Only send to integrations")!');
            return;
        }

        // Check Electron availability (only required for local folders)
        const isElectron = !!(window.electronAPI && window.electronAPI.createProject);

        if (!onlyIntegrations && !isElectron) {
            console.error('❌ Not running in Electron mode!');
            this.showError('Project creation is only available in the Electron app, not in browser mode.');
            return;
        }

        try {
            let finalProjectName = originalProjectName;
            let finalProjectPath = ''; // Will be empty for integrations only
            let conflictResolution = { proceed: true, wasRenamed: false, overwrite: false };

            // Start loading state
            const createBtn = document.getElementById('createProjectBtn'); // Assuming ID, adjust if different
            // Better: use a modal or global loading indicator if available, but for now we proceed

            // *** ONLY CHECK CONFLICTS IF CREATING LOCAL FOLDER OR SKIPPING FOLDER IN BASE PATH ***
            const isCloudOnly = onlyIntegrations && !basePath;
            const skipFolder = onlyIntegrations && !!basePath;

            if (!isCloudOnly) {
                // *** NEUE KONFLIKT-PRÜFUNG ***
                conflictResolution = await this.checkDirectoryAndResolveConflicts(basePath, originalProjectName, skipFolder);

                if (!conflictResolution.proceed) {
                    // User cancelled or error occurred
                    return;
                }

                // Verwende den eventuell geänderten Projektnamen
                finalProjectName = conflictResolution.projectName;
                finalProjectPath = conflictResolution.projectPath;
            } else {
                console.log('☁️ Skipping directory conflict check (Cloud Only Mode)');
                finalProjectPath = 'cloud-only'; // dummy path for logic
            }

            console.log(`📁 Final project name: ${finalProjectName}`);
            // ... (rest of logic)
            console.log(`📁 Final project path: ${finalProjectPath}`);

            // Ab hier: Normale createProject-Logik mit finalProjectName
            // Get template info
            const template = templateManager.currentTemplate;

            // Handle template structure
            let templateStructure = template.folderStructure || template.structure || '';
            if (Array.isArray(templateStructure)) {
                templateStructure = templateStructure.join('\n');
            }
            templateStructure = String(templateStructure || '');

            console.log('📋 templateStructure (processed):', templateStructure);
            console.log('📋 templateStructure type:', typeof templateStructure);
            console.log('📋 templateStructure length:', templateStructure.length);

            // Check if metadata exists
            let hasMetadata = template.type === 'experiment' &&
                template.metadata &&
                Object.keys(template.metadata).length > 0;

            // Get experiment metadata
            let experimentMetadata = window.experimentForm && window.experimentForm.collectData ?
                window.experimentForm.collectData() : null;

            // Ensure experimentMetadata exists so provenance is always saved
            if (!experimentMetadata) {
                experimentMetadata = {};
            }

            // Inject provenance block (creator, group, ISA-compatible metadata)
            if (window.profileManager && window.profileManager.isInitialized) {
                const currentUsername = window.userManager ? window.userManager.currentUser : null;
                if (currentUsername) {
                    experimentMetadata.provenance = window.profileManager.getProvenanceBlock(currentUsername);
                    console.log('📋 Provenance block injected into metadata (always-on)');
                }
            }

            // Update hasMetadata so the JSON is actually written later on
            hasMetadata = Object.keys(experimentMetadata).length > 0;

            // VALIDATION: Check required fields before creating project
            // Only validate if it's an experiment template with actual metadata fields (not just provenance)
            const isExperimentTemplate = template.type === 'experiment' && template.metadata && Object.keys(template.metadata).length > 0;
            if (isExperimentTemplate && window.experimentForm && window.experimentForm.validate) {
                console.log('🔍 Validating required fields...');

                const validationResult = window.experimentForm.validate();

                if (!validationResult.valid) {
                    console.warn('❌ Validation failed:', validationResult.message);
                    this.showError(validationResult.message);
                    return; // Stop project creation
                }

                console.log('✅ Validation passed - all required fields filled');
            }

            // 🚨 NEW: OMERO Group Validation - Check BEFORE creating project
            if (template.type === 'experiment' && hasMetadata && await settingsManager.get('omero.enabled')) {
                console.log('🔍 Performing OMERO group validation...');

                const omeroValidation = await this.shouldSyncToOMEROWithValidation();

                if (omeroValidation.sync === false && omeroValidation.validationError) {
                    console.warn('❌ OMERO group validation failed:', omeroValidation.validationError.message);
                    // Error is already displayed by showOMEROGroupWarning, just stop here
                    return; // Stop project creation - do not create folders if OMERO sync is invalid
                }

                console.log('✅ OMERO group validation passed or not applicable');
            }

            console.log('🚀 Starting project creation...');
            console.log('📁 basePath:', basePath);
            console.log('📁 projectName:', projectName);
            console.log('📋 templateStructure:', templateStructure);
            console.log('📋 experimentMetadata:', experimentMetadata);
            console.log('📋 hasMetadata:', hasMetadata);

            // PRE-FLIGHT: If "Fetch Next ID" is enabled, we MUST create the eLabFTW experiment first
            let elabFTWResult = null;
            let elabFTWProcessed = false;
            const fetchNextIdCheckbox = document.getElementById('elabftwFetchNextId');
            const shouldFetchNextId = fetchNextIdCheckbox ? fetchNextIdCheckbox.checked : false;
            const existingExpIdElement = document.getElementById('existingExperimentId');
            const existingExpId = existingExpIdElement?.value?.trim();

            if (shouldFetchNextId && !existingExpId && await settingsManager.get('elabftw.enabled') && await this.shouldSyncToElabFTW()) {
                console.log('🧪 eLabFTW: "Fetch Next ID" is enabled. Creating experiment FIRST to get ID...');
                
                const categoryIdElement = document.getElementById('elabftwProjectCategory');
                const specificCategoryId = categoryIdElement?.value?.trim();

                try {
                    elabFTWResult = await settingsManager.createElabFTWExperiment(
                        finalProjectName,
                        experimentMetadata || {},
                        templateStructure,
                        specificCategoryId
                    );
                    elabFTWProcessed = true;

                    if (elabFTWResult && elabFTWResult.success && elabFTWResult.custom_id) {
                        console.log(`✅ eLabFTW Custom ID retrieved: ${elabFTWResult.custom_id}`);
                        finalProjectName = `${elabFTWResult.custom_id}_${finalProjectName}`;
                        console.log(`📁 Project name updated to: ${finalProjectName}`);
                    } else {
                        console.warn('⚠️ eLabFTW: Could not fetch custom_id, proceeding with original project name.');
                    }
                } catch (elabFTWError) {
                    console.error('❌ eLabFTW pre-flight failed:', elabFTWError);
                    // If eLabFTW fails but fetchNextId was required, stop the process
                    throw new Error(`Failed to create eLabFTW experiment for Next ID: ${elabFTWError.message}`);
                }
            }

            // Create project with final (possibly changed) name
            // Create project locally OR skip if integrations only
            let result = { success: true, message: 'Project data processed successfully', projectPath: '' };

            if (!isCloudOnly) {
                console.log(skipFolder ? '📄 Creating local project file (Skipping Folder)...' : '🚀 Creating local project folder...');
                
                const userInfo = window.userManager ? { username: window.userManager.currentUser, groupname: window.userManager.currentGroup } : null;
                const options = {
                    extend: conflictResolution.extend || false,
                    skipFolder: skipFolder,
                    userInfo: userInfo,
                    templateName: template ? template.name : 'Unknown Template'
                };

                const projectNameToUse = (conflictResolution.extend && conflictResolution.existingProjectName) 
                    ? conflictResolution.existingProjectName 
                    : finalProjectName;

                result = await window.electronAPI.createProject(
                    basePath,
                    projectNameToUse,
                    templateStructure,
                    experimentMetadata,
                    options
                );
            } else {
                console.log('☁️ Skipping local project creation (Integrations Only)');
                result = {
                    success: true,
                    message: 'Integrations processing started',
                    projectPath: 'Cloud Project (No local folder)'
                };
            }

            console.log('✅ Project creation result:', result);

            if (result && result.success) {
                // NEW: Harvest IDs from the new project metadata
                if (window.electronAPI && window.electronAPI.saveIdValues && experimentMetadata) {
                    try {
                        const harvestResult = await window.electronAPI.saveIdValues(
                            experimentMetadata, 
                            window.userManager?.getCurrentUserInfo() || { username: 'default' }
                        );
                        if (harvestResult && harvestResult.success && harvestResult.newCount > 0) {
                            console.log(`🧠 Harvester: Added ${harvestResult.newCount} new IDs to dictionary`);
                        }
                    } catch (e) {
                        console.error('Error saving ID values:', e);
                    }
                }

                let successMessage = result.message;

                // Add information about name change if applicable
                if (conflictResolution.wasRenamed) {
                    successMessage += ` (Renamed from "${originalProjectName}" to avoid conflicts)`;
                } else if (conflictResolution.overwrite) {
                    successMessage += ` (Overwrote existing directory)`;
                } else if (conflictResolution.extend) {
                    successMessage += ` (Extended existing metadata)`;
                }
                
                let omeroResult = null;

                // elabFTW Integration
                if (await settingsManager.get('elabftw.enabled')) {
                    console.log('🧪 Starting elabFTW integration...');

                    const shouldSyncToElabFTW = await this.shouldSyncToElabFTW();

                    if (shouldSyncToElabFTW) {
                        if (elabFTWProcessed) {
                            console.log('🧪 eLabFTW already processed during pre-flight. Skipping duplicate creation.');
                            if (elabFTWResult && elabFTWResult.success) {
                                successMessage += ' (Synced to elabFTW with Custom ID)';
                            }
                        } else {
                            try {
                                console.log('🔧 DEBUG: Experiment ID check:', {
                                    element: !!existingExpIdElement,
                                    rawValue: existingExpIdElement?.value,
                                    trimmedValue: existingExpId,
                                    isEmpty: !existingExpId,
                                    length: existingExpId?.length || 0
                                });

                                if (existingExpId && existingExpId.length > 0) {
                                    // Update existing experiment
                                    console.log('🧪 Updating existing elabFTW experiment:', existingExpId);
                                    elabFTWResult = await settingsManager.updateExistingElabFTWExperiment(
                                        existingExpId,
                                        experimentMetadata || {}
                                    );
                                } else {
                                    // Create new experiment with final project name
                                    console.log('🧪 Creating new elabFTW experiment');

                                    // Get specific category ID if set
                                    const categoryIdElement = document.getElementById('elabftwProjectCategory');
                                    const specificCategoryId = categoryIdElement?.value?.trim();

                                    elabFTWResult = await settingsManager.createElabFTWExperiment(
                                        finalProjectName,
                                        experimentMetadata || {},
                                        templateStructure,
                                        specificCategoryId
                                    );
                                }

                                console.log('🧪 elabFTW result:', elabFTWResult);

                                if (elabFTWResult && elabFTWResult.success) {
                                    successMessage += ' (Synced to elabFTW)';
                                }

                            } catch (elabFTWError) {
                                console.error('❌ elabFTW integration failed:', elabFTWError);
                                elabFTWResult = {
                                    success: false,
                                    message: elabFTWError.message || 'Unknown elabFTW error'
                                };
                            }
                        }
                    } else {
                        console.log('🧪 elabFTW sync skipped');
                    }
                }

                // OMERO Integration - NOW WITH VALIDATED GROUP
                // NOTE: hasMetadata guard removed - consistent with elabFTW. User controls via sidebar toggle.
                if (await settingsManager.get('omero.enabled')) {
                    // Re-check validation result (should pass since we checked earlier)
                    const omeroValidation = await this.shouldSyncToOMEROWithValidation();

                    if (omeroValidation.sync) {
                        console.log('🔬 Starting OMERO upload with validated group...');
                        try {
                            const omeroOptions = this.getOMEROOptions();

                            // Override group ID with validated one
                            if (omeroValidation.groupId) {
                                omeroOptions.groupId = omeroValidation.groupId;
                                console.log('🔬 Using validated OMERO group ID:', omeroValidation.groupId);
                            }

                            omeroResult = await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(
                                finalProjectName,
                                experimentMetadata || {},
                                omeroOptions
                            );

                            console.log('🔬 OMERO result:', omeroResult);

                            if (omeroResult && omeroResult.success) {
                                successMessage += ' (Synced to OMERO)';
                            }
                        } catch (error) {
                            console.error('❌ OMERO upload failed:', error);
                            omeroResult = { success: false, message: error.message };
                        }
                    } else {
                        console.log('🔬 OMERO sync skipped (validation failed or not requested)');
                    }
                }

                // RSpace Integration
                let rspaceResult = null;
                // NOTE: hasMetadata guard removed - consistent with elabFTW. User controls via sidebar toggle.
                if (await settingsManager.get('rspace.enabled')) {
                    const shouldSyncToRSpace = await this.shouldSyncToRSpace();

                    if (shouldSyncToRSpace) {
                        console.log('🧪 Starting RSpace integration...');
                        try {
                            // Get tags from RSpace input
                            const tagsInput = document.getElementById('rspaceTags');
                            const tags = tagsInput ? tagsInput.value : 'metafold';

                            // Get parent folder
                            const folderSelect = document.getElementById('rspaceFolderSelect');
                            const parentId = folderSelect ? folderSelect.value : null;

                            // Format metadata as HTML for RSpace
                            let contentHtml = `<h2>${finalProjectName}</h2>`;
                            contentHtml += '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
                            contentHtml += '<thead><tr style="background-color: #f2f2f2;"><th>Field</th><th>Value</th></tr></thead><tbody>';

                            for (const [key, value] of Object.entries(experimentMetadata || {})) {
                                if (['projectName', 'templateInfo', 'metafold_integration'].includes(key)) continue;
                                const displayValue = (typeof value === 'object' && value !== null && value.value !== undefined) ? value.value : value;
                                contentHtml += `<tr><td><strong>${key}</strong></td><td>${displayValue}</td></tr>`;
                            }
                            contentHtml += '</tbody></table>';
                            contentHtml += `<p><em>Created by MetaFold on ${new Date().toLocaleString()}</em></p>`;

                            // Create RSpace document
                            const result = await window.rspaceIntegration.createDocument(finalProjectName, tags, contentHtml, parentId);

                            if (result && result.id) {
                                // Construct URL
                                let baseUrl = window.rspaceIntegration.config.apiUrl.replace(/\/api\/v1\/?$/, '');
                                if (!baseUrl.endsWith('/')) baseUrl += '/';

                                // User requested specific editor link format
                                // "Richtiger Link": .../workspace/editor/structuredDocument/{id}
                                const docUrl = `${baseUrl}workspace/editor/structuredDocument/${result.id}`;

                                rspaceResult = {
                                    success: true,
                                    documentUrl: docUrl,
                                    documentId: result.id,
                                    globalId: result.globalId
                                };

                                console.log('🧪 RSpace result:', rspaceResult);
                                successMessage += ' (Synced to RSp ace)';
                            }
                        } catch (rspaceError) {
                            console.error('❌ RSpace integration failed:', rspaceError);
                            rspaceResult = {
                                success: false,
                                message: rspaceError.message || 'Unknown RSpace error'
                            };
                        }
                    } else {
                        console.log('🧪 RSpace sync skipped');
                    }
                }

                // n8n Integration
                let n8nResult = null;
                if (await settingsManager.get('n8n.enabled')) {
                    const shouldSyncToN8n = await this.shouldSyncToN8n();

                    if (shouldSyncToN8n) {
                        console.log('🤖 Starting n8n integration...');
                        try {
                            const webhookUrl = await settingsManager.get('n8n.webhook_url');
                            const authType = await settingsManager.get('n8n.auth_type') || 'none';
                            const authToken = await settingsManager.get('n8n.auth_token');
                            const basicUser = await settingsManager.get('n8n.basic_user');
                            const basicPass = await settingsManager.get('n8n.basic_pass');
                            const instanceId = await settingsManager.get('n8n.instance_id');

                            if (!webhookUrl) {
                                throw new Error('n8n Webhook URL is not configured.');
                            }

                            // Build payload
                            const payload = {
                                event: 'project_created',
                                metafold_instance: instanceId || 'Unknown',
                                timestamp: new Date().toISOString(),
                                project: {
                                    name: finalProjectName,
                                    targetPath: result.projectPath,
                                    templateName: template.name,
                                    metadata: experimentMetadata || {}
                                }
                            };

                            // Add user context
                            if (window.userManager) {
                                const currentUser = window.userManager.getCurrentUser();
                                if (currentUser) {
                                    payload.user = currentUser.username;
                                }
                            }

                            // Prepare headers
                            const headers = {
                                'Content-Type': 'application/json'
                            };

                            if (authType === 'bearer' && authToken) {
                                headers['Authorization'] = `Bearer ${authToken}`;
                            } else if (authType === 'basic' && basicUser && basicPass) {
                                headers['Authorization'] = 'Basic ' + btoa(`${basicUser}:${basicPass}`);
                            }

                            // Send webhook request
                            const verifySsl = await settingsManager.get('n8n.verify_ssl'); // true by default
                            const sslVerificationEnabled = verifySsl !== false; // default: true
                            let responseData = {};
                            let isSuccess = false;

                            if (window.electronAPI && window.electronAPI.sendWebhook) {
                                // IPC path: runs in Main Process, supports rejectUnauthorized for self-signed certs
                                console.log(`🤖 Sending webhook via IPC (Main Process) | SSL verify: ${sslVerificationEnabled}`);
                                const response = await window.electronAPI.sendWebhook(webhookUrl, payload, headers, sslVerificationEnabled);
                                
                                if (!response.success) {
                                    // Provide a helpful error message for SSL issues
                                    const errMsg = response.error || String(response.status);
                                    if (errMsg.includes('CERT') || errMsg.includes('certificate') || errMsg.includes('SSL') || errMsg.includes('self-signed')) {
                                        throw new Error(
                                            `SSL certificate error connecting to n8n: "${errMsg}". ` +
                                            `Your n8n server uses a self-signed or untrusted certificate. ` +
                                            `Solution: In MetaFold Settings → n8n, disable "Verify SSL Certificate".`
                                        );
                                    }
                                    throw new Error(`n8n Webhook request failed: ${errMsg}`);
                                }
                                
                                try {
                                    responseData = JSON.parse(response.data);
                                } catch (e) {
                                    responseData.text = response.data;
                                }
                                isSuccess = true;
                            } else {
                                // Fallback: native fetch() in the Renderer Process
                                // ⚠️ This path CANNOT bypass SSL certificate errors (ERR_CERT_AUTHORITY_INVALID).
                                // If you see SSL errors, make sure MetaFold is running as an Electron app (not in a browser).
                                console.warn('⚠️ electronAPI.sendWebhook not available — falling back to native fetch(). SSL certificate bypass is NOT supported in this mode.');
                                if (!sslVerificationEnabled) {
                                    console.warn('⚠️ SSL verification is disabled in settings, but native fetch() cannot honor this — SSL errors may still occur. Run MetaFold as the Electron app to fix this.');
                                }
                                const response = await fetch(webhookUrl, {
                                    method: 'POST',
                                    headers: headers,
                                    body: JSON.stringify(payload)
                                });

                                if (!response.ok) {
                                    throw new Error(`HTTP error! status: ${response.status}`);
                                }

                                const contentType = response.headers.get("content-type");
                                if (contentType && contentType.indexOf("application/json") !== -1) {
                                    responseData = await response.json();
                                } else {
                                    responseData.text = await response.text();
                                }
                                isSuccess = true;
                            }

                            n8nResult = {
                                success: isSuccess,
                                data: responseData
                            };

                            console.log('🤖 n8n result:', n8nResult);
                            successMessage += ' (Triggered n8n)';

                        } catch (n8nError) {
                            console.error('❌ n8n integration failed:', n8nError);
                            n8nResult = {
                                success: false,
                                message: n8nError.message || 'Unknown n8n error'
                            };
                        }
                    } else {
                        console.log('🤖 n8n sync skipped');
                    }
                }

                // Process integration links
                try {
                    const uploadResults = {
                        elabftw: elabFTWResult,
                        omero: omeroResult,
                        rspace: rspaceResult,
                        n8n: n8nResult
                    };

                    const projectData = {
                        metadata: experimentMetadata || {},
                        projectName: finalProjectName,
                        basePath: basePath,
                        template: template
                    };

                    await this.processIntegrationLinksPostUpload(projectData, result.projectPath, uploadResults);
                } catch (linkError) {
                    console.error('❌ Error processing integration links (non-critical):', linkError);
                }

                // Build links and show success
                const links = await this.buildLinksFromResults({ elabftw: elabFTWResult, omero: omeroResult, rspace: rspaceResult, n8n: n8nResult });
                this.showEnhancedSuccess(successMessage, result.projectPath, links);

            } else {
                this.showError(result ? result.message : 'Unknown error occurred during project creation');
            }
        } catch (error) {
            console.error('❌ Error creating project:', error);
            this.showError('Error creating project: ' + error.message);
        }
    },

    // Check if should sync to elabFTW
    async shouldSyncToElabFTW() {
        const autoSync = await settingsManager.get('elabftw.auto_sync');
        if (autoSync) {
            console.log('🧪 elabFTW auto-sync is enabled');
            return true;
        }

        const sendToElabFTW = document.getElementById('sendToElabFTW');
        if (sendToElabFTW && sendToElabFTW.checked) {
            console.log('🧪 elabFTW manual sync checkbox is checked');
            return true;
        }

        console.log('🧪 elabFTW sync not requested');
        return false;
    },

    // Check if should sync to OMERO
    async shouldSyncToOMERO() {
        const autoSync = await settingsManager.get('omero.auto_sync');
        if (autoSync) {
            console.log('🔬 OMERO auto-sync is enabled');
            return true;
        }

        const sendToOMERO = document.getElementById('sendToOMERO');
        if (sendToOMERO && sendToOMERO.checked) {
            console.log('🔬 OMERO manual sync checkbox is checked');
            return true;
        }

        console.log('🔬 OMERO sync not requested');
        return false;
    },

    // Check if should sync to RSpace
    async shouldSyncToRSpace() {
        const autoSync = await settingsManager.get('rspace.auto_sync');
        if (autoSync) {
            console.log('🧪 RSpace auto-sync is enabled');
            return true;
        }

        const sendToRSpace = document.getElementById('sendToRSpace');
        if (sendToRSpace && sendToRSpace.checked) {
            console.log('🧪 RSpace manual sync checkbox is checked');
            return true;
        }

        console.log('🧪 RSpace sync not requested');
        return false;
    },

    // Check if should sync to n8n
    async shouldSyncToN8n() {
        const sendToN8n = document.getElementById('sendToN8n');
        if (sendToN8n && sendToN8n.checked) {
            console.log('🤖 n8n manual sync checkbox is checked');
            return true;
        }

        console.log('🤖 n8n sync not requested');
        return false;
    },

    /**
     * Phase 4.2: Handle OMERO login
     * Allows users to manually trigger OMERO login with password prompt if needed
     * @returns {Promise<boolean>} True if login successful
     */
    async handleOmeroLogin() {
        console.log('🔬 === MANUAL OMERO LOGIN ===');

        try {
            // Check if OMERO auth module is available
            if (!window.omeroAuth) {
                throw new Error('OMERO authentication module not available');
            }

            // Get username from settings
            const username = await window.settingsManager.get('omero.username');
            if (!username) {
                throw new Error('OMERO username not configured in settings');
            }

            console.log('🔬 Attempting OMERO login for user:', username);

            // Call omeroAuth.login() which will use getPassword() internally
            // This will trigger password prompt if "don't save password" is enabled
            const result = await window.omeroAuth.login(username);

            if (result && result.success) {
                console.log('✅ OMERO login successful');
                console.log('📋 Login method:', result.loginMethod);

                // Show success notification
                this.showInfo(`OMERO login successful as ${username}`);

                // Update UI if needed
                this.updateOmeroConnectionStatus(true);

                return true;
            } else {
                throw new Error(result?.message || 'Login failed');
            }

        } catch (error) {
            console.error('❌ OMERO login failed:', error);
            this.showError(`OMERO login failed: ${error.message}`);

            // Update UI
            this.updateOmeroConnectionStatus(false);

            return false;
        }
    },

    /**
     * Update OMERO connection status in UI
     * @param {boolean} isConnected - Whether OMERO is connected
     */
    updateOmeroConnectionStatus(isConnected) {
        // Update any UI elements that show OMERO connection status
        // This can be extended based on UI requirements
        console.log(`🔬 OMERO connection status updated: ${isConnected ? 'Connected' : 'Disconnected'}`);

        // Example: Update a status indicator if it exists
        const statusIndicator = document.getElementById('omeroConnectionStatus');
        if (statusIndicator) {
            statusIndicator.textContent = isConnected ? '🟢 Connected' : '🔴 Disconnected';
            statusIndicator.className = isConnected ? 'status-connected' : 'status-disconnected';
        }
    },


    // Build OMERO options with enhanced metadata support
    getOMEROOptions() {
        console.log('🔬 Building OMERO options...');

        const options = {};

        // Group selection
        const groupSelect = document.getElementById('omeroGroupSelect');
        if (groupSelect && groupSelect.value) {
            options.groupId = groupSelect.value;
            console.log('🔬 OMERO group selected:', options.groupId);
        } else {
            console.log('🔬 OMERO group: Using default/current');
        }

        // Project selection
        const projectSelect = document.getElementById('omeroProjectSelect');
        if (projectSelect && projectSelect.value && projectSelect.value !== 'refresh' && projectSelect.value !== '') {
            options.projectId = projectSelect.value;
            console.log('🔬 OMERO project selected:', options.projectId);
        } else {
            console.log('🔬 OMERO project: Creating standalone dataset');
        }

        // Namespace
        const namespaceInput = document.getElementById('omeroNamespace');
        if (namespaceInput && namespaceInput.value.trim()) {
            options.namespace = namespaceInput.value.trim();
        } else {
            options.namespace = 'NFDI4BioImage.MetaFold.ExperimentMetadata';
        }

        // *** JSON Triplets Checkbox Abfrage ***
        const jsonTripletsCheckbox = document.getElementById('omeroUseJsonTriplets');
        if (jsonTripletsCheckbox) {
            options.useJsonTriplets = jsonTripletsCheckbox.checked;
            console.log('🔬 JSON Triplets mode from UI:', options.useJsonTriplets);
        } else {
            console.log('🔬 JSON Triplets checkbox not found in UI');
        }

        // *** KORREKTUR: Template-Metadaten korrekt abrufen ***
        let currentTemplate = null;

        // FIX: Verwende templateManager.currentTemplate statt getCurrentTemplate()
        if (window.templateManager && window.templateManager.currentTemplate) {
            currentTemplate = window.templateManager.currentTemplate;
            console.log('🔬 Current template found:', currentTemplate.name);
            console.log('🔬 Template type:', currentTemplate.type);
        } else {
            console.warn('⚠️ No current template found');
            console.log('🔍 templateManager exists:', !!window.templateManager);
            console.log('🔍 currentTemplate exists:', !!(window.templateManager && window.templateManager.currentTemplate));
        }

        if (currentTemplate) {
            options.templateMetadata = currentTemplate;
            options.templateName = currentTemplate.name;
            console.log('🔬 Template metadata added for groups support:', currentTemplate.name);

            // Debug: Template groups detection
            if (currentTemplate.metadata) {
                const groupFields = Object.entries(currentTemplate.metadata)
                    .filter(([key, field]) => field && field.type === 'group')
                    .map(([key, field]) => ({
                        key: key,
                        label: field.label || key,
                        fieldCount: field.fields ? field.fields.length : 0
                    }));

                if (groupFields.length > 0) {
                    console.log('🔬 Template groups detected:', groupFields.length);
                    groupFields.forEach(group => {
                        console.log(`🔬    - Group: "${group.label}" (${group.fieldCount} fields)`);
                    });
                } else {
                    console.log('🔬 No template groups found in current template');
                }
            } else {
                console.log('🔬 Current template has no metadata structure');
            }
        } else {
            console.log('⚠️ No current template found for groups support');
        }

        // Add project path and user context (if needed)
        if (window.userManager && typeof window.userManager.getCurrentUser === 'function') {
            try {
                const currentUser = window.userManager.getCurrentUser();
                if (currentUser) {
                    options.username = currentUser.username;
                    options.groupname = currentUser.groupname;
                    console.log('🔬 User context added:', currentUser.username);
                }
            } catch (error) {
                console.warn('⚠️ Error getting current user:', error);
            }
        }

        console.log('🔬 Complete OMERO options (with template metadata):', options);
        return options;
    },


    // Enhanced sync to OMERO with correct template metadata passing
    async syncToOMERO(projectName, targetPath, metadata) {
        console.log('🔬 Enhanced OMERO sync starting...', projectName);

        if (!window.settingsManager) {
            throw new Error('Settings manager not available');
        }

        const omeroOptions = this.getOMEROOptions();

        // *** KORREKTUR: Template-Metadaten für Groups Support hinzufügen ***
        let currentTemplate = null;

        // FIX: Korrekte Template-Abfrage
        if (window.templateManager && window.templateManager.currentTemplate) {
            currentTemplate = window.templateManager.currentTemplate;
            console.log('🔬 Current template retrieved for OMERO sync:', currentTemplate.name);
        } else {
            console.warn('⚠️ No current template available for OMERO sync');
        }

        if (currentTemplate) {
            omeroOptions.templateMetadata = currentTemplate;
            omeroOptions.templateName = currentTemplate.name;
            console.log('🔬 Template metadata added for groups support:', currentTemplate.name);
            console.log('🔬 Template groups found:', Object.keys(currentTemplate.metadata || {}));

            // Debug: Suche nach Group-Feldern
            if (currentTemplate.metadata) {
                const groupFields = Object.entries(currentTemplate.metadata)
                    .filter(([key, field]) => field && field.type === 'group');

                if (groupFields.length > 0) {
                    console.log('🔬 Group fields detected for OMERO sync:');
                    groupFields.forEach(([key, field]) => {
                        const groupName = field.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        console.log(`🔬    - "${groupName}": ${field.fields ? field.fields.length : 0} fields`);
                    });
                } else {
                    console.log('🔬 No group fields found in template metadata');
                }
            }
        } else {
            console.log('⚠️ No current template found for groups support');
        }

        // Add project path and user context
        omeroOptions.projectPath = targetPath;
        if (window.userManager) {
            const currentUser = window.userManager.getCurrentUser();
            if (currentUser) {
                omeroOptions.username = currentUser.username;
                omeroOptions.groupname = currentUser.groupname;
            }
        }

        console.log('🔬 Enhanced OMERO options:', omeroOptions);

        // *** FIX: IMPROVED FUNCTION DETECTION AND CALLS ***
        try {
            // Method 1: Try Enhanced Integration method
            if (window.metaFoldOMEROIntegration && window.metaFoldOMEROIntegration.createDatasetForMetaFoldProjectEnhanced) {
                console.log('🔬 Using ENHANCED OMERO integration method...');
                return await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProjectEnhanced(projectName, metadata, omeroOptions);
            }

            // Method 2: Try Standard Integration method with Enhanced Map Annotations
            else if (window.metaFoldOMEROIntegration && window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject) {
                console.log('🔬 Using STANDARD OMERO integration with enhanced annotations...');

                // Create dataset using standard method
                const result = await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(projectName, metadata, omeroOptions);

                // If successful and we have template metadata, try to add enhanced annotations
                if (result.success && currentTemplate && result.dataset && result.dataset.id) {
                    console.log('🔬 Dataset created successfully, adding enhanced annotations...');

                    try {
                        // Try to replace annotations with enhanced version
                        const enhancedAnnotations = await window.metaFoldOMEROIntegration.addMapAnnotationsNew(
                            result.dataset.id,
                            metadata,
                            omeroOptions.namespace,
                            {
                                templateMetadata: currentTemplate,
                                useJsonTriplets: omeroOptions.useJsonTriplets,
                                useTemplateGroupsAsNamespaces: true,
                                integrationLinksAsKeyValue: true
                            }
                        );

                        if (enhancedAnnotations.success) {
                            console.log('✅ Enhanced annotations added successfully!');
                            result.annotations = {
                                ...result.annotations,
                                enhanced: enhancedAnnotations
                            };
                        }
                    } catch (enhancedError) {
                        console.warn('⚠️ Enhanced annotations failed, keeping standard annotations:', enhancedError);
                    }
                }

                return result;
            }

            // Method 3: Fallback to settings manager
            else if (window.settingsManager.createOMERODatasetEnhanced) {
                console.log('🔬 Using settings manager enhanced OMERO method...');
                return await window.settingsManager.createOMERODatasetEnhanced(projectName, metadata, omeroOptions);
            }

            // Method 4: Last resort fallback
            else if (window.settingsManager.createOMERODataset) {
                console.log('🔬 Using settings manager standard OMERO method (groups not supported)...');
                return await window.settingsManager.createOMERODataset(projectName, metadata, omeroOptions);
            }

            else {
                throw new Error('No OMERO integration method available');
            }

        } catch (error) {
            console.error('❌ OMERO sync failed:', error);
            throw error;
        }
    },

    // Build links from integration results
    async buildLinksFromResults(uploadResults) {
        const links = [];

        // elabFTW Link
        if (uploadResults.elabftw && uploadResults.elabftw.success) {
            let elabUrl = null;

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

        // OMERO Link - KORRIGIERTE VERSION
        if (uploadResults.omero && uploadResults.omero.success) {
            let omeroUrl = null;

            if (uploadResults.omero.dataset && uploadResults.omero.dataset.omeroWebUrl) {
                omeroUrl = uploadResults.omero.dataset.omeroWebUrl;
            } else if (uploadResults.omero.omeroWebUrl) {
                omeroUrl = uploadResults.omero.omeroWebUrl;
            } else if (uploadResults.omero.url) {
                omeroUrl = uploadResults.omero.url;
            } else if (uploadResults.omero.dataset && uploadResults.omero.dataset.id) {
                // Fallback: URL aus Dataset-ID konstruieren - FIXED to use dynamic server URL
                const datasetId = uploadResults.omero.dataset.id;

                try {
                    // Try to get server URL from settings
                    let serverUrl = null;
                    if (window.settingsManager && typeof window.settingsManager.get === 'function') {
                        serverUrl = await window.settingsManager.get('omero.server_url');
                    }

                    // Fallback: Try to get from current OMERO session
                    if (!serverUrl && window.metaFoldOMEROIntegration?.hybridAuth?.session?.serverUrl) {
                        serverUrl = window.metaFoldOMEROIntegration.hybridAuth.session.serverUrl;
                    }

                    if (!serverUrl) {
                        throw new Error('No OMERO server URL configured - cannot generate link');
                    }

                    omeroUrl = `${serverUrl}webclient/?show=dataset-${datasetId}`;
                    console.log(`🔗 projectManager: Generated dynamic fallback OMERO URL: ${omeroUrl}`);

                } catch (error) {
                    console.error('❌ projectManager: Error generating dynamic OMERO URL:', error);
                    omeroUrl = null; // Don't create invalid links
                }
            }

            if (omeroUrl) {
                links.push({
                    type: 'OMERO',
                    url: omeroUrl,
                    text: '🔬 Open in OMERO'
                });
            } else {
                console.warn('⚠️ OMERO URL not found in result:', uploadResults.omero);
            }
        }

        // RSpace Link
        if (uploadResults.rspace && uploadResults.rspace.success) {
            let rspaceUrl = null;

            if (uploadResults.rspace.documentUrl) {
                rspaceUrl = uploadResults.rspace.documentUrl;
            } else if (uploadResults.rspace.url) {
                rspaceUrl = uploadResults.rspace.url;
            }

            if (rspaceUrl) {
                links.push({
                    type: 'RSpace',
                    url: rspaceUrl,
                    text: '📝 Open in RSpace'
                });
            } else {
                console.warn('⚠️ RSpace URL not found in result:', uploadResults.rspace);
            }
        }

        return links;
    },

    // =================== FIXED MESSAGE FUNCTIONS ===================

    /**
     * Central function to clear ALL messages
     * This ensures old messages are completely removed before showing new ones
     */
    clearAllMessages() {
        const messageIds = ['errorMessage', 'successMessage', 'infoMessage'];
        messageIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
                element.innerHTML = '';  // Clear content completely
            }
        });
    },

    /**
     * Show enhanced success message
     * FIXED: Validates BEFORE clearing (prevents empty divs from being displayed)
     */
    showEnhancedSuccess(message, projectPath = null, links = []) {
        // ✅ CRITICAL FIX: Validate FIRST, before any DOM manipulation
        if (!message || message.trim() === '') {
            console.warn('⚠️ Attempted to show empty success message - BLOCKED');
            return;
        }

        // Only clear messages if we have valid content
        this.clearAllMessages();

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

            // Add external links
            links.forEach((link, index) => {
                try {
                    let urlToUse = '';

                    if (typeof link.url === 'string') {
                        urlToUse = link.url;
                    } else if (link.url && typeof link.url === 'object') {
                        urlToUse = link.url.main || link.url.web || link.url.url || link.url.omeroWebUrl || '';
                    } else {
                        console.warn(`⚠️ Link ${index} URL format not recognized:`, link);
                        urlToUse = String(link.url || '');
                    }

                    if (!urlToUse || urlToUse.trim() === '') {
                        console.warn(`⚠️ Empty URL for link ${index}:`, link);
                        return;
                    }

                    const escapedUrl = urlToUse.replace(/'/g, "\\'").replace(/"/g, '\\"');
                    const linkText = link.text || 'Open Link';

                    buttonsHtml += `<button class="btn btn-secondary" onclick="projectManager.openExternalLink('${escapedUrl}')" style="margin-top: 8px; margin-right: 8px;">${linkText}</button>`;

                } catch (error) {
                    console.error(`❌ Error processing link ${index}:`, link, error);
                }
            });

            if (buttonsHtml) {
                content += `<br>${buttonsHtml}`;
            }

            successDiv.innerHTML = content;
            successDiv.style.display = 'block';

            console.log('✅ Success message displayed:', message.substring(0, 50) + '...');

            // Auto-hide after 20 seconds
            setTimeout(() => {
                successDiv.style.display = 'none';
                successDiv.innerHTML = '';
            }, 20000);
        }
    },

    // Open external link
    async openExternalLink(url) {
        try {
            console.log('Attempting to open URL:', url);

            if (window.electronAPI && typeof window.electronAPI.openExternal === 'function') {
                console.log('Using Electron openExternal via IPC');
                const result = await window.electronAPI.openExternal(url);
                if (result && !result.success) {
                    throw new Error(result.error || 'Failed to open URL');
                }
            } else {
                console.log('Using fallback window.open');
                window.open(url, '_blank', 'noopener,noreferrer');
            }
        } catch (error) {
            console.error('Error opening external link:', error);
            this.showError(`Cannot open link automatically. Please open this URL manually: ${url}`);
        }
    },

    /**
     * Show error message
     * FIXED: Validates BEFORE clearing
     */
    showError(message) {
        // ✅ CRITICAL FIX: Validate FIRST
        if (!message || message.trim() === '') {
            console.warn('⚠️ Attempted to show empty error message - BLOCKED');
            return;
        }

        // Only clear if we have valid content
        this.clearAllMessages();

        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.innerHTML = `❌ ${message}`;
            errorDiv.style.display = 'block';

            // Reset to original error styling
            errorDiv.style.background = '';
            errorDiv.style.borderLeft = '';
            errorDiv.style.color = '';

            console.log('⚠️ Error message displayed:', message.substring(0, 50) + '...');

            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorDiv.style.display = 'none';
                errorDiv.innerHTML = '';
            }, 10000);
        }
    },

    /**
     * Show success message (legacy version)
     * FIXED: Validates BEFORE clearing
     */
    showSuccess(message, projectPath = null, elabFTWUrl = null) {
        // ✅ Validation happens in showEnhancedSuccess
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

    /**
     * Show info message
     * FIXED: Validates BEFORE clearing
     */
    showInfo(message) {
        // ✅ CRITICAL FIX: Validate FIRST
        if (!message || message.trim() === '') {
            console.warn('⚠️ Attempted to show empty info message - BLOCKED');
            return;
        }

        // Only clear if we have valid content
        this.clearAllMessages();

        const infoDiv = document.getElementById('infoMessage');
        if (infoDiv) {
            infoDiv.innerHTML = `ℹ️ ${message}`;
            infoDiv.style.display = 'block';

            console.log('ℹ️ Info message displayed:', message.substring(0, 50) + '...');

            // Auto-hide after 6 seconds
            setTimeout(() => {
                infoDiv.style.display = 'none';
                infoDiv.innerHTML = '';
            }, 6000);
        }
    },

    /**
     * Hide all messages immediately
     */
    hideMessages() {
        this.clearAllMessages();
    },

    /**
     * Hide other messages (DEPRECATED - use clearAllMessages instead)
     * Kept for backwards compatibility but now just calls clearAllMessages
     */
    hideOtherMessages(keepVisible) {
        if (!keepVisible) {
            this.clearAllMessages();
            return;
        }

        // Legacy behavior: hide all except one
        const messageIds = ['errorMessage', 'successMessage', 'infoMessage'];
        messageIds.forEach(id => {
            if (id !== keepVisible) {
                const element = document.getElementById(id);
                if (element) {
                    element.style.display = 'none';
                    element.innerHTML = '';
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

    // Legacy method
    async openElabFTWExperiment(url) {
        return this.openExternalLink(url);
    },

    // =================== METADATA LINKS MANAGEMENT ===================

    async handleEnhancedMetadataUpload(originalMetadata, projectPath, uploadResults) {
        console.log('🔗 projectManager: Starting enhanced metadata upload with integration links');

        try {
            if (!window.metadataLinksManager || !window.metadataLinksManager.shouldAddIntegrationInfo(uploadResults.elabftw, uploadResults.omero)) {
                console.log('🔗 projectManager: No successful uploads to process - skipping enhanced upload');
                return;
            }

            const enhancedMetadata = await window.metadataLinksManager.addIntegrationInfo(
                originalMetadata,
                projectPath,
                uploadResults.elabftw,
                uploadResults.omero
            );

            const integrationFields = window.metadataLinksManager.createIntegrationFields(
                enhancedMetadata.metafold_integration
            );

            await this.uploadIntegrationFieldsToExternalServices(integrationFields, uploadResults);

            console.log('✅ projectManager: Enhanced metadata upload completed successfully');

        } catch (error) {
            console.error('❌ projectManager: Error in enhanced metadata upload:', error);
        }
    },

    async uploadIntegrationFieldsToExternalServices(integrationFields, uploadResults) {
        console.log('🔄 projectManager: Uploading integration fields to external services');
        console.log(`🔄 projectManager: ${Object.keys(integrationFields).length} integration fields to upload`);

        // Upload to elabFTW if successful
        if (uploadResults.elabftw && uploadResults.elabftw.success && (uploadResults.elabftw.experimentId || uploadResults.elabftw.id)) {
            console.log('🧪 projectManager: Adding integration fields to elabFTW experiment');

            try {
                const experimentId = uploadResults.elabftw.experimentId || uploadResults.elabftw.id;
                await this.addIntegrationFieldsToElabFTW(experimentId, integrationFields);
                console.log('✅ projectManager: Integration fields added to elabFTW successfully');
            } catch (error) {
                console.error('❌ projectManager: Error adding integration fields to elabFTW:', error);
            }
        }

        // Upload to OMERO if successful
        const omeroDatasetId = uploadResults.omero?.integration?.datasetId || uploadResults.omero?.dataset?.datasetId || uploadResults.omero?.dataset?.id;
        if (uploadResults.omero && uploadResults.omero.success && omeroDatasetId) {
            console.log('🔬 projectManager: Adding integration fields to OMERO dataset/project');

            try {
                // Determine if it is a project or dataset from the URL
                const isProject = uploadResults.omero.integration?.url?.includes('show=project') || uploadResults.omero.dataset?.omeroWebUrl?.includes('show=project');
                const objectType = isProject ? 'project' : 'dataset';
                await this.addIntegrationFieldsToOMERO(omeroDatasetId, integrationFields, objectType);
                console.log('✅ projectManager: Integration fields added to OMERO successfully');
            } catch (error) {
                console.error('❌ projectManager: Error adding integration fields to OMERO:', error);
            }
        }
    },

    async addIntegrationFieldsToElabFTW(experimentId, integrationFields) {
        console.log(`🧪 projectManager: Adding integration fields to elabFTW experiment ${experimentId}`);

        if (!window.settingsManager || typeof window.settingsManager.updateExistingElabFTWExperiment !== 'function') {
            throw new Error('settingsManager.updateExistingElabFTWExperiment not available');
        }

        try {
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

    async addIntegrationFieldsToOMERO(datasetId, integrationFields, objectType = 'dataset') {
        console.log(`🔬 projectManager: Adding enhanced integration fields to OMERO dataset ${datasetId}`);

        // FIX: Check format of integrationFields
        console.log('🔍 Integration fields type:', typeof integrationFields);
        console.log('🔍 Integration fields keys:', Object.keys(integrationFields));

        if (!window.omeroAnnotations || typeof window.omeroAnnotations.convertIntegrationLinksToKeyValue !== 'function') {
            console.warn('⚠️ Phase 2 integration links method not available, using fallback');
            // Fallback to old method
            if (window.metaFoldOMEROIntegration && typeof window.metaFoldOMEROIntegration.addWorkingMapAnnotations === 'function') {
                const mapAnnotationData = this.convertIntegrationFieldsToOMEROFormat(integrationFields);
                return await window.metaFoldOMEROIntegration.addWorkingMapAnnotations(
                    datasetId,
                    mapAnnotationData,
                    'NFDI4BioImage.MetaFold.IntegrationLinks'
                );
            } else {
                throw new Error('No integration fields method available');
            }
        }

        try {
            // Phase 2: Use new Key-Value integration links method
            console.log('🔗 Using Phase 2 Key-Value integration links method...');

            // FIX: Convert integration fields to the format expected by Phase 2 method
            const integrationData = {};

            // FIX: Use Object.entries instead of forEach (integrationFields is Object, not Array)
            Object.entries(integrationFields).forEach(([fieldName, fieldData]) => {
                let key = fieldName.toLowerCase().replace(/\s+/g, '_');
                let value = fieldData.value || fieldData;

                // Convert common field names to standard integration data keys
                if (fieldName.includes('Path') || fieldName.includes('path')) {
                    key = 'project_local_path';
                } else if (fieldName.includes('Created') || fieldName.includes('timestamp')) {
                    key = 'metafold_export_timestamp';
                } else if (fieldName.includes('OMERO') && fieldName.includes('Link')) {
                    key = 'omero_link';
                } else if (fieldName.includes('elabFTW') || fieldName.includes('elab')) {
                    key = 'elabftw_link';
                }

                integrationData[key] = value;
                console.log(`🔗 Mapped: ${fieldName} → ${key} = "${value}"`);
            });

            console.log('🔗 Integration data prepared:', integrationData);

            // Use Phase 2 conversion method  
            const keyValuePairs = window.omeroAnnotations.convertIntegrationLinksToKeyValue(integrationData);

            if (keyValuePairs.length > 0) {
                // Create annotation using Phase 2 method with System Metadata namespace
                const result = await window.omeroAnnotations.testCreateMultipleKeyValues(datasetId, keyValuePairs, objectType, 'System Metadata by MetaFold');

                if (result.success) {
                    console.log('✅ projectManager: Enhanced integration fields successfully added to OMERO');
                    return {
                        success: true,
                        message: `Added ${keyValuePairs.length} integration links as clean key-value pairs`,
                        keyValuePairs: keyValuePairs.length,
                        annotationId: result.annotationId,
                        method: 'phase2_key_value'
                    };
                } else {
                    throw new Error(result.error || 'Failed to create key-value annotation');
                }
            } else {
                console.warn('⚠️ No key-value pairs generated from integration fields');
                return {
                    success: false,
                    message: 'No valid integration fields to process'
                };
            }

        } catch (error) {
            console.error('❌ projectManager: Error in enhanced addIntegrationFieldsToOMERO:', error);
            throw error;
        }
    },

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

    async processIntegrationLinksPostUpload(projectData, projectPath, uploadResults) {
        console.log('🔗 projectManager: Processing integration links post-upload');

        try {
            if (!window.metadataLinksManager) {
                console.warn('⚠️ projectManager: metadataLinksManager not available - skipping link processing');
                return;
            }

            const hasSuccessfulUploads = window.metadataLinksManager.shouldAddIntegrationInfo(
                uploadResults.elabftw,
                uploadResults.omero
            ) || (uploadResults.rspace && uploadResults.rspace.success);

            if (!hasSuccessfulUploads) {
                console.log('🔗 projectManager: No successful uploads - skipping link processing');
                return;
            }

            await this.handleEnhancedMetadataUpload(
                projectData.metadata,
                projectPath,
                uploadResults
            );

            // 🔗 SIMPLE: Insert links into existing README.html
            console.log('📄 projectManager: Inserting integration links into existing README...');

            if (window.electronAPI && window.electronAPI.insertLinksIntoReadme) {
                try {
                    // Extract URLs from upload results
                    let elabftwUrl = null;
                    let omeroUrl = null;
                    let rspaceUrl = null;

                    if (uploadResults.elabftw && uploadResults.elabftw.success && uploadResults.elabftw.url) {
                        elabftwUrl = uploadResults.elabftw.url;
                    }

                    if (uploadResults.omero && uploadResults.omero.success) {
                        if (uploadResults.omero.dataset && uploadResults.omero.dataset.omeroWebUrl) {
                            omeroUrl = uploadResults.omero.dataset.omeroWebUrl;
                        } else if (uploadResults.omero.url) {
                            omeroUrl = uploadResults.omero.url;
                        } else if (uploadResults.omero.dataset && uploadResults.omero.dataset.id) {
                            // Generate dynamic OMERO URL instead of hardcoded one
                            try {
                                // Try to get server URL from settings
                                let serverUrl = null;
                                if (window.settingsManager && typeof window.settingsManager.get === 'function') {
                                    serverUrl = await window.settingsManager.get('omero.server_url');
                                }

                                // Fallback: Try to get from current OMERO session
                                if (!serverUrl && window.metaFoldOMEROIntegration?.hybridAuth?.session?.serverUrl) {
                                    serverUrl = window.metaFoldOMEROIntegration.hybridAuth.session.serverUrl;
                                }

                                if (!serverUrl) {
                                    throw new Error('No OMERO server URL configured - cannot generate integration link');
                                }

                                omeroUrl = `${serverUrl}webclient/?show=dataset-${uploadResults.omero.dataset.id}`;
                                console.log(`🔗 projectManager: Generated dynamic OMERO integration URL: ${omeroUrl}`);

                            } catch (error) {
                                console.error('❌ projectManager: Error generating dynamic OMERO integration URL:', error);
                                omeroUrl = null; // Don't create invalid links
                            }
                        }
                    }

                    if (uploadResults.rspace && uploadResults.rspace.success) {
                        if (uploadResults.rspace.documentUrl) {
                            rspaceUrl = uploadResults.rspace.documentUrl;
                        } else if (uploadResults.rspace.url) {
                            rspaceUrl = uploadResults.rspace.url;
                        }
                    }
                    // ✅ FIX: Use projectData.projectName instead of undefined finalProjectName
                    const projectName = projectData.projectName;

                    // Insert links if we have any
                    if (elabftwUrl || omeroUrl || rspaceUrl) {
                        const insertResult = await window.electronAPI.insertLinksIntoReadme(
                            projectPath,
                            elabftwUrl,
                            omeroUrl,
                            projectName,  // ✅ FIXED: Now using defined variable
                            rspaceUrl
                        );

                        if (insertResult.success) {
                            console.log('✅ projectManager: Integration links inserted into README successfully');
                        } else {
                            // Not an error - folder-only templates have no README, that's expected
                            console.log('📄 projectManager: No README to update (folder-only template or README not yet created):', insertResult.message);
                        }
                    } else {
                        console.log('📄 projectManager: No integration links to insert');
                    }
                } catch (linkError) {
                    console.error('❌ projectManager: Error inserting links into README:', linkError);
                }
            } else {
                console.warn('⚠️ projectManager: Link insertion not available - running in browser mode');
            }


            console.log('✅ projectManager: Integration links processing completed');

        } catch (error) {
            console.error('❌ projectManager: Error processing integration links:', error);
        }
    },

    // =================== OMERO GROUP VALIDATION ===================

    /**
     * Validate OMERO group selection before project creation
     * Prevents creation when "All" is selected (which is not a valid group)
     */
    validateOMEROGroupSelection() {
        const sendToOMERO = document.getElementById('sendToOMERO');
        const groupSelect = document.getElementById('omeroGroupSelect');

        // Skip validation if OMERO sync is not requested
        if (!sendToOMERO || !sendToOMERO.checked) {
            return { valid: true, message: 'OMERO sync not requested' };
        }

        // Skip validation if group dropdown not found
        if (!groupSelect) {
            return { valid: true, message: 'OMERO group dropdown not found' };
        }

        const selectedGroupId = groupSelect.value;

        console.log('🔍 Validating OMERO group selection:', selectedGroupId);

        // Check if "All" or similar is selected
        if (selectedGroupId === 'all' || selectedGroupId === 'All' || selectedGroupId === '') {
            console.warn('❌ Invalid OMERO group selected:', selectedGroupId);

            return {
                valid: false,
                message: '⚠️ Cannot create OMERO dataset in "All Groups". Please select a specific group.',
                details: {
                    selectedValue: selectedGroupId,
                    reason: 'ALL_GROUPS_NOT_SUPPORTED',
                    guidance: 'Select a specific group from the dropdown where you have dataset creation permissions.'
                }
            };
        }

        // Check if refresh option is selected
        if (selectedGroupId === 'refresh') {
            return {
                valid: false,
                message: '⚠️ Please select a valid OMERO group instead of "Refresh".',
                details: {
                    selectedValue: selectedGroupId,
                    reason: 'REFRESH_OPTION_SELECTED',
                    guidance: 'Choose a specific group from the dropdown.'
                }
            };
        }

        console.log('✅ OMERO group validation passed:', selectedGroupId);
        return {
            valid: true,
            message: `Valid group selected: ${selectedGroupId}`,
            groupId: selectedGroupId
        };
    },

    /**
     * Show OMERO group warning
     * FIXED: Validates BEFORE clearing
     */
    showOMEROGroupWarning(message, guidance = null) {
        // ✅ CRITICAL FIX: Validate FIRST
        if (!message || message.trim() === '') {
            console.warn('⚠️ Attempted to show empty OMERO warning message - BLOCKED');
            return;
        }

        console.log('🚨 Showing OMERO group warning:', message);

        // Only clear if we have valid content
        this.clearAllMessages();

        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            let content = `⚠️ ${message}`;

            if (guidance) {
                content += `<br><small style="margin-top: 5px; display: block;">${guidance}</small>`;
            }

            errorDiv.innerHTML = content;
            errorDiv.style.display = 'block';

            // Reset to original error message style
            errorDiv.style.background = '';
            errorDiv.style.borderLeft = '';

            console.log('🚨 OMERO warning displayed:', message.substring(0, 50) + '...');

            // Auto-hide after 10 seconds
            setTimeout(() => {
                this.hideOMEROGroupWarning();
            }, 10000);
        }
    },

    /**
     * Hide OMERO group warning
     */
    hideOMEROGroupWarning() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.innerHTML = '';
        }
    },

    /**
     * Enhanced shouldSyncToOMERO with group validation
     * Now includes early validation to prevent invalid configurations
     */
    async shouldSyncToOMEROWithValidation() {
        const baseResult = await this.shouldSyncToOMERO();

        if (!baseResult) {
            // No OMERO sync requested, no validation needed
            this.hideOMEROGroupWarning();
            return { sync: false, reason: 'OMERO sync not requested' };
        }

        // Perform group validation if OMERO sync is requested
        const groupValidation = this.validateOMEROGroupSelection();

        if (!groupValidation.valid) {
            // Show warning and prevent sync
            this.showOMEROGroupWarning(groupValidation.message, groupValidation.details?.guidance);
            return {
                sync: false,
                reason: 'Invalid group selection',
                validationError: groupValidation
            };
        }

        // All validations passed
        this.hideOMEROGroupWarning();
        return {
            sync: true,
            reason: 'OMERO sync validated and approved',
            groupId: groupValidation.groupId
        };
    },

    // =================== OMERO GROUP WARNING (SIMPLE IMPLEMENTATION) ===================

    /**
     * Show OMERO group warning in results area (where success/error messages appear)
     * Simple implementation that shows warning at the bottom like other messages
     * FIXED: This is a duplicate - the main implementation above is already fixed
     */
    // NOTE: This duplicate function will use the main implementation above

    /**
     * Hide OMERO group warning
     */
    hideOMEROGroupWarning() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    },

    // =================== NEUE ORDNER-EXISTENZ-PRÜFUNG ===================

    /**
     * Check if project directory exists and handle conflicts
     * Returns: { proceed: boolean, projectName: string, projectPath: string }
     */
    async checkDirectoryAndResolveConflicts(basePath, originalProjectName, skipFolder = false) {
        try {
            const originalPath = skipFolder 
                ? basePath 
                : (window.utils && window.utils.buildFullPath 
                    ? window.utils.buildFullPath(basePath, originalProjectName) 
                    : basePath + (basePath.endsWith('/') || basePath.endsWith('\\') ? '' : '/') + originalProjectName);

            console.log(`📁 Checking path: ${originalPath}`);

            // Check if directory exists
            const dirCheck = await window.electronAPI.checkDirectoryExists(originalPath);

            // If we are skipping folder, and it doesn't have metadata, we can just proceed (or if directory doesn't exist at all).
            if (!dirCheck.exists || (skipFolder && !dirCheck.hasMetafoldData)) {
                // Directory doesn't exist - safe to proceed
                console.log('✅ Path is safe to proceed');
                return {
                    proceed: true,
                    projectName: originalProjectName,
                    projectPath: originalPath
                };
            }

            console.log(`⚠️ Directory exists: ${dirCheck.itemCount} items, empty: ${dirCheck.isEmpty}, MetaFoldData: ${dirCheck.hasMetafoldData}`);

            // Directory exists - get alternatives and show dialog
            const alternatives = await window.electronAPI.generateAlternativeNames(basePath, originalProjectName);

            if (!alternatives.success) {
                this.showError('Error generating alternative names: ' + alternatives.error);
                return { proceed: false };
            }

            // Show confirmation dialog
            const userChoice = await window.electronAPI.showDirectoryConfirmationDialog({
                projectName: originalProjectName,
                directoryPath: originalPath,
                directoryInfo: dirCheck,
                alternatives: alternatives.alternatives
            });

            if (!userChoice.success) {
                this.showError('Error showing confirmation dialog: ' + userChoice.error);
                return { proceed: false };
            }

            return await this.handleUserDirectoryChoice(userChoice, originalProjectName, originalPath, basePath, alternatives.alternatives, dirCheck);

        } catch (error) {
            console.error('❌ Error in directory conflict resolution:', error);
            this.showError('Error checking directory: ' + error.message);
            return { proceed: false };
        }
    },

    /**
     * Handle user's choice from directory conflict dialog
     */
    async handleUserDirectoryChoice(userChoice, originalProjectName, originalPath, basePath, alternatives, dirCheck = null) {
        const { choice, choiceName } = userChoice;

        console.log(`🤔 Processing user choice: ${choiceName} (${choice})`);

        if (choiceName === 'Cancel' || choice === 0) {
            console.log('❌ User cancelled project creation due to directory conflict');
            this.showInfo('Project creation cancelled');
            return { proceed: false };
        } else if (choiceName === 'Overwrite') {
            console.log('⚠️ User chose to overwrite existing directory');
            this.showWarning(`Overwriting existing directory: ${originalProjectName}`);
            return {
                proceed: true,
                projectName: originalProjectName,
                projectPath: originalPath,
                overwrite: true
            };
        } else if (choiceName === 'Extend Metadata') {
            console.log('➕ User chose to extend existing metadata');
            this.showInfo(`Extending existing metadata in: ${originalProjectName}`);
            return {
                proceed: true,
                projectName: originalProjectName,
                projectPath: originalPath,
                extend: true,
                existingProjectName: dirCheck?.existingProjectName || null
            };
        } else if (choiceName === 'Use Different Name') {
            console.log('🔄 User chose to use different name');
            return await this.handleAlternativeNameSelection(basePath, alternatives);
        } else {
            console.warn('⚠️ Unknown user choice, defaulting to cancel');
            return { proceed: false };
        }
    },

    /**
     * Handle alternative name selection
     */
    async handleAlternativeNameSelection(basePath, alternatives) {
        if (!alternatives || alternatives.length === 0) {
            this.showError('No alternative names available');
            return { proceed: false };
        }

        // For now, use the first alternative automatically
        // TODO: In future, could show a selection dialog
        const chosenAlternative = alternatives[0];

        console.log(`✅ Using alternative name: ${chosenAlternative.name}`);

        // Update UI to show the new name
        const projectNameField = document.getElementById('projectName');
        if (projectNameField) {
            projectNameField.value = chosenAlternative.name;
            this.updatePathPreview(); // Update the preview
        }

        this.showSuccess(`Using alternative name: ${chosenAlternative.name}`, null);

        return {
            proceed: true,
            projectName: chosenAlternative.name,
            projectPath: chosenAlternative.path,
            wasRenamed: true,
            originalName: projectNameField ? projectNameField.value : 'Unknown',
            alternativeType: chosenAlternative.type
        };
    },

    /**
     * Show warning message
     * FIXED: Validates BEFORE clearing
     */
    showWarning(message) {
        // ✅ CRITICAL FIX: Validate FIRST
        if (!message || message.trim() === '') {
            console.warn('⚠️ Attempted to show empty warning message - BLOCKED');
            return;
        }

        // Only clear if we have valid content
        this.clearAllMessages();

        const warningDiv = document.getElementById('errorMessage'); // Reuse error message div
        if (warningDiv) {
            warningDiv.innerHTML = `⚠️ ${message}`;
            warningDiv.style.display = 'block';
            warningDiv.style.background = 'rgba(239, 196, 68, 0.1)'; // Yellow warning color
            warningDiv.style.color = '#d97706';
            warningDiv.style.borderLeft = '4px solid #f59e0b';

            console.log('⚠️ Warning message displayed:', message.substring(0, 50) + '...');

            // Auto-hide after 8 seconds
            setTimeout(() => {
                warningDiv.style.display = 'none';
                warningDiv.innerHTML = '';
                // Reset to original error styling
                warningDiv.style.background = '';
                warningDiv.style.color = '';
                warningDiv.style.borderLeft = '';
            }, 8000);
        }
    }
};

// Make globally available
window.projectManager = projectManager;