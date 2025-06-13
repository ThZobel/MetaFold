// Enhanced Experiment Form with Drag & Drop Support for Field Reordering

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

    // Manage saved field values
    getSavedFieldValue(fieldName) {
        return this.savedFieldValues[fieldName];
    },

    saveFieldValue(fieldName, value) {
        this.savedFieldValues[fieldName] = value;
    },

    clearSavedFieldValues() {
        this.savedFieldValues = {};
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

    // Enhanced render single field with drag & drop support
    renderField(container, fieldName, fieldInfo) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group draggable-field';
        fieldDiv.draggable = true;
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
        
        // NEW: Add drag handle and position indicator for experiment form
        const dragHandle = `
            <div class="experiment-drag-handle" title="Drag to reorder field">
                <span class="experiment-drag-icon">⋮⋮</span>
            </div>
        `;
        
        const positionIndicator = fieldInfo.position ? 
            `<span class="experiment-field-position" style="font-size: 10px; color: #9ca3af; margin-left: 8px;">[${fieldInfo.position}]</span>` : '';
        
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
        
        // Enhanced label with drag handle and position indicator
        const labelHtml = fieldInfo.description ? 
            `<div class="field-label-container">
                ${dragHandle}
                <span>${fieldInfo.label}${requiredMark} ${positionIndicator}</span>
                <small style="color: #9ca3af; font-weight: normal; display: block; margin-top: 2px;">(${fieldInfo.description})</small>
            </div>` :
            `<div class="field-label-container">
                ${dragHandle}
                <span>${fieldInfo.label}${requiredMark} ${positionIndicator}</span>
            </div>`;
        
        fieldDiv.innerHTML = `
            <label for="${safeFieldId}">${labelHtml}:</label>
            ${inputHtml}
        `;
        
        // NEW: Add drag event listeners to the field
        this.addFieldDragEventListeners(fieldDiv, fieldName);
        
        container.appendChild(fieldDiv);
        
        // Event listener for saving values
        const input = fieldDiv.querySelector(`#${safeFieldId}`);
        if (input) {
            input.addEventListener('change', () => {
                const realFieldName = input.getAttribute('data-field-name');
                this.saveFieldValue(realFieldName, input.type === 'checkbox' ? input.checked : input.value);
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

    // Enhanced save template with field order support
    saveTemplate() {
        console.log('💾 Starting enhanced saveTemplate with field order support...');
        
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

        // Find the correct template index in the own templates array
        const templateIndex = templateManager.templates.findIndex(t => 
            t.name === templateManager.currentTemplate.name && 
            t.createdBy === templateManager.currentTemplate.createdBy &&
            t.createdAt === templateManager.currentTemplate.createdAt
        );

        if (templateIndex < 0) {
            console.error('❌ Template not found in own templates array');
            alert('Error: Could not find template to update. This might be a shared template that you need to copy first.');
            return;
        }

        console.log('💾 Found template at index:', templateIndex);

        // Create updated template
        const updatedTemplate = { ...templateManager.templates[templateIndex] };
        
        // Handle both enhanced and legacy metadata formats
        let fieldsToUpdate;
        if (updatedTemplate.metadata.fields) {
            // Enhanced format
            fieldsToUpdate = updatedTemplate.metadata.fields;
        } else {
            // Legacy format
            fieldsToUpdate = updatedTemplate.metadata;
        }
        
        // Merge current form values into template metadata
        Object.entries(currentData).forEach(([fieldName, value]) => {
            if (fieldsToUpdate[fieldName]) {
                fieldsToUpdate[fieldName].value = value;
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

        // Update template in templateManager
        templateManager.update(templateIndex, updatedTemplate);
        
        // Update current template reference
        templateManager.currentTemplate = updatedTemplate;
        
        // Show success message
        this.showSaveMessage('✅ Template values and project paths saved successfully! (Field order preserved)');
        
        console.log('✅ Enhanced template saved successfully with field order preservation');
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
    }
};

// Make globally available
window.experimentForm = experimentForm;

// Make debug function globally available for testing
window.debugFieldOrder = () => experimentForm.debugFieldOrder();

console.log('✅ Enhanced Experiment Form loaded with Field Order Support');