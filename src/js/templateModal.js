// Template Modal Manager (FIXED: No more focus-breaking alerts)

const templateModal = {
    editingIndex: -1, // -1 = new template, >= 0 = editing existing
    tagPicker: null,

    // Initialize or refresh community metadata UI (Category, Collections, TagPicker)
    ensureCommunityUI() {
        const container = document.getElementById('communityTagsContainer');
        if (container && !this.tagPicker && window.communityManager) {
            this.tagPicker = window.communityManager.createTagPicker({
                container: container,
                onChange: (tags) => {
                    const hidden = document.getElementById('communityTags');
                    if (hidden) hidden.value = tags.join(', ');
                }
            });
        }

        // Populate collections dropdown if available
        const colSelect = document.getElementById('communityCollection');
        if (colSelect && window.communityManager) {
            const currentVal = colSelect.value || 'General';
            const collections = window.communityManager.getCollections();
            colSelect.innerHTML = '';
            collections.forEach(col => {
                const opt = document.createElement('option');
                opt.value = col.id;
                opt.textContent = col.name + (col.id === 'General' ? ' (Default Collection)' : '');
                colSelect.appendChild(opt);
            });
            const proposeOpt = document.createElement('option');
            proposeOpt.value = '__propose_new__';
            proposeOpt.textContent = '➕ Propose new collection...';
            colSelect.appendChild(proposeOpt);

            if ([...colSelect.options].some(o => o.value === currentVal)) {
                colSelect.value = currentVal;
            } else {
                colSelect.value = 'General';
            }
        }
    },

    onCollectionChange(val) {
        const box = document.getElementById('communityProposedCollectionBox');
        if (box) {
            box.style.display = (val === '__propose_new__') ? 'block' : 'none';
        }
    },

    // Show modal for new template
    async show() {
        this.editingIndex = -1;
        document.getElementById('modalTitle').textContent = 'Create New Template';
        
        // NEW: Inject category field dynamically if not present
        this.injectCategoryField();
        
        this.clearForm();
        this.toggleTypeContent();
        
        // NEW: Load category names and set default
        await this.loadCategoryNames();
        this.setCategory(window.templateTypeManager?.currentType || 'category1');
        
        document.getElementById('templateModal').style.display = 'block';
        
        // Explicitly activate metadata tab
        this.switchTab('metadata');
        
        // NEW: Inject "Save as New" button
        this.injectSaveAsNewButton();
        
        // FIXED: Ensure proper focus after modal opens
        setTimeout(() => {
            const firstInput = document.querySelector('#templateModal input:not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Open modal for editing
    async openForEdit(index, template) {
        this.editingIndex = index;
        document.getElementById('modalTitle').textContent = 'Edit Template';
        
        // NEW: Inject category field dynamically if not present
        this.injectCategoryField();
        
        this.populateForm(template);
        this.toggleTypeContent();
        
        // NEW: Load category names and set from template
        await this.loadCategoryNames();
        this.setCategory(template.category || 'category1');
        
        document.getElementById('templateModal').style.display = 'block';
        
        // Explicitly activate metadata tab
        this.switchTab('metadata');
        
        // NEW: Inject "Save as New" button
        this.injectSaveAsNewButton();
        
        // FIXED: Ensure proper focus after modal opens
        setTimeout(() => {
            const nameInput = document.getElementById('templateName');
            if (nameInput) {
                nameInput.focus();
                nameInput.select(); // Select all for easy editing
            }
        }, 100);
    },

    // Close modal
    close() {
        document.getElementById('templateModal').style.display = 'none';
        this.clearForm();
        this.editingIndex = -1;
        
        // FIXED: Restore focus to main content after modal closes
        setTimeout(() => {
            document.body.focus();
            if (window.repairInputFocus) {
                window.repairInputFocus();
            }
        }, 100);
    },

    // Clear form
    clearForm() {
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        // REMOVED: templateType field (now using category only)
        // REMOVED: document.getElementById('folderStructure').value = '';
        document.getElementById('experimentStructure').value = '';
        
        // Clear toggles
        const writeFilesOnly = document.getElementById('templateWriteFilesOnly');
        if (writeFilesOnly) writeFilesOnly.checked = false;
        const multipleFolders = document.getElementById('templateMultipleFolders');
        if (multipleFolders) multipleFolders.checked = false;

        // Clear community fields
        this.ensureCommunityUI();
        const catSelect = document.getElementById('communityCategory');
        if (catSelect) catSelect.value = 'Experiments';
        const colSelect = document.getElementById('communityCollection');
        if (colSelect) colSelect.value = 'General';
        this.onCollectionChange('General');

        const pName = document.getElementById('communityProposedName');
        const pLab = document.getElementById('communityProposedLab');
        const pDesc = document.getElementById('communityProposedDesc');
        const pWeb = document.getElementById('communityProposedWebsite');
        if (pName) pName.value = '';
        if (pLab) pLab.value = '';
        if (pDesc) pDesc.value = '';
        if (pWeb) pWeb.value = '';

        if (this.tagPicker) {
            this.tagPicker.clear();
        }

        const systemInput = document.getElementById('communitySystem');
        const disciplineInput = document.getElementById('communityDiscipline');
        const organismInput = document.getElementById('communityOrganism');
        const tagsInput = document.getElementById('communityTags');
        const authorInput = document.getElementById('communityAuthor');
        const institutionInput = document.getElementById('communityInstitution');
        const orcidInput = document.getElementById('communityOrcid');
        const versionInput = document.getElementById('communityVersion');
        const licenseInput = document.getElementById('communityLicense');

        if (systemInput) systemInput.value = '';
        if (disciplineInput) disciplineInput.value = '';
        if (organismInput) organismInput.value = '';
        if (tagsInput) tagsInput.value = '';

        const currentUser = window.userManager?.currentUser;
        const userProfile = (currentUser && window.profileManager?.isInitialized) ?
            window.profileManager.getUserByUsername(currentUser) : null;
        const defaultAuthor = userProfile?.fullName || currentUser || '';
        const defaultInst = userProfile?.primaryGroupId ?
            window.profileManager?.getGroupById(userProfile.primaryGroupId)?.institution :
            (window.userManager?.currentGroup || '');
        const defaultOrcid = userProfile?.orcid || '';

        if (authorInput) authorInput.value = defaultAuthor;
        if (institutionInput) institutionInput.value = defaultInst;
        if (orcidInput) orcidInput.value = defaultOrcid;
        if (versionInput) versionInput.value = '1.0.0';
        if (licenseInput) licenseInput.value = 'CC0-1.0';

        // Reset collapsible folder structure
        const folderDetails = document.getElementById('folderStructureDetails');
        if (folderDetails) folderDetails.open = false;
        
        // Clear metadata fields
        if (window.metadataEditor && window.metadataEditor.clearFields) {
            window.metadataEditor.clearFields();
        }
        
        // Clear any error messages
        this.clearMessages();
    },

    // Populate form with template data
    populateForm(template) {
        document.getElementById('templateName').value = template.name || '';
        document.getElementById('templateDescription').value = template.description || '';
        // REMOVED: templateType field (now using category only)
        
        // GEÄNDERT: Immer experimentStructure verwenden, unabhängig vom Template-Typ
        document.getElementById('experimentStructure').value = template.structure || '';
        
        // Load toggles
        const writeFilesOnly = document.getElementById('templateWriteFilesOnly');
        if (writeFilesOnly) writeFilesOnly.checked = template.options?.writeFilesOnly || false;
        const multipleFolders = document.getElementById('templateMultipleFolders');
        if (multipleFolders) multipleFolders.checked = template.options?.multipleFolders || false;

        // Populate Community taxonomy
        this.ensureCommunityUI();
        const comm = template.community || {};

        // Category (Fixed: Systems, Protocols, Experiments, Workflows)
        const catSelect = document.getElementById('communityCategory');
        if (catSelect) {
            const rawCat = comm.category || comm.type || template.type || 'Experiments';
            const matched = ['Systems', 'Protocols', 'Experiments', 'Workflows'].find(
                c => c.toLowerCase() === String(rawCat).toLowerCase()
            ) || 'Experiments';
            catSelect.value = matched;
        }

        // Collection & Proposed collection
        const colSelect = document.getElementById('communityCollection');
        if (colSelect) {
            if (comm.proposedCollection && comm.proposedCollection.name) {
                colSelect.value = '__propose_new__';
                this.onCollectionChange('__propose_new__');
                const pName = document.getElementById('communityProposedName');
                const pLab = document.getElementById('communityProposedLab');
                const pDesc = document.getElementById('communityProposedDesc');
                const pWeb = document.getElementById('communityProposedWebsite');
                if (pName) pName.value = comm.proposedCollection.name || '';
                if (pLab) pLab.value = comm.proposedCollection.institution || '';
                if (pDesc) pDesc.value = comm.proposedCollection.description || '';
                if (pWeb) pWeb.value = comm.proposedCollection.website || '';
            } else {
                const col = comm.collection || 'General';
                if (![...colSelect.options].some(o => o.value === col)) {
                    const opt = document.createElement('option');
                    opt.value = col;
                    opt.textContent = col;
                    colSelect.insertBefore(opt, colSelect.lastElementChild);
                }
                colSelect.value = col;
                this.onCollectionChange(col);
            }
        }

        // Tags
        let tags = [];
        if (Array.isArray(comm.tags)) {
            tags = comm.tags;
        } else if (comm.tags) {
            tags = String(comm.tags).split(',').map(t => t.trim()).filter(Boolean);
        }
        if (this.tagPicker) {
            this.tagPicker.setTags(tags);
        }

        const systemInput = document.getElementById('communitySystem');
        const disciplineInput = document.getElementById('communityDiscipline');
        const organismInput = document.getElementById('communityOrganism');
        const tagsInput = document.getElementById('communityTags');
        const authorInput = document.getElementById('communityAuthor');
        const institutionInput = document.getElementById('communityInstitution');
        const orcidInput = document.getElementById('communityOrcid');
        const versionInput = document.getElementById('communityVersion');
        const licenseInput = document.getElementById('communityLicense');

        if (systemInput) systemInput.value = comm.system || '';
        if (disciplineInput) disciplineInput.value = comm.discipline || '';
        if (organismInput) organismInput.value = comm.organism || '';
        if (tagsInput) {
            tagsInput.value = Array.isArray(comm.tags) ? comm.tags.join(', ') : (comm.tags || '');
        }

        // Default author/institution/orcid from profile if not present
        const currentUser = window.userManager?.currentUser;
        const userProfile = (currentUser && window.profileManager?.isInitialized) ?
            window.profileManager.getUserByUsername(currentUser) : null;
        const defaultAuthor = userProfile?.fullName || currentUser || template.createdBy || '';
        const defaultInst = userProfile?.primaryGroupId ?
            window.profileManager?.getGroupById(userProfile.primaryGroupId)?.institution :
            (window.userManager?.currentGroup || template.createdByGroup || '');
        const defaultOrcid = userProfile?.orcid || '';

        if (authorInput) authorInput.value = comm.author || defaultAuthor;
        if (institutionInput) institutionInput.value = comm.institution || defaultInst;
        if (orcidInput) orcidInput.value = comm.orcid || defaultOrcid;
        if (versionInput) versionInput.value = comm.version || '1.0.0';
        if (licenseInput) licenseInput.value = comm.license || 'CC0-1.0';

        // Auto-expand folder structure if template has existing structure or options
        const folderDetails = document.getElementById('folderStructureDetails');
        if (folderDetails) {
            folderDetails.open = Boolean(
                template.structure || 
                template.options?.writeFilesOnly || 
                template.options?.multipleFolders
            );
        }
        
        // Load metadata into editor if it's an experiment template
        const isExperiment = template.type === 'experiment' || (template.metadata && Object.keys(template.metadata).length > 0);
        if (isExperiment && template.metadata && window.metadataEditor && window.metadataEditor.loadMetadataIntoEditor) {
            window.metadataEditor.loadMetadataIntoEditor(template.metadata);
        }
        
        // Clear any error messages
        this.clearMessages();
    },

    // Toggle between folder and experiment content
    // VEREINFACHT: Nur experimentTab anzeigen, folderTab existiert nicht mehr
    toggleTypeContent() {
        const experimentTab = document.getElementById('experimentTab');
        
        if (experimentTab) {
            experimentTab.style.display = 'block';
        }
    },

    // Switch between metadata, structure, and community tabs
    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('#experimentTab .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('#experimentTab .tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab content
        if (tabName === 'metadata') {
            const content = document.getElementById('metadataContent');
            if (content) content.classList.add('active');
            const tabBtn = document.getElementById('tabBtnMetadata') || 
                           document.querySelector('#experimentTab .tab[data-tab="metadata"]');
            if (tabBtn) tabBtn.classList.add('active');
        } else if (tabName === 'structure') {
            const content = document.getElementById('structureContent');
            if (content) content.classList.add('active');
            const tabBtn = document.getElementById('tabBtnStructure') || 
                           document.querySelector('#experimentTab .tab[data-tab="structure"]');
            if (tabBtn) tabBtn.classList.add('active');
            this.updateDynamicFieldsHelper();
        } else if (tabName === 'community') {
            const content = document.getElementById('communityContent');
            if (content) content.classList.add('active');
            const tabBtn = document.getElementById('tabBtnCommunity') || 
                           document.querySelector('#experimentTab .tab[data-tab="community"]');
            if (tabBtn) tabBtn.classList.add('active');
        }
    },

    // Update the dynamic folder fields helper chips in the Folder Structure tab
    updateDynamicFieldsHelper() {
        const container = document.getElementById('dynamicFolderChipsList');
        if (!container) return;
        container.innerHTML = '';

        const fieldTags = new Map();

        // 1. Standard / System Tags (always available)
        fieldTags.set('User Name', { label: 'User Name', source: 'system', desc: 'Current logged-in user' });
        fieldTags.set('Project Name', { label: 'Project Name', source: 'system', desc: 'Project name from project form' });
        fieldTags.set('Date', { label: 'Date', source: 'system', desc: 'Current creation date (YYYY-MM-DD)' });

        // 2. Custom fields from Metadata Editor DOM
        const fieldEls = document.querySelectorAll('#metadataFields .metadata-field');
        fieldEls.forEach(fieldEl => {
            const type = fieldEl.querySelector('.field-type-selector')?.value;
            if (type === 'group') return;
            const label = fieldEl.querySelector('.field-label-input')?.value.trim();
            const name = fieldEl.querySelector('.field-name-input')?.value.trim();
            const displayTag = label || name;
            if (displayTag && !fieldTags.has(displayTag)) {
                fieldTags.set(displayTag, { label: displayTag, source: 'template', desc: label && name ? `Key: ${name}` : '' });
            }
        });

        // 3. Fallback from collectMetadata or template object
        if (window.metadataEditor && typeof window.metadataEditor.collectMetadata === 'function') {
            try {
                const meta = window.metadataEditor.collectMetadata() || {};
                const fields = meta.fields || meta;
                for (const [key, f] of Object.entries(fields)) {
                    if (f && f.type === 'group') continue;
                    const label = f?.label ? f.label.trim() : key;
                    if (label && !fieldTags.has(label)) {
                        fieldTags.set(label, { label, source: 'template', desc: `Key: ${key}` });
                    }
                }
            } catch (e) {}
        }

        // Render chips
        fieldTags.forEach((info, tag) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-secondary btn-small';
            btn.style.cssText = `
                padding: 3px 9px;
                font-size: 0.78rem;
                font-family: monospace;
                background: ${info.source === 'system' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(168, 85, 247, 0.22)'};
                border: 1px solid ${info.source === 'system' ? 'rgba(59, 130, 246, 0.45)' : 'rgba(168, 85, 247, 0.45)'};
                color: ${info.source === 'system' ? '#93c5fd' : '#e9d5ff'};
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.15s ease;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            `;
            btn.title = `Click to insert [${tag}]/ into folder structure${info.desc ? ` (${info.desc})` : ''}`;
            btn.innerHTML = `<span>[${tag}]</span>`;
            btn.onmouseenter = () => {
                btn.style.transform = 'translateY(-1px)';
                btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
            };
            btn.onmouseleave = () => {
                btn.style.transform = 'none';
                btn.style.boxShadow = 'none';
            };
            btn.onclick = () => this.insertPlaceholderIntoStructure(`[${tag}]`);
            container.appendChild(btn);
        });
    },

    // Insert dynamic tag placeholder into folder structure textarea at cursor position
    insertPlaceholderIntoStructure(tag) {
        const textarea = document.getElementById('experimentStructure');
        if (!textarea) return;
        const tagToInsert = tag.endsWith('/') ? tag : `${tag}/`;
        const start = textarea.selectionStart !== undefined ? textarea.selectionStart : textarea.value.length;
        const end = textarea.selectionEnd !== undefined ? textarea.selectionEnd : textarea.value.length;
        const text = textarea.value;

        textarea.value = text.substring(0, start) + tagToInsert + text.substring(end);
        textarea.focus();
        const newPos = start + tagToInsert.length;
        textarea.setSelectionRange(newPos, newPos);
    },

    // Collect Community & Sharing metadata
    collectCommunityData() {
        const category = document.getElementById('communityCategory')?.value || 'Experiments';
        const colSelect = document.getElementById('communityCollection');
        const collectionValue = colSelect?.value || 'General';
        const isProposed = collectionValue === '__propose_new__';

        let proposedCollection = null;
        if (isProposed) {
            proposedCollection = {
                name: document.getElementById('communityProposedName')?.value?.trim() || '',
                institution: document.getElementById('communityProposedLab')?.value?.trim() || '',
                description: document.getElementById('communityProposedDesc')?.value?.trim() || '',
                website: document.getElementById('communityProposedWebsite')?.value?.trim() || ''
            };
        }

        let tags = [];
        if (this.tagPicker) {
            tags = this.tagPicker.getTags();
        } else {
            const rawTags = document.getElementById('communityTags')?.value || '';
            tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);
        }

        // Sync hidden tags input
        const hiddenTags = document.getElementById('communityTags');
        if (hiddenTags) {
            hiddenTags.value = tags.join(', ');
        }

        const author = document.getElementById('communityAuthor')?.value?.trim() || '';
        const institution = document.getElementById('communityInstitution')?.value?.trim() || '';
        const orcid = document.getElementById('communityOrcid')?.value?.trim() || '';
        const version = document.getElementById('communityVersion')?.value?.trim() || '1.0.0';
        const license = document.getElementById('communityLicense')?.value?.trim() || 'CC0-1.0';

        // Keep legacy fields populated for backward compatibility
        const system = document.getElementById('communitySystem')?.value?.trim() || '';
        const discipline = document.getElementById('communityDiscipline')?.value?.trim() || '';
        const organism = document.getElementById('communityOrganism')?.value?.trim() || '';

        return {
            category,
            type: category.toLowerCase(),
            collection: isProposed ? 'General' : collectionValue,
            proposedCollection,
            tags,
            author,
            institution,
            orcid,
            version,
            license,
            system,
            discipline,
            organism
        };
    },

    // FIXED: Better error/success message display without focus-breaking alerts
    showMessage(message, type = 'info', autoHide = true) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Remove existing message
        this.clearMessages();
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.id = 'templateModalMessage';
        messageDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            font-weight: 500;
            z-index: 10002;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideDown 0.3s ease-out;
        `;
        
        // Style based on type
        switch (type) {
            case 'error':
                messageDiv.style.background = '#fee2e2';
                messageDiv.style.color = '#dc2626';
                messageDiv.style.border = '1px solid #f87171';
                messageDiv.innerHTML = `❌ ${message}`;
                break;
            case 'success':
                messageDiv.style.background = '#d1fae5';
                messageDiv.style.color = '#059669';
                messageDiv.style.border = '1px solid #34d399';
                messageDiv.innerHTML = `✅ ${message}`;
                break;
            case 'warning':
                messageDiv.style.background = '#fef3c7';
                messageDiv.style.color = '#d97706';
                messageDiv.style.border = '1px solid #fbbf24';
                messageDiv.innerHTML = `⚠️ ${message}`;
                break;
            default:
                messageDiv.style.background = '#dbeafe';
                messageDiv.style.color = '#2563eb';
                messageDiv.style.border = '1px solid #60a5fa';
                messageDiv.innerHTML = `ℹ️ ${message}`;
        }
        
        // Add animation CSS if not exists
        if (!document.getElementById('modalMessageStyles')) {
            const styles = document.createElement('style');
            styles.id = 'modalMessageStyles';
            styles.textContent = `
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(-20px); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to modal
        const modal = document.getElementById('templateModal');
        if (modal) {
            modal.appendChild(messageDiv);
            
            // Auto-hide success messages
            if (autoHide && type === 'success') {
                setTimeout(() => {
                    this.clearMessages();
                }, 3000);
            }
        }
        
        return messageDiv;
    },
    
    // Clear message
    clearMessages() {
        const existingMessage = document.getElementById('templateModalMessage');
        if (existingMessage) {
            existingMessage.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                if (existingMessage.parentNode) {
                    existingMessage.remove();
                }
            }, 300);
        }
    },

    // Show error with focus preservation
    showError(message) {
        this.showMessage(message, 'error', false);
        
        // CRITICAL: Preserve focus after error display
        setTimeout(() => {
            // Try to focus the field that caused the error
            if (message.includes('name')) {
                const nameInput = document.getElementById('templateName');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.style.borderColor = '#dc2626';
                    setTimeout(() => {
                        nameInput.style.borderColor = '';
                    }, 3000);
                }
            }
            
            // General focus repair
            if (window.repairInputFocus) {
                window.repairInputFocus();
            }
        }, 100);
    },

    // Show success message
    showSuccess(message) {
        this.showMessage(message, 'success', true);
    },

    // FIXED: Save method without focus-breaking alerts (made async for proper template refresh)
    async save() {
        console.log('🔧 Save method called');
        
        // Clear previous messages
        this.clearMessages();
        
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        
        // Determine type based on whether metadata exists
        const hasMetadata = window.metadataEditor && window.metadataEditor.collectMetadata && 
                          Object.keys(window.metadataEditor.collectMetadata() || {}).length > 0;
        const type = hasMetadata ? 'experiment' : 'folders';

        console.log('Form values:', { name, description, type, hasMetadata });

        // FIXED: Use showError instead of alert
        if (!name) {
            this.showError('Please enter a template name!');
            return;
        }

        // Additional validation
        if (name.length > 100) {
            this.showError('Template name is too long (max 100 characters)!');
            return;
        }
        
        if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
            this.showError('Template name contains invalid characters! Use only letters, numbers, spaces, hyphens and underscores.');
            return;
        }

        // GEÄNDERT: Immer experimentStructure auslesen
        let structure = document.getElementById('experimentStructure').value.trim();

        console.log('Structure:', structure);

        const category = this.getSelectedCategory(); // NEW: Get category
        
        let existingIntegrations = null;
        let existingProjectDefaults = null;
        if (this.editingIndex >= 0 && window.templateManager && window.templateManager.templates) {
            const existingTemplate = window.templateManager.templates[this.editingIndex];
            if (existingTemplate) {
                existingIntegrations = existingTemplate.integrations;
                existingProjectDefaults = existingTemplate.projectDefaults;
            }
        } else if (window.templateManager && window.templateManager.currentTemplate) {
            existingIntegrations = window.templateManager.currentTemplate.integrations;
            existingProjectDefaults = window.templateManager.currentTemplate.projectDefaults;
        }
        
        const template = {
            name: name,
            description: description,
            type: type,
            category: category, // NEW: Save category
            structure: structure,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString(),
            options: {
                writeFilesOnly: document.getElementById('templateWriteFilesOnly')?.checked || false,
                multipleFolders: document.getElementById('templateMultipleFolders')?.checked || false
            },
            community: this.collectCommunityData()
        };

        if (existingIntegrations) {
            template.integrations = JSON.parse(JSON.stringify(existingIntegrations));
        }
        if (existingProjectDefaults) {
            template.projectDefaults = JSON.parse(JSON.stringify(existingProjectDefaults));
        }

        // FIXED: Add metadata for experiments
        if (type === 'experiment' && window.metadataEditor && window.metadataEditor.collectMetadata) {
            const metadata = window.metadataEditor.collectMetadata();
            if (metadata && Object.keys(metadata).length > 0) {
                template.metadata = metadata;
                console.log('Metadata collected:', metadata);
            }
        }

        console.log('Final template object:', template);

        try {
            if (this.editingIndex >= 0) {
                // Update existing template
                if (window.templateManager && window.templateManager.update) {
                    await window.templateManager.update(this.editingIndex, template);
                    console.log('✅ Template updated successfully!');
                    
                    // FIXED: Reload templates to refresh UI after update
                    console.log('🔄 Refreshing template list after update...');
                    await window.templateManager.refresh();
                    
                    // FIXED: Show success message without alert
                    this.showSuccess(`Template "${name}" has been updated!`);
                    
                    // Close modal after brief delay to show success message
                    setTimeout(() => {
                        this.close();
                    }, 2000);
                } else {
                    throw new Error('templateManager.update not available');
                }
            } else {
                // Add new template
                if (window.templateManager && window.templateManager.add) {
                    await window.templateManager.add(template);
                    console.log('✅ Template added successfully!');
                    
                    // FIXED: Reload templates to refresh UI after adding
                    console.log('🔄 Refreshing template list after adding...');
                    await window.templateManager.refresh();
                    
                    // FIXED: Show success message without alert
                    this.showSuccess(`Template "${name}" has been created!`);
                    
                    // Close modal after brief delay to show success message
                    setTimeout(() => {
                        this.close();
                    }, 2000);
                } else {
                    throw new Error('templateManager.add not available');
                }
            }
            
        } catch (error) {
            console.error('❌ Error in save process:', error);
            
            // FIXED: Show error message without alert
            this.showError('Error while saving: ' + error.message);
        }
    },

    // FIXED: Enhanced form validation with better UX
    validateForm() {
        const name = document.getElementById('templateName').value.trim();
        
        // Determine type based on whether metadata exists
        const hasMetadata = window.metadataEditor && window.metadataEditor.collectMetadata && 
                          Object.keys(window.metadataEditor.collectMetadata() || {}).length > 0;
        const type = hasMetadata ? 'experiment' : 'folders';
        
        const errors = [];
        
        if (!name) {
            errors.push('Template name is required');
        } else if (name.length > 100) {
            errors.push('Template name is too long (max 100 characters)');
        } else if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
            errors.push('Template name contains invalid characters');
        }
        
        // Check for duplicate names
        if (window.templateManager && window.templateManager.templates) {
            const existingTemplate = window.templateManager.templates.find((t, index) => 
                t.name.toLowerCase() === name.toLowerCase() && 
                index !== this.editingIndex
            );
            if (existingTemplate) {
                errors.push('A template with this name already exists');
            }
        }
        
        // Validate structure if provided
        if (type === 'folders') {
            const structure = document.getElementById('experimentStructure').value.trim();
            if (structure && !this.validateStructure(structure)) {
                errors.push('Invalid folder structure format');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },
    
    // Helper to validate structure format
    validateStructure(structure) {
        try {
            const lines = structure.split('\n').filter(line => line.trim());
            return lines.length > 0; // Basic validation - at least one line
        } catch (e) {
            return false;
        }
    },

    // NEW: Load category names from settings and update dropdown
    async loadCategoryNames() {
        console.log('📁 Loading category names from settings...');
        
        const categorySelect = document.getElementById('templateCategory');
        if (!categorySelect) {
            console.warn('Category select not found');
            return;
        }
        
        try {
            // Get category configurations from settings
            const categories = [];
            for (let i = 1; i <= 4; i++) {
                const categoryId = `category${i}`;
                const config = await window.settingsManager?.getCategoryConfig?.(categoryId);
                
                if (config) {
                    categories.push({
                        id: categoryId,
                        name: config.name || `Category ${i}`,
                        icon: config.icon || '📋',
                        color: config.color || '#6b7280'
                    });
                } else {
                    // Fallback if settings not available
                    const defaults = {
                        category1: { name: 'Main-Project', icon: '🎯', color: '#8b5cf6' },
                        category2: { name: 'Sub-Project', icon: '📊', color: '#06b6d4' },
                        category3: { name: 'Action', icon: '⚡', color: '#10b981' },
                        category4: { name: 'Misc', icon: '📋', color: '#f59e0b' }
                    };
                    const def = defaults[categoryId];
                    categories.push({
                        id: categoryId,
                        name: def.name,
                        icon: def.icon,
                        color: def.color
                    });
                }
            }
            
            // Update dropdown options
            categorySelect.innerHTML = categories.map(cat => 
                `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
            ).join('');
            
            console.log('✅ Category names loaded:', categories.map(c => c.name).join(', '));
            
        } catch (error) {
            console.error('Error loading category names:', error);
            // Keep default options if error occurs
        }
    },

    // NEW: Get selected category from dropdown
    getSelectedCategory() {
        const categorySelect = document.getElementById('templateCategory');
        if (!categorySelect) {
            return 'category1'; // Default fallback
        }
        return categorySelect.value || 'category1';
    },

    // NEW: Set category in dropdown
    setCategory(categoryId) {
        const categorySelect = document.getElementById('templateCategory');
        if (!categorySelect) {
            console.warn('Category select not found');
            return;
        }
        
        // Validate category ID
        const validCategories = ['category1', 'category2', 'category3', 'category4'];
        if (!validCategories.includes(categoryId)) {
            console.warn('Invalid category ID:', categoryId, '- using category1');
            categoryId = 'category1';
        }
        
        categorySelect.value = categoryId;
        console.log('📁 Category set to:', categoryId);
    },

    // NEW: Dynamically inject "Save as New" button into modal if not present
    injectSaveAsNewButton() {
        console.log('🔧 Checking for "Save as New" button...');
        
        // Check if button already exists (prevent duplicates)
        if (document.getElementById('saveAsNewBtn')) {
            console.log('✅ "Save as New" button already exists');
            return;
        }
        
        // Wait a bit for modal to be fully rendered
        setTimeout(() => {
            const modal = document.getElementById('templateModal');
            if (!modal || modal.style.display === 'none') {
                console.warn('⚠️ Modal not visible, skipping button injection');
                return;
            }
            
            // Find the Save button
            const buttons = modal.querySelectorAll('button');
            const saveBtn = Array.from(buttons).find(btn => 
                btn.textContent.includes('Save') && 
                !btn.textContent.includes('Cancel') &&
                !btn.textContent.includes('Copy')
            );
            
            if (saveBtn) {
                // Check if button already exists (double-check)
                const existingBtn = document.getElementById('saveAsNewBtn');
                if (existingBtn) {
                    console.log('✅ "Save as New" button already exists (double-check)');
                    return;
                }
                
                // Create "Save as New" button
                const newBtn = document.createElement('button');
                newBtn.id = 'saveAsNewBtn';
                newBtn.className = 'btn btn-secondary';
                newBtn.onclick = () => window.templateModal.saveAsNewTemplate();
                newBtn.textContent = '💾 Save as New';
                newBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                newBtn.style.borderColor = '#059669';
                newBtn.style.color = 'white';
                newBtn.style.marginRight = '8px';
                newBtn.title = 'Create a copy of this template with a new name';
                
                // Insert before the Save button
                saveBtn.parentNode.insertBefore(newBtn, saveBtn);
                
                console.log('✅ "Save as New" button injected successfully');
            } else {
                console.warn('⚠️ Save button not found in modal');
            }
        }, 150); // Small delay to ensure modal is rendered
    },
    
    // NEW: Dynamically inject category field into modal if not present
    injectCategoryField() {
        console.log('🔧 Checking for category field...');
        
        // Check if field already exists
        if (document.getElementById('templateCategory')) {
            console.log('✅ Category field already exists');
            return;
        }
        
        console.log('➕ Injecting category field dynamically...');
        
        // Find the templateDescription field as reference point
        const templateDescriptionField = document.getElementById('templateDescription');
        if (!templateDescriptionField) {
            console.error('❌ Could not find templateDescription field - cannot inject category field');
            return;
        }
        
        // Find the parent form group of templateDescription
        const templateDescriptionFormGroup = templateDescriptionField.closest('.form-group') || templateDescriptionField.parentElement;
        
        // Create the category field HTML
        const categoryFieldHTML = `
            <div class="form-group" id="templateCategoryGroup" style="margin-bottom: 20px; margin-top: 15px;">
                <label for="templateCategory" style="display: block; margin-bottom: 8px; font-weight: 600; color: #e0e0e0;">
                    📁 Template Category:
                </label>
                <select id="templateCategory" 
                        style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: #e0e0e0; font-size: 14px;">
                    <option value="category1">🎯 Main-Project</option>
                    <option value="category2">📊 Sub-Project</option>
                    <option value="category3">⚡ Action</option>
                    <option value="category4">📋 Misc</option>
                </select>
                <small style="display: block; margin-top: 6px; color: #9ca3af; font-size: 12px;">
                    Choose which category this template belongs to. Category names can be customized in Settings.
                </small>
            </div>
        `;
        
        // Insert after the templateDescription form group
        if (templateDescriptionFormGroup.nextSibling) {
            templateDescriptionFormGroup.insertAdjacentHTML('afterend', categoryFieldHTML);
        } else {
            templateDescriptionFormGroup.parentElement.insertAdjacentHTML('beforeend', categoryFieldHTML);
        }
        
        console.log('✅ Category field injected successfully');
    },

    /**
     * NEW: Save current template as a NEW template (duplicate functionality)
     * Creates a copy of the currently edited template with a new name
     * 
     * Usage: Called when user clicks "Save as New Template" button
     * Result: Always creates a new template, never overwrites existing ones
     */
    async saveAsNewTemplate() {
        console.log('💾 Saving template as new template...');
        
        try {
            // === STEP 1: Get all form values ===
            const name = document.getElementById('templateName').value.trim();
            const description = document.getElementById('templateDescription').value.trim();
            const category = this.getSelectedCategory(); // Get category from dropdown
            
            // === STEP 2: Validate required fields ===
            if (!name) {
                this.showMessage('⚠️ Please enter a template name', 'error');
                return false;
            }
            
            // === STEP 3: Determine template type (Experiment or Folder) ===
            const hasMetadata = window.metadataEditor && window.metadataEditor.collectMetadata && 
                              Object.keys(window.metadataEditor.collectMetadata() || {}).length > 0;
            const type = hasMetadata ? 'experiment' : 'folders';
            
            // GEÄNDERT: Immer experimentStructure auslesen
            let structure = document.getElementById('experimentStructure').value.trim();
            let metadata = null;
            
            if (type === 'experiment') {
                // === EXPERIMENT TEMPLATE ===
                // Get metadata from the metadata editor
                if (window.metadataEditor && window.metadataEditor.collectMetadata) {
                    metadata = window.metadataEditor.collectMetadata();
                }
                
                // Validate: At least one of structure or metadata must be present
                if (!structure && (!metadata || Object.keys(metadata).length === 0)) {
                    this.showMessage('⚠️ Please add either a folder structure or metadata fields', 'error');
                    return false;
                }
            } else {
                // === FOLDER TEMPLATE ===
                // For folder templates, structure is required
                if (!structure) {
                    this.showMessage('⚠️ Please enter a folder structure', 'error');
                    return false;
                }
            }
            
            // === STEP 4: Preserve existing integrations and project defaults ===
            let existingIntegrations = null;
            let existingProjectDefaults = null;
            if (window.templateManager && window.templateManager.currentTemplate) {
                existingIntegrations = window.templateManager.currentTemplate.integrations;
                existingProjectDefaults = window.templateManager.currentTemplate.projectDefaults;
            }

            // === STEP 5: Create new template object ===
            const newTemplate = {
                name: name + ' (Copy)', // Automatically add "(Copy)" to name
                description: description || '',
                structure: structure,
                metadata: metadata || {},
                type: type,
                category: category,
                community: this.collectCommunityData(),
                options: {
                    writeFilesOnly: document.getElementById('templateWriteFilesOnly')?.checked || false,
                    multipleFolders: document.getElementById('templateMultipleFolders')?.checked || false
                },
                createdBy: window.userManager?.currentUser || 'Unknown',
                createdByGroup: window.userManager?.currentGroup || 'Unknown',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (existingIntegrations) {
                newTemplate.integrations = JSON.parse(JSON.stringify(existingIntegrations));
            }
            if (existingProjectDefaults) {
                newTemplate.projectDefaults = JSON.parse(JSON.stringify(existingProjectDefaults));
            }
            
            // === STEP 5: Handle duplicate names ===
            // Check if a template with this name already exists
            const existingTemplate = window.templateManager.templates.find(t => 
                t.name === newTemplate.name && 
                t.createdBy === newTemplate.createdBy
            );
            
            if (existingTemplate) {
                // Name already exists - add a number to make it unique
                let counter = 2;
                let uniqueName = `${name} (Copy ${counter})`;
                
                // Keep incrementing until we find a unique name
                while (window.templateManager.templates.find(t => 
                    t.name === uniqueName && 
                    t.createdBy === newTemplate.createdBy
                )) {
                    counter++;
                    uniqueName = `${name} (Copy ${counter})`;
                }
                
                newTemplate.name = uniqueName;
                console.log(`📝 Adjusted name to avoid duplicate: ${uniqueName}`);
            }
            
            // === STEP 6: Add template to manager ===
            await window.templateManager.add(newTemplate);
            
            // === STEP 7: Refresh template list ===
            console.log('🔄 Refreshing template list after adding...');
            await window.templateManager.refresh();
            
            // === STEP 8: Show success message ===
            this.showMessage(`✅ Template "${newTemplate.name}" created successfully!`, 'success');
            
            // === STEP 9: Close modal after short delay ===
            setTimeout(() => {
                this.close();
            }, 800);
            
            console.log(`✅ Template successfully saved as new: "${newTemplate.name}"`);
            return true;
            
        } catch (error) {
            console.error('❌ Error saving template as new:', error);
            this.showMessage(`❌ Error: ${error.message}`, 'error');
            return false;
        }
    }
};

// Make globally available
window.templateModal = templateModal;
console.log('✅ templateModal loaded (FIXED: Focus-safe notifications)');