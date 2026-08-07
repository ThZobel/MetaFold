// Enhanced Experiment Form Manager for MetaFold
// ❌ NOTE: Drag & Drop is DISABLED in the experiment form (Create Project tab)
// Drag & Drop is only active in the Template Edit Modal (metadataEditor.js)
// This prevents accidental drag when selecting text in input fields

const experimentForm = {
    savedFieldValues: {},

    // NEW: Drag & Drop state for experiment form
    dragState: {
        isDragging: false,
        draggedElement: null,
        draggedFieldName: null,
        dropIndicator: null,
        originalOrder: [] // Store original field order
    },

    // NEW: Filename suggestion state
    filenameState: {
        selectedFields: [],  // Array of field names in selection order
        prefix: '',
        isSwitchingTemplate: false  // NEW: Flag to prevent auto-save during template switch
    },

    // NEW: Prevent auto template creation with validation (SANFTER)
    preventAutoTemplateCreation() {
        // Check if we have a valid user context
        const currentUser = window.userManager?.currentUser;
        const currentGroup = window.userManager?.currentGroup;

        if (!currentUser || currentUser === 'Unknown' || !currentGroup || currentGroup === 'Unknown') {
            console.warn('⚠️ Auto template creation prevented: Invalid user context');
            return false;
        }

        // SANFTERE Prüfung: Nur wirklich problematische Templates verhindern
        if (!window.templateManager?.currentTemplate) {
            console.warn('⚠️ Auto template creation prevented: No current template');
            return false;
        }

        const template = window.templateManager.currentTemplate;

        // Nur Templates mit 'undefined' im Namen oder leeren Namen verhindern
        if (!template.name ||
            template.name === 'undefined' ||
            template.name.startsWith('undefined') ||
            template.name.trim() === '') {
            console.warn('⚠️ Auto template creation prevented: Invalid template name:', template.name);
            return false;
        }

        return true; // ALLES ANDERE IST OK
    },

    // Initialize experiment form with drag & drop
    init() {
        this.createDropIndicator();
        console.log('✅ Experiment Form initialized with Drag & Drop support');
    },

    // Create drop indicator for experiment form
    createDropIndicator() {
        if (!this.dragState.dropIndicator) {
            this.dragState.dropIndicator = document.createElement('div');
            this.dragState.dropIndicator.className = 'experiment-drag-drop-indicator';
            this.dragState.dropIndicator.innerHTML = '<div class="experiment-drop-line"></div>';
            this.dragState.dropIndicator.style.display = 'none';
        }
    },

    // NEW: Generate template-specific cache key
    getTemplateSpecificKey(fieldName) {
        const templateId = window.templateManager?.currentTemplate?.id || 'unknown';
        return `${templateId}_${fieldName}`;
    },

    // UPDATED: Template-specific saved field value getter
    getSavedFieldValue(fieldName) {
        const key = this.getTemplateSpecificKey(fieldName);
        return this.savedFieldValues[key];
    },

    // UPDATED: Template-specific saved field value setter
    saveFieldValue(fieldName, value) {
        const key = this.getTemplateSpecificKey(fieldName);
        this.savedFieldValues[key] = value;
    },

    clearSavedFieldValues() {
        this.savedFieldValues = {};
    },

    // NEW: Reset form completely before loading new template
    resetFormForNewTemplate() {
        console.log('🔄 Resetting form for new template...');

        // NEW: Set flag to prevent auto-save during reset
        this.filenameState.isSwitchingTemplate = true;

        try {
            // 1. (Removed clearAllFormInputs to prevent change events from wiping savedFieldValues of the previous template)

            // 2. Clear the form container completely (force clean slate)
            const container = document.getElementById('experimentFields');
            if (container) {
                container.innerHTML = '';
            }

            // 3. Clear project paths
            const targetPathEl = document.getElementById('targetPath');
            const projectNameEl = document.getElementById('projectName');
            if (targetPathEl) {
                targetPathEl.value = '';
                targetPathEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (projectNameEl) {
                projectNameEl.value = '';
                projectNameEl.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // 4. Update path preview
            if (window.projectManager && window.projectManager.updatePathPreview) {
                window.projectManager.updatePathPreview();
            }

            // 5. Clear any temporary field order
            this.tempFieldOrder = null;

            console.log('✅ Form completely reset for new template');

        } catch (error) {
            console.error('❌ Error resetting form for new template:', error);
        }
    },

    // NEW: Clear values for specific template only
    clearSavedFieldValuesForCurrentTemplate() {
        if (!window.templateManager?.currentTemplate?.id) return;

        const templateId = window.templateManager.currentTemplate.id;
        const keysToDelete = Object.keys(this.savedFieldValues).filter(key =>
            key.startsWith(templateId + '_')
        );

        keysToDelete.forEach(key => {
            delete this.savedFieldValues[key];
        });

        console.log(`🧹 Cleared ${keysToDelete.length} cached values for template: ${templateId}`);
    },

    // REPARIERTE Enhanced render experiment form with validation
    render(metadata) {
        // SANFTE VALIDIERUNG: Nur bei wirklich problematischen Templates stoppen
        if (!this.preventAutoTemplateCreation()) {
            console.warn('⚠️ Render prevented: Invalid template or user context');

            const container = document.getElementById('experimentFields');
            if (container) {
                container.innerHTML = `
                    <div class="empty-state" style="text-align: center; padding: 40px; color: #6b7280;">
                        <div style="font-size: 24px; margin-bottom: 10px;">🧪</div>
                        <div>Select an experiment template to begin</div>
                        <div style="font-size: 14px; margin-top: 10px;">
                            Choose a template from the list to create experiment metadata forms
                        </div>
                    </div>
                `;
            }
            return;
        }

        // ORIGINALE RENDER LOGIK (ab hier ist alles original)
        const container = document.getElementById('experimentFields');
        container.innerHTML = '';

        // Load saved paths if available in template
        if (templateManager.currentTemplate && templateManager.currentTemplate.projectDefaults) {
            const defaults = templateManager.currentTemplate.projectDefaults;
            const targetPathEl = document.getElementById('targetPath');
            const projectNameEl = document.getElementById('projectName');

            if (targetPathEl && defaults.basePath) {
                targetPathEl.value = defaults.basePath;
            }
            if (projectNameEl && defaults.projectName) {
                projectNameEl.value = defaults.projectName;
            }

            // Update path preview
            if (window.projectManager && window.projectManager.updatePathPreview) {
                window.projectManager.updatePathPreview();
            }
        }

        // NEW: Enhanced metadata handling with field order support
        let fieldsToRender, fieldOrder;

        // Check if metadata has enhanced format (fields + fieldOrder)
        if (metadata.fields && metadata.fieldOrder) {
            // Enhanced format from new metadata editor
            fieldsToRender = metadata.fields;
            fieldOrder = metadata.fieldOrder;
            console.log('📋 Using enhanced metadata format with custom field order:', fieldOrder);
        } else if (metadata.fieldOrder && !metadata.fields) {
            // Transitional format - fieldOrder exists but fields are at root level
            fieldsToRender = { ...metadata };
            delete fieldsToRender.fieldOrder; // Remove fieldOrder from fields
            fieldOrder = metadata.fieldOrder;
            console.log('📋 Using transitional metadata format with field order:', fieldOrder);
        } else {
            // Legacy format - use alphabetical order but check for position hints
            fieldsToRender = metadata;

            // Try to detect elabFTW-style positions
            const fieldsWithPositions = Object.entries(metadata).filter(([key, field]) =>
                field.position !== undefined
            );

            if (fieldsWithPositions.length > 0) {
                // Sort by position
                fieldOrder = fieldsWithPositions
                    .sort((a, b) => (a[1].position || 999) - (b[1].position || 999))
                    .map(([key]) => key);

                // Add remaining fields without positions
                const fieldsWithoutPositions = Object.keys(metadata).filter(key =>
                    !fieldsWithPositions.find(([k]) => k === key)
                );
                fieldOrder = [...fieldOrder, ...fieldsWithoutPositions.sort()];

                console.log('📋 Using position-based field order:', fieldOrder);
            } else {
                // Fall back to alphabetical order
                fieldOrder = Object.keys(metadata).sort();
                console.log('📋 Using alphabetical field order (legacy fallback):', fieldOrder);
            }
        }

        // Create Table Structure
        const table = document.createElement('table');
        table.className = 'metadata-table';

        // Table Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th style="width: 30%;">Field Name</th>
                <th style="width: 15%;">Type</th>
                <th style="width: 40%;">Value</th>
                <th style="width: 15%; text-align: center;">Filename</th>
            </tr>
        `;
        table.appendChild(thead);
        container.appendChild(table);

        // Initial default tbody for fields before any group
        let currentGroupTbody = document.createElement('tbody');
        table.appendChild(currentGroupTbody);

        // Render fields in the specified order
        fieldOrder.forEach((fieldName, index) => {
            const fieldInfo = fieldsToRender[fieldName];
            if (!fieldInfo) {
                console.warn(`⚠️ Field "${fieldName}" in fieldOrder but not found in fields`);
                return;
            }

            // FIX: Hide 'Detailed Metadata' field from the main UI (moved to OMERO menu)
            if (fieldName === 'Detailed Metadata' || fieldInfo.label === 'Detailed Metadata' || 
                fieldName === 'Detailed metadata format' || fieldInfo.label === 'Detailed metadata format') {
                return;
            }

            if (fieldInfo.type === 'group') {
                // Render group header in a new tbody
                currentGroupTbody = document.createElement('tbody');
                currentGroupTbody.className = 'group-tbody expanded';
                table.appendChild(currentGroupTbody);
                this.renderGroupHeader(currentGroupTbody, fieldName, fieldInfo, index);
            } else {
                // Render normal field in the current tbody
                this.renderField(currentGroupTbody, fieldName, fieldInfo);
            }
        });

        console.log(`✅ Rendered ${fieldOrder.length} fields in specified order`);

        // NEW: Initialize filename state from template
        this.initializeFilenameStateFromTemplate();

        // NEW: Update filename preview after rendering
        setTimeout(() => {
            this.updateFilenamePreview();

            // NEW: Reset template switching flag AFTER everything is loaded
            this.filenameState.isSwitchingTemplate = false;
            console.log('✅ Template switch complete, auto-save re-enabled');

            // NEW: Restore integration states from template
            if (templateManager.currentTemplate && templateManager.currentTemplate.integrations) {
                const ints = templateManager.currentTemplate.integrations;

                const elabToggle = document.getElementById('sendToElabFTW');
                const omeroToggle = document.getElementById('sendToOMERO');
                const rspaceToggle = document.getElementById('sendToRSpace');
                const n8nToggle = document.getElementById('sendToN8n');

                if (elabToggle) {
                    let elabVal = ints.elabftwEnabled !== undefined ? ints.elabftwEnabled : ints.elabftw;
                    if (typeof elabVal === 'object' && elabVal !== null) elabVal = true;
                    if (elabVal !== undefined && elabToggle.checked !== elabVal) {
                        elabToggle.checked = elabVal;
                        elabToggle.dispatchEvent(new Event('change'));
                    }
                }

                if (omeroToggle) {
                    let omeroVal = ints.omeroEnabled !== undefined ? ints.omeroEnabled : ints.omero;
                    if (typeof omeroVal === 'object' && omeroVal !== null) omeroVal = true;
                    if (omeroVal !== undefined && omeroToggle.checked !== omeroVal) {
                        omeroToggle.checked = omeroVal;
                        omeroToggle.dispatchEvent(new Event('change'));
                    }
                }

                if (rspaceToggle) {
                    let rspaceVal = ints.rspaceEnabled !== undefined ? ints.rspaceEnabled : ints.rspace;
                    if (typeof rspaceVal === 'object' && rspaceVal !== null) rspaceVal = true;
                    if (rspaceVal !== undefined && rspaceToggle.checked !== rspaceVal) {
                        rspaceToggle.checked = rspaceVal;
                        rspaceToggle.dispatchEvent(new Event('change'));
                    }
                }

                if (n8nToggle) {
                    let n8nVal = ints.n8nEnabled !== undefined ? ints.n8nEnabled : ints.n8n;
                    if (typeof n8nVal === 'object' && n8nVal !== null) n8nVal = true;
                    if (n8nVal !== undefined && n8nToggle.checked !== n8nVal) {
                        n8nToggle.checked = n8nVal;
                        n8nToggle.dispatchEvent(new Event('change'));
                    }
                }

                console.log('🔄 Restored integration states:', ints);
            }
        }, 150);
    },

    // Render group header (Row spanning all columns)
    renderGroupHeader(tbody, fieldName, fieldInfo, index) {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.className = 'group-header-row';
        tr.innerHTML = `
            <td colspan="4" style="padding: 0;">
                <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); 
                            border-radius: 8px; padding: 10px 15px; margin: 15px 0 5px 0; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="color: #a855f7; margin: 0; font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                            <svg class="accordion-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s; transform: rotate(180deg);">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                            ${fieldInfo.label}
                        </h4>
                        ${fieldInfo.description ? `<p style="color: #9ca3af; font-size: 0.8rem; margin: 2px 0 0 24px;">${fieldInfo.description}</p>` : ''}
                    </div>
                </div>
            </td>
        `;
        
        tr.addEventListener('click', () => {
            const isExpanded = tbody.classList.contains('expanded');
            if (isExpanded) {
                tbody.classList.remove('expanded');
                tbody.classList.add('collapsed');
                tr.querySelector('.accordion-icon').style.transform = 'rotate(0deg)';
                // Hide all rows in this tbody except the header
                Array.from(tbody.children).forEach(child => {
                    if (child !== tr) child.style.display = 'none';
                });
            } else {
                tbody.classList.remove('collapsed');
                tbody.classList.add('expanded');
                tr.querySelector('.accordion-icon').style.transform = 'rotate(180deg)';
                // Show all rows
                Array.from(tbody.children).forEach(child => {
                    if (child !== tr) child.style.display = '';
                });
            }
        });
        
        tbody.appendChild(tr);
    },

    // Render single field as Table Row
    renderField(tbody, fieldName, fieldInfo) {
        const tr = document.createElement('tr');
        tr.className = 'draggable-field';
        tr.setAttribute('data-field-name', fieldName);
        tr.setAttribute('draggable', 'true');

        // Add drag event listeners
        this.addFieldDragEventListeners(tr, fieldName);

        // Check if field belongs to a group (nested)
        if (fieldName.includes('.')) {
            // Add visual indication for nested fields if needed
        }

        const isRequired = fieldInfo.required || false;
        const requiredMark = isRequired ? ' <span style="color: #ef4444;">*</span>' : '';
        const safeFieldId = 'field_' + this.createSafeId(fieldName);

        // FIX: Robust check for saved values to handle false/0/empty array properly
        let savedValue = this.getSavedFieldValue(fieldName);
        if (savedValue === undefined || savedValue === null) {
            if (fieldInfo.defaultValue !== undefined) {
                savedValue = fieldInfo.defaultValue;
            } else if (fieldInfo.value !== undefined) {
                savedValue = fieldInfo.value;
            } else {
                savedValue = '';
            }
        }

        // 1. Field Name Column
        const nameCell = document.createElement('td');
        nameCell.className = 'field-name-cell';
        nameCell.innerHTML = `
            <span class="field-name">${fieldInfo.label}${requiredMark}</span>
            ${fieldInfo.description ? `<span class="field-desc">${fieldInfo.description}</span>` : ''}
        `;
        tr.appendChild(nameCell);

        // 2. Type Column
        const typeCell = document.createElement('td');
        typeCell.innerHTML = `<span class="type-badge">${fieldInfo.type}</span>`;
        tr.appendChild(typeCell);

        // 3. Value Column
        const valueCell = document.createElement('td');
        valueCell.className = 'value-cell';

        let inputHtml = '';
        switch (fieldInfo.type) {
            case 'text':
            case 'id_anchor':
                inputHtml = `<input type="text" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''}>`;
                break;
            case 'number':
                const min = fieldInfo.min !== undefined ? `min="${fieldInfo.min}"` : '';
                const max = fieldInfo.max !== undefined ? `max="${fieldInfo.max}"` : '';
                const unitHtml = fieldInfo.unit ? `<span style="margin-left: 8px; color: #9ca3af; font-size: 0.9em; user-select: none;">${fieldInfo.unit}</span>` : '';
                if (fieldInfo.unit) {
                    inputHtml = `<div style="display: flex; align-items: center;"><input type="number" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${min} ${max} ${isRequired ? 'required' : ''} style="flex: 1;">${unitHtml}</div>`;
                } else {
                    inputHtml = `<input type="number" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${min} ${max} ${isRequired ? 'required' : ''}>`;
                }
                break;
            case 'date':
                inputHtml = `<input type="date" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''}>`;
                break;
            case 'time':
                inputHtml = `<input type="time" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''}>`;
                break;
            case 'url':
                inputHtml = `<input type="url" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''} placeholder="https://...">`;
                break;
            case 'email':
                inputHtml = `<input type="email" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''} placeholder="name@domain.com">`;
                break;
            case 'rating':
                const ratingVal = parseInt(savedValue) || 0;
                let starsHtml = '';
                for (let i = 1; i <= 5; i++) {
                    const isFilled = i <= ratingVal;
                    starsHtml += `<svg class="star-icon" data-value="${i}" width="24" height="24" viewBox="0 0 24 24" fill="${isFilled ? '#a855f7' : 'none'}" stroke="${isFilled ? '#a855f7' : '#9ca3af'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; transition: all 0.2s; margin-right: 2px;">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>`;
                }
                inputHtml = `<div class="rating-container" id="${safeFieldId}" data-field-name="${fieldName}" data-value="${ratingVal}" style="display: flex; align-items: center;">
                    ${starsHtml}
                </div>`;
                break;
            case 'textarea':
                inputHtml = `<textarea id="${safeFieldId}" data-field-name="${fieldName}" ${isRequired ? 'required' : ''} rows="1">${savedValue}</textarea>`;
                break;
            case 'dropdown':
                const options = fieldInfo.options || [];
                const optionsHtml = options.map(opt =>
                    `<option value="${opt}" ${opt === savedValue ? 'selected' : ''}>${opt}</option>`
                ).join('');
                inputHtml = `<select id="${safeFieldId}" data-field-name="${fieldName}" ${isRequired ? 'required' : ''}>
                    <option value="">-- Select --</option>
                    ${optionsHtml}
                </select>`;
                break;
            case 'checkbox':
                const checked = savedValue === true || savedValue === 'true' ? 'checked' : '';
                inputHtml = `<label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="${safeFieldId}" data-field-name="${fieldName}" ${checked} style="width: auto;">
                    <span style="font-size: 0.85rem; color: #e0e0e0;">Yes/No</span>
                </label>`;
                break;
            case 'multicheckbox':
                // savedValue may be an array from prior save or a stringified array
                let mcSavedArr = [];
                if (Array.isArray(savedValue)) {
                    mcSavedArr = savedValue;
                } else if (typeof savedValue === 'string') {
                    if (savedValue.startsWith('[')) {
                        try { mcSavedArr = JSON.parse(savedValue); } catch(e) { mcSavedArr = []; }
                    } else if (savedValue.trim() !== '') {
                        mcSavedArr = savedValue.split(',').map(s => s.trim());
                    }
                }
                const mcOptions = fieldInfo.options || [];
                const mcPills = mcOptions.map(opt => {
                    const isSelected = mcSavedArr.includes(opt);
                    return `<label class="multicheckbox-pill${isSelected ? ' selected' : ''}" title="${opt}">
                        <input type="checkbox"
                               class="mc-item"
                               data-field-name="${fieldName}"
                               data-option="${opt}"
                               ${isSelected ? 'checked' : ''}
                               onchange="experimentForm.handleMultiCheckboxChange('${fieldName}', this)">
                        <svg class="mc-icon" width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <rect x="0.5" y="0.5" width="12" height="12" rx="3" stroke="currentColor"/>
                            <path class="mc-check" d="M3 6.5L5.5 9L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        ${opt}
                    </label>`;
                }).join('');
                // Hidden input to store the aggregated array value for collectFormValues
                inputHtml = `<div class="multicheckbox-group" id="${safeFieldId}" data-field-name="${fieldName}">
                    ${mcPills}
                    ${mcOptions.length > 3 ? `<button type="button" class="mc-toggle-all" onclick="experimentForm.toggleAllMultiCheckbox('${safeFieldId}', '${fieldName}')" title="Toggle all">⊞</button>` : ''}
                </div>`;
                break;
            case 'derived_from':
            case 'tags': {
                // Resolve initial tags array from saved value
                let initialTags = [];
                if (Array.isArray(savedValue)) {
                    initialTags = savedValue;
                } else if (typeof savedValue === 'string' && savedValue.startsWith('[')) {
                    try { initialTags = JSON.parse(savedValue); } catch(e) { initialTags = []; }
                }
                const isDerivedFrom = fieldName === 'derived_from' || fieldInfo.type === 'derived_from';
                const datalistId = isDerivedFrom ? `datalist_${safeFieldId}` : '';
                const existingPills = initialTags.map(tag =>
                    `<span class="tag-pill-form" data-tag="${tag}"
                           style="display:inline-flex;align-items:center;gap:4px;
                                  background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.4);
                                  color:#2dd4bf;border-radius:20px;padding:2px 8px;font-size:12px;cursor:default;">
                        ${tag}
                        <span style="cursor:pointer;opacity:0.7;font-size:13px;line-height:1;"
                              onclick="experimentForm.removeTagFromField('${safeFieldId}','${fieldName}','${tag}')">×</span>
                    </span>`
                ).join('');
                inputHtml = `
                    <div class="tags-form-container" id="${safeFieldId}" data-field-name="${fieldName}" style="display:flex;flex-direction:column;gap:5px;">
                        <div class="tags-pills-row" style="display:flex;flex-wrap:wrap;gap:4px;min-height:26px;">${existingPills}</div>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <input type="text" class="tags-form-input"
                                   placeholder="${isDerivedFrom ? 'Enter or select an ID...' : 'Add tag + Enter'}"
                                   ${datalistId ? `list="${datalistId}"` : ''}
                                   style="flex:1;font-size:12px;"
                                   onkeydown="experimentForm.handleFormTagInput(event, '${safeFieldId}', '${fieldName}')"
                                   onfocus="${isDerivedFrom ? `experimentForm.loadIdAutocomplete('${datalistId}')` : ''}">
                            ${isDerivedFrom ? `<button type="button" title="Scan folder for IDs" onclick="experimentForm.scanFolderForIds('${safeFieldId}','${fieldName}')"
                                    style="background:rgba(13,148,136,0.2);border:1px solid rgba(13,148,136,0.4);color:#2dd4bf;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap;">
                                    📂 Scan Folder
                                </button>` : ''}
                        </div>
                        ${datalistId ? `<datalist id="${datalistId}"></datalist>` : ''}
                    </div>`;
                break;
            }
        }
        valueCell.innerHTML = inputHtml;
        tr.appendChild(valueCell);

        // 4. Filename Checkbox Column
        const filenameCell = document.createElement('td');
        filenameCell.className = 'filename-cell';

        const isCheckedAttr = fieldInfo.useForFilename ? 'checked' : '';
        filenameCell.innerHTML = `
            <input type="checkbox" 
                   class="filename-checkbox"
                   id="useForFilename_${safeFieldId}"
                   data-field-name="${fieldName}"
                   ${isCheckedAttr}
                   onchange="experimentForm.handleFilenameCheckboxChange('${fieldName}', this.checked)"
                   title="Use this field in the generated filename">
        `;
        tr.appendChild(filenameCell);

        tbody.appendChild(tr);

        // Event listener for saving values
        const input = valueCell.querySelector(`#${safeFieldId}`);
        if (input) {
            if (input.classList.contains('multicheckbox-group')) {
                // Multi-checkbox: listen on each pill checkbox
                input.querySelectorAll('.mc-item').forEach(cb => {
                    cb.addEventListener('change', () => {
                        const vals = this.getMultiCheckboxValues(fieldName);
                        this.saveFieldValue(fieldName, vals);
                        if (this.filenameState.selectedFields.includes(fieldName)) {
                            this.updateFilenamePreview();
                        }
                    });
                });
            } else if (input.classList.contains('tags-form-container')) {
                // Tags: no standard change event – values are managed by add/remove pill functions
                // Value is read directly at collect time via getTagValues()
                // Nothing extra needed here.
            } else if (input.classList.contains('rating-container')) {
                // Rating: listen on each star
                const stars = input.querySelectorAll('.star-icon');
                stars.forEach(star => {
                    star.addEventListener('click', () => {
                        const val = parseInt(star.getAttribute('data-value'));
                        input.setAttribute('data-value', val);
                        stars.forEach(s => {
                            const sVal = parseInt(s.getAttribute('data-value'));
                            const isFilled = sVal <= val;
                            s.setAttribute('fill', isFilled ? '#a855f7' : 'none');
                            s.setAttribute('stroke', isFilled ? '#a855f7' : '#9ca3af');
                        });
                        this.saveFieldValue(fieldName, val);
                        if (this.filenameState.selectedFields.includes(fieldName)) {
                            this.updateFilenamePreview();
                        }
                    });
                });
            } else {
                input.addEventListener('change', () => {
                    const realFieldName = input.getAttribute('data-field-name');
                    this.saveFieldValue(realFieldName, input.type === 'checkbox' ? input.checked : input.value);

                    if (this.filenameState.selectedFields.includes(realFieldName)) {
                        this.updateFilenamePreview();
                    }
                });
            }
        }
    },

    addFieldDragEventListeners(fieldDiv, fieldName) {
        // Drag start
        fieldDiv.addEventListener('dragstart', (e) => {
            this.dragState.isDragging = true;
            this.dragState.draggedElement = fieldDiv;
            this.dragState.draggedFieldName = fieldName;

            fieldDiv.classList.add('dragging-experiment-field');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', fieldDiv.outerHTML);

            // Store current form values to preserve them
            this.preserveFormValues();

            // Show drop indicator
            if (this.dragState.dropIndicator) {
                this.dragState.dropIndicator.style.display = 'block';
            }

            console.log('🎯 Experiment field drag started:', fieldName);
        });

        // Drag end
        fieldDiv.addEventListener('dragend', (e) => {
            this.dragState.isDragging = false;
            fieldDiv.classList.remove('dragging-experiment-field');

            // Hide drop indicator
            if (this.dragState.dropIndicator) {
                this.dragState.dropIndicator.style.display = 'none';
            }

            // Clean up visual indicators
            document.querySelectorAll('.draggable-field').forEach(field => {
                field.classList.remove('drag-over-experiment');
            });

            console.log('🎯 Experiment field drag ended');
        });

        // Drag over
        fieldDiv.addEventListener('dragover', (e) => {
            if (!this.dragState.isDragging) return;

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';

            if (this.getExperimentDragAfterElement) {
                const afterElement = this.getExperimentDragAfterElement(fieldDiv, e.clientY);
                const container = document.getElementById('experimentFields');

                if (container && this.dragState.dropIndicator) {
                    if (afterElement == null) {
                        container.appendChild(this.dragState.dropIndicator);
                    } else {
                        container.insertBefore(this.dragState.dropIndicator, afterElement);
                    }
                }
            }
        });

        // Drop
        fieldDiv.addEventListener('drop', (e) => {
            if (!this.dragState.isDragging) return;

            e.preventDefault();
            const targetFieldName = fieldDiv.getAttribute('data-field-name');

            if (targetFieldName !== this.dragState.draggedFieldName) {
                if (this.reorderExperimentFields) {
                    this.reorderExperimentFields(this.dragState.draggedFieldName, targetFieldName);
                }
                console.log(`🎯 Experiment field moved: ${this.dragState.draggedFieldName} → ${targetFieldName}`);
            }
        });

        // Visual feedback
        fieldDiv.addEventListener('dragenter', (e) => {
            if (!this.dragState.isDragging) return;
            fieldDiv.classList.add('drag-over-experiment');
        });

        fieldDiv.addEventListener('dragleave', (e) => {
            if (!this.dragState.isDragging) return;
            fieldDiv.classList.remove('drag-over-experiment');
        });
    },

    // NEW: Get element after drag position for experiment fields
    getExperimentDragAfterElement(container, y) {
        const draggableElements = [...container.parentNode.querySelectorAll('.draggable-field:not(.dragging-experiment-field)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    // NEW: Preserve form values during drag operations
    preserveFormValues() {
        const container = document.getElementById('experimentFields');
        if (!container) return;

        const fields = container.querySelectorAll('.draggable-field');
        fields.forEach(fieldDiv => {
            const fieldName = fieldDiv.getAttribute('data-field-name');
            const input = fieldDiv.querySelector('input, select, textarea');

            if (input && fieldName) {
                let value = input.value;
                if (input.type === 'checkbox') {
                    value = input.checked;
                }
                this.saveFieldValue(fieldName, value);
            }
        });

        console.log('💾 Form values preserved during drag');
    },

    // NEW: Reorder experiment fields and update display
    reorderExperimentFields(draggedFieldName, targetFieldName) {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            console.warn('⚠️ No template or metadata available for reordering');
            return;
        }

        const metadata = templateManager.currentTemplate.metadata;
        let fieldsSource, fieldOrder;

        // Determine source of fields and field order
        if (metadata.fields && metadata.fieldOrder) {
            fieldsSource = metadata.fields;
            fieldOrder = [...metadata.fieldOrder]; // Copy array
        } else {
            fieldsSource = metadata;
            fieldOrder = Object.keys(fieldsSource);
        }

        // Find indices
        const draggedIndex = fieldOrder.indexOf(draggedFieldName);
        const targetIndex = fieldOrder.indexOf(targetFieldName);

        if (draggedIndex === -1 || targetIndex === -1) {
            console.warn('⚠️ Field not found in order array:', { draggedFieldName, targetFieldName });
            return;
        }

        // Reorder array
        const [draggedField] = fieldOrder.splice(draggedIndex, 1);
        fieldOrder.splice(targetIndex, 0, draggedField);

        // Update positions
        fieldOrder.forEach((fieldName, index) => {
            const field = fieldsSource[fieldName];
            if (field) {
                field.position = index + 1;
            }
        });

        // Store the new order temporarily (for Save Field Order button)
        this.tempFieldOrder = fieldOrder;

        // Re-render with new order
        const tempMetadata = metadata.fields ?
            { fields: fieldsSource, fieldOrder: fieldOrder } :
            fieldsSource;

        this.render(tempMetadata);

        // Show save button
        this.showSaveFieldOrderButton();

        console.log('✅ Experiment fields reordered:', fieldOrder);
    },

    // NEW: Show save field order button
    showSaveFieldOrderButton() {
        // Find or create the save field order button
        let saveButton = document.getElementById('saveFieldOrderBtn');

        if (!saveButton) {
            // Create button next to existing save template button
            const saveTemplateBtn = document.querySelector('button[onclick*="saveExperimentTemplate"]');
            if (saveTemplateBtn) {
                saveButton = document.createElement('button');
                saveButton.id = 'saveFieldOrderBtn';
                saveButton.className = 'btn btn-secondary btn-small';
                saveButton.style.cssText = 'margin-left: 8px; background: #10b981; color: white;';
                saveButton.innerHTML = '📋 Save Field Order';
                saveButton.onclick = () => this.saveFieldOrderToTemplate();

                saveTemplateBtn.parentNode.insertBefore(saveButton, saveTemplateBtn.nextSibling);
            }
        }

        if (saveButton) {
            saveButton.style.display = 'inline-block';
            saveButton.style.animation = 'pulse 2s infinite';

            // Add pulse animation if not exists
            if (!document.getElementById('pulseAnimation')) {
                const style = document.createElement('style');
                style.id = 'pulseAnimation';
                style.textContent = `
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.02); }
    100% { transform: scale(1); }
}
`;
                document.head.appendChild(style);
            }
        }
    },

    // NEW: Save field order back to template
    async saveFieldOrderToTemplate() {
        if (!this.tempFieldOrder || !templateManager.currentTemplate) {
            alert('No field order changes to save.');
            return;
        }

        if (!templateManager.currentTemplate.isOwn) {
            alert('You can only modify your own templates. Please copy this template first.');
            return;
        }

        try {
            console.log('💾 Saving field order to template...');

            // Find template index
            const templateIndex = templateManager.templates.findIndex(t =>
                t.name === templateManager.currentTemplate.name &&
                t.createdBy === templateManager.currentTemplate.createdBy &&
                t.createdAt === templateManager.currentTemplate.createdAt
            );

            if (templateIndex < 0) {
                throw new Error('Template not found in own templates');
            }

            // Update template with new field order
            const updatedTemplate = { ...templateManager.templates[templateIndex] };

            if (updatedTemplate.metadata.fields && updatedTemplate.metadata.fieldOrder) {
                // Enhanced format
                updatedTemplate.metadata.fieldOrder = [...this.tempFieldOrder];

                // Update positions
                this.tempFieldOrder.forEach((fieldName, index) => {
                    if (updatedTemplate.metadata.fields[fieldName]) {
                        updatedTemplate.metadata.fields[fieldName].position = index + 1;
                    }
                });
            } else {
                // Legacy format - convert to enhanced
                const fields = { ...updatedTemplate.metadata };
                this.tempFieldOrder.forEach((fieldName, index) => {
                    if (fields[fieldName]) {
                        fields[fieldName].position = index + 1;
                    }
                });

                updatedTemplate.metadata = {
                    fields: fields,
                    fieldOrder: [...this.tempFieldOrder]
                };
            }

            updatedTemplate.updatedAt = new Date().toISOString();

            // Save to template manager
            templateManager.update(templateIndex, updatedTemplate);
            templateManager.currentTemplate = updatedTemplate;
            // Clear temp order
            this.tempFieldOrder = null;

            // Hide save button
            const saveButton = document.getElementById('saveFieldOrderBtn');
            if (saveButton) {
                saveButton.style.display = 'none';
                saveButton.style.animation = 'none';
            }

            // Show success message
            this.showSaveMessage('✅ Field order saved to template permanently!');
            console.log('✅ Field order saved to template successfully');

        } catch (error) {
            console.error('❌ Error saving field order:', error);
            alert('Error saving field order: ' + error.message);
        }
    },

    // Helper: Create safe ID from field name
    createSafeId(str) {
        return str.replace(/[^a-zA-Z0-9-_]/g, '_');
    },

    // Validate form
    validate() {
        const requiredFields = document.querySelectorAll('[required]');
        let isValid = true;
        let message = '';

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.classList.add('error');
                if (!message) {
                    const fieldName = field.getAttribute('data-field-name');
                    const label = field.closest('tr')?.querySelector('.field-name')?.textContent?.replace('*', '').trim();
                    message = `Field "${label || fieldName || 'Unknown'}" is required.`;
                }
            } else {
                field.classList.remove('error');
            }
        });

        const emailFields = document.querySelectorAll('input[type="email"]');
        emailFields.forEach(field => {
            if (field.value.trim()) {
                const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!re.test(field.value.trim())) {
                    isValid = false;
                    field.classList.add('error');
                    if (!message) {
                        const fieldName = field.getAttribute('data-field-name');
                        const label = field.closest('tr')?.querySelector('.field-name')?.textContent?.replace('*', '').trim();
                        message = `Field "${label || fieldName || 'Unknown'}" contains an invalid E-Mail address.`;
                    }
                } else if (field.classList.contains('error') && requiredFields.includes && !requiredFields.includes(field)) {
                    field.classList.remove('error');
                }
            }
        });

        return { valid: isValid, message: message };
    },

    // Save template
    async saveTemplate() {
        if (!templateManager.currentTemplate) return;

        const validation = this.validate();
        if (!validation.valid) {
            alert(validation.message || 'Please fill in all required fields.');
            return;
        }

        try {
            // Collect values
            const formData = this.collectFormValues();

            // Update template object
            const updatedTemplate = { ...templateManager.currentTemplate };

            // Update default values in metadata
            if (updatedTemplate.metadata && updatedTemplate.metadata.fields) {
                Object.keys(formData).forEach(key => {
                    if (updatedTemplate.metadata.fields[key]) {
                        updatedTemplate.metadata.fields[key].defaultValue = formData[key];
                    }
                });
            } else if (updatedTemplate.metadata) {
                Object.keys(formData).forEach(key => {
                    if (updatedTemplate.metadata[key]) {
                        updatedTemplate.metadata[key].defaultValue = formData[key];
                    }
                });
            }

            // Save integration states
            if (!updatedTemplate.integrations) updatedTemplate.integrations = {};

            const elabToggle = document.getElementById('sendToElabFTW');
            const omeroToggle = document.getElementById('sendToOMERO');
            const rspaceToggle = document.getElementById('sendToRSpace');
            const n8nToggle = document.getElementById('sendToN8n');

            if (elabToggle) updatedTemplate.integrations.elabftwEnabled = elabToggle.checked;
            if (omeroToggle) updatedTemplate.integrations.omeroEnabled = omeroToggle.checked;
            if (rspaceToggle) updatedTemplate.integrations.rspaceEnabled = rspaceToggle.checked;
            if (n8nToggle) updatedTemplate.integrations.n8nEnabled = n8nToggle.checked;

            // NEW: Save project defaults (Project Name and Target Path)
            if (!updatedTemplate.projectDefaults) updatedTemplate.projectDefaults = {};

            const projectNameEl = document.getElementById('projectName');
            const targetPathEl = document.getElementById('targetPath');

            if (projectNameEl) {
                updatedTemplate.projectDefaults.projectName = projectNameEl.value;
                console.log('💾 Saving project name to template:', projectNameEl.value);
            }
            if (targetPathEl) {
                updatedTemplate.projectDefaults.basePath = targetPathEl.value;
                console.log('💾 Saving base path to template:', targetPathEl.value);
            }

            // Find index
            const index = templateManager.templates.findIndex(t => t.id === updatedTemplate.id);

            if (index >= 0) {
                await templateManager.update(index, updatedTemplate);
                this.showSaveMessage('✅ Template saved successfully!');

                // Trigger sidebar update
                if (window.sidebarIntegration && window.sidebarIntegration.updateSidebarVisibilityFromSettings) {
                    window.sidebarIntegration.updateSidebarVisibilityFromSettings();
                }
            }

        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template: ' + error.message);
        }
    },

    // Clear template form (wrapper)
    clearTemplate() {
        if (!templateManager.currentTemplate) {
            alert('No template selected to clear.');
            return;
        }

        if (!templateManager.currentTemplate.isOwn) {
            alert('You can only clear your own templates. Please copy this template first.');
            return;
        }

        try {
            // Clear all form inputs
            this.clearAllFormInputs();

            // Clear saved field values
            this.clearSavedFieldValuesForCurrentTemplate();

            // Clear project paths
            const targetPathEl = document.getElementById('targetPath');
            const projectNameEl = document.getElementById('projectName');
            if (targetPathEl) targetPathEl.value = '';
            if (projectNameEl) projectNameEl.value = '';

            // Update path preview
            if (window.projectManager && window.projectManager.updatePathPreview) {
                window.projectManager.updatePathPreview();
            }

            this.showSaveMessage('🧹 Template form cleared successfully!');
            console.log('✅ Template form cleared');

        } catch (error) {
            console.error('❌ Error clearing template form:', error);
            alert('Error clearing template form: ' + error.message);
        }
    },

    // Clear all form inputs
    clearAllFormInputs() {
        const container = document.getElementById('experimentFields');
        if (!container) return;

        const inputs = container.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }

            // Trigger change event to update any listeners
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        console.log(`🧹 Cleared ${inputs.length} form inputs`);
    },

    // Clear template values permanently (save cleared state)
    clearTemplateValues() {
        console.log('🧹 Starting permanent template values clear...');

        if (!templateManager.currentTemplate) {
            alert('No template selected to clear.');
            return;
        }

        if (!templateManager.currentTemplate.isOwn) {
            alert('You can only clear your own templates. Please copy this template first.');
            return;
        }

        try {
            // Use the templateManager's clear function
            templateManager.clearCurrentTemplate();

            this.showSaveMessage('🧹 Template values cleared permanently and saved!');
            console.log('✅ Template values cleared permanently');

        } catch (error) {
            console.error('❌ Error clearing template values:', error);
            alert('Error clearing template values: ' + error.message);
        }
    },

    // Show template actions menu
    showTemplateActionsMenu() {
        const menu = document.createElement('div');
        menu.className = 'template-actions-menu';
        menu.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 300px;
            padding: 20px;
        `;

        const templateName = templateManager.currentTemplate?.name || 'Unknown';

        menu.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="margin: 0 0 5px 0; color: #374151;">Template Actions</h3>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Template: ${templateName}</p>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button onclick="window.experimentForm.clearTemplate(); document.body.removeChild(this.closest('.template-actions-menu'))" 
                    style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f9fafb; cursor: pointer;">
                    🧹 Clear Form Values
                    <div style="font-size: 12px; color: #6b7280; margin-top: 4px;">Clear current form inputs (temporary)</div>
                </button>
                
                <button onclick="window.experimentForm.clearTemplateValuesNoConfirm(); try { document.body.removeChild(this.closest('.template-actions-menu')); } catch(e) {}" 
                    style="padding: 10px; border: 1px solid #fca5a5; border-radius: 6px; background: #fef2f2; cursor: pointer; color: #dc2626;">
                    🗑️ Clear Template Values
                    <div style="font-size: 12px; color: #ef4444; margin-top: 4px;">Permanently clear all saved values from template</div>
                </button>
                
                <button onclick="document.body.removeChild(this.closest('.template-actions-menu'))" 
                    style="padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; background: #f3f4f6; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;

        // Add backdrop
        const backdrop = document.createElement('div');
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        `;
        backdrop.onclick = () => {
            try {
                if (backdrop.parentNode) {
                    document.body.removeChild(backdrop);
                }
                if (menu.parentNode) {
                    document.body.removeChild(menu);
                }
            } catch (error) {
                console.warn('Menu cleanup error (harmless):', error);
            }
        };

        document.body.appendChild(backdrop);
        document.body.appendChild(menu);
    },

    // Enhanced collect current form values with field order awareness
    collectFormValues() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return null;
        }

        const metadata = templateManager.currentTemplate.metadata;
        const formValues = {};

        // Determine which fields object to use
        const fieldsToCollect = metadata.fields || metadata;

        Object.entries(fieldsToCollect).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.type === 'group') return; // Skip groups

            // FIX: Hide 'Detailed Metadata' field as requested by the user, because it's now in the OMERO sidebar menu
            if (fieldName === 'Detailed Metadata' || fieldInfo.label === 'Detailed Metadata' || 
                fieldName === 'Detailed metadata format' || fieldInfo.label === 'Detailed metadata format') {
                return;
            }

            const safeFieldId = 'field_' + this.createSafeId(fieldName);

            // Multi-Checkbox: collect from grouped checkboxes
            if (fieldInfo.type === 'multicheckbox') {
                formValues[fieldName] = this.getMultiCheckboxValues(fieldName);
                return;
            } else if (fieldInfo.type === 'tags' || fieldInfo.type === 'derived_from') {
                formValues[fieldName] = this.getTagValues(safeFieldId);
                return;
            }

            const input = document.getElementById(safeFieldId);
            if (!input) return;

            let value = input.value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = parseFloat(value) || 0;
            } else if (input.tagName === 'SELECT') {
                value = input.value || '';
            }

            formValues[fieldName] = value;
        });

        return formValues;
    },

    // Collect selected values from a multi-checkbox group
    getMultiCheckboxValues(fieldName) {
        const safeFieldId = 'field_' + this.createSafeId(fieldName);
        const group = document.getElementById(safeFieldId);
        if (!group) return [];
        const checked = group.querySelectorAll('.mc-item:checked');
        return Array.from(checked).map(cb => cb.getAttribute('data-option'));
    },

    // Handle individual pill toggle (update visual state)
    handleMultiCheckboxChange(fieldName, checkbox) {
        const pill = checkbox.closest('.multicheckbox-pill');
        if (pill) {
            pill.classList.toggle('selected', checkbox.checked);
        }
        const vals = this.getMultiCheckboxValues(fieldName);
        this.saveFieldValue(fieldName, vals);
        if (this.filenameState.selectedFields.includes(fieldName)) {
            this.updateFilenamePreview();
        }
    },

    // Toggle all checkboxes in a multi-checkbox group
    toggleAllMultiCheckbox(groupId, fieldName) {
        const group = document.getElementById(groupId);
        if (!group) return;
        const items = group.querySelectorAll('.mc-item');
        const anyUnchecked = Array.from(items).some(cb => !cb.checked);
        items.forEach(cb => {
            cb.checked = anyUnchecked;
            const pill = cb.closest('.multicheckbox-pill');
            if (pill) pill.classList.toggle('selected', anyUnchecked);
        });
        const vals = this.getMultiCheckboxValues(fieldName);
        this.saveFieldValue(fieldName, vals);
        if (this.filenameState.selectedFields.includes(fieldName)) {
            this.updateFilenamePreview();
        }
    },

    // Show save message
    showSaveMessage(message) {
        // Create or get save message element
        let saveMessage = document.getElementById('saveMessage');
        if (!saveMessage) {
            saveMessage = document.createElement('div');
            saveMessage.id = 'saveMessage';
            saveMessage.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-weight: 500;
                animation: slideIn 0.3s ease-out;
            `;
            document.body.appendChild(saveMessage);

            // Add CSS animation if not exists
            if (!document.getElementById('saveMessageCSS')) {
                const style = document.createElement('style');
                style.id = 'saveMessageCSS';
                style.textContent = `
                    @keyframes slideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes slideOut {
                        from { transform: translateX(0); opacity: 1; }
                        to { transform: translateX(100%); opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
        }

        saveMessage.textContent = message;
        saveMessage.style.display = 'block';

        // Hide after 3 seconds with animation
        setTimeout(() => {
            saveMessage.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                saveMessage.style.display = 'none';
            }, 300);
        }, 3000);
    },

    // Enhanced collect experiment data with field order preservation
    collectData() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return null;
        }

        const templateMetadata = templateManager.currentTemplate.metadata;
        const metadata = {};

        // Determine source of fields and field order
        let fieldsSource, fieldOrder;
        if (templateMetadata.fields && templateMetadata.fieldOrder) {
            // Enhanced format
            fieldsSource = templateMetadata.fields;
            fieldOrder = templateMetadata.fieldOrder;
        } else {
            // Legacy format
            fieldsSource = templateMetadata;
            // Try to preserve any existing order or fall back to alphabetical
            fieldOrder = Object.keys(fieldsSource).sort();
        }

        let currentGroupObj = null;

        // Collect data in the specified field order
        fieldOrder.forEach(fieldName => {
            const fieldInfo = fieldsSource[fieldName];
            
            if (fieldInfo && fieldInfo.type === 'group') {
                currentGroupObj = {};
                metadata[fieldInfo.label || fieldName] = currentGroupObj;
                return;
            }
            
            if (!fieldInfo) return; // Skip invalid

            let value;

            // Handle multi-checkbox specifically
            if (fieldInfo.type === 'multicheckbox') {
                value = this.getMultiCheckboxValues(fieldName);
            } else if (fieldInfo.type === 'tags' || fieldInfo.type === 'derived_from') {
                // Tags: read pills array from the DOM container
                const safeFieldId = 'field_' + this.createSafeId(fieldName);
                value = this.getTagValues(safeFieldId);
                
                // UX FIX: Capture pending text that the user typed but forgot to press 'Enter' for
                const container = document.getElementById(safeFieldId);
                if (container) {
                    const inputEl = container.querySelector('.tag-input-form');
                    if (inputEl && inputEl.value && inputEl.value.trim() !== '') {
                        const pendingValue = inputEl.value.trim();
                        if (!value.includes(pendingValue)) {
                            value.push(pendingValue);
                        }
                    }
                }
            } else {
                const safeFieldId = 'field_' + this.createSafeId(fieldName);
                const input = document.getElementById(safeFieldId);
                if (!input) return;

                if (input.classList.contains('rating-container')) {
                    value = parseInt(input.getAttribute('data-value')) || 0;
                } else {
                    value = input.value;
                    if (input.type === 'checkbox') {
                        value = input.checked;
                    } else if (input.type === 'number') {
                        value = parseFloat(value) || 0;
                    } else if (input.tagName === 'SELECT') {
                        value = input.value || '';
                    }
                }
            }

            const fieldData = {
                label: fieldInfo.label,
                type: fieldInfo.type,
                value: value,
                required: fieldInfo.required || false,
                position: fieldInfo.position || (fieldOrder.indexOf(fieldName) + 1)
            };

            // Carry over additional properties
            if (fieldInfo.options) fieldData.options = fieldInfo.options;
            if (fieldInfo.unit !== undefined) fieldData.unit = fieldInfo.unit;

            if (currentGroupObj) {
                currentGroupObj[fieldName] = fieldData;
            } else {
                metadata[fieldName] = fieldData;
            }
        });

        return metadata;
    },

    // Debug field order
    debugFieldOrder() {
        if (!templateManager.currentTemplate) return;
        const metadata = templateManager.currentTemplate.metadata;
        console.log('Template Metadata:', metadata);

        if (metadata.fieldOrder) {
            console.log('Field Order:', metadata.fieldOrder);
        }

        // Show current DOM order
        const domFields = Array.from(document.querySelectorAll('.form-group[data-field-name]'))
            .map(el => el.getAttribute('data-field-name'));
        console.log('Current DOM order:', domFields);
    },


    // NEW: Clear template values without additional confirmation (already confirmed in menu)
    clearTemplateValuesNoConfirm() {
        console.log('🧹 Starting permanent template values clear (no additional confirm)...');

        if (!templateManager.currentTemplate) {
            alert('No template selected to clear.');
            return;
        }

        if (!templateManager.currentTemplate.isOwn) {
            alert('You can only clear your own templates. Please copy this template first.');
            return;
        }

        try {
            // Use the templateManager's clear function
            templateManager.clearCurrentTemplate();

            this.showSaveMessage('🧹 Template values cleared permanently and saved!');
            console.log('✅ Template values cleared permanently');

        } catch (error) {
            console.error('❌ Error clearing template values:', error);
            alert('Error clearing template values: ' + error.message);
        }
    },

    // ENHANCED: Save as template with proper user validation
    async saveAsTemplateEnhanced() {
        console.log('💾 Starting enhanced save as template...');

        // Validate user context first
        const currentUser = window.userManager?.currentUser;
        const currentGroup = window.userManager?.currentGroup;

        if (!currentUser || currentUser === 'Unknown' || !currentGroup || currentGroup === 'Unknown') {
            alert('❌ Cannot create template: User not properly logged in.\n\nPlease:\n1. Go to Settings → User Management\n2. Select or create a user\n3. Try creating the template again');
            return;
        }

        // Get template name
        const templateName = prompt('Enter template name:');
        if (!templateName || templateName.trim() === '') {
            return;
        }

        // Get template description (optional)
        const templateDescription = prompt('Enter template description (optional):') || '';

        try {
            // Collect form data
            const formData = this.collectFormValues();

            if (!formData || Object.keys(formData).length === 0) {
                alert('No form data available to create template.');
                return;
            }

            // Get current metadata schema from templateManager
            let metadataSchema = {};
            if (window.templateManager?.currentTemplate?.metadata) {
                metadataSchema = JSON.parse(JSON.stringify(window.templateManager.currentTemplate.metadata));

                // Add current form values as default values
                Object.keys(formData).forEach(fieldName => {
                    if (metadataSchema[fieldName]) {
                        metadataSchema[fieldName].defaultValue = formData[fieldName];
                    } else if (metadataSchema.fields && metadataSchema.fields[fieldName]) {
                        metadataSchema.fields[fieldName].defaultValue = formData[fieldName];
                    }
                });
            } else {
                // Create metadata schema from form data
                Object.keys(formData).forEach(fieldName => {
                    const value = formData[fieldName];
                    const fieldType = typeof value === 'boolean' ? 'checkbox' :
                        typeof value === 'number' ? 'number' : 'text';

                    metadataSchema[fieldName] = {
                        type: fieldType,
                        label: fieldName,
                        required: false,
                        defaultValue: value
                    };
                });
            }

            const fetchNextIdInput = document.getElementById('elabftwFetchNextId');
            const targetPathInput = document.getElementById('targetPath');
            const projectNameInput = document.getElementById('projectName');
            const categoryIdInput = document.getElementById('elabftwProjectCategory');

            const projectDefaults = {};
            if (targetPathInput && targetPathInput.value) projectDefaults.targetPath = targetPathInput.value;
            if (projectNameInput && projectNameInput.value) projectDefaults.projectName = projectNameInput.value;

            const elabftwIntegration = {};
            if (fetchNextIdInput) elabftwIntegration.fetchNextId = fetchNextIdInput.checked;
            if (categoryIdInput && categoryIdInput.value) elabftwIntegration.defaultCategory = parseInt(categoryIdInput.value);

            // Collect integration toggles
            const integrations = {
                elabftw: elabftwIntegration
            };
            const elabToggle = document.getElementById('sendToElabFTW');
            const omeroToggle = document.getElementById('sendToOMERO');
            const rspaceToggle = document.getElementById('sendToRSpace');
            const n8nToggle = document.getElementById('sendToN8n');

            if (elabToggle) integrations.elabftwEnabled = elabToggle.checked;
            if (omeroToggle) integrations.omeroEnabled = omeroToggle.checked;
            if (rspaceToggle) integrations.rspaceEnabled = rspaceToggle.checked;
            if (n8nToggle) integrations.n8nEnabled = n8nToggle.checked;

            // Create new template object with proper user info
            const newTemplate = {
                id: this.generateTemplateId(templateName),
                name: templateName.trim(),
                description: templateDescription.trim(),
                type: 'experiment',
                metadata: metadataSchema,
                createdBy: currentUser,
                createdByGroup: currentGroup,
                createdAt: new Date().toISOString(),
                savedFormData: formData,
                projectDefaults: projectDefaults,
                integrations: integrations
            };

            console.log('📝 Creating template:', {
                name: newTemplate.name,
                user: newTemplate.createdBy,
                group: newTemplate.createdByGroup,
                fieldsCount: Object.keys(metadataSchema).length
            });

            // Add to templateManager
            if (!window.templateManager) {
                alert('Template manager not available');
                return;
            }

            window.templateManager.templates.push(newTemplate);

            // Save templates using storage
            if (window.storage) {
                const saved = await window.storage.saveTemplates(window.templateManager.templates);
                if (!saved) {
                    alert('Failed to save template to storage');
                    return;
                }
            } else {
                alert('Storage not available');
                return;
            }

            // Update UI
            window.templateManager.invalidateCache();
            window.templateManager.buildSearchIndex();
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();

            // Show success message
            this.showSaveMessage(`✅ Template "${templateName}" created successfully!`);

            console.log('✅ Template created and saved successfully');

        } catch (error) {
            console.error('❌ Error creating template:', error);
            alert('Error creating template: ' + error.message);
        }
    },

    // ========== FILENAME SUGGESTION SYSTEM ==========

    /**
     * Handle checkbox change for "Use for filename"
     */
    handleFilenameCheckboxChange(fieldName, isChecked) {
        console.log(`📝 Filename checkbox changed: ${fieldName} = ${isChecked}`);

        if (isChecked) {
            // Add to selectedFields if not already there
            if (!this.filenameState.selectedFields.includes(fieldName)) {
                this.filenameState.selectedFields.push(fieldName);
            }
        } else {
            // Remove from selectedFields
            this.filenameState.selectedFields = this.filenameState.selectedFields.filter(f => f !== fieldName);
        }

        // Update the preview
        this.updateFilenamePreview();

        // NEW: Only save if NOT switching templates
        if (!this.filenameState.isSwitchingTemplate) {
            // Save checkbox state to current template
            this.saveFilenameCheckboxToTemplate(fieldName, isChecked);
        } else {
            console.log(`⏸️ Skipped auto-save during template switch: ${fieldName}`);
        }
    },

    /**
     * Save filename checkbox state to template
     */
    async saveFilenameCheckboxToTemplate(fieldName, isChecked) {
        if (!window.templateManager?.currentTemplate) return;

        const template = window.templateManager.currentTemplate;
        const metadata = template.metadata;

        // Find the field and update useForFilename
        if (metadata[fieldName]) {
            metadata[fieldName].useForFilename = isChecked;
        } else if (metadata.fields && metadata.fields[fieldName]) {
            metadata.fields[fieldName].useForFilename = isChecked;
        }

        // Save template (silent save)
        const templateIndex = window.templateManager.templates.findIndex(t =>
            t.name === template.name &&
            t.createdBy === template.createdBy
        );

        if (templateIndex >= 0) {
            await window.templateManager.update(templateIndex, template);
            console.log(`💾 Saved useForFilename for ${fieldName}: ${isChecked}`);
        }
    },

    /**
     * Update filename preview based on selected fields
     */
    updateFilenamePreview() {
        const prefixInput = document.getElementById('filenamePrefix');
        const previewDiv = document.getElementById('filenamePreview');
        const warningDiv = document.getElementById('filenameLengthWarning');

        if (!previewDiv) return;

        // Get manual prefix
        const prefix = prefixInput?.value?.trim() || '';
        this.filenameState.prefix = prefix;

        // Collect values from selected fields (in order)
        const parts = [];

        if (prefix) {
            parts.push(prefix);
        }

        this.filenameState.selectedFields.forEach(fieldName => {
            const safeFieldId = 'field_' + this.createSafeId(fieldName);
            const group = document.getElementById(safeFieldId);

            if (group && group.classList.contains('multicheckbox-group')) {
                // Multi-checkbox: join selected options with '+'
                const selected = this.getMultiCheckboxValues(fieldName);
                if (selected.length > 0) {
                    const value = selected
                        .map(v => String(v).replace(/[^a-zA-Z0-9-_]/g, '_'))
                        .join('+');
                    parts.push(value);
                }
            } else if (group && group.value) {
                let value = group.type === 'checkbox' ? (group.checked ? 'Yes' : 'No') : group.value;
                if (value) {
                    // Sanitize value for filename
                    value = String(value).replace(/[^a-zA-Z0-9-_]/g, '_');
                    parts.push(value);
                }
            }
        });


        // Join with underscores
        const filename = parts.join('_');
        previewDiv.textContent = filename || '(No fields selected)';

        // Check length
        if (filename.length > 50) {
            if (warningDiv) warningDiv.style.display = 'block';
            previewDiv.style.color = '#ef4444';
        } else {
            if (warningDiv) warningDiv.style.display = 'none';
            previewDiv.style.color = '#4b5563';
        }
    },

    /**
     * Initialize filename state from template metadata
     */
    initializeFilenameStateFromTemplate() {
        if (!window.templateManager?.currentTemplate) return;

        console.log('🔄 Initializing filename state from template...');
        this.filenameState.selectedFields = [];

        const metadata = window.templateManager.currentTemplate.metadata;
        const fields = metadata.fields || metadata;

        Object.entries(fields).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.useForFilename) {
                this.filenameState.selectedFields.push(fieldName);
            }
        });

        console.log('📋 Initialized filename fields:', this.filenameState.selectedFields);
    },

    // Helper: Generate ID
    generateTemplateId(name) {
        return name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now();
    },

    // Helper: Deep copy
    createDeepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    // =================== TAGS FIELD HELPERS ===================

    /**
     * Handle keydown in the tags form input field.
     * Enter or comma confirms the current tag and adds a pill.
     */
    handleFormTagInput(event, containerId, fieldName) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const inputEl = event.target;
            const value = inputEl.value.trim().replace(/,$/, '');
            if (!value) return;

            const container = document.getElementById(containerId);
            if (!container) return;

            // Check for duplicate
            const existing = this.getTagValues(containerId);
            if (existing.includes(value)) {
                inputEl.value = '';
                return;
            }

            // Create pill
            const pillsRow = container.querySelector('.tags-pills-row');
            if (pillsRow) {
                const pill = document.createElement('span');
                pill.className = 'tag-pill-form';
                pill.setAttribute('data-tag', value);
                pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.4);color:#2dd4bf;border-radius:20px;padding:2px 8px;font-size:12px;cursor:default;';
                pill.innerHTML = `${value} <span style="cursor:pointer;opacity:0.7;font-size:13px;line-height:1;"
                    onclick="experimentForm.removeTagFromField('${containerId}','${fieldName}','${value}')">×</span>`;
                pillsRow.appendChild(pill);
            }

            inputEl.value = '';
            this.saveFieldValue(fieldName, this.getTagValues(containerId));
        } else if (event.key === 'Backspace' && event.target.value === '') {
            const container = document.getElementById(containerId);
            const pillsRow = container?.querySelector('.tags-pills-row');
            if (pillsRow) {
                const lastPill = pillsRow.querySelector('.tag-pill-form:last-child');
                if (lastPill) {
                    lastPill.remove();
                    this.saveFieldValue(fieldName, this.getTagValues(containerId));
                }
            }
        }
    },

    /**
     * Remove a specific tag pill from a tags-form-container
     */
    removeTagFromField(containerId, fieldName, tagValue) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const pill = container.querySelector(`.tag-pill-form[data-tag="${tagValue}"]`);
        if (pill) {
            pill.remove();
            this.saveFieldValue(fieldName, this.getTagValues(containerId));
        }
    },

    /**
     * Get all tag values from a tags-form-container as a string array
     */
    getTagValues(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return [...container.querySelectorAll('.tag-pill-form')].map(p => p.getAttribute('data-tag'));
    },

    /**
     * Load id_dictionary.json for the current user and populate a <datalist>
     */
    async loadIdAutocomplete(datalistId) {
        if (!datalistId) return;
        const datalist = document.getElementById(datalistId);
        if (!datalist) return;
        if (datalist.dataset.loaded === 'true') return; // Only load once per focus session

        try {
            const userInfo = window.userManager?.getCurrentUserInfo() || { username: 'Unknown' };
            if (window.electronAPI?.loadIdDictionary) {
                const result = await window.electronAPI.loadIdDictionary(userInfo);
                if (result?.success && Array.isArray(result.ids)) {
                    datalist.innerHTML = result.ids.map(item => {
                        const id = typeof item === 'string' ? item : item.id;
                        const type = typeof item === 'string' ? 'id_anchor' : item.type;
                        const label = type === 'project' ? `📁 Projekt` : `⚓ ID`;
                        return `<option value="${id}">${label}</option>`;
                    }).join('');
                    datalist.dataset.loaded = 'true';
                    console.log(`📋 Loaded ${result.ids.length} IDs into autocomplete`);
                }
            }
        } catch (err) {
            console.warn('⚠️ Could not load ID dictionary for autocomplete:', err.message);
        }
    },

    /**
     * Open folder picker and harvest IDs into the user's id_dictionary.json
     */
    async scanFolderForIds(containerId, fieldName) {
        try {
            // Open folder picker
            const folderResult = await window.electronAPI.selectFolder?.();
            if (!folderResult) return;
            const dirPath = folderResult;

            // Show inline recursive option
            const recursive = confirm(
                `Scan folder for IDs:\n"${dirPath}"\n\n` +
                `Click OK to include ALL subfolders (recursive).\n` +
                `Click Cancel to scan only this folder.`
            );

            const userInfo = window.userManager?.getCurrentUserInfo() || { username: 'Unknown' };

            let result;
            if (window.electronAPI?.harvestIdsFromFolder) {
                result = await window.electronAPI.harvestIdsFromFolder(dirPath, recursive, userInfo);
            }

            if (result?.success) {
                const msg = `✅ ${result.foundCount || 0} IDs found, ${result.newCount ?? 0} new IDs imported (total: ${result.total ?? '?'})`;
                console.log(msg);
                if (result.debugInfo) {
                    console.log('🔍 Scanner Debug Info:', result.debugInfo);
                }
                // Refresh autocomplete datalist
                const container = document.getElementById(containerId);
                const datalist = document.getElementById('datalist_' + containerId) || 
                               (container ? container.parentElement.querySelector('datalist') : null);
                if (datalist) {
                    datalist.dataset.loaded = ''; // Reset so next focus reloads
                    await this.loadIdAutocomplete(datalist.id);
                }
                // Show brief feedback next to the button
                const btn = container?.querySelector('button[title="Scan folder for IDs"]');
                if (btn) {
                    const orig = btn.textContent;
                    btn.textContent = msg;
                    btn.style.color = '#4ade80';
                    setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 3000);
                }
            }
        } catch (err) {
            console.error('❌ scanFolderForIds error:', err);
        }
    }
};

// Export to window
window.experimentForm = experimentForm;

// Debug helper
window.debugFieldOrder = () => experimentForm.debugFieldOrder();

console.log('✅ Enhanced Experiment Form loaded with Field Order Support');