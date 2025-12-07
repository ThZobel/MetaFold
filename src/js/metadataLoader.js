// MetaFold Metadata Loader - Retroactive Integration Sender
// Load existing metadata JSON files and send them to OMERO/elabFTW without creating local folders

const metadataLoader = {
    initialized: false,
    loadedMetadata: null,
    loadedFilePath: null,
    loadedFileName: null,

    // Initialize the metadata loader
    async init() {
        if (this.initialized) return;

        console.log('📥 Initializing Metadata Loader...');

        try {
            this.initialized = true;
            console.log('✅ Metadata Loader initialized');
        } catch (error) {
            console.error('❌ Error initializing Metadata Loader:', error);
        }
    },

    // =================== MAIN FUNCTIONS ===================

    // Load metadata JSON file
    async loadMetadataFile() {
        try {
            console.log('📥 Opening file dialog to load metadata...');

            // Use electron API to select JSON file
            const result = await window.electronAPI.loadJsonFile();

            if (!result) {
                console.log('📁 No file selected');
                return;
            }

            // Check if operation was successful
            if (result.success === false) {
                this.showError('Failed to load file: ' + (result.message || 'Unknown error'));
                return;
            }

            // Extract metadata from the result
            // loadJsonFile returns: { success: true, content: {...}, filePath: '...', fileName: '...' }
            const metadata = result.content;
            let filePath = result.filePath || result.path || '';
            let fileName = result.fileName || result.name || '';

            // If fileName not provided, extract from filePath
            if (!fileName && filePath) {
                fileName = filePath.split(/[\\\/]/).pop();
            }

            // Fallback values if still empty
            if (!filePath) {
                filePath = 'Unknown location';
            }
            if (!fileName) {
                fileName = 'metadata.json';
            }

            console.log('📍 File path:', filePath);
            console.log('📍 File name:', fileName);

            if (!metadata) {
                this.showError('No metadata content in the selected file.');
                return;
            }

            console.log('📄 Metadata loaded from file:', fileName);
            console.log('📊 Metadata object:', metadata);

            // Validate metadata structure
            if (!this.validateMetadata(metadata)) {
                this.showError('Invalid metadata format. Please select a valid MetaFold metadata JSON file.');
                return;
            }

            this.loadedMetadata = metadata;
            this.loadedFilePath = filePath;
            this.loadedFileName = fileName;

            console.log('✅ Metadata loaded successfully');

            // Render metadata view
            this.renderMetadataView();

        } catch (error) {
            console.error('❌ Error loading metadata file:', error);
            this.showError('Error loading metadata: ' + error.message);
        }
    },

    // Validate metadata structure
    validateMetadata(metadata) {
        // Check if it has basic structure
        if (!metadata || typeof metadata !== 'object') {
            return false;
        }

        // Check for required fields (flexible validation)
        // Accept if it has either metadata field or any recognizable structure
        const hasMetadata = metadata.metadata || metadata.fields || metadata.projectName || Object.keys(metadata).length > 0;

        return hasMetadata;
    },

    // Extract project name from filename or metadata - IMPROVED
    getProjectName() {
        console.log('📋 Extracting project name...');
        console.log('📋 Loaded filename:', this.loadedFileName);
        console.log('📋 Loaded filepath:', this.loadedFilePath);
        console.log('📋 Metadata keys:', Object.keys(this.loadedMetadata));

        // Priority 1: projectName field in top-level metadata
        if (this.loadedMetadata.projectName) {
            const name = this.loadedMetadata.projectName.trim();
            if (name) {
                console.log('✅ Project name from metadata.projectName:', name);
                return name;
            }
        }

        // Priority 2: name in metadata
        if (this.loadedMetadata.name) {
            const name = this.loadedMetadata.name.trim();
            if (name) {
                console.log('✅ Project name from metadata.name:', name);
                return name;
            }
        }

        // Priority 3: Extract from filename (remove -metadata.json or similar patterns)
        if (this.loadedFileName) {
            let name = this.loadedFileName
                .replace(/-metadata\.json$/i, '')
                .replace(/-README\.html$/i, '')
                .replace(/metadata\.json$/i, '')
                .replace(/README\.html$/i, '')
                .replace(/\.json$/i, '')
                .replace(/\.html$/i, '')
                .trim();

            // Only use if it's not just "metadata" or "README"
            if (name && name.toLowerCase() !== 'metadata' && name.toLowerCase() !== 'readme') {
                console.log('✅ Project name from filename:', name);
                return name;
            }
        }

        // Priority 4: Get parent folder name from path
        if (this.loadedFilePath && this.loadedFilePath !== 'Selected metadata file' && this.loadedFilePath !== 'Unknown location') {
            try {
                // Split path by both forward and backward slashes
                const pathParts = this.loadedFilePath.split(/[/\\]/);

                // Filter out empty parts
                const nonEmptyParts = pathParts.filter(part => part && part.trim() !== '');

                if (nonEmptyParts.length >= 2) {
                    // Get the parent folder name (second to last element)
                    const parentFolder = nonEmptyParts[nonEmptyParts.length - 2].trim();

                    // Only use if it's not a generic name
                    const genericNames = ['metadata', 'data', 'json', 'files', 'documents'];
                    if (parentFolder && !genericNames.includes(parentFolder.toLowerCase())) {
                        console.log('✅ Project name from parent folder:', parentFolder);
                        return parentFolder;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error extracting parent folder name:', error);
            }
        }

        // Priority 5: Search for common project name fields in nested metadata
        if (this.loadedMetadata.metadata) {
            // Check common field names
            const commonNameFields = ['project_name', 'experiment_name', 'title', 'project', 'experiment'];

            for (const field of commonNameFields) {
                if (this.loadedMetadata.metadata[field]) {
                    const value = this.loadedMetadata.metadata[field].value || this.loadedMetadata.metadata[field];
                    if (typeof value === 'string' && value.trim()) {
                        console.log('✅ Project name from metadata field:', field, '=', value);
                        return value.trim();
                    }
                }
            }
        }

        console.warn('⚠️ Could not extract project name, using fallback');
        return 'Unknown Project';
    },

    // Render metadata view UI
    renderMetadataView() {
        const container = document.getElementById('metadataViewerContainer');
        const scannerContainer = document.getElementById('projectScannerContainer');
        const quickStart = document.getElementById('discoveryQuickStart');

        if (!container) {
            console.error('❌ Metadata viewer container not found');
            return;
        }

        // Hide scanner results and quick start
        if (scannerContainer) scannerContainer.style.display = 'none';
        if (quickStart) quickStart.style.display = 'none';

        // Get project name using intelligent extraction
        const projectName = this.getProjectName();
        console.log('📋 Project name extracted:', projectName);

        // Build HTML
        const html = `
            <div class="metadata-viewer">
                <div class="viewer-header">
                    <div class="header-content">
                        <h2>📋 Loaded Metadata: ${projectName}</h2>
                        <p class="file-path">Source: <code>${this.loadedFileName || this.loadedFilePath}</code></p>
                    </div>
                     <div class="header-actions">
                        <button class="btn btn-secondary" onclick="metadataLoader.closeMetadataView()">
                            ⬅️ Back to Discovery
                        </button>
                    </div>
                </div>
                
                ${this.renderMetadataTable()}
                
                <div class="metadata-footer" style="padding: 20px; text-align: center; color: #9ca3af; font-style: italic;">
                    <p>ℹ️ Use the Right Sidebar to configure and enable integrations (elabFTW / OMERO)</p>
                </div>
            </div>
        `;

        container.innerHTML = html;
        container.style.display = 'block';

        console.log('✅ Metadata view rendered');

        // Check for existing OMERO connection
        setTimeout(async () => {
            if (window.omeroAuth && window.omeroAuth.isSessionValid()) {
                console.log('🔬 Existing OMERO session found, updating viewer UI...');
                // We don't need to connect here anymore as we use the sidebar
            }
        }, 100);
    },

    // NEW: Close metadata view and show explorer again
    closeMetadataView() {
        const container = document.getElementById('metadataViewerContainer');
        const scannerContainer = document.getElementById('projectScannerContainer');
        const quickStart = document.getElementById('discoveryQuickStart');

        if (container) container.style.display = 'none';
        if (scannerContainer) scannerContainer.style.display = 'block';

        // Show quick start only if no scan results
        const hasResults = scannerContainer && scannerContainer.children.length > 0;
        if (quickStart) quickStart.style.display = hasResults ? 'none' : 'block';
    },

    // Render metadata table
    renderMetadataTable() {
        // Get metadata - handle both nested and flat structures
        let metadata = this.loadedMetadata.metadata || this.loadedMetadata;

        // Filter out meta fields like projectName, templateInfo, createdAt
        const metaFields = ['projectName', 'name', 'templateInfo', 'createdAt', 'metafold_integration'];
        const displayMetadata = {};

        Object.entries(metadata).forEach(([key, value]) => {
            if (!metaFields.includes(key)) {
                displayMetadata[key] = value;
            }
        });

        if (!displayMetadata || Object.keys(displayMetadata).length === 0) {
            return `
                <div class="no-metadata">
                    <p>⚠️ No metadata fields found in this file</p>
                </div>
            `;
        }

        let tableHTML = '<div class="metadata-table-container"><h3>📊 Metadata Fields</h3><table class="metadata-table"><thead><tr><th>Field Name</th><th>Type</th><th>Value</th></tr></thead><tbody>';

        Object.entries(displayMetadata).forEach(([key, field]) => {
            // Skip integration fields
            if (key === 'elabftw' || key === 'metafold_integration') return;

            const value = field.value !== undefined ? field.value : field;
            const type = field.type || 'text';
            const displayValue = value || '<em style="color: #9ca3af;">Empty</em>';

            tableHTML += `
                <tr>
                    <td><strong>${this.formatFieldName(key)}</strong></td>
                    <td><span class="field-type-badge">${type}</span></td>
                    <td>${displayValue}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table></div>';

        return tableHTML;
    },

    // Render integration options (clone from main UI)
    renderIntegrationOptions() {
        return `
            <!-- elabFTW Option -->
            <div class="integration-option" id="elabftwOption_viewer">
                <label class="integration-label">
                    <input type="checkbox" id="sendToElabFTW_viewer">
                    <span class="integration-icon">🧪</span>
                    <span>Send to elabFTW</span>
                </label>
                <p class="integration-description">Create experiment in elabFTW with this metadata</p>
                
                <!-- REUSE: Same category input as in Create Project Tab -->
                <div id="elabftwCategoryField_viewer" style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                    <label for="elabftwProjectCategory_viewer" style="display: block; font-weight: 500; color: #9ca3af; margin-bottom: 5px;">
                        📂 elabFTW Category ID:
                    </label>
                    <input type="number" 
                           id="elabftwProjectCategory_viewer" 
                           min="0" 
                           placeholder="e.g., 1" 
                           value="" 
                           style="width: 100%; padding: 6px 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; color: #e0e0e0;">
                    <small style="color: #9ca3af; display: block; margin-top: 4px;">
                        From template or settings default
                    </small>
                </div>
                
                <!-- elabFTW Connection Status -->
                <div class="integration-status" id="elabftwStatus_viewer" style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 6px; font-size: 0.85rem; color: #9ca3af;">
                    <span id="elabftwStatusText_viewer">ℹ️ Check elabFTW settings in Settings tab</span>
                </div>
            </div>
            
            <!-- OMERO Option -->
            <div class="integration-option" id="omeroOption_viewer">
                <label class="integration-label">
                    <input type="checkbox" id="sendToOMERO_viewer" onchange="metadataLoader.handleOMEROCheckboxChange()">
                    <span class="integration-icon">🔬</span>
                    <span>Send to OMERO</span>
                </label>
                <p class="integration-description">Create dataset in OMERO with this metadata</p>
                
                <!-- OMERO Connection Button -->
                <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button class="btn btn-secondary" onclick="metadataLoader.connectToOMERO()" id="omeroConnectBtn_viewer" style="padding: 6px 12px; font-size: 0.85rem;">
                        🔗 Connect to OMERO
                    </button>
                    <button 
                        id="omeroLogoutBtn_viewer" 
                        onclick="logoutFromOMERO()"
                        style="display: none; padding: 6px 12px; background: linear-gradient(45deg, #dc2626, #b91c1c); color: white; border: none; border-radius: 6px; font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);"
                        title="Logout from OMERO"
                    >
                        🚪 Logout
                    </button>
                    <span id="omeroConnectionStatus_viewer" style="font-size: 0.85rem; color: #9ca3af;">
                        Not connected
                    </span>
                </div>
                
                <!-- OMERO Group Selection -->
                <div id="omeroGroupSelection_viewer" class="omero-selection" style="display: none; margin-top: 10px;">
                    <label for="omeroGroupSelect_viewer">OMERO Group:</label>
                    <select id="omeroGroupSelect_viewer" onchange="metadataLoader.handleOMEROGroupChange()">
                        <option value="">Connect to OMERO first</option>
                    </select>
                </div>
                
                <!-- OMERO Project Selection -->
                <div id="omeroProjectSelection_viewer" class="omero-selection" style="display: none; margin-top: 10px;">
                    <label for="omeroProjectSelect_viewer">OMERO Project (optional):</label>
                    <select id="omeroProjectSelect_viewer">
                        <option value="">Select group first</option>
                    </select>
                </div>
            </div>
        `;
    },

    // Connect to OMERO (reuse from Create Project tab) - FIXED USERNAME DISPLAY
    async connectToOMERO() {
        const connectBtn = document.getElementById('omeroConnectBtn_viewer');
        const statusText = document.getElementById('omeroConnectionStatus_viewer');

        if (!connectBtn || !statusText) return;

        // Set loading state
        connectBtn.disabled = true;
        connectBtn.innerHTML = '⏳ Connecting...';
        statusText.textContent = 'Testing connection...';
        statusText.style.color = '#6b7280';

        try {
            // Use existing OMERO test connection functionality
            if (!window.omeroUIIntegration) {
                throw new Error('OMERO UI integration not available');
            }

            const result = await window.omeroUIIntegration.testConnection();

            if (result.success) {
                // Success state
                connectBtn.innerHTML = '✅ Connected';
                connectBtn.style.background = 'linear-gradient(135deg, #059669, #047857)';

                // ✅ FIX: Get username from CORRECT locations in priority order
                let username = 'Unknown User';

                console.log('🔍 Looking for OMERO username...');
                console.log('🔍 window.metaFoldOMEROIntegration:', !!window.metaFoldOMEROIntegration);
                console.log('🔍 window.omeroAuth:', !!window.omeroAuth);

                // Priority 1: metaFoldOMEROIntegration session (MOST RELIABLE)
                if (window.metaFoldOMEROIntegration?.hybridAuth?.session?.userName) {
                    username = window.metaFoldOMEROIntegration.hybridAuth.session.userName;
                    console.log('✅ Username from metaFoldOMEROIntegration.hybridAuth:', username);
                }
                // Priority 2: omeroAuth eventContext userName (BACKUP)
                else if (window.omeroAuth?.session?.eventContext?.userName) {
                    username = window.omeroAuth.session.eventContext.userName;
                    console.log('✅ Username from omeroAuth.session.eventContext:', username);
                }
                // Priority 3: omeroAuth basic session (FALLBACK)
                else if (window.omeroAuth?.session?.username) {
                    username = window.omeroAuth.session.username;
                    console.log('✅ Username from omeroAuth.session:', username);
                }
                // Priority 4: From test result details
                else if (result.details?.userName) {
                    username = result.details.userName;
                    console.log('✅ Username from result details:', username);
                }
                else if (result.details?.omeName) {
                    username = result.details.omeName;
                    console.log('✅ Username from omeName:', username);
                }
                // Priority 5: From settings (LAST RESORT)
                else if (window.settingsManager) {
                    username = await window.settingsManager.get('omero.username') || 'User';
                    console.log('✅ Username from settings:', username);
                }

                // ✅ FIX: Display username with correct HTML structure
                statusText.innerHTML = `✅ Connected as <strong>${username}</strong>`;
                statusText.style.color = '#059669';

                console.log('✅ OMERO connected, final username:', username);

                // Load groups directly (don't copy from main tab)
                console.log('🔬 Loading OMERO groups for metadata viewer...');
                await this.loadOMEROGroups();

                // Show logout button
                const logoutBtn = document.getElementById('omeroLogoutBtn_viewer');
                if (logoutBtn) {
                    logoutBtn.style.display = 'inline-block';
                }

            } else {
                // Error state
                connectBtn.innerHTML = '❌ Connection Failed';
                connectBtn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                statusText.textContent = '❌ Connection failed - check settings';
                statusText.style.color = '#dc2626';

                // Hide logout button
                const logoutBtn = document.getElementById('omeroLogoutBtn_viewer');
                if (logoutBtn) {
                    logoutBtn.style.display = 'none';
                }

                // Reset button after 3 seconds
                setTimeout(() => {
                    connectBtn.innerHTML = '🔗 Connect to OMERO';
                    connectBtn.style.background = '';
                    statusText.textContent = 'Not connected';
                    statusText.style.color = '#9ca3af';
                }, 3000);
            }
        } catch (error) {
            console.error('❌ OMERO connection error:', error);
            connectBtn.innerHTML = '❌ Error';
            connectBtn.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
            statusText.textContent = '❌ ' + error.message;
            statusText.style.color = '#dc2626';

            // Hide logout button
            const logoutBtn = document.getElementById('omeroLogoutBtn_viewer');
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
            }

            // Reset button after 3 seconds
            setTimeout(() => {
                connectBtn.innerHTML = '🔗 Connect to OMERO';
                connectBtn.style.background = '';
                statusText.textContent = 'Not connected';
                statusText.style.color = '#9ca3af';
            }, 3000);
        } finally {
            connectBtn.disabled = false;
        }
    },

    // Load OMERO groups directly (not from main tab)
    async loadOMEROGroups() {
        const groupSelect = document.getElementById('omeroGroupSelect_viewer');
        const groupSelection = document.getElementById('omeroGroupSelection_viewer');

        if (!groupSelect || !groupSelection) {
            console.error('❌ Group selection elements not found');
            return;
        }

        try {
            console.log('🔬 Loading OMERO groups directly...');

            // Show loading state
            groupSelect.innerHTML = '<option value="">Loading groups...</option>';

            // Check if omeroGroups module is available
            if (!window.omeroGroups) {
                throw new Error('OMERO groups module not available');
            }

            // Get groups data
            const groupData = await window.omeroGroups.getCurrentUserGroups();
            const groups = groupData.allGroups;

            console.log('✅ Groups loaded:', groups.length);

            // Clear and rebuild options
            groupSelect.innerHTML = '<option value="">-- Select Group --</option>';

            // Add current group first (if available)
            if (groupData.currentGroupId) {
                const currentGroup = groups.find(g => g.id == groupData.currentGroupId);
                if (currentGroup) {
                    const option = document.createElement('option');
                    option.value = currentGroup.id;
                    option.textContent = `${currentGroup.name} (current)`;
                    option.selected = true;
                    groupSelect.appendChild(option);
                }
            }

            // Add other groups
            groups.forEach(group => {
                // Skip if already added as current
                if (group.id == groupData.currentGroupId) return;

                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                if (group.description) {
                    option.title = group.description;
                }
                groupSelect.appendChild(option);
            });

            // Show group selection
            groupSelection.style.display = 'block';

            // Auto-load projects for initially selected group
            const selectedGroupId = groupSelect.value;
            if (selectedGroupId && selectedGroupId !== '') {
                await this.loadOMEROProjects(selectedGroupId);
            }

        } catch (error) {
            console.error('❌ Error loading OMERO groups:', error);
            groupSelect.innerHTML = '<option value="">Error loading groups</option>';
            this.showError('Failed to load OMERO groups: ' + error.message);
        }
    },

    // Load OMERO projects for a specific group
    async loadOMEROProjects(groupId) {
        const projectSelect = document.getElementById('omeroProjectSelect_viewer');
        const projectSelection = document.getElementById('omeroProjectSelection_viewer');

        if (!projectSelect || !projectSelection) {
            console.error('❌ Project selection elements not found');
            return;
        }

        try {
            console.log('📁 Loading OMERO projects for group:', groupId);

            // Show loading state
            projectSelect.innerHTML = '<option value="">Loading projects...</option>';

            // Check if omeroProjects module is available
            if (!window.omeroProjects) {
                throw new Error('OMERO projects module not available');
            }

            // Get projects for the group
            const projects = await window.omeroProjects.getProjectsForGroupEnhanced(groupId);

            console.log('✅ Projects loaded:', projects.length);

            // Clear and rebuild options
            projectSelect.innerHTML = '<option value="">-- Create standalone dataset --</option>';

            if (projects.length === 0) {
                projectSelect.innerHTML += '<option value="" disabled>No projects in this group</option>';
            } else {
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;

                    let displayText = project.name;
                    displayText += ` (ID: ${project.id})`;

                    option.textContent = displayText;
                    if (project.description) {
                        option.title = project.description;
                    }
                    projectSelect.appendChild(option);
                });
            }

            // Show project selection
            projectSelection.style.display = 'block';

        } catch (error) {
            console.error('❌ Error loading projects for group:', error);
            projectSelect.innerHTML = '<option value="">Error loading projects</option>';
            this.showError('Failed to load OMERO projects: ' + error.message);
        }
    },

    // Handle OMERO checkbox change
    async handleOMEROCheckboxChange() {
        const checkbox = document.getElementById('sendToOMERO_viewer');
        const groupSelection = document.getElementById('omeroGroupSelection_viewer');
        const projectSelection = document.getElementById('omeroProjectSelection_viewer');
        const groupSelect = document.getElementById('omeroGroupSelect_viewer');

        if (checkbox && checkbox.checked) {
            // Check if already connected (groups are loaded)
            if (groupSelect && groupSelect.options.length > 1) {
                // Already connected - show group selection
                if (groupSelection) groupSelection.style.display = 'block';
            } else {
                // Not connected - show warning
                this.showError('Please connect to OMERO first by clicking the "Connect to OMERO" button');
                checkbox.checked = false;
            }
        } else {
            // Hide selections
            if (groupSelection) groupSelection.style.display = 'none';
            if (projectSelection) projectSelection.style.display = 'none';
        }
    },

    // Handle OMERO group change
    async handleOMEROGroupChange() {
        const groupSelect = document.getElementById('omeroGroupSelect_viewer');
        const projectSelection = document.getElementById('omeroProjectSelection_viewer');

        if (!groupSelect || !projectSelection) return;

        const selectedGroupId = groupSelect.value;

        console.log('🔬 Group selected:', selectedGroupId);

        if (selectedGroupId && selectedGroupId !== '') {
            // Load projects for the selected group
            await this.loadOMEROProjects(selectedGroupId);
        } else {
            // Hide project selection if no group selected
            projectSelection.style.display = 'none';
        }
    },

    // Send metadata to selected integrations - ENHANCED WITH INTEGRATION LINKS
    async sendMetadata() {
        try {
            const sendBtn = document.getElementById('sendToIntegrationsBtn');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '⏳ Sending...';
            }

            // Use Sidebar Inputs
            const selectedOptions = {
                elabftw: document.getElementById('sendToElabFTW')?.checked || false,
                omero: document.getElementById('sendToOMERO')?.checked || false,
                rspace: document.getElementById('sendToRSpace')?.checked || false
            };

            if (!selectedOptions.elabftw && !selectedOptions.omero && !selectedOptions.rspace) {
                this.showError('Please select at least one integration (elabFTW, OMERO, or RSpace)');
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '🚀 Send to Integrations';
                }
                return;
            }

            console.log('🚀 Sending metadata to integrations:', selectedOptions);

            // Get project name ONCE at the start
            const projectName = this.getProjectName();
            const metadata = this.loadedMetadata.metadata || this.loadedMetadata;

            console.log('📋 Project name for upload:', projectName);

            let results = {
                elabftw: null,
                omero: null,
                rspace: null
            };

            // Send to elabFTW
            if (selectedOptions.elabftw) {
                console.log('🧪 Creating elabFTW experiment...');
                results.elabftw = await this.createElabFTWExperiment(projectName, metadata);
            }

            // Send to OMERO
            if (selectedOptions.omero) {
                console.log('🔬 Creating OMERO dataset...');
                results.omero = await this.createOMERODataset(projectName, metadata);
            }

            // Send to RSpace
            if (selectedOptions.rspace) {
                console.log('🧪 Creating RSpace document...');
                results.rspace = await this.createRSpaceDocument(projectName, metadata);
            }

            // ✅ NEW: Build integration links for success message
            console.log('🔗 Building integration links for success message...');
            const integrationLinks = [];

            // Add elabFTW link
            if (results.elabftw?.success && results.elabftw.experimentUrl) {
                integrationLinks.push({
                    type: 'elabFTW',
                    url: results.elabftw.experimentUrl,
                    text: '🧪 Open in elabFTW'
                });
                console.log('✅ elabFTW link added:', results.elabftw.experimentUrl);
            }

            // Add OMERO link
            if (results.omero?.success && results.omero.datasetUrl) {
                integrationLinks.push({
                    type: 'OMERO',
                    url: results.omero.datasetUrl,
                    text: '🔬 Open in OMERO'
                });
                console.log('✅ OMERO link added:', results.omero.datasetUrl);
            }

            // Add RSpace link
            if (results.rspace?.success && results.rspace.documentUrl) {
                integrationLinks.push({
                    type: 'RSpace',
                    url: results.rspace.documentUrl,
                    text: '📝 Open in RSpace'
                });
                console.log('✅ RSpace link added:', results.rspace.documentUrl);
            }

            // Add integration links to metadata
            console.log('🔗 Adding integration links to metadata...');

            let localPath = this.loadedFilePath;
            if (localPath && localPath !== 'Unknown location' && localPath !== 'Selected metadata file') {
                const pathParts = localPath.split(/[/\\]/);
                pathParts.pop();
                localPath = pathParts.join('/');
            } else {
                localPath = 'Unknown';
            }

            let enhancedMetadata = metadata;

            if (window.metadataLinksManager) {
                try {
                    console.log('🔗 Using metadataLinksManager for integration links...');
                    enhancedMetadata = await window.metadataLinksManager.addIntegrationInfo(
                        metadata,
                        localPath,
                        results.elabftw && results.elabftw.success ? {
                            success: true,
                            experimentId: results.elabftw.experimentId || results.elabftw.id,
                            url: results.elabftw.experimentUrl
                        } : null,
                        results.omero && results.omero.success ? {
                            success: true,
                            dataset: {
                                id: results.omero.datasetId
                            },
                            url: results.omero.datasetUrl
                        } : null,
                        results.rspace && results.rspace.success ? {
                            success: true,
                            documentId: results.rspace.documentId,
                            url: results.rspace.documentUrl
                        } : null
                    );
                    console.log('✅ Integration links added via metadataLinksManager');
                } catch (error) {
                    console.error('❌ Error using metadataLinksManager:', error);
                    enhancedMetadata = await this.addIntegrationLinksManually(metadata, results);
                }
            } else {
                console.warn('⚠️ metadataLinksManager not available, using fallback');
                enhancedMetadata = await this.addIntegrationLinksManually(metadata, results);
            }

            // Save enhanced metadata to file
            const updateSuccess = await this.updateMetadataFile(enhancedMetadata);

            // Add integration fields to external services
            if (updateSuccess) {
                try {
                    console.log('🔄 metadataLoader: Sending integration links back to external services...');

                    const integrationFields = {};

                    if (results.elabftw?.experimentUrl) {
                        integrationFields['elabFTW Link'] = {
                            type: 'url',
                            value: results.elabftw.experimentUrl,
                            label: 'elabFTW Experiment'
                        };
                    }

                    if (results.omero?.datasetUrl) {
                        integrationFields['OMERO Link'] = {
                            type: 'url',
                            value: results.omero.datasetUrl,
                            label: 'OMERO Dataset'
                        };
                    }

                    integrationFields['Local Path'] = {
                        type: 'text',
                        value: localPath,
                        label: 'Project Directory'
                    };

                    integrationFields['Upload Timestamp'] = {
                        type: 'text',
                        value: new Date().toISOString(),
                        label: 'Uploaded At'
                    };

                    // Update elabFTW experiment
                    if (results.elabftw?.success && results.elabftw.experimentId) {
                        try {
                            if (window.settingsManager?.updateExistingElabFTWExperiment) {
                                await window.settingsManager.updateExistingElabFTWExperiment(
                                    results.elabftw.experimentId,
                                    integrationFields
                                );
                                console.log('✅ metadataLoader: Integration links added to elabFTW');
                            }
                        } catch (elabError) {
                            console.error('❌ metadataLoader: Error updating elabFTW:', elabError);
                        }
                    }

                    // Update OMERO dataset
                    if (results.omero?.success && results.omero.datasetId) {
                        try {
                            const omeroKeyValues = [
                                ['Project Local Path', localPath],
                                ['MetaFold Export Date', new Date().toISOString().split('T')[0]]
                            ];

                            if (results.elabftw?.experimentUrl) {
                                omeroKeyValues.push(['elabFTW Link', results.elabftw.experimentUrl]);
                            }

                            if (results.omero?.datasetUrl) {
                                omeroKeyValues.push(['OMERO Dataset Link', results.omero.datasetUrl]);
                            }

                            if (window.metaFoldOMEROIntegration?.addWorkingMapAnnotations) {
                                await window.metaFoldOMEROIntegration.addWorkingMapAnnotations(
                                    results.omero.datasetId,
                                    Object.fromEntries(omeroKeyValues.map(([k, v]) => [k, { type: 'text', value: v }])),
                                    'NFDI4BioImage.MetaFold.IntegrationLinks'
                                );
                                console.log('✅ metadataLoader: Integration links added to OMERO');
                            }
                        } catch (omeroError) {
                            console.error('❌ metadataLoader: Error updating OMERO:', omeroError);
                        }
                    }

                    // Insert links into README
                    console.log('📄 metadataLoader: Inserting integration links into README...');

                    if (window.electronAPI?.insertLinksIntoReadme) {
                        try {
                            let elabftwUrl = results.elabftw?.experimentUrl || null;
                            let omeroUrl = results.omero?.datasetUrl || null;

                            if (!omeroUrl && results.omero?.dataset?.omeroWebUrl) {
                                omeroUrl = results.omero.dataset.omeroWebUrl;
                            }

                            if (!omeroUrl && results.omero?.datasetId) {
                                let serverUrl = null;
                                if (window.settingsManager?.get) {
                                    serverUrl = await window.settingsManager.get('omero.server_url');
                                }
                                if (!serverUrl && window.metaFoldOMEROIntegration?.hybridAuth?.session?.serverUrl) {
                                    serverUrl = window.metaFoldOMEROIntegration.hybridAuth.session.serverUrl;
                                }
                                if (serverUrl) {
                                    omeroUrl = `${serverUrl}webclient/?show=dataset-${results.omero.datasetId}`;
                                }
                            }

                            if (elabftwUrl || omeroUrl) {
                                let projectDirectory = localPath;

                                if (projectDirectory === 'Unknown' && this.loadedFilePath && this.loadedFilePath !== 'Unknown location') {
                                    const pathParts = this.loadedFilePath.split(/[/\\]/);
                                    pathParts.pop();
                                    projectDirectory = pathParts.join(window.electronAPI?.platform === 'win32' ? '\\' : '/');
                                }

                                const insertResult = await window.electronAPI.insertLinksIntoReadme(
                                    projectDirectory,
                                    elabftwUrl,
                                    omeroUrl,
                                    projectName
                                );

                                if (insertResult.success) {
                                    console.log('✅ metadataLoader: Integration links inserted into README');
                                } else {
                                    console.warn('⚠️ metadataLoader: Failed to insert links:', insertResult.message);
                                }
                            }
                        } catch (linkError) {
                            console.error('❌ metadataLoader: Error inserting links:', linkError);
                        }
                    }

                } catch (error) {
                    console.error('⚠️ metadataLoader: Error in post-upload processing:', error);
                }
            }

            // ✅ NEW: Show enhanced success message with integration links (like projectManager)
            if (updateSuccess) {
                let successMessage = 'Metadata sent successfully! JSON file updated with integration links.';

                // Use showEnhancedSuccess from projectManager
                if (window.projectManager && typeof window.projectManager.showEnhancedSuccess === 'function') {
                    console.log('✅ metadataLoader: Using projectManager.showEnhancedSuccess with', integrationLinks.length, 'links');
                    window.projectManager.showEnhancedSuccess(successMessage, null, integrationLinks);
                } else {
                    // Fallback to regular success
                    console.warn('⚠️ metadataLoader: projectManager.showEnhancedSuccess not available, using fallback');
                    this.showSuccess(successMessage);
                }
            } else {
                this.showError('Metadata sent but failed to update JSON file');
            }

            // Reset button
            // Reset button logic is now in finally block

        } catch (error) {
            console.error('❌ Error sending metadata:', error);
            this.showError('Error sending metadata: ' + error.message);
        } finally {
            const sendBtn = document.getElementById('sendToIntegrationsBtn');
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '🚀 Send to Integrations';
            }
        }
    },

    // Fallback manual integration links adding
    async addIntegrationLinksManually(metadata, results) {
        const enhancedMetadata = JSON.parse(JSON.stringify(metadata));

        if (!enhancedMetadata.metafold_integration) {
            enhancedMetadata.metafold_integration = {};
        }
        if (!enhancedMetadata.metafold_integration.external_links) {
            enhancedMetadata.metafold_integration.external_links = {};
        }

        // Add elabFTW link
        if (results.elabftw?.success && results.elabftw.experimentUrl) {
            enhancedMetadata.metafold_integration.external_links.elabftw = {
                url: results.elabftw.experimentUrl,
                experiment_id: results.elabftw.experimentId,
                uploaded_at: new Date().toISOString(),
                status: 'uploaded'
            };
        }

        // Add OMERO link
        if (results.omero?.success && results.omero.datasetUrl) {
            enhancedMetadata.metafold_integration.external_links.omero = {
                url: results.omero.datasetUrl,
                dataset_id: results.omero.datasetId,
                uploaded_at: new Date().toISOString(),
                status: 'uploaded'
            };
        }

        // Add RSpace link
        if (results.rspace?.success && results.rspace.documentUrl) {
            enhancedMetadata.metafold_integration.external_links.rspace = {
                url: results.rspace.documentUrl,
                document_id: results.rspace.documentId,
                uploaded_at: new Date().toISOString(),
                status: 'uploaded'
            };
        }

        return enhancedMetadata;
    },

    // Create RSpace document
    async createRSpaceDocument(projectName, metadata) {
        try {
            if (!window.rspaceIntegration) {
                throw new Error('RSpace integration not available');
            }

            console.log('🧪 Creating RSpace document:', projectName);

            // Format metadata as HTML table
            let contentHtml = `<h2>${projectName}</h2>`;
            contentHtml += '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; width: 100%;">';
            contentHtml += '<thead><tr style="background-color: #f2f2f2;"><th>Field</th><th>Value</th></tr></thead><tbody>';

            const metaDataObj = metadata.metadata || metadata;
            for (const [key, value] of Object.entries(metaDataObj)) {
                if (['projectName', 'templateInfo', 'metafold_integration'].includes(key)) continue;

                const displayValue = (typeof value === 'object' && value !== null && value.value !== undefined) ? value.value : value;
                contentHtml += `<tr><td><strong>${key}</strong></td><td>${displayValue}</td></tr>`;
            }
            contentHtml += '</tbody></table>';

            contentHtml += `<p><em>Created by MetaFold on ${new Date().toLocaleString()}</em></p>`;

            // Get tags from UI if available
            const tagsInput = document.getElementById('rspaceTags');
            const tags = tagsInput ? tagsInput.value : 'metafold';

            // Get parent folder
            const folderSelect = document.getElementById('rspaceFolderSelect');
            const parentId = folderSelect ? folderSelect.value : null;

            const result = await window.rspaceIntegration.createDocument(projectName, tags, contentHtml, parentId);

            if (result && result.id) {
                // Construct URL
                let baseUrl = window.rspaceIntegration.config.apiUrl.replace(/\/api\/v1\/?$/, '');
                if (!baseUrl.endsWith('/')) baseUrl += '/';

                const docUrl = `${baseUrl}global/document/${result.id}`;

                console.log('✅ RSpace document created:', docUrl);
                return {
                    success: true,
                    documentUrl: docUrl,
                    documentId: result.id,
                    globalId: result.globalId
                };
            } else {
                throw new Error('No document ID returned');
            }

        } catch (error) {
            console.error('❌ Error creating RSpace document:', error);
            this.showError('RSpace error: ' + error.message);
            return null;
        }
    },

    // Create elabFTW experiment - FIXED to accept projectName parameter
    async createElabFTWExperiment(projectName, metadata) {
        try {
            if (!window.settingsManager) {
                throw new Error('Settings manager not available');
            }

            console.log('🧪 Creating elabFTW experiment:', projectName);

            // Get category from viewer input, fallback to existing manager
            const categoryFromViewer = this.getElabFTWCategoryFromViewer();

            // Temporarily override category manager if viewer has a value
            const originalGetCategory = window.elabftwCategoryManager?.getCategoryForExperiment;
            if (window.elabftwCategoryManager) {
                window.elabftwCategoryManager.getCategoryForExperiment = async () => {
                    if (categoryFromViewer !== null) {
                        console.log('🧪 metadataLoader: Using category from viewer:', categoryFromViewer);
                        return categoryFromViewer;
                    }

                    const settingsCategory = await window.settingsManager.get('elabftw.default_category');
                    console.log('🧪 metadataLoader: Using settings default:', settingsCategory);
                    return settingsCategory || 1;
                };
            }

            try {
                const result = await window.settingsManager.createElabFTWExperiment(
                    projectName,
                    metadata,
                    '',
                    categoryFromViewer // Pass specific category ID
                );

                if (result.success) {
                    console.log('✅ elabFTW experiment created:', result.experimentUrl);
                    return {
                        success: true,
                        experimentUrl: result.experimentUrl || result.url,
                        experimentId: result.experimentId || result.id
                    };
                } else {
                    console.error('❌ elabFTW creation failed:', result.message);
                    this.showError('elabFTW: ' + result.message);
                    return null;
                }
            } finally {
                // Restore original function
                if (window.elabftwCategoryManager && originalGetCategory) {
                    window.elabftwCategoryManager.getCategoryForExperiment = originalGetCategory;
                }
            }

        } catch (error) {
            console.error('❌ Error creating elabFTW experiment:', error);
            this.showError('elabFTW error: ' + error.message);
            return null;
        }
    },

    // Create OMERO dataset - FIXED to accept projectName parameter
    async createOMERODataset(projectName, metadata) {
        try {
            if (!window.metaFoldOMEROIntegration) {
                throw new Error('OMERO integration not available. Please check OMERO settings.');
            }
            // Use sidebar inputs as viewer inputs are removed
            const groupId = document.getElementById('omeroGroupSelect')?.value;
            const projectId = document.getElementById('omeroProjectSelect')?.value || null;

            if (!groupId || groupId === '') {
                throw new Error('Please select a valid OMERO group');
            }

            console.log('🔬 Creating OMERO dataset with:', {
                name: projectName,
                groupId: groupId,
                projectId: projectId || 'none (standalone)',
                fieldsCount: Object.keys(metadata).length
            });

            const result = await window.metaFoldOMEROIntegration.createDatasetForMetaFoldProject(
                projectName,
                metadata,
                {
                    groupId: groupId,
                    projectId: projectId
                }
            );

            if (result.success) {
                console.log('✅ OMERO dataset created:', result.dataset.omeroWebUrl);
                return {
                    success: true,
                    datasetUrl: result.dataset.omeroWebUrl,
                    datasetId: result.dataset.id
                };
            } else {
                console.error('❌ OMERO creation failed:', result.message);
                this.showError('OMERO: ' + result.message);
                return null;
            }

        } catch (error) {
            console.error('❌ Error creating OMERO dataset:', error);
            this.showError('OMERO error: ' + error.message);
            return null;
        }
    },

    // Update metadata JSON file - FIXED to accept parameter
    async updateMetadataFile(enhancedMetadata) {
        try {
            console.log('💾 Updating metadata file with integration links...');

            // ✅ FIX: Update loadedMetadata BEFORE saving
            this.loadedMetadata = enhancedMetadata;

            // Save the file
            let saveResult;
            if (this.loadedFilePath && this.loadedFilePath !== 'Unknown location' && this.loadedFilePath !== 'Selected metadata file') {
                console.log('💾 Overwriting existing metadata file:', this.loadedFilePath);
                saveResult = await window.electronAPI.saveJsonFile(enhancedMetadata, this.loadedFilePath);
            } else {
                console.log('💾 Asking user where to save updated metadata...');
                saveResult = await window.electronAPI.saveJsonFile(enhancedMetadata);
            }

            if (saveResult && saveResult.success) {
                console.log('✅ Metadata file saved successfully to:', saveResult.filePath);
                this.loadedFilePath = saveResult.filePath;
                return true;
            } else {
                console.error('❌ Failed to save metadata file:', saveResult?.message);
                this.showError('Failed to save updated metadata. Please save it manually.');
                return false;
            }

        } catch (error) {
            console.error('❌ Error updating metadata file:', error);
            this.showError('Error saving metadata: ' + error.message);
            return false;
        }
    },

    // Clear view and return to discovery
    clearView() {
        const container = document.getElementById('metadataViewerContainer');
        const scannerContainer = document.getElementById('projectScannerContainer');
        const quickStart = document.getElementById('discoveryQuickStart');

        if (container) container.style.display = 'none';
        if (scannerContainer) scannerContainer.style.display = 'block';
        if (quickStart) quickStart.style.display = 'block';

        this.loadedMetadata = null;
        this.loadedFilePath = null;
        this.loadedFileName = null;

        console.log('🔄 Cleared metadata view');
    },

    // =================== README GENERATION FUNCTION ===================

    /**
     * Generate and save README.html with integration links
     * Uses the existing generateReadmeHtmlWithMetadata function from main.js
     */
    async generateAndSaveReadme(elabftwResult = null, omeroResult = null) {
        try {
            console.log('📄 metadataLoader: Starting README generation with integration links...');

            // ✅ FIX: Extract URLs from parameters FIRST (not from metadata)
            let elabftwUrl = null;
            let omeroUrl = null;

            // Extract elabFTW URL from result
            if (elabftwResult && elabftwResult.success) {
                elabftwUrl = elabftwResult.experimentUrl || elabftwResult.url || null;
                console.log('📄 metadataLoader: elabFTW URL from result:', elabftwUrl);
            }

            // Extract OMERO URL from result  
            if (omeroResult && omeroResult.success) {
                omeroUrl = omeroResult.datasetUrl || omeroResult.url || null;

                // Fallback: Extract from dataset object if available
                if (!omeroUrl && omeroResult.dataset) {
                    omeroUrl = omeroResult.dataset.omeroWebUrl || null;
                }

                console.log('📄 metadataLoader: OMERO URL from result:', omeroUrl);
            }

            // Log integration links status
            if (!elabftwUrl && !omeroUrl) {
                console.log('📄 metadataLoader: No integration links available - README will be generated without links');
            } else {
                console.log('📄 metadataLoader: README will include integration links:');
                console.log('  elabFTW:', elabftwUrl || 'none');
                console.log('  OMERO:', omeroUrl || 'none');
            }

            // Get project name
            const projectName = this.getProjectName();
            console.log('📄 metadataLoader: Project name:', projectName);

            // Get metadata for README (only the metadata fields, not the whole structure)
            const metadataFields = this.loadedMetadata.metadata || this.loadedMetadata;

            // Generate README HTML content using existing function in main.js
            console.log('📄 metadataLoader: Requesting README HTML generation from backend...');

            const generateResult = await window.electronAPI.generateReadmeHtmlContent(
                metadataFields,
                projectName,
                elabftwUrl,
                omeroUrl
            );

            if (!generateResult.success) {
                throw new Error(generateResult.message || 'Failed to generate README content');
            }

            console.log('✅ metadataLoader: README HTML content generated');
            console.log('  Content length:', generateResult.html.length, 'characters');

            // Suggest filename based on project name
            const sanitizedProjectName = projectName
                ? projectName.replace(/[<>:"/\\|?*]/g, '_').trim()
                : 'Project';
            const suggestedFilename = `${sanitizedProjectName}-README.html`;

            console.log('📄 metadataLoader: Opening save dialog...');
            console.log('  Suggested filename:', suggestedFilename);

            // Open save dialog and let user choose where to save
            const saveResult = await window.electronAPI.saveHtmlFile(
                generateResult.html,
                suggestedFilename
            );

            if (saveResult.success) {
                console.log('✅ metadataLoader: README.html saved successfully');
                console.log('  Saved to:', saveResult.filePath);

                // Show success message to user
                this.showSuccess(`README.html saved successfully to: ${saveResult.filename}`);

                return {
                    success: true,
                    message: 'README saved successfully',
                    path: saveResult.filePath,
                    filename: saveResult.filename
                };
            } else if (saveResult.cancelled) {
                console.log('ℹ️ metadataLoader: User cancelled README save');
                return {
                    success: false,
                    message: 'README save cancelled by user',
                    cancelled: true
                };
            } else {
                throw new Error(saveResult.message || 'Failed to save README');
            }

        } catch (error) {
            console.error('❌ metadataLoader: Error generating/saving README:', error);
            this.showError('Error saving README: ' + error.message);
            return {
                success: false,
                message: error.message,
                error: error.toString()
            };
        }
    },

    /**
     * OLD FUNCTION - DEPRECATED
     * Update README.html with integration links
     * Uses the regenerate-readme-html API to create a complete new README
     */
    async updateReadmeWithLinks_DEPRECATED(results, projectName, localPath) {
        try {
            console.log('📄 metadataLoader: Starting README.html regeneration...');

            // ✅ FIX: Extract directory from loaded file path (where the metadata.json is)
            let projectDirectory = null;

            // Priority 1: Use this.loadedFilePath (most reliable)
            if (this.loadedFilePath && this.loadedFilePath !== 'Unknown location' && this.loadedFilePath !== 'Selected metadata file') {
                // Extract directory by removing the filename (browser-compatible)
                const pathParts = this.loadedFilePath.split(/[/\\]/);
                pathParts.pop(); // Remove filename
                projectDirectory = pathParts.join(window.electronAPI.platform === 'win32' ? '\\' : '/');
                console.log('📄 metadataLoader: Extracted directory from loadedFilePath:', projectDirectory);
                console.log('  Original path:', this.loadedFilePath);
            }

            // Priority 2: Fallback to localPath parameter
            if (!projectDirectory && localPath && localPath !== 'Unknown') {
                projectDirectory = localPath;
                console.log('📄 metadataLoader: Using localPath parameter:', projectDirectory);
            }

            if (!projectDirectory) {
                console.warn('⚠️ metadataLoader: Cannot regenerate README - project directory unknown');
                console.warn('  this.loadedFilePath:', this.loadedFilePath);
                console.warn('  localPath:', localPath);
                return;
            }

            // Extract URLs from results
            const elabftwUrl = results.elabftw?.experimentUrl || null;
            const omeroUrl = results.omero?.datasetUrl || null;

            if (!elabftwUrl && !omeroUrl) {
                console.log('📄 metadataLoader: No integration links to add to README');
                return;
            }

            // Get the metadata for README generation
            const metadata = this.loadedMetadata.metadata || this.loadedMetadata;

            console.log('📄 metadataLoader: Calling regenerate-readme-html API...');
            console.log('  Project name:', projectName);
            console.log('  Project directory:', projectDirectory);
            console.log('  elabFTW URL:', elabftwUrl || 'none');
            console.log('  OMERO URL:', omeroUrl || 'none');

            // Use electron API to regenerate README with integration links
            if (window.electronAPI && window.electronAPI.regenerateReadmeHtml) {
                const result = await window.electronAPI.regenerateReadmeHtml(
                    projectDirectory,
                    metadata,
                    projectName,
                    elabftwUrl,
                    omeroUrl
                );

                if (result.success) {
                    console.log('✅ metadataLoader: README.html regenerated successfully:', result.path);
                } else {
                    console.warn('⚠️ metadataLoader: Failed to regenerate README:', result.message);
                }
            } else {
                console.warn('⚠️ metadataLoader: regenerateReadmeHtml API not available');
            }

        } catch (error) {
            console.error('❌ metadataLoader: Error regenerating README.html:', error);
            // Don't throw - this is non-critical
        }
    },

    // =================== UTILITY FUNCTIONS ===================

    // =================== elabFTW CATEGORY FUNCTIONS (REUSE EXISTING) ===================

    /**
     * Load elabFTW category for viewer - REUSES existing manager!
     */
    async loadElabFTWCategoryForViewer() {
        try {
            console.log('📂 Loading elabFTW category for metadata viewer...');

            const categoryInput = document.getElementById('elabftwProjectCategory_viewer');
            if (!categoryInput) {
                console.warn('⚠️ Viewer category input not found');
                return;
            }

            let categoryId = null;

            // Priority 1: Get from template info in loaded metadata
            if (this.loadedMetadata?.templateInfo?.integrations?.elabftw?.defaultCategory) {
                categoryId = this.loadedMetadata.templateInfo.integrations.elabftw.defaultCategory;
                console.log('✅ Category from template:', categoryId);
            }

            // Priority 2: Use existing manager to get default from settings
            if (categoryId === null && window.elabftwCategoryManager) {
                // Temporarily set the viewer input ID for the manager
                const originalInput = document.getElementById('elabftwProjectCategory');
                const viewerInput = document.getElementById('elabftwProjectCategory_viewer');

                if (originalInput && viewerInput) {
                    // Temporarily swap IDs so manager reads from viewer
                    originalInput.id = 'elabftwProjectCategory_temp';
                    viewerInput.id = 'elabftwProjectCategory';

                    // Load using existing manager function
                    await window.elabftwCategoryManager.loadDefaultCategory();

                    // Get the loaded value
                    categoryId = viewerInput.value;

                    // Restore IDs
                    viewerInput.id = 'elabftwProjectCategory_viewer';
                    originalInput.id = 'elabftwProjectCategory';

                    console.log('✅ Category from settings (via manager):', categoryId);
                }
            }

            // Set final value
            if (categoryId !== null && categoryId !== '') {
                categoryInput.value = categoryId;
                console.log('✅ Viewer category input set to:', categoryId);
            }

        } catch (error) {
            console.error('❌ Error loading elabFTW category:', error);
        }
    },

    /**
     * Get category from viewer input - REUSES existing manager logic!
     */
    getElabFTWCategoryFromViewer() {
        // Use sidebar input
        const categoryInput = document.getElementById('elabftwProjectCategory');
        if (categoryInput && categoryInput.value.trim()) {
            const categoryId = parseInt(categoryInput.value.trim());
            return !isNaN(categoryId) && categoryId > 0 ? categoryId : null;
        }
        return null;
    },

    // Format field name for display
    formatFieldName(key) {
        return key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },

    // Show success message
    showSuccess(message) {
        console.log('✅', message);
        if (window.projectManager && window.projectManager.showSuccess) {
            window.projectManager.showSuccess(message);
        } else if (window.showSuccess) {
            window.showSuccess(message);
        } else {
            alert('Success: ' + message);
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
            alert('Error: ' + message);
        }
    }
};

// Make globally available
window.metadataLoader = metadataLoader;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => metadataLoader.init(), 100);
    });
} else {
    setTimeout(() => metadataLoader.init(), 100);
}

console.log('📥 Metadata Loader module loaded');
