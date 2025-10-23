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
            // 1. Clear all form inputs using existing function
            this.clearAllFormInputs();
            
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
        
        // Render fields in the specified order
        fieldOrder.forEach(fieldName => {
            const fieldInfo = fieldsToRender[fieldName];
            if (!fieldInfo) {
                console.warn(`⚠️ Field "${fieldName}" in fieldOrder but not found in fields`);
                return;
            }
            
            if (fieldInfo.type === 'group') {
                // Render group header
                this.renderGroupHeader(container, fieldName, fieldInfo);
            } else {
                // Render normal field
                this.renderField(container, fieldName, fieldInfo);
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
        }, 150);
    },

        // ENHANCED: Add validation to saveAsTemplateEnhanced
        async saveAsTemplateEnhanced() {
            console.log('💾 Starting enhanced save as template...');
            
            // ENHANCED VALIDATION: Prevent creation with invalid context
            if (!this.preventAutoTemplateCreation()) {
                alert('❌ Cannot create template:\n\n• Invalid user context\n• No valid template selected\n\nPlease:\n1. Go to Settings → User Management\n2. Select or create a user\n3. Select a valid experiment template\n4. Try creating the template again');
                return;
            }
            
            // Continue with original saveAsTemplateEnhanced logic...
        },

        // ENHANCED: Add validation to saveTemplate  
        async saveTemplate() {
            console.log('💾 Starting template-specific save with validation...');
            
            // VALIDATION: Prevent saving invalid template
            if (!this.preventAutoTemplateCreation()) {
                alert('❌ Cannot save template: Invalid template or user context');
                return;
            }
            
            // Continue with original saveTemplate logic...
        },

        // NEW: Safe template initialization check
        checkTemplateInitialization() {
            const template = window.templateManager?.currentTemplate;
            
            if (!template) {
                console.warn('⚠️ No template selected for initialization');
                return false;
            }
            
            if (!template.name || template.name === 'undefined' || template.name.includes('undefined')) {
                console.warn('⚠️ Invalid template name detected:', template.name);
                return false;
            }
            
            if (!template.createdBy || template.createdBy === 'Unknown') {
                console.warn('⚠️ Invalid template creator detected:', template.createdBy);
                return false;
            }
            
            return true;
        },
    
    savedFieldValues: {},
    
    // NEW: Drag & Drop state for experiment form
    dragState: {
        isDragging: false,
        draggedElement: null,
        draggedFieldName: null,
        dropIndicator: null,
        originalOrder: [] // Store original field order
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

    // Enhanced render experiment form with field order support
    render(metadata) {
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
        
        // Render fields in the specified order
        fieldOrder.forEach(fieldName => {
            const fieldInfo = fieldsToRender[fieldName];
            if (!fieldInfo) {
                console.warn(`⚠️ Field "${fieldName}" in fieldOrder but not found in fields`);
                return;
            }
            
            if (fieldInfo.type === 'group') {
                // Render group header
                this.renderGroupHeader(container, fieldName, fieldInfo);
            } else {
                // Render normal field
                this.renderField(container, fieldName, fieldInfo);
            }
        });
        
        console.log(`✅ Rendered ${fieldOrder.length} fields in specified order`);
        
        // NEW: Initialize filename state from template
        this.initializeFilenameStateFromTemplate();
        
        // NEW: Update filename preview after field values are loaded
        setTimeout(() => {
            this.updateFilenamePreview();
            console.log('📝 Filename preview updated after template load');
            
            // NEW: Reset template switching flag AFTER everything is loaded
            this.filenameState.isSwitchingTemplate = false;
            console.log('✅ Template switch complete, auto-save re-enabled');
        }, 200);
    },

    // Render group header
    renderGroupHeader(container, fieldName, fieldInfo) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'form-group-header';
        groupDiv.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); 
                        border-radius: 8px; padding: 15px; margin: 20px 0 10px 0;">
                <h4 style="color: #a855f7; margin: 0 0 5px 0;">${fieldInfo.label}</h4>
                ${fieldInfo.description ? `<p style="color: #9ca3af; font-size: 12px; margin: 0;">${fieldInfo.description}</p>` : ''}
            </div>
        `;
        container.appendChild(groupDiv);
    },

    // Enhanced render single field WITHOUT drag & drop support (disabled for experiment form)
    renderField(container, fieldName, fieldInfo) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group';
        // ❌ REMOVED: fieldDiv.draggable = true; - Drag & Drop disabled in experiment form
        fieldDiv.setAttribute('data-field-name', fieldName);
        
        // Check if field belongs to a group (nested)
        if (fieldName.includes('.')) {
            fieldDiv.classList.add('nested-field');
        }
        
        // Add position indicator for development/debugging
        if (fieldInfo.position) {
            fieldDiv.setAttribute('data-field-position', fieldInfo.position);
        }
        
        const isRequired = fieldInfo.required || false;
        const requiredMark = isRequired ? ' <span style="color: #ef4444;">*</span>' : '';
        
        // Create safe ID for the field
        const safeFieldId = 'field_' + this.createSafeId(fieldName);
        
        let inputHtml = '';
        const savedValue = this.getSavedFieldValue(fieldName) || fieldInfo.value || '';
        
        // ❌ REMOVED: Drag handle and position indicator - not needed in experiment form
        
        switch (fieldInfo.type) {
            case 'text':
                inputHtml = `<input type="text" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''}>`;
                break;
            case 'number':
                const min = fieldInfo.min !== undefined ? `min="${fieldInfo.min}"` : '';
                const max = fieldInfo.max !== undefined ? `max="${fieldInfo.max}"` : '';
                inputHtml = `<input type="number" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${min} ${max} ${isRequired ? 'required' : ''}>`;
                break;
            case 'date':
                inputHtml = `<input type="date" id="${safeFieldId}" data-field-name="${fieldName}" value="${savedValue}" ${isRequired ? 'required' : ''}>`;
                break;
            case 'textarea':
                inputHtml = `<textarea id="${safeFieldId}" data-field-name="${fieldName}" ${isRequired ? 'required' : ''}>${savedValue}</textarea>`;
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
                inputHtml = `<input type="checkbox" id="${safeFieldId}" data-field-name="${fieldName}" ${checked} style="width: auto; margin-right: 8px;">`;
                break;
        }
        
        // Enhanced label WITHOUT drag handle
        const labelHtml = fieldInfo.description ? 
            `<div class="field-label-container">
                <span>${fieldInfo.label}${requiredMark}</span>
                <small style="color: #9ca3af; font-weight: normal; display: block; margin-top: 2px;">(${fieldInfo.description})</small>
            </div>` :
            `<div class="field-label-container">
                <span>${fieldInfo.label}${requiredMark}</span>
            </div>`;
        
        // NEW: Use for Filename Checkbox
        // WICHTIG: Während Template-Switch nicht checked setzen, wird später programmtisch gesetzt
        const isCheckedAttr = (this.filenameState.isSwitchingTemplate) ? '' : (fieldInfo.useForFilename ? 'checked' : '');
        const useForFilenameCheckbox = `
            <div style="margin-top: 8px; padding: 6px; background: rgba(16, 185, 129, 0.1); border-radius: 4px;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 0.85rem; cursor: pointer;">
                    <input type="checkbox" 
                           id="useForFilename_${safeFieldId}"
                           data-field-name="${fieldName}"
                           ${isCheckedAttr}
                           onchange="experimentForm.handleFilenameCheckboxChange('${fieldName}', this.checked)"
                           style="width: auto; margin: 0;">
                    <span style="color: #10b981; font-weight: 500;">📝 Use for filename</span>
                </label>
            </div>
        `;
        
        fieldDiv.innerHTML = `
            <label for="${safeFieldId}">${labelHtml}:</label>
            ${inputHtml}
            ${useForFilenameCheckbox}
        `;
        
        // ❌ REMOVED: addFieldDragEventListeners - Drag & Drop disabled in experiment form
        
        container.appendChild(fieldDiv);
        
        // Event listener for saving values
        const input = fieldDiv.querySelector(`#${safeFieldId}`);
        if (input) {
            input.addEventListener('change', () => {
                const realFieldName = input.getAttribute('data-field-name');
                this.saveFieldValue(realFieldName, input.type === 'checkbox' ? input.checked : input.value);
                
                // NEW: Update filename preview if this field is used for filename
                if (this.filenameState.selectedFields.includes(realFieldName)) {
                    this.updateFilenamePreview();
                }
            });
        }
    },

    // NEW: Add drag and drop event listeners to experiment form fields
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
            this.dragState.dropIndicator.style.display = 'block';
            
            console.log('🎯 Experiment field drag started:', fieldName);
        });

        // Drag end
        fieldDiv.addEventListener('dragend', (e) => {
            this.dragState.isDragging = false;
            fieldDiv.classList.remove('dragging-experiment-field');
            
            // Hide drop indicator
            this.dragState.dropIndicator.style.display = 'none';
            
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
            
            const afterElement = this.getExperimentDragAfterElement(fieldDiv, e.clientY);
            const container = document.getElementById('experimentFields');
            
            if (afterElement == null) {
                container.appendChild(this.dragState.dropIndicator);
            } else {
                container.insertBefore(this.dragState.dropIndicator, afterElement);
            }
        });

        // Drop
        fieldDiv.addEventListener('drop', (e) => {
            if (!this.dragState.isDragging) return;
            
            e.preventDefault();
            const targetFieldName = fieldDiv.getAttribute('data-field-name');
            
            if (targetFieldName !== this.dragState.draggedFieldName) {
                this.reorderExperimentFields(this.dragState.draggedFieldName, targetFieldName);
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

    // Safe ID generation for HTML elements (unchanged)
    createSafeId(fieldName) {
        return fieldName.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Enhanced validate experiment fields with field order support
    validate() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return { valid: true };
        }
        
        const metadata = templateManager.currentTemplate.metadata;
        const missingFields = [];
        
        // Determine which fields object to validate
        const fieldsToValidate = metadata.fields || metadata;
        
        Object.entries(fieldsToValidate).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.required && fieldInfo.type !== 'group') {
                const safeFieldId = 'field_' + this.createSafeId(fieldName);
                const input = document.getElementById(safeFieldId);
                if (!input) return;
                
                let value = input.value;
                if (input.type === 'checkbox') {
                    value = input.checked;
                }
                
                // Validation by type
                if (fieldInfo.type === 'checkbox') {
                    // Checkboxes are always valid
                } else if (!value || value.toString().trim() === '') {
                    missingFields.push(fieldInfo.label || fieldName);
                }
            }
        });
        
        if (missingFields.length > 0) {
            return {
                valid: false,
                message: `Please fill in all required fields: ${missingFields.join(', ')}`
            };
        }
        
        return { valid: true };
    },


// UPDATED: Enhanced save template with immediate file storage
    saveTemplate() {
        console.log('💾 Starting template-specific save with file storage...');
        
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            alert('No template selected or no metadata available to save.');
            return;
        }

        // Check if user owns this template
        if (!templateManager.currentTemplate.isOwn) {
            alert('You can only save your own templates. Please copy this template first to make changes.');
            return;
        }

        // Collect current form data
        const currentData = this.collectFormValues();
        
        if (!currentData || Object.keys(currentData).length === 0) {
            alert('No data to save.');
            return;
        }

        // Get current project paths
        const basePath = document.getElementById('targetPath')?.value?.trim() || '';
        const projectName = document.getElementById('projectName')?.value?.trim() || '';

        console.log('💾 Form data collected:', Object.keys(currentData).length, 'fields');
        console.log('💾 Project paths:', { basePath, projectName });

        // Find the correct template index
        const templateIndex = templateManager.templates.findIndex(t => 
            t.name === templateManager.currentTemplate.name && 
            t.createdBy === templateManager.currentTemplate.createdBy &&
            t.createdAt === templateManager.currentTemplate.createdAt
        );

        if (templateIndex < 0) {
            console.error('❌ Template not found in templates array');
            alert('Error: Could not find template to update.');
            return;
        }

        console.log('💾 Found template at index:', templateIndex);

        // NEW: Save all filename checkbox states to template before updating
        this.saveAllFilenameCheckboxesToTemplate();

        // Create deep copy to avoid reference sharing
        const originalTemplate = templateManager.templates[templateIndex];
        const updatedTemplate = createDeepCopy(originalTemplate);
        
        // Handle both enhanced and legacy metadata formats
        let fieldsToUpdate;
        if (updatedTemplate.metadata.fields) {
            fieldsToUpdate = updatedTemplate.metadata.fields;
        } else {
            fieldsToUpdate = updatedTemplate.metadata;
        }
        
        // SAFE: Merge current form values into template metadata
        Object.entries(currentData).forEach(([fieldName, value]) => {
            if (fieldsToUpdate[fieldName]) {
                fieldsToUpdate[fieldName] = { 
                    ...fieldsToUpdate[fieldName],
                    value: value 
                };
                console.log(`💾 Updated field "${fieldName}":`, value);
            }
        });

        // Save project paths with template
        if (!updatedTemplate.projectDefaults) {
            updatedTemplate.projectDefaults = {};
        }
        updatedTemplate.projectDefaults.basePath = basePath;
        updatedTemplate.projectDefaults.projectName = projectName;
        updatedTemplate.updatedAt = new Date().toISOString();

        // Update template with immediate file storage
        templateManager.update(templateIndex, updatedTemplate);
        templateManager.currentTemplate = updatedTemplate;
        
        // Show success message
        this.showSaveMessage('✅ Template values and project paths saved successfully!');
        
        console.log('✅ Template saved successfully with file storage');
    },

    // NEW: Clear current template values
    clearTemplate() {
        console.log('🧹 Starting template clear...');
        
        if (!templateManager.currentTemplate) {
            alert('No template selected to clear.');
            return;
        }

        if (!templateManager.currentTemplate.isOwn) {
            alert('You can only clear your own templates. Please copy this template first.');
            return;
        }

        // Confirmation already handled by menu - proceed directly

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

    // NEW: Clear all form inputs
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

    // NEW: Clear template values permanently (save cleared state)
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

        // Removed duplicate confirmation - already confirmed in menu

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

    // NEW: Show template actions menu
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

            const safeFieldId = 'field_' + this.createSafeId(fieldName);
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

    // Show save message (unchanged)
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

        // Collect data in the specified field order
        fieldOrder.forEach(fieldName => {
            const fieldInfo = fieldsSource[fieldName];
            if (!fieldInfo || fieldInfo.type === 'group') return; // Skip groups
        
            const safeFieldId = 'field_' + this.createSafeId(fieldName);
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
            
            metadata[fieldName] = {
                label: fieldInfo.label,
                type: fieldInfo.type,
                value: value,
                required: fieldInfo.required || false,
                position: fieldInfo.position || (fieldOrder.indexOf(fieldName) + 1)
            };
            
            // Carry over additional properties
            if (fieldInfo.options) metadata[fieldName].options = fieldInfo.options;
            if (fieldInfo.min !== undefined) metadata[fieldName].min = fieldInfo.min;
            if (fieldInfo.max !== undefined) metadata[fieldName].max = fieldInfo.max;
            if (fieldInfo.description) metadata[fieldName].description = fieldInfo.description;
        });
        
        console.log(`📋 Collected data for ${Object.keys(metadata).length} fields in custom order`);
        return metadata;
    },

    // NEW: Debug function to show current field order
    debugFieldOrder() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            console.log('❌ No template or metadata available for debug');
            return;
        }

        const metadata = templateManager.currentTemplate.metadata;
        
        console.log('🐛 FIELD ORDER DEBUG:');
        console.log('Template name:', templateManager.currentTemplate.name);
        
        if (metadata.fields && metadata.fieldOrder) {
            console.log('✅ Enhanced format detected');
            console.log('Field order:', metadata.fieldOrder);
            console.log('Fields object:', Object.keys(metadata.fields));
        } else if (metadata.fieldOrder) {
            console.log('⚠️ Transitional format detected');
            console.log('Field order:', metadata.fieldOrder);
            console.log('Root fields:', Object.keys(metadata).filter(k => k !== 'fieldOrder'));
        } else {
            console.log('📋 Legacy format detected');
            console.log('Available fields (alphabetical):', Object.keys(metadata).sort());
            
            // Check for position hints
            const withPositions = Object.entries(metadata).filter(([k, v]) => v.position !== undefined);
            if (withPositions.length > 0) {
                console.log('Position hints found:', withPositions.map(([k, v]) => `${k}: ${v.position}`));
            }
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

    // Add this enhanced saveAsTemplate function to experimentForm.js to prevent "Unknown" templates

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
                savedFormData: formData
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
            const input = document.getElementById(safeFieldId);
            
            if (input && input.value) {
                let value = input.type === 'checkbox' ? (input.checked ? 'Yes' : 'No') : input.value;
                
                // Sanitize the value
                value = this.sanitizeFilename(value);
                
                if (value) {
                    parts.push(value);
                }
            }
        });
        
        // Generate filename
        let filename = parts.length > 0 ? parts.join('_') : 'Select fields with "Use for filename"';
        
        // Update preview
        previewDiv.textContent = filename;
        
        // Check length and show warning
        if (parts.length > 0 && filename.length > 30) {
            warningDiv.style.display = 'block';
            warningDiv.textContent = `⚠️ Filename exceeds 30 characters (${filename.length})`;
        } else {
            warningDiv.style.display = 'none';
        }
        
        console.log(`📝 Filename updated: ${filename} (${filename.length} chars)`);
    },

    /**
     * Sanitize filename - only allow A-Z, a-z, 0-9, _, -
     */
    sanitizeFilename(value) {
        if (!value) return '';
        
        return value
            .replace(/[^a-zA-Z0-9_-]/g, '_')  // Replace invalid chars with _
            .replace(/_+/g, '_')               // Replace multiple _ with single _
            .replace(/^_|_$/g, '');            // Remove leading/trailing _
    },

    /**
     * Copy filename to clipboard
     */
    async copyFilenameToClipboard() {
        const previewDiv = document.getElementById('filenamePreview');
        if (!previewDiv) return;
        
        const filename = previewDiv.textContent;
        
        if (filename === 'Select fields with "Use for filename"' || !filename) {
            this.showSaveMessage('⚠️ No filename generated yet');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(filename);
            this.showSaveMessage('📋 Filename copied to clipboard!');
            console.log('📋 Filename copied:', filename);
        } catch (error) {
            console.error('Error copying filename:', error);
            this.showSaveMessage('❌ Failed to copy filename');
        }
    },

    /**
     * Initialize filename state from template
     */
    initializeFilenameStateFromTemplate() {
        if (!window.templateManager?.currentTemplate) return;
        
        const template = window.templateManager.currentTemplate;
        const metadata = template.metadata;
        this.filenameState.selectedFields = [];
        
        console.log('📝 Initializing filename state from template...');
        
        // NEW: Restore saved filename prefix FIRST
        const prefixInput = document.getElementById('filenamePrefix');
        if (prefixInput && template.filenamePrefix !== undefined) {
            prefixInput.value = template.filenamePrefix;
            this.filenameState.prefix = template.filenamePrefix;
            console.log(`📝 Restored filename prefix: "${template.filenamePrefix}"`);
        }
        
        // Handle both metadata formats
        const fieldsToCheck = metadata.fields || metadata;
        
        // NEW: Collect fields with useForFilename and sort by filenameOrder
        const fieldsWithFilename = [];
        Object.entries(fieldsToCheck).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.useForFilename && fieldInfo.filenameOrder !== undefined) {
                fieldsWithFilename.push({
                    name: fieldName,
                    order: fieldInfo.filenameOrder
                });
            }
        });
        
        // Sort by filenameOrder
        fieldsWithFilename.sort((a, b) => a.order - b.order);
        
        if (fieldsWithFilename.length > 0) {
            console.log(`📝 Restoring ${fieldsWithFilename.length} checkboxes in order...`);
            
            // Set checkboxes one by one in order
            fieldsWithFilename.forEach((field, index) => {
                const safeFieldId = 'field_' + this.createSafeId(field.name);
                const checkbox = document.getElementById(`useForFilename_${safeFieldId}`);
                
                if (checkbox && !checkbox.checked) {
                    console.log(`  [✅ ${field.order}] Setting checkbox for: ${field.name}`);
                    checkbox.checked = true;
                    
                    // Add to selectedFields in correct order
                    this.filenameState.selectedFields.push(field.name);
                }
            });
            
            // DON'T update filename preview yet - wait for field values to load
            console.log('📝 Filename state restored from filenameOrder (waiting for values)');
            
        } else {
            console.log('📝 No filename configuration found in template');
        }
    },

    /**
     * NEW: Save all "Use for filename" checkbox states to template
     * This function collects ALL checkbox states and updates the template metadata
     */
    saveAllFilenameCheckboxesToTemplate() {
        console.log('💾 Saving all filename checkbox states to template...');
        
        if (!window.templateManager?.currentTemplate) {
            console.warn('⚠️ No current template to save checkbox states');
            return;
        }
        
        const template = window.templateManager.currentTemplate;
        const metadata = template.metadata;
        
        // Determine which fields object to use (enhanced or legacy format)
        const fieldsToUpdate = metadata.fields || metadata;
        
        // Find all "Use for filename" checkboxes in the DOM
        const checkboxes = document.querySelectorAll('input[id^="useForFilename_"]');
        
        let updatedCount = 0;
        
        // First pass: Set all useForFilename and clear filenameOrder
        checkboxes.forEach(checkbox => {
            const fieldName = checkbox.getAttribute('data-field-name');
            const isChecked = checkbox.checked;
            
            if (fieldName && fieldsToUpdate[fieldName]) {
                fieldsToUpdate[fieldName].useForFilename = isChecked;
                
                // Clear filenameOrder if not checked
                if (!isChecked) {
                    delete fieldsToUpdate[fieldName].filenameOrder;
                }
                
                updatedCount++;
                console.log(`  📝 ${fieldName}: useForFilename = ${isChecked}`);
            }
        });
        
        // Second pass: Set filenameOrder for checked fields in current order
        this.filenameState.selectedFields.forEach((fieldName, index) => {
            if (fieldsToUpdate[fieldName]) {
                fieldsToUpdate[fieldName].filenameOrder = index + 1;
                console.log(`  🔢 ${fieldName}: filenameOrder = ${index + 1}`);
            }
        });
        
        // Save the manual prefix in template
        const prefixInput = document.getElementById('filenamePrefix');
        if (prefixInput) {
            template.filenamePrefix = prefixInput.value || '';
            console.log(`  📝 Saved filename prefix: "${template.filenamePrefix}"`);
        }
        
        console.log(`✅ Updated ${updatedCount} checkbox states with filenameOrder in template`);
        
        return updatedCount;
    }

};

function createDeepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
        return obj.map(item => createDeepCopy(item));
    }
    
    if (typeof obj === 'object') {
        const copy = {};
        Object.keys(obj).forEach(key => {
            copy[key] = createDeepCopy(obj[key]);
        });
        return copy;
    }
    
    return obj;

}



// Make globally available
window.experimentForm = experimentForm;

// Make debug function globally available for testing
window.debugFieldOrder = () => experimentForm.debugFieldOrder();

console.log('✅ Enhanced Experiment Form loaded with Field Order Support');