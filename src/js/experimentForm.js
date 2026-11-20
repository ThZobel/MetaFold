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
        if (window.templateManager?.currentTemplate?.isLoadedProject) {
            return true;
        }

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
        // Dismiss notes autocomplete dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.form-notes-wrapper')) {
                document.querySelectorAll('.form-notes-ac-dropdown').forEach(d => {
                    d.style.display = 'none';
                });
            }
        });
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

            if (targetPathEl && defaults.basePath !== undefined) {
                targetPathEl.value = defaults.basePath;
            }
            if (projectNameEl && defaults.projectName !== undefined) {
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
        // ❌ Drag & Drop is disabled in the Create Project form so selecting text inside inputs never drags rows.
        // Field reordering is exclusively done in the Template Editor (metadataEditor.js).

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

        const safeFieldNameJs = String(fieldName).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const safeFieldIdJs = String(safeFieldId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const scanBtnHtml = (scanMode) => `<button type="button" class="mf-field-scan-btn" title="QR-/Barcode oder DataMatrix per Kamera scannen (Handscanner funktioniert direkt im Feld)" onclick="experimentForm.scanCodeForField('${safeFieldIdJs}', '${safeFieldNameJs}', '${scanMode}')" style="background:rgba(139,92,246,0.16);border:1px solid rgba(139,92,246,0.38);color:#c4b5fd;border-radius:6px;padding:4px 8px;font-size:12px;line-height:1.2;cursor:pointer;white-space:nowrap;flex-shrink:0;">📷</button>`;

        let inputHtml = '';
        switch (fieldInfo.type) {
            case 'text':
                inputHtml = `<div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="text" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''} onkeydown="if(event.key==='Enter'){event.preventDefault();}" style="flex:1;">${scanBtnHtml('text')}</div>`;
                break;
            case 'id_anchor':
                inputHtml = `
                    <div class="own-id-form-container" id="${safeFieldId}_container" data-autocomplete-mode="own_id" style="display:flex;flex-direction:column;gap:4px;position:relative;">
                        <div style="display:flex;gap:6px;align-items:center;position:relative;">
                            <input type="text" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''}
                                   autocomplete="off"
                                   style="flex:1;"
                                   placeholder="Enter or scan Own / Internal ID..."
                                   oninput="experimentForm.handleOwnIdInput(this, '${safeFieldId}', '${fieldName}')"
                                   onfocus="experimentForm.openOwnIdSuggestions(this, '${safeFieldId}', '${fieldName}')"
                                   onclick="experimentForm.openOwnIdSuggestions(this, '${safeFieldId}', '${fieldName}')"
                                   onkeydown="experimentForm.handleOwnIdKeydown(event, this, '${safeFieldId}', '${fieldName}')">
                            ${scanBtnHtml('id_anchor')}
                            <button type="button" class="scan-index-folder-btn" title="Scan folder to index IDs &amp; Tags" onclick="experimentForm.scanFolderForIds('${safeFieldId}_container','${fieldName}')"
                                    style="background:rgba(13,148,136,0.2);border:1px solid rgba(13,148,136,0.4);color:#2dd4bf;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap;">
                                📂 Scan Folder
                            </button>
                        </div>
                        <div class="own-id-status-hint" id="${safeFieldId}_hint" style="display:none;font-size:11px;line-height:1.3;"></div>
                    </div>`;
                break;
            case 'number': {
                const hasMin = fieldInfo.min !== undefined && fieldInfo.min !== null && fieldInfo.min !== '' && !isNaN(Number(fieldInfo.min));
                const hasMax = fieldInfo.max !== undefined && fieldInfo.max !== null && fieldInfo.max !== '' && !isNaN(Number(fieldInfo.max));
                const min = hasMin ? `min="${fieldInfo.min}"` : '';
                const max = hasMax ? `max="${fieldInfo.max}"` : '';
                const rangeHint = (hasMin && hasMax)
                    ? `Min: ${fieldInfo.min} · Max: ${fieldInfo.max}`
                    : (hasMin ? `Min: ${fieldInfo.min}` : (hasMax ? `Max: ${fieldInfo.max}` : ''));
                const unitHtml = fieldInfo.unit ? `<span style="margin-left: 4px; color: #9ca3af; font-size: 0.9em; user-select: none;">${fieldInfo.unit}</span>` : '';
                const numberInput = `<input type="number" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${min} ${max} ${isRequired ? 'required' : ''} oninput="experimentForm.handleNumberLimitInput(this)" onchange="experimentForm.clampNumberToLimits(this)" onblur="experimentForm.clampNumberToLimits(this)" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}" ${rangeHint ? `title="${rangeHint}"` : ''} style="flex: 1;">`;
                const limitHintHtml = rangeHint
                    ? `<div class="mf-number-limit-hint" style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${rangeHint}</div>`
                    : '';
                inputHtml = `<div style="display: flex; flex-direction: column; width: 100%;"><div style="display: flex; align-items: center; gap: 6px;">${numberInput}${unitHtml}${scanBtnHtml('number')}</div>${limitHintHtml}</div>`;
                break;
            }
            case 'date':
                inputHtml = `<input type="date" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''} onclick="try { if (typeof this.showPicker === 'function') this.showPicker(); } catch (_) {}" style="cursor: pointer;">`;
                break;
            case 'time':
                inputHtml = `<input type="time" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''} onclick="try { if (typeof this.showPicker === 'function') this.showPicker(); } catch (_) {}" style="cursor: pointer;">`;
                break;
            case 'url':
                inputHtml = `<div style="display:flex;gap:6px;align-items:center;width:100%;"><input type="url" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''} placeholder="https://..." onkeydown="if(event.key==='Enter'){event.preventDefault();}" style="flex:1;">${scanBtnHtml('url')}</div>`;
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
            case 'textarea': {
                inputHtml = `
                    <div class="form-textarea-wrapper" style="width: 100%; display: flex; gap: 6px; align-items: flex-start;">
                        <textarea id="${safeFieldId}" data-field-name="${fieldName}" ${isRequired ? 'required' : ''} rows="2" style="flex: 1; min-height: 48px; resize: vertical; font-family: inherit; font-size: 13px; line-height: 1.4;">${savedValue}</textarea>
                        ${scanBtnHtml('textarea')}
                    </div>
                `;
                break;
            }
            case 'notes':
            case 'markdown': {
                inputHtml = `
                    <div class="form-textarea-wrapper form-notes-wrapper" style="position: relative; width: 100%;">
                        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin-bottom: 3px;">
                            ${scanBtnHtml('notes')}
                            <button type="button" class="btn btn-secondary btn-sm form-textarea-preview-btn" onclick="experimentForm.toggleTextareaPreview('${safeFieldId}')" style="padding: 1px 7px; font-size: 11px; line-height: 1.4; color: #c4b5fd; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); border-radius: 4px; cursor: pointer;" title="Toggle Markdown Preview">
                                👁️ Preview
                            </button>
                        </div>
                        <textarea id="${safeFieldId}" data-field-name="${fieldName}" data-field-type="notes" ${isRequired ? 'required' : ''} rows="3"
                            oninput="experimentForm.handleNotesTextareaInput(event, this)"
                            onkeydown="experimentForm.handleNotesTextareaKeydown(event, this)"
                            placeholder="Notes, observations, #tags, [[projects]]..."
                            style="width: 100%; min-height: 56px; resize: vertical; font-family: inherit; font-size: 13px; line-height: 1.4;">${savedValue}</textarea>
                        <div id="${safeFieldId}_preview" class="mf-md form-textarea-preview" onclick="experimentForm.toggleTextareaPreview('${safeFieldId}')" style="display: none; width: 100%; min-height: 56px; padding: 6px 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 4px; font-size: 13px; line-height: 1.4; color: #e5e7eb; cursor: pointer;" title="Click anywhere to return to editing"></div>
                        <div id="${safeFieldId}_ac" class="form-notes-ac-dropdown" style="display: none; position: absolute; left: 0; top: 100%; margin-top: 2px; max-height: 200px; width: 340px; max-width: 100%; overflow-y: auto; background: #1e293b; border: 1px solid rgba(139, 92, 246, 0.5); border-radius: 6px; box-shadow: 0 10px 25px rgba(0,0,0,0.65); z-index: 10001; padding: 0;"></div>
                    </div>
                `;
                break;
            }
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
                        try { mcSavedArr = JSON.parse(savedValue); } catch (e) { mcSavedArr = []; }
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
            case 'related_to':
            case 'tags': {
                // Resolve initial tags array from saved value
                let initialTags = [];
                if (Array.isArray(savedValue)) {
                    initialTags = savedValue;
                } else if (typeof savedValue === 'string' && savedValue.startsWith('[')) {
                    try { initialTags = JSON.parse(savedValue); } catch (e) { initialTags = []; }
                }
                const isDerivedFrom = fieldName === 'derived_from' || fieldInfo.type === 'derived_from';
                const isRelatedTo = fieldName === 'related_to' || fieldInfo.type === 'related_to';
                const isLinkField = isDerivedFrom || isRelatedTo;
                const autocompleteMode = isDerivedFrom ? 'derived_from' : (isRelatedTo ? 'related_to' : 'tags');
                const datalistId = `datalist_${safeFieldId}`;
                const existingPills = initialTags.map(tagItem => {
                    const tagId = (tagItem && typeof tagItem === 'object') ? (tagItem.id || tagItem.name) : tagItem;
                    let tagLabel = (tagItem && typeof tagItem === 'object') ? (tagItem.name || tagItem.id) : tagItem;
                    if (isLinkField && tagId && String(tagLabel) === String(tagId)) {
                        const resolvedProj = (window.facetSearch && typeof window.facetSearch._resolveProjectByRef === 'function')
                            ? window.facetSearch._resolveProjectByRef(tagId)
                            : (window.projectScanner?.projects || []).find(p =>
                                p.name === tagId ||
                                p.metafold_project_id === tagId ||
                                p.projectId === tagId ||
                                p.metadata?.metafold_project_id === tagId
                            );
                        if (resolvedProj && resolvedProj.name) {
                            tagLabel = resolvedProj.name;
                        }
                    }
                    const safeTagAttr = String(tagId).replace(/"/g, '&quot;');
                    const safeTagJs = String(tagId).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const safeJsonData = (tagItem && typeof tagItem === 'object') ? JSON.stringify(tagItem).replace(/"/g, '&quot;') : '';
                    return `<span class="tag-pill-form" data-tag="${safeTagAttr}" ${safeJsonData ? `data-item-json="${safeJsonData}"` : ''}
                           style="display:inline-flex;align-items:center;gap:4px;
                                  background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.4);
                                  color:#2dd4bf;border-radius:20px;padding:2px 8px;font-size:12px;cursor:default;"
                           title="${tagId}">
                        ${tagLabel}
                        <span style="cursor:pointer;opacity:0.7;font-size:13px;line-height:1;"
                              onclick="experimentForm.removeTagFromField('${safeFieldId}','${fieldName}','${safeTagJs}')">×</span>
                    </span>`;
                }).join('');
                const _showDerivedHint = (typeof isDerivedFrom !== 'undefined' && isDerivedFrom) || (fieldName || '').toLowerCase() === 'derived_from';
                const _showRelatedHint = (typeof isRelatedTo !== 'undefined' && isRelatedTo) || (fieldName || '').toLowerCase() === 'related_to';
                const _relationHintHtml = _showDerivedHint
                    ? `<div style="font-size: 11px; color: #c4b5fd; opacity: 0.9; line-height: 1.35;">⬆️ <strong>Causal Parent (Lineage Tree):</strong> This project directly derives from / builds upon the selected parent project or sample ID.</div>`
                    : (_showRelatedHint
                        ? `<div style="font-size: 11px; color: #7dd3fc; opacity: 0.9; line-height: 1.35;">🔀 <strong>Associative Link:</strong> General reference, comparison, or <code>[[Note]]</code> mention (does not alter parent-child lineage).</div>`
                        : '');
                inputHtml = `
                    <div class="tags-form-container" id="${safeFieldId}" data-field-name="${fieldName}" data-autocomplete-mode="${autocompleteMode}" style="display:flex;flex-direction:column;gap:5px;position:relative;">
                        <div class="tags-pills-row" style="display:flex;flex-wrap:wrap;gap:4px;min-height:26px;">${existingPills}</div>
                        <div style="display:flex;gap:6px;align-items:center;position:relative;">
                            <input type="text" class="tags-form-input" autocomplete="off"
                                   placeholder="${isLinkField ? 'Enter or select a Project or ID...' : 'Add or select tag + Enter'}"
                                   style="flex:1;font-size:12px;"
                                   onkeydown="experimentForm.handleFormTagInput(event, '${safeFieldId}', '${fieldName}')"
                                   oninput="experimentForm.handleFormTagChange(event, '${safeFieldId}', '${fieldName}', '${datalistId}', '${autocompleteMode}')"
                                   onfocus="experimentForm.openIdAutocomplete(this, '${datalistId}', '${safeFieldId}', '${fieldName}', '${autocompleteMode}')"
                                   onclick="experimentForm.openIdAutocomplete(this, '${datalistId}', '${safeFieldId}', '${fieldName}', '${autocompleteMode}')">
                            ${scanBtnHtml(autocompleteMode)}
                            <button type="button" class="scan-index-folder-btn" title="Scan folder to index IDs &amp; Tags" onclick="experimentForm.scanFolderForIds('${safeFieldId}','${fieldName}')"
                                    style="background:rgba(13,148,136,0.2);border:1px solid rgba(13,148,136,0.4);color:#2dd4bf;border-radius:6px;padding:4px 8px;font-size:11px;cursor:pointer;white-space:nowrap;">
                                📂 Scan Folder
                            </button>
                        </div>
                        ${_relationHintHtml}
                        <datalist id="${datalistId}" style="display:none;"></datalist>
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

    scanCodeForField(fieldId, fieldName, mode) {
        if (!window.codeScannerModal || typeof window.codeScannerModal.open !== 'function') {
            alert('Code-Scanner ist nicht verfügbar.');
            return;
        }
        const fieldLabel = fieldName ? String(fieldName).replace(/_/g, ' ') : '';
        window.codeScannerModal.open({
            fieldLabel,
            onDetected: (code) => {
                const trimmed = String(code ?? '').trim();
                if (!trimmed) return;

                if (mode === 'derived_from' || mode === 'related_to' || mode === 'tags') {
                    this.addTagToField(fieldId, fieldName, trimmed);
                    return;
                }

                const el = document.getElementById(fieldId);
                if (!el) return;

                if (mode === 'number') {
                    const normalized = trimmed.replace(',', '.');
                    const num = Number(normalized);
                    if (isNaN(num)) {
                        alert(`Gescannter Code "${trimmed}" ist keine gültige Zahl für "${fieldLabel}".`);
                        return;
                    }
                    el.value = normalized;
                    this.clampNumberToLimits(el);
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    el.focus();
                    return;
                }

                if (mode === 'textarea' || mode === 'notes') {
                    const start = typeof el.selectionStart === 'number' ? el.selectionStart : el.value.length;
                    const end = typeof el.selectionEnd === 'number' ? el.selectionEnd : el.value.length;
                    const before = el.value.slice(0, start);
                    const after = el.value.slice(end);
                    const spacer = before && !/[\s\n]$/.test(before) ? ' ' : '';
                    el.value = before + spacer + trimmed + after;
                    const newPos = before.length + spacer.length + trimmed.length;
                    el.focus();
                    try { el.setSelectionRange(newPos, newPos); } catch (_) { }
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }

                // text, url, id_anchor
                el.value = trimmed;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof this.saveFieldValue === 'function') {
                    this.saveFieldValue(fieldName, trimmed);
                }
                if (mode === 'id_anchor' && typeof this.updateOwnIdStatusHint === 'function') {
                    this.updateOwnIdStatusHint(trimmed, fieldId);
                }
                if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName) && typeof this.updateFilenamePreview === 'function') {
                    this.updateFilenamePreview();
                }
                el.focus();
            }
        });
    },

    handleNumberLimitInput(input) {
        if (!input) return;
        const raw = String(input.value || '').trim();
        const hintEl = input.closest('td, .form-group, div')?.parentElement?.querySelector('.mf-number-limit-hint')
            || input.parentElement?.parentElement?.querySelector('.mf-number-limit-hint')
            || input.parentElement?.querySelector('.mf-number-limit-hint');
        if (!raw) {
            if (!input.required) input.classList.remove('error');
            if (hintEl) hintEl.style.color = '#9ca3af';
            return;
        }
        const num = Number(raw);
        const minAttr = input.getAttribute('min');
        const maxAttr = input.getAttribute('max');
        const hasMin = minAttr !== null && minAttr !== '' && !isNaN(Number(minAttr));
        const hasMax = maxAttr !== null && maxAttr !== '' && !isNaN(Number(maxAttr));
        const outOfRange = isNaN(num)
            || (hasMin && num < Number(minAttr))
            || (hasMax && num > Number(maxAttr));
        if (outOfRange) {
            input.classList.add('error');
            if (hintEl) hintEl.style.color = '#f87171';
        } else {
            input.classList.remove('error');
            if (hintEl) hintEl.style.color = '#9ca3af';
        }
    },

    clampNumberToLimits(input) {
        if (!input) return;
        const raw = String(input.value || '').trim();
        const hintEl = input.parentElement?.parentElement?.querySelector('.mf-number-limit-hint')
            || input.parentElement?.querySelector('.mf-number-limit-hint');
        if (!raw) {
            if (hintEl) hintEl.style.color = '#9ca3af';
            return;
        }
        let num = Number(raw);
        if (isNaN(num)) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        const minAttr = input.getAttribute('min');
        const maxAttr = input.getAttribute('max');
        const hasMin = minAttr !== null && minAttr !== '' && !isNaN(Number(minAttr));
        const hasMax = maxAttr !== null && maxAttr !== '' && !isNaN(Number(maxAttr));
        let clamped = num;
        if (hasMin && clamped < Number(minAttr)) clamped = Number(minAttr);
        if (hasMax && clamped > Number(maxAttr)) clamped = Number(maxAttr);
        if (clamped !== num) {
            input.value = String(clamped);
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        input.classList.remove('error');
        if (hintEl) hintEl.style.color = '#9ca3af';
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
                    const label = field.closest('tr')?.querySelector('.field-name')?.textContent?.replace(/\*/g, '').trim();
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
                        const label = field.closest('tr')?.querySelector('.field-name')?.textContent?.replace(/\*/g, '').trim();
                        message = `Field "${label || fieldName || 'Unknown'}" contains an invalid E-Mail address.`;
                    }
                } else if (field.classList.contains('error') && requiredFields.includes && !requiredFields.includes(field)) {
                    field.classList.remove('error');
                }
            }
        });

        const numberFields = document.querySelectorAll('input[type="number"][min], input[type="number"][max]');
        numberFields.forEach(field => {
            const raw = field.value.trim();
            if (!raw) return;
            const num = Number(raw);
            const minAttr = field.getAttribute('min');
            const maxAttr = field.getAttribute('max');
            const hasMin = minAttr !== null && minAttr !== '' && !isNaN(Number(minAttr));
            const hasMax = maxAttr !== null && maxAttr !== '' && !isNaN(Number(maxAttr));
            const tooLow = hasMin && num < Number(minAttr);
            const tooHigh = hasMax && num > Number(maxAttr);
            if (isNaN(num) || tooLow || tooHigh) {
                isValid = false;
                field.classList.add('error');
                if (!message) {
                    const fieldName = field.getAttribute('data-field-name');
                    const label = field.closest('tr')?.querySelector('.field-name')?.textContent?.replace(/\*/g, '').trim();
                    const rangeDesc = (hasMin && hasMax)
                        ? `between ${minAttr} and ${maxAttr}`
                        : (hasMin ? `>= ${minAttr}` : `<= ${maxAttr}`);
                    message = `Field "${label || fieldName || 'Unknown'}" must be ${rangeDesc}.`;
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

    // Toggle in-place Markdown preview for textarea fields in Create Project form
    toggleTextareaPreview(fieldId) {
        const ta = document.getElementById(fieldId);
        const preview = document.getElementById(`${fieldId}_preview`);
        const wrapper = ta?.closest('.form-textarea-wrapper') || ta?.parentElement;
        const btn = wrapper?.querySelector('.form-textarea-preview-btn');
        if (!ta || !preview) return;

        if (ta.style.display === 'none') {
            // Return to edit mode
            ta.style.display = 'block';
            preview.style.display = 'none';
            if (btn) {
                btn.innerHTML = '👁️ Preview';
                btn.style.background = 'rgba(139, 92, 246, 0.15)';
                btn.style.color = '#c4b5fd';
            }
            ta.focus();
        } else {
            // Switch to preview mode
            const raw = ta.value || '';
            if (window.markdownLite) {
                preview.innerHTML = raw.trim()
                    ? window.markdownLite.render(raw)
                    : '<em style="color:#6b7280; font-style:italic;">Nothing to preview yet. Click to write...</em>';
            } else {
                preview.textContent = raw || 'Empty';
            }
            preview.style.minHeight = `${Math.max(48, ta.offsetHeight)}px`;
            ta.style.display = 'none';
            preview.style.display = 'block';
            if (btn) {
                btn.innerHTML = '✏️ Edit';
                btn.style.background = '#8b5cf6';
                btn.style.color = '#fff';
            }
        }
    },

    // Autocomplete & Live Shortcut support for Notes fields in Create Project form
    _notesAcState: {
        textarea: null,
        dropdown: null,
        tokenStart: 0,
        mode: null, // 'tag' | 'link'
        items: [],
        activeIndex: -1
    },

    handleNotesTextareaInput(event, textarea) {
        if (!textarea) return;
        const text = textarea.value || '';
        const cursor = textarea.selectionStart;
        const beforeCursor = text.slice(0, cursor);

        // Live shortcut: *[] + space -> - [ ]
        if (beforeCursor.endsWith('*[] ')) {
            const replaced = beforeCursor.slice(0, -4) + '- [ ] ';
            textarea.value = replaced + text.slice(cursor);
            const newPos = replaced.length;
            textarea.setSelectionRange(newPos, newPos);
            this._hideNotesAutocomplete(textarea);
            return;
        }

        // Tag autocomplete: #...
        const tagMatch = /(?:^|\s)#([a-zA-Z0-9_\-]{0,25})$/.exec(beforeCursor);
        if (tagMatch) {
            const query = tagMatch[1].toLowerCase();
            const tokenStart = cursor - tagMatch[1].length - 1;
            this._showNotesTagAutocomplete(textarea, query, tokenStart);
            return;
        }

        // Link / Project autocomplete: [[... or [...
        const linkMatch = /(?:\[\[|(?:\s|^)\[)([^\[\]\n]{0,35})$/.exec(beforeCursor);
        if (linkMatch) {
            const query = linkMatch[1].toLowerCase();
            const isDouble = beforeCursor.endsWith('[[' + linkMatch[1]);
            const prefixLen = isDouble ? 2 : 1;
            const tokenStart = cursor - linkMatch[1].length - prefixLen;
            this._showNotesLinkAutocomplete(textarea, query, tokenStart);
            return;
        }

        this._hideNotesAutocomplete(textarea);
    },

    _showNotesTagAutocomplete(textarea, query, tokenStart) {
        const dropdown = document.getElementById(textarea.id + '_ac');
        if (!dropdown) return;

        if (!Array.isArray(this._tagDictionaryItems)) {
            this.loadIdAutocomplete('', false);
        }

        const tagSet = new Map();
        if (Array.isArray(this._tagDictionaryItems)) {
            this._tagDictionaryItems.forEach(t => {
                if (t && t.id) tagSet.set(t.id.toLowerCase(), { id: t.id, count: t.count || 0 });
            });
        }
        if (window.facetSearch && Array.isArray(window.facetSearch.masterData)) {
            window.facetSearch.masterData.forEach(p => {
                const flat = p.flatMeta || {};
                for (const [k, v] of Object.entries(flat)) {
                    if (k.toLowerCase().includes('tag') && v) {
                        String(v).split(/[,;]/).forEach(raw => {
                            const trimmed = raw.trim();
                            if (trimmed) {
                                const lower = trimmed.toLowerCase();
                                const prev = tagSet.get(lower);
                                tagSet.set(lower, { id: trimmed, count: (prev?.count || 0) + 1 });
                            }
                        });
                    }
                }
                if (p.notes_markdown && window.markdownLite) {
                    window.markdownLite.extractTags(p.notes_markdown).forEach(t => {
                        const lower = t.toLowerCase();
                        const prev = tagSet.get(lower);
                        tagSet.set(lower, { id: t, count: (prev?.count || 0) + 1 });
                    });
                }
            });
        }

        const matches = Array.from(tagSet.values())
            .filter(t => !query || t.id.toLowerCase().includes(query))
            .slice(0, 10);

        if (matches.length === 0) {
            this._hideNotesAutocomplete(textarea);
            return;
        }

        this._notesAcState = {
            textarea,
            dropdown,
            tokenStart,
            mode: 'tag',
            items: matches,
            activeIndex: 0
        };

        this._renderNotesAutocompleteDropdown();
    },

    _showNotesLinkAutocomplete(textarea, query, tokenStart) {
        const dropdown = document.getElementById(textarea.id + '_ac');
        if (!dropdown) return;

        if (!Array.isArray(this._idDictionaryItems)) {
            this.loadIdAutocomplete('', false);
        }

        const itemMap = new Map();
        if (Array.isArray(this._idDictionaryItems)) {
            this._idDictionaryItems.forEach(item => {
                if (item && item.id) {
                    itemMap.set(item.id.toLowerCase(), {
                        name: item.id,
                        type: item.type === 'project' ? 'Project' : 'ID'
                    });
                }
            });
        }
        if (window.facetSearch && Array.isArray(window.facetSearch.masterData)) {
            window.facetSearch.masterData.forEach(p => {
                if (p.name) {
                    itemMap.set(p.name.toLowerCase(), {
                        name: p.name,
                        type: 'Project'
                    });
                }
                if (p.metafold_project_id) {
                    itemMap.set(p.metafold_project_id.toLowerCase(), {
                        name: p.metafold_project_id,
                        type: 'UUID'
                    });
                }
            });
        }

        const matches = Array.from(itemMap.values())
            .filter(item => !query || item.name.toLowerCase().includes(query))
            .slice(0, 10);

        if (matches.length === 0) {
            this._hideNotesAutocomplete(textarea);
            return;
        }

        this._notesAcState = {
            textarea,
            dropdown,
            tokenStart,
            mode: 'link',
            items: matches,
            activeIndex: 0
        };

        this._renderNotesAutocompleteDropdown();
    },

    _renderNotesAutocompleteDropdown() {
        const { dropdown, mode, items, activeIndex } = this._notesAcState;
        if (!dropdown) return;

        let html = mode === 'tag'
            ? `<div style="padding: 4px 10px; font-size: 0.68rem; font-weight: 700; color: #c4b5fd; background: rgba(139, 92, 246, 0.14); border-bottom: 1px solid rgba(139, 92, 246, 0.3); text-transform: uppercase; letter-spacing: 0.03em;">🏷️ Add tag (#tag)</div>`
            : `<div style="padding: 4px 10px; font-size: 0.68rem; font-weight: 700; color: #7dd3fc; background: rgba(56, 189, 248, 0.1); border-bottom: 1px solid rgba(56, 189, 248, 0.25); text-transform: uppercase; letter-spacing: 0.03em;">🔀 Link related projects ([[Project]])</div>`;
        items.forEach((item, idx) => {
            const isActive = idx === activeIndex;
            const bg = isActive ? 'rgba(139, 92, 246, 0.28)' : 'transparent';
            if (mode === 'tag') {
                html += `
                    <div class="notes-ac-item" data-index="${idx}" style="padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #c4b5fd; background: ${bg}; border-bottom: 1px solid rgba(255,255,255,0.05);" onmouseenter="experimentForm._setNotesAcActive(${idx})" onclick="experimentForm._selectNotesAutocompleteItem(${idx})">
                        <span>🏷️ #${item.id}</span>
                        ${item.count ? `<span style="font-size: 10px; color: #94a3b8;">(${item.count})</span>` : ''}
                    </div>
                `;
            } else {
                html += `
                    <div class="notes-ac-item" data-index="${idx}" style="padding: 6px 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #93c5fd; background: ${bg}; border-bottom: 1px solid rgba(255,255,255,0.05);" onmouseenter="experimentForm._setNotesAcActive(${idx})" onclick="experimentForm._selectNotesAutocompleteItem(${idx})">
                        <span>📁 ${item.name}</span>
                        <span style="font-size: 10px; color: #94a3b8; text-transform: uppercase;">${item.type || 'LINK'}</span>
                    </div>
                `;
            }
        });

        dropdown.innerHTML = html;
        dropdown.style.display = 'block';
    },

    _setNotesAcActive(idx) {
        this._notesAcState.activeIndex = idx;
        const dropdown = this._notesAcState.dropdown;
        if (!dropdown) return;
        dropdown.querySelectorAll('.notes-ac-item').forEach((el, i) => {
            el.style.background = i === idx ? 'rgba(139, 92, 246, 0.28)' : 'transparent';
        });
    },

    handleNotesTextareaKeydown(event, textarea) {
        const { dropdown, items, activeIndex } = this._notesAcState;
        if (!dropdown || dropdown.style.display === 'none' || !items || items.length === 0) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const next = (activeIndex + 1) % items.length;
            this._setNotesAcActive(next);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const prev = (activeIndex - 1 + items.length) % items.length;
            this._setNotesAcActive(prev);
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            if (activeIndex >= 0 && activeIndex < items.length) {
                event.preventDefault();
                this._selectNotesAutocompleteItem(activeIndex);
            }
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this._hideNotesAutocomplete(textarea);
        }
    },

    _selectNotesAutocompleteItem(index) {
        const { textarea, mode, items, tokenStart } = this._notesAcState;
        if (!textarea || !items || !items[index]) return;

        const item = items[index];
        const text = textarea.value || '';
        const end = textarea.selectionStart;

        let insertText = '';
        if (mode === 'tag') {
            insertText = `#${item.id} `;
        } else {
            insertText = `[[${item.name}]] `;
        }

        textarea.value = text.slice(0, tokenStart) + insertText + text.slice(end);
        const newPos = tokenStart + insertText.length;
        textarea.focus();
        textarea.setSelectionRange(newPos, newPos);
        this._hideNotesAutocomplete(textarea);
    },

    _hideNotesAutocomplete(textarea) {
        const dropdown = textarea ? document.getElementById(textarea.id + '_ac') : this._notesAcState?.dropdown;
        if (dropdown) dropdown.style.display = 'none';
        this._notesAcState = {
            textarea: null,
            dropdown: null,
            tokenStart: 0,
            mode: null,
            items: [],
            activeIndex: -1
        };
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

    // Populate form fields with existing metadata (e.g. loaded from JSON)
    populateForm(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            console.warn('⚠️ populateForm called with invalid metadata:', metadata);
            return;
        }

        console.log('📝 Populating experimentForm with loaded metadata...', metadata);

        // Helper to flatten nested metadata objects
        const flatValues = {};
        const extractValues = (obj, prefix = '') => {
            if (!obj || typeof obj !== 'object') return;
            for (const [key, val] of Object.entries(obj)) {
                if (key === 'extra_fields' || key === 'metadata') {
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        extractValues(val, prefix);
                    }
                    continue;
                }
                if (key === 'schemaVersion' || key === 'schemaType' || key === 'template' ||
                    key === 'templateInfo' || key === 'integrations' || key === 'provenance' ||
                    key === 'created_at' || key === 'updated_at' || key === 'previous_names' ||
                    (window.metafoldSchema && window.metafoldSchema.isReservedProjectKey(key))) {
                    continue;
                }
                const fullKey = prefix ? `${prefix}.${key}` : key;
                if (val && typeof val === 'object' && !Array.isArray(val) && val.value === undefined && val.type === undefined) {
                    // Category or nested group
                    extractValues(val, fullKey);
                } else {
                    const actualValue = (val && typeof val === 'object' && val.value !== undefined) ? val.value : val;
                    flatValues[key] = actualValue;
                    if (prefix) flatValues[fullKey] = actualValue;
                }
            }
        };

        extractValues(metadata);
        if (metadata.metadata) {
            extractValues(metadata.metadata);
        }
        if (metadata.extra_fields) {
            extractValues(metadata.extra_fields);
        }

        // Iterate over flatValues and populate matching inputs
        for (const [fieldName, val] of Object.entries(flatValues)) {
            const safeFieldId = 'field_' + this.createSafeId(fieldName);
            const input = document.getElementById(safeFieldId);
            if (!input) continue;

            if (input.classList.contains('multicheckbox-group')) {
                const arr = Array.isArray(val) ? val : [val];
                input.querySelectorAll('.mc-item').forEach(cb => {
                    cb.checked = arr.map(String).includes(String(cb.value));
                });
                this.saveFieldValue(fieldName, arr);
            } else if (input.classList.contains('tags-form-container')) {
                // Clear existing pills
                const pillsRow = input.querySelector('.tags-pills-row');
                if (pillsRow) {
                    pillsRow.innerHTML = '';
                }
                const arr = Array.isArray(val) ? val : (typeof val === 'string' && val.trim() ? val.split(',').map(s => s.trim()) : []);
                arr.forEach(item => {
                    if (item) {
                        this.addTagToField(safeFieldId, fieldName, item);
                    }
                });
                this.saveFieldValue(fieldName, arr);
            } else if (input.classList.contains('rating-container')) {
                const numVal = parseInt(val) || 0;
                input.setAttribute('data-value', numVal);
                const stars = input.querySelectorAll('.star-icon');
                stars.forEach(s => {
                    const sVal = parseInt(s.getAttribute('data-value'));
                    const isFilled = sVal <= numVal;
                    s.setAttribute('fill', isFilled ? '#a855f7' : 'none');
                    s.setAttribute('stroke', isFilled ? '#a855f7' : '#9ca3af');
                });
                this.saveFieldValue(fieldName, numVal);
            } else if (input.type === 'checkbox') {
                input.checked = !!val;
                this.saveFieldValue(fieldName, input.checked);
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                input.value = (val !== undefined && val !== null) ? val : '';
                this.saveFieldValue(fieldName, input.value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }

        // Notes / Markdown support
        if (metadata.notes_markdown) {
            const notesEl = document.getElementById('field_notes_markdown') || document.querySelector('textarea[data-field-name="notes_markdown"]');
            if (notesEl) {
                notesEl.value = metadata.notes_markdown;
                this.saveFieldValue('notes_markdown', metadata.notes_markdown);
                notesEl.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        if (typeof this.updateFilenamePreview === 'function') {
            this.updateFilenamePreview();
        }

        console.log('✅ Form successfully populated with metadata');
    },

    // Render and activate form directly from an existing loaded metadata file
    renderLoadedProject(rawMetadata, filePath, projectName) {
        console.log('📂 Rendering loaded project in experimentForm:', projectName, filePath);

        // Normalize raw metadata fields into form-compatible field definitions
        const normalized = this.normalizeLoadedMetadata(rawMetadata);

        // Set virtual template context so validation passes and fields can be collected
        if (window.templateManager) {
            window.templateManager.currentTemplate = {
                name: projectName || 'Loaded Project',
                type: 'experiment',
                isLoadedProject: true,
                metadata: normalized,
                structure: '',
                filePath: filePath,
                createdBy: rawMetadata.provenance?.creator?.username || rawMetadata.createdBy || null,
                createdAt: rawMetadata.created_at || rawMetadata.createdAt || rawMetadata.provenance?.createdAt || null,
                updatedAt: rawMetadata.updated_at || rawMetadata.updatedAt || null
            };
            window.templateManager.selectedIndex = -1;
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
        }

        // Show templateDetails, hide placeholder
        const detailsEl = document.getElementById('templateDetails');
        const placeholderEl = document.getElementById('templatePlaceholder');
        const formDiv = document.getElementById('experimentForm');

        if (placeholderEl) placeholderEl.style.display = 'none';
        if (detailsEl) detailsEl.style.display = 'block';
        if (formDiv) formDiv.style.display = 'block';

        // Set input fields
        const projectNameInput = document.getElementById('projectName');
        const targetPathInput = document.getElementById('targetPath');

        if (projectNameInput) {
            projectNameInput.value = projectName;
        }

        if (targetPathInput && filePath) {
            const parts = filePath.split(/[/\\]/);
            parts.pop();
            targetPathInput.value = parts.join(window.electronAPI?.platform === 'win32' ? '\\' : '/');
        }

        // Ensure "Skip folder creation / Extend existing project" mode is enabled for loaded projects
        const onlyIntCb = document.getElementById('onlyIntegrations');
        if (onlyIntCb) {
            onlyIntCb.checked = true;
        }
        const extendHint = document.getElementById('extendProjectHint');
        if (extendHint) {
            const safeProjName = (window.appUtils?.escapeHtml ? window.appUtils.escapeHtml(projectName) : projectName);
            extendHint.style.display = 'block';
            extendHint.style.color = '#34d399';
            extendHint.innerHTML = `✅ Loaded existing project: <strong>${safeProjName}</strong> — updates &amp; template extensions will be merged without data loss.`;
        }

        // Render form structure with normalized fields
        this.render(normalized);

        // Populate fields with values
        this.populateForm(rawMetadata.metadata || rawMetadata);

        // Update previews
        if (window.projectManager && window.projectManager.updatePathPreview) {
            window.projectManager.updatePathPreview();
        }

        // Update footer buttons (Show Update & Send to Integrations buttons, hide Create Project)
        if (typeof window.updateFooterVisibility === 'function') {
            window.updateFooterVisibility();
        }

        // Pre-configure right sidebar integrations if present in metadata
        const integLinks = rawMetadata.metafold_integration?.external_links || rawMetadata.integrations;
        if (integLinks) {
            const elabToggle = document.getElementById('sendToElabFTW');
            const omeroToggle = document.getElementById('sendToOMERO');
            const rspaceToggle = document.getElementById('sendToRSpace');
            if (elabToggle && integLinks.elabftw) elabToggle.checked = true;
            if (omeroToggle && integLinks.omero) omeroToggle.checked = true;
            if (rspaceToggle && integLinks.rspace) rspaceToggle.checked = true;
        }

        console.log('✅ Loaded project rendered successfully in center form');
    },

    // Normalize any metadata JSON format (flat, nested, rich) into fields + fieldOrder
    normalizeLoadedMetadata(rawMetadata) {
        const fields = {};
        const fieldOrder = [];

        const metaIgnore = new Set([
            'schemaVersion', 'schemaType', 'template',
            'projectName', 'name', 'projectId', 'metafold_project_id', 'id',
            'templateInfo', 'integrations', 'metafold_integration',
            'provenance', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
            'previous_names', 'notes_log', 'changelog', 'elabftw', 'extra_fields',
            'metadata', 'community', '_metafold'
        ]);

        const shouldIgnoreKey = (k) => {
            if (!k) return true;
            if (metaIgnore.has(k)) return true;
            if (k.startsWith('System.') || k.startsWith('_')) return true;
            if (window.metafoldSchema && typeof window.metafoldSchema.isReservedProjectKey === 'function') {
                return window.metafoldSchema.isReservedProjectKey(k);
            }
            return false;
        };

        const sourceObj = {};
        if (rawMetadata.extra_fields && typeof rawMetadata.extra_fields === 'object') {
            Object.assign(sourceObj, rawMetadata.extra_fields);
        }
        if (rawMetadata.metadata && typeof rawMetadata.metadata === 'object') {
            Object.assign(sourceObj, rawMetadata.metadata);
        }
        if (rawMetadata.fields && typeof rawMetadata.fields === 'object') {
            Object.assign(sourceObj, rawMetadata.fields);
        }
        if (rawMetadata && typeof rawMetadata === 'object') {
            for (const [k, v] of Object.entries(rawMetadata)) {
                if (!shouldIgnoreKey(k)) {
                    sourceObj[k] = v;
                }
            }
        }

        const processEntries = (obj, parentCategory = null) => {
            if (!obj || typeof obj !== 'object') return;
            for (const [key, rawVal] of Object.entries(obj)) {
                if (shouldIgnoreKey(key)) continue;

                // Collapse accidental repeated group prefixes (e.g. "Microscopy.Microscopy.mode" inside "Microscopy")
                let leafKey = key;
                if (parentCategory) {
                    const catPrefix = `${parentCategory}.`;
                    while (leafKey.startsWith(catPrefix)) {
                        leafKey = leafKey.slice(catPrefix.length);
                    }
                }
                const fullKey = parentCategory ? `${parentCategory}.${leafKey}` : leafKey;

                // Check if rawVal is a category/nested group (plain object without value/type)
                if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && rawVal.value === undefined && rawVal.type === undefined) {
                    const groupKey = `group_${key}`;
                    fields[groupKey] = {
                        type: 'group',
                        label: key.replace(/_/g, ' ')
                    };
                    fieldOrder.push(groupKey);
                    processEntries(rawVal, key);
                    continue;
                }

                // If this normalized key already exists (from legacy duplicate entries), keep the newest entry
                if (fields[fullKey]) {
                    const existingTs = fields[fullKey]._lastUpdatedAt ? new Date(fields[fullKey]._lastUpdatedAt).getTime() : 0;
                    const incomingTs = rawVal?.lastUpdatedAt ? new Date(rawVal.lastUpdatedAt).getTime() : 0;
                    if (incomingTs < existingTs) {
                        continue;
                    }
                }

                let type = 'text';
                let label = leafKey.replace(/_/g, ' ');
                let val = rawVal;
                let unit = '';
                let options = null;

                if (rawVal && typeof rawVal === 'object' && !Array.isArray(rawVal) && (rawVal.value !== undefined || rawVal.type !== undefined)) {
                    val = rawVal.value !== undefined ? rawVal.value : '';
                    type = rawVal.type || 'text';
                    label = rawVal.label || label;
                    unit = rawVal.unit || '';
                    options = rawVal.options || null;
                } else if (Array.isArray(rawVal)) {
                    type = 'tags';
                } else if (typeof rawVal === 'number') {
                    type = 'number';
                } else if (typeof rawVal === 'boolean') {
                    type = 'checkbox';
                } else if (typeof rawVal === 'string') {
                    if (leafKey.toLowerCase().includes('note') || leafKey.toLowerCase().includes('markdown') || leafKey.toLowerCase().includes('observation') || rawVal.length > 120 || rawVal.includes('\n')) {
                        type = leafKey.toLowerCase().includes('note') || leafKey.toLowerCase().includes('markdown') ? 'notes' : 'textarea';
                    }
                }

                const alreadyInOrder = Object.prototype.hasOwnProperty.call(fields, fullKey);
                fields[fullKey] = {
                    type,
                    label: label.charAt(0).toUpperCase() + label.slice(1),
                    value: val,
                    defaultValue: val,
                    unit,
                    options,
                    originalKey: leafKey,
                    _lastUpdatedAt: rawVal?.lastUpdatedAt || null,
                    templateName: rawVal?.templateName || null,
                    description: rawVal?.description || '',
                    required: Boolean(rawVal?.required),
                    min: rawVal?.min,
                    max: rawVal?.max
                };
                if (!alreadyInOrder) {
                    fieldOrder.push(fullKey);
                }
            }
        };

        processEntries(sourceObj);

        // Include notes_markdown if present and not already added
        if (rawMetadata.notes_markdown && !fields['notes_markdown']) {
            fields['notes_markdown'] = {
                type: 'notes',
                label: 'Notes & Observations (Markdown)',
                value: rawMetadata.notes_markdown,
                defaultValue: rawMetadata.notes_markdown
            };
            fieldOrder.push('notes_markdown');
        }

        return { fields, fieldOrder };
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
        let currentGroupName = null;

        // Collect data in the specified field order
        fieldOrder.forEach(fieldName => {
            const fieldInfo = fieldsSource[fieldName];

            if (fieldInfo && fieldInfo.type === 'group') {
                currentGroupObj = {};
                currentGroupName = fieldInfo.label || fieldName.replace(/^group_/, '');
                metadata[currentGroupName] = currentGroupObj;
                return;
            }

            if (!fieldInfo) return; // Skip invalid

            let value;

            // Handle multi-checkbox specifically
            if (fieldInfo.type === 'multicheckbox') {
                value = this.getMultiCheckboxValues(fieldName);
            } else if (fieldInfo.type === 'tags' || fieldInfo.type === 'derived_from' || fieldInfo.type === 'related_to') {
                // Tags & Links: read pills array from the DOM container
                const safeFieldId = 'field_' + this.createSafeId(fieldName);
                value = this.getTagValues(safeFieldId);

                // UX FIX: Capture pending text that the user typed but forgot to press 'Enter' for
                const container = document.getElementById(safeFieldId);
                if (container) {
                    const inputEl = container.querySelector('.tags-form-input, .tag-input-form');
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
            if (fieldInfo.displayInNotes !== undefined) fieldData.displayInNotes = fieldInfo.displayInNotes;
            if (fieldInfo.term) fieldData.term = fieldInfo.term;
            if (fieldInfo.valueTerm) fieldData.valueTerm = fieldInfo.valueTerm;
            if (fieldInfo.description) fieldData.description = fieldInfo.description;
            if (fieldInfo.templateName) fieldData.templateName = fieldInfo.templateName;

            if (currentGroupObj) {
                let leafKey = fieldInfo.originalKey || fieldName;
                if (currentGroupName) {
                    const groupPrefix = `${currentGroupName}.`;
                    while (leafKey.startsWith(groupPrefix)) {
                        leafKey = leafKey.slice(groupPrefix.length);
                    }
                }
                currentGroupObj[leafKey] = fieldData;
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
            } else if (group && group.classList.contains('tags-form-container')) {
                const tags = this.getTagValues(safeFieldId);
                if (tags.length > 0) {
                    const value = tags
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
     * Copy the generated filename to clipboard
     */
    async copyFilenameToClipboard() {
        const previewDiv = document.getElementById('filenamePreview');
        if (!previewDiv) return;

        const filename = previewDiv.textContent;
        if (filename === '(No fields selected)' || !filename) {
            if (typeof showToast === 'function') showToast('⚠️ No filename generated yet');
            return;
        }

        try {
            if (window.electronAPI && window.electronAPI.copyToClipboard) {
                window.electronAPI.copyToClipboard(filename);
            } else if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(filename);
            } else {
                // Fallback for older browsers or non-secure contexts
                const textArea = document.createElement('textarea');
                textArea.value = filename;
                textArea.style.position = 'fixed';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            if (typeof showToast === 'function') showToast('📋 Filename copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy filename:', err);
            if (typeof showToast === 'function') showToast('❌ Failed to copy to clipboard');
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

    _idDictionaryItems: null,
    _tagDictionaryItems: null,
    _idAutocompleteState: {
        inputEl: null,
        containerId: null,
        fieldName: null,
        datalistId: null,
        mode: 'derived_from',
        activeIndex: -1,
        filteredItems: [],
        outsideClickHandler: null,
        scrollResizeHandler: null
    },

    /**
     * Add a single value as a pill/tag to a tags-form-container immediately.
     * Supports either string tags or structured link objects { id, name, anchor, relation_note }.
     */
    addTagToField(containerId, fieldName, rawValue, inputEl = null, itemObj = null) {
        let value = '';
        let displayLabel = '';
        let structuredData = null;

        if (itemObj && typeof itemObj === 'object') {
            value = String(itemObj.id || itemObj.name || '').trim();
            displayLabel = String(itemObj.name || itemObj.id || '').trim();
            structuredData = itemObj;
        } else if (rawValue && typeof rawValue === 'object') {
            value = String(rawValue.id || rawValue.name || '').trim();
            displayLabel = String(rawValue.name || rawValue.id || '').trim();
            structuredData = rawValue;
        } else {
            value = String(rawValue || '').trim().replace(/,$/, '');
            displayLabel = value;
            const modeAttr = document.getElementById(containerId)?.getAttribute('data-autocomplete-mode') || '';
            if (value && (modeAttr === 'derived_from' || modeAttr === 'related_to')) {
                const resolvedProj = (window.facetSearch && typeof window.facetSearch._resolveProjectByRef === 'function')
                    ? window.facetSearch._resolveProjectByRef(value)
                    : (window.projectScanner?.projects || []).find(p =>
                        p.name === value ||
                        p.metafold_project_id === value ||
                        p.projectId === value ||
                        p.metadata?.metafold_project_id === value
                    );
                if (resolvedProj && resolvedProj.name) {
                    displayLabel = resolvedProj.name;
                    structuredData = { id: value, name: resolvedProj.name };
                }
            }
        }

        if (!value) return false;

        const container = document.getElementById(containerId);
        if (!container) return false;

        const targetInput = inputEl || container.querySelector('.tags-form-input');

        // Prevent duplicate pills
        const existing = this.getTagValues(containerId);
        if (existing.includes(value)) {
            if (targetInput) targetInput.value = '';
            return false;
        }

        const pillsRow = container.querySelector('.tags-pills-row');
        if (pillsRow) {
            const safeTagJs = value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const pill = document.createElement('span');
            pill.className = 'tag-pill-form';
            pill.setAttribute('data-tag', value);
            if (structuredData) {
                try {
                    pill.setAttribute('data-item-json', JSON.stringify(structuredData));
                } catch (_) { }
            }
            pill.title = value !== displayLabel ? `${displayLabel} (ID: ${value})` : value;
            pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(13,148,136,0.15);border:1px solid rgba(13,148,136,0.4);color:#2dd4bf;border-radius:20px;padding:2px 8px;font-size:12px;cursor:default;';
            pill.innerHTML = `${displayLabel} <span style="cursor:pointer;opacity:0.7;font-size:13px;line-height:1;"
                onclick="experimentForm.removeTagFromField('${containerId}','${fieldName}','${safeTagJs}')">×</span>`;
            pillsRow.appendChild(pill);
        }

        if (targetInput) {
            targetInput.value = '';
        }

        const updatedTags = this.getTagValues(containerId);
        this.saveFieldValue(fieldName, updatedTags);
        if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName)) {
            this.updateFilenamePreview();
        }
        return true;
    },

    /**
     * Handle keydown in the tags form input field.
     * Supports ArrowDown/ArrowUp/Enter/Escape in the autocomplete dropdown,
     * as well as Enter or comma to confirm the current tag and add a pill.
     */
    handleFormTagInput(event, containerId, fieldName) {
        const dropdown = document.getElementById('metafoldIdAutocompleteDropdown');
        const isDropdownOpen = dropdown && dropdown.style.display !== 'none' && this._idAutocompleteState.containerId === containerId;

        if (isDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            const items = this._idAutocompleteState.filteredItems || [];
            if (items.length === 0) return;
            if (event.key === 'ArrowDown') {
                this._idAutocompleteState.activeIndex = (this._idAutocompleteState.activeIndex + 1) % items.length;
            } else {
                this._idAutocompleteState.activeIndex = (this._idAutocompleteState.activeIndex - 1 + items.length) % items.length;
            }
            this._updateIdAutocompleteHighlight();
            return;
        }

        if (event.key === 'Escape' && isDropdownOpen) {
            event.preventDefault();
            this.closeIdAutocompleteDropdown();
            return;
        }

        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const inputEl = event.target;

            // If an autocomplete suggestion is highlighted with ArrowDown/ArrowUp, pick it
            if (isDropdownOpen && event.key === 'Enter' && this._idAutocompleteState.activeIndex >= 0) {
                const chosen = (this._idAutocompleteState.filteredItems || [])[this._idAutocompleteState.activeIndex];
                if (chosen && chosen.id) {
                    this.addTagToField(containerId, fieldName, chosen.id, inputEl);
                    this.closeIdAutocompleteDropdown();
                    return;
                }
            }

            const value = inputEl.value.trim().replace(/,$/, '');
            if (!value) return;

            this.addTagToField(containerId, fieldName, value, inputEl);
            if (isDropdownOpen) {
                this.closeIdAutocompleteDropdown();
            }
        } else if (event.key === 'Backspace' && event.target.value === '') {
            const container = document.getElementById(containerId);
            const pillsRow = container?.querySelector('.tags-pills-row');
            if (pillsRow) {
                const lastPill = pillsRow.querySelector('.tag-pill-form:last-child');
                if (lastPill) {
                    lastPill.remove();
                    this.saveFieldValue(fieldName, this.getTagValues(containerId));
                    if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName)) {
                        this.updateFilenamePreview();
                    }
                    if (isDropdownOpen) {
                        this.renderIdAutocompleteDropdown();
                    }
                }
            }
        }
    },

    /**
     * Handle live typing or native datalist replacement in the tags input field.
     */
    handleFormTagChange(event, containerId, fieldName, datalistId = '', mode = '') {
        const inputEl = event.target;
        if (!inputEl) return;

        // If triggered by native datalist replacement, immediately add as pill
        if (event.inputType === 'insertReplacementText' || !(event instanceof InputEvent)) {
            const val = inputEl.value.trim();
            if (val) {
                this.addTagToField(containerId, fieldName, val, inputEl);
                this.closeIdAutocompleteDropdown();
                return;
            }
        }

        // Filter the custom dropdown live for both derived_from and tags fields
        const container = document.getElementById(containerId);
        const resolvedMode = mode || container?.dataset?.autocompleteMode || 'derived_from';
        this.openIdAutocomplete(inputEl, datalistId, containerId, fieldName, resolvedMode);
    },

    /**
     * Remove a specific tag pill from a tags-form-container
     */
    removeTagFromField(containerId, fieldName, tagValue) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const pills = container.querySelectorAll('.tag-pill-form');
        let removed = false;
        pills.forEach(p => {
            if (p.getAttribute('data-tag') === tagValue) {
                p.remove();
                removed = true;
            }
        });
        if (removed) {
            this.saveFieldValue(fieldName, this.getTagValues(containerId));
            if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName)) {
                this.updateFilenamePreview();
            }
            if (this._idAutocompleteState.containerId === containerId) {
                this.renderIdAutocompleteDropdown();
            }
        }
    },

    /**
     * Get all tag values from a tags-form-container (structured objects for link fields, or strings for tags)
     */
    getTagValues(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return [];
        return [...container.querySelectorAll('.tag-pill-form')].map(p => {
            const rawJson = p.getAttribute('data-item-json');
            if (rawJson) {
                try {
                    const parsed = JSON.parse(rawJson);
                    if (parsed && typeof parsed === 'object') return parsed;
                } catch (_) { }
            }
            return p.getAttribute('data-tag');
        });
    },

    /**
     * Load user_index IDs and Tags for the current user and cache the entries
     */
    async loadIdAutocomplete(datalistId, forceReload = false) {
        if (!forceReload && Array.isArray(this._idDictionaryItems) && Array.isArray(this._tagDictionaryItems)) {
            return this._idDictionaryItems;
        }

        try {
            const userInfo = window.userManager?.getCurrentUserInfo() || { username: 'Unknown' };
            if (window.electronAPI?.loadIdDictionary) {
                const result = await window.electronAPI.loadIdDictionary(userInfo);
                if (result?.success) {
                    this._idDictionaryItems = Array.isArray(result.ids) ? result.ids.map(item => ({
                        id: typeof item === 'string' ? item : item.id,
                        type: typeof item === 'string' ? 'id_anchor' : (item.type || 'id_anchor')
                    })).filter(item => item.id) : [];

                    this._tagDictionaryItems = Array.isArray(result.tags) ? result.tags.map(item => ({
                        id: typeof item === 'string' ? item : item.id,
                        type: 'tag',
                        count: typeof item === 'object' && item.count ? item.count : 0
                    })).filter(item => item.id) : [];

                    const datalist = datalistId ? document.getElementById(datalistId) : null;
                    if (datalist) {
                        datalist.innerHTML = this._idDictionaryItems.map(item => {
                            const label = item.type === 'project' ? '📁 Project' : '⚓ ID';
                            return `<option value="${item.id}">${label}</option>`;
                        }).join('');
                        datalist.dataset.loaded = 'true';
                    }
                    console.log(`📋 Loaded ${this._idDictionaryItems.length} IDs and ${this._tagDictionaryItems.length} Tags from User Index`);
                    return this._idDictionaryItems;
                }
            }
        } catch (err) {
            console.warn('⚠️ Could not load ID/Tag dictionary for autocomplete:', err.message);
        }
        this._idDictionaryItems = [];
        this._tagDictionaryItems = [];
        return this._idDictionaryItems;
    },

    /**
     * Open and render the custom scrollable autocomplete dropdown for derived_from IDs, Tags, or Own IDs.
     */
    async openIdAutocomplete(inputEl, datalistId, containerId, fieldName, mode = 'derived_from') {
        if (!inputEl) return;
        const container = containerId ? document.getElementById(containerId) : null;
        const resolvedMode = mode || container?.dataset?.autocompleteMode || 'derived_from';
        this._idAutocompleteState.inputEl = inputEl;
        this._idAutocompleteState.datalistId = datalistId;
        this._idAutocompleteState.containerId = containerId;
        this._idAutocompleteState.fieldName = fieldName;
        this._idAutocompleteState.mode = resolvedMode;
        this._idAutocompleteState.activeIndex = -1;

        await this.loadIdAutocomplete(datalistId, false);
        this.renderIdAutocompleteDropdown();
    },

    /**
     * Live check and autocomplete helper for 'id_anchor' (Own / Internal ID) fields
     */
    async handleOwnIdInput(inputEl, safeFieldId, fieldName) {
        if (!inputEl) return;
        const val = (inputEl.value || '').trim();
        this.saveFieldValue(fieldName, inputEl.value);
        if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName)) {
            this.updateFilenamePreview();
        }

        await this.loadIdAutocomplete('', false);
        this.updateOwnIdStatusHint(val, safeFieldId);
        this.openIdAutocomplete(inputEl, '', `${safeFieldId}_container`, fieldName, 'own_id');
    },

    async openOwnIdSuggestions(inputEl, safeFieldId, fieldName) {
        if (!inputEl) return;
        await this.loadIdAutocomplete('', false);
        this.updateOwnIdStatusHint((inputEl.value || '').trim(), safeFieldId);
        this.openIdAutocomplete(inputEl, '', `${safeFieldId}_container`, fieldName, 'own_id');
    },

    updateOwnIdStatusHint(val, safeFieldId) {
        const hintEl = document.getElementById(`${safeFieldId}_hint`);
        if (!hintEl) return;
        if (!val) {
            hintEl.style.display = 'none';
            hintEl.textContent = '';
            return;
        }
        const allIds = Array.isArray(this._idDictionaryItems) ? this._idDictionaryItems : [];
        const duplicate = allIds.find(item => item.id && item.id.toLowerCase() === val.toLowerCase());
        if (duplicate) {
            hintEl.style.display = 'block';
            hintEl.style.color = '#f59e0b';
            hintEl.textContent = `⚠️ "${duplicate.id}" already exists in your User Index (${duplicate.type === 'project' ? 'Project' : 'Own ID'})`;
        } else {
            hintEl.style.display = 'none';
            hintEl.textContent = '';
        }
    },

    handleOwnIdKeydown(event, inputEl, safeFieldId, fieldName) {
        const dropdown = document.getElementById('metafoldIdAutocompleteDropdown');
        const containerId = `${safeFieldId}_container`;
        const isDropdownOpen = dropdown && dropdown.style.display !== 'none' && this._idAutocompleteState.containerId === containerId;

        if (isDropdownOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
            event.preventDefault();
            const items = this._idAutocompleteState.filteredItems || [];
            if (items.length === 0) return;
            if (event.key === 'ArrowDown') {
                this._idAutocompleteState.activeIndex = (this._idAutocompleteState.activeIndex + 1) % items.length;
            } else {
                this._idAutocompleteState.activeIndex = (this._idAutocompleteState.activeIndex - 1 + items.length) % items.length;
            }
            this._updateIdAutocompleteHighlight();
            return;
        }

        if (event.key === 'Escape' && isDropdownOpen) {
            event.preventDefault();
            this.closeIdAutocompleteDropdown();
            return;
        }

        if (event.key === 'Enter' && isDropdownOpen && this._idAutocompleteState.activeIndex >= 0) {
            event.preventDefault();
            const chosen = (this._idAutocompleteState.filteredItems || [])[this._idAutocompleteState.activeIndex];
            if (chosen && chosen.id) {
                inputEl.value = chosen.id;
                this.saveFieldValue(fieldName, chosen.id);
                if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName)) {
                    this.updateFilenamePreview();
                }
                this.updateOwnIdStatusHint(chosen.id, safeFieldId);
                this.closeIdAutocompleteDropdown();
            }
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.closeIdAutocompleteDropdown();
        }
    },

    positionIdAutocompleteDropdown() {
        const dropdown = document.getElementById('metafoldIdAutocompleteDropdown');
        const inputEl = this._idAutocompleteState.inputEl;
        if (!dropdown || !inputEl || dropdown.style.display === 'none') return;

        const rect = inputEl.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
            this.closeIdAutocompleteDropdown();
            return;
        }

        const maxHeight = 220;
        const spaceBelow = window.innerHeight - rect.bottom - 8;
        const containerEl = this._idAutocompleteState.containerId ? document.getElementById(this._idAutocompleteState.containerId) : null;
        const topAnchorRect = containerEl ? containerEl.getBoundingClientRect() : rect;
        const spaceAbove = topAnchorRect.top - 8;

        dropdown.style.left = `${Math.max(8, rect.left)}px`;
        dropdown.style.width = `${Math.max(240, rect.width)}px`;

        if (spaceBelow < 100 && spaceAbove > spaceBelow) {
            // Flip upward above the entire tags container (so pills are never covered) when at very bottom of window
            const availHeight = Math.min(maxHeight, Math.max(100, spaceAbove - 4));
            dropdown.style.maxHeight = `${availHeight}px`;
            dropdown.style.top = 'auto';
            dropdown.style.bottom = `${window.innerHeight - topAnchorRect.top + 4}px`;
        } else {
            const availHeight = Math.min(maxHeight, Math.max(100, spaceBelow - 4));
            dropdown.style.maxHeight = `${availHeight}px`;
            dropdown.style.bottom = 'auto';
            dropdown.style.top = `${rect.bottom + 4}px`;
        }
    },

    renderIdAutocompleteDropdown() {
        const { inputEl, containerId, fieldName, mode } = this._idAutocompleteState;
        if (!inputEl || !containerId) return;

        let dropdown = document.getElementById('metafoldIdAutocompleteDropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.id = 'metafoldIdAutocompleteDropdown';
            dropdown.style.cssText = `
                position: fixed;
                z-index: 100000;
                background: #1e293b;
                border: 1px solid rgba(45, 212, 191, 0.45);
                border-radius: 7px;
                box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
                max-height: 220px;
                overflow-y: auto;
                overscroll-behavior: contain;
                padding: 4px 0;
                display: none;
            `;
            document.body.appendChild(dropdown);
        }

        const query = (inputEl.value || '').trim().toLowerCase();
        let sourceItems = [];
        let existingSet = new Set();

        if (mode === 'tags') {
            const knownTags = (typeof window !== 'undefined' && window.getAllKnownTags)
                ? window.getAllKnownTags().map(t => ({ id: t, type: 'tag' }))
                : [];
            const dictTags = Array.isArray(this._tagDictionaryItems) ? this._tagDictionaryItems : [];
            const combined = new Map();
            dictTags.forEach(item => { if (item?.id) combined.set(item.id.toLowerCase(), item); });
            knownTags.forEach(item => { if (item?.id && !combined.has(item.id.toLowerCase())) combined.set(item.id.toLowerCase(), item); });
            sourceItems = Array.from(combined.values());
            existingSet = new Set(this.getTagValues(containerId).map(t => String(t).toLowerCase()));
        } else if (mode === 'own_id') {
            const allIds = Array.isArray(this._idDictionaryItems) ? this._idDictionaryItems : [];
            const ownIds = allIds.filter(i => i.type === 'id_anchor');
            sourceItems = ownIds.length > 0 ? ownIds : allIds;
        } else {
            sourceItems = Array.isArray(this._idDictionaryItems) ? this._idDictionaryItems : [];
            existingSet = new Set(this.getTagValues(containerId).map(t => String(t).toLowerCase()));
        }

        const filtered = sourceItems.filter(item => {
            if (!item || !item.id) return false;
            if (mode !== 'own_id' && existingSet.has(item.id.toLowerCase())) return false;
            if (!query) return true;
            return item.id.toLowerCase().includes(query) || (item.type && item.type.toLowerCase().includes(query));
        });

        this._idAutocompleteState.filteredItems = filtered;
        if (this._idAutocompleteState.activeIndex >= filtered.length) {
            this._idAutocompleteState.activeIndex = -1;
        }

        if (filtered.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.innerHTML = '';
        if (mode === 'own_id') {
            const header = document.createElement('div');
            header.style.cssText = 'padding: 3px 10px 4px; font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid rgba(255,255,255,0.06);';
            header.textContent = 'Existing IDs in User Index (Reference)';
            dropdown.appendChild(header);
        }

        filtered.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'id-autocomplete-item';
            row.dataset.index = String(idx);
            const isActive = idx === this._idAutocompleteState.activeIndex;
            row.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 6px 10px;
                font-size: 12px;
                color: #e2e8f0;
                cursor: pointer;
                background: ${isActive ? 'rgba(45, 212, 191, 0.22)' : 'transparent'};
                transition: background 0.1s ease;
            `;

            const idSpan = document.createElement('span');
            idSpan.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500;';
            idSpan.textContent = item.id;

            const badgeSpan = document.createElement('span');
            badgeSpan.style.cssText = 'font-size: 10.5px; color: #2dd4bf; opacity: 0.85; flex-shrink: 0; background: rgba(13, 148, 136, 0.18); padding: 1px 6px; border-radius: 999px;';
            if (mode === 'tags') {
                badgeSpan.textContent = item.count > 0 ? `🏷️ Tag (${item.count})` : '🏷️ Tag';
            } else {
                badgeSpan.textContent = item.type === 'project' ? '📁 Project' : '🔑 Own ID';
            }

            row.appendChild(idSpan);
            row.appendChild(badgeSpan);

            row.addEventListener('mouseenter', () => {
                this._idAutocompleteState.activeIndex = idx;
                this._updateIdAutocompleteHighlight(false);
            });

            // Use mousedown so it fires before input blur
            row.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (mode === 'own_id') {
                    inputEl.value = item.id;
                    this.saveFieldValue(fieldName, item.id);
                    if (this.filenameState && Array.isArray(this.filenameState.selectedFields) && this.filenameState.selectedFields.includes(fieldName)) {
                        this.updateFilenamePreview();
                    }
                    const safeFieldId = containerId.replace(/_container$/, '');
                    this.updateOwnIdStatusHint(item.id, safeFieldId);
                } else {
                    this.addTagToField(containerId, fieldName, item.id, inputEl, item);
                }
                this.closeIdAutocompleteDropdown();
            });

            dropdown.appendChild(row);
        });

        dropdown.style.display = 'block';
        this.positionIdAutocompleteDropdown();

        // Register outside-click and scroll/resize listeners once while open
        if (!this._idAutocompleteState.outsideClickHandler) {
            this._idAutocompleteState.outsideClickHandler = (e) => {
                const dd = document.getElementById('metafoldIdAutocompleteDropdown');
                const inp = this._idAutocompleteState.inputEl;
                if (dd && dd.contains(e.target)) return;
                if (inp && (e.target === inp || inp.contains(e.target))) return;
                this.closeIdAutocompleteDropdown();
            };
            document.addEventListener('mousedown', this._idAutocompleteState.outsideClickHandler, true);
        }

        if (!this._idAutocompleteState.scrollResizeHandler) {
            this._idAutocompleteState.scrollResizeHandler = (e) => {
                const dd = document.getElementById('metafoldIdAutocompleteDropdown');
                if (dd && e && e.target && (e.target === dd || dd.contains(e.target))) {
                    return; // scrolling inside the autocomplete dropdown itself
                }
                this.positionIdAutocompleteDropdown();
            };
            window.addEventListener('resize', this._idAutocompleteState.scrollResizeHandler, true);
            window.addEventListener('scroll', this._idAutocompleteState.scrollResizeHandler, true);
        }
    },

    _updateIdAutocompleteHighlight(scrollIntoView = true) {
        const dropdown = document.getElementById('metafoldIdAutocompleteDropdown');
        if (!dropdown) return;
        const rows = dropdown.querySelectorAll('.id-autocomplete-item');
        rows.forEach((row, i) => {
            const isActive = i === this._idAutocompleteState.activeIndex;
            row.style.background = isActive ? 'rgba(45, 212, 191, 0.22)' : 'transparent';
            if (isActive && scrollIntoView && typeof row.scrollIntoView === 'function') {
                row.scrollIntoView({ block: 'nearest' });
            }
        });
    },

    closeIdAutocompleteDropdown() {
        const dropdown = document.getElementById('metafoldIdAutocompleteDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
        }
        if (this._idAutocompleteState.outsideClickHandler) {
            document.removeEventListener('mousedown', this._idAutocompleteState.outsideClickHandler, true);
            this._idAutocompleteState.outsideClickHandler = null;
        }
        if (this._idAutocompleteState.scrollResizeHandler) {
            window.removeEventListener('resize', this._idAutocompleteState.scrollResizeHandler, true);
            window.removeEventListener('scroll', this._idAutocompleteState.scrollResizeHandler, true);
            this._idAutocompleteState.scrollResizeHandler = null;
        }
        this._idAutocompleteState.activeIndex = -1;
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
                `Scan folder to index MetaFold projects (IDs & Tags):\n"${dirPath}"\n\n` +
                `Click OK to include ALL subfolders (recursive).\n` +
                `Click Cancel to scan only this folder.`
            );

            const userInfo = window.userManager?.getCurrentUserInfo() || { username: 'Unknown' };

            let result;
            if (window.electronAPI?.harvestIdsFromFolder) {
                result = await window.electronAPI.harvestIdsFromFolder(dirPath, recursive, userInfo);
            }

            if (result?.success) {
                const container = document.getElementById(containerId);
                const mode = container?.dataset?.autocompleteMode || 'derived_from';
                const msg = mode === 'tags'
                    ? `✅ ${result.foundCount || 0} projects scanned, ${result.newTagsCount ?? 0} new tags (total: ${result.totalTags ?? '?'})`
                    : `✅ ${result.foundCount || 0} projects scanned, ${result.newCount ?? 0} new IDs (total: ${result.total ?? '?'})`;
                console.log(msg);
                if (result.debugInfo) {
                    console.log('🔍 Scanner Debug Info:', result.debugInfo);
                }
                // Refresh autocomplete dictionary cache
                const datalist = document.getElementById('datalist_' + containerId) ||
                    (container ? container.parentElement.querySelector('datalist') : null);
                this._idDictionaryItems = null;
                this._tagDictionaryItems = null;
                await this.loadIdAutocomplete(datalist ? datalist.id : '', true);

                if (mode === 'own_id') {
                    const safeFieldId = containerId.replace(/_container$/, '');
                    const inputEl = document.getElementById(safeFieldId);
                    if (inputEl) {
                        this.updateOwnIdStatusHint((inputEl.value || '').trim(), safeFieldId);
                    }
                }
                if (window.projectScanner && typeof window.projectScanner.updateIndexBadge === 'function') {
                    window.projectScanner.updateIndexBadge();
                }

                // Show brief feedback next to the button
                const btn = container?.querySelector('.scan-index-folder-btn');
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