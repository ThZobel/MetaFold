// Enhanced Metadata Editor for Experiment Templates with Drag & Drop Support

const metadataEditor = {
    fieldCounter: 0,
    dragState: {
        isDragging: false,
        draggedElement: null,
        draggedIndex: -1,
        dropIndicator: null
    },

    // Initialize the metadata editor
    init() {
        this.createDropIndicator();
        console.log('✅ Metadata Editor initialized with Drag & Drop support');
    },

    // Create drop indicator element
    createDropIndicator() {
        if (!this.dragState.dropIndicator) {
            this.dragState.dropIndicator = document.createElement('div');
            this.dragState.dropIndicator.className = 'drag-drop-indicator';
            this.dragState.dropIndicator.innerHTML = '<div class="drop-line"></div>';
            this.dragState.dropIndicator.style.display = 'none';
        }
    },

    // Enhanced add metadata field with better position indicator placement
    addField(fieldType = null) {
        const container = document.getElementById('metadataFields');
        const fieldId = 'field_' + (++this.fieldCounter);
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'metadata-field';
        fieldDiv.draggable = true;
        fieldDiv.setAttribute('data-field-id', fieldId);
        
        // Default field type - prioritize passed parameter
        const defaultType = fieldType || 'text';
        
        fieldDiv.innerHTML = `
            <div class="metadata-field-header">
                <div class="drag-handle" title="Drag to reorder">
                    <span class="drag-icon">⋮⋮</span>
                </div>
                <input type="text" class="field-name-input" placeholder="Field Name" onchange="metadataEditor.updateJsonPreview()" style="flex: 1; margin-right: 10px;">
                <div class="field-position-indicator">
                    <span class="position-number">Pos: ${this.getFieldPosition(fieldDiv)}</span>
                </div>
                <div class="metadata-field-controls">
                    <label class="required-label" style="display: flex; align-items: center; margin-right: 10px; font-size: 12px;">
                        <input type="checkbox" class="required-checkbox" onchange="metadataEditor.updateJsonPreview()" style="margin-right: 5px; width: auto;">
                        Required
                    </label>
                    <select class="field-type-selector" onchange="metadataEditor.updateFieldType(this); metadataEditor.updateJsonPreview()">
                        <option value="text" ${defaultType === 'text' ? 'selected' : ''}>Text</option>
                        <option value="number" ${defaultType === 'number' ? 'selected' : ''}>Number</option>
                        <option value="date" ${defaultType === 'date' ? 'selected' : ''}>Date</option>
                        <option value="textarea" ${defaultType === 'textarea' ? 'selected' : ''}>Text Area</option>
                        <option value="dropdown" ${defaultType === 'dropdown' ? 'selected' : ''}>Dropdown</option>
                        <option value="checkbox" ${defaultType === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                        <option value="group" ${defaultType === 'group' ? 'selected' : ''}>Group</option>
                    </select>
                    <button class="btn btn-danger btn-small" onclick="metadataEditor.removeField(this)">×</button>
                </div>
            </div>
            <div class="field-options">
                <input type="text" class="field-label-input" placeholder="Label" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <input type="text" class="field-description-input" placeholder="Description (optional)" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <div class="field-specific-options"></div>
            </div>
        `;
        
        // Add drag event listeners
        this.addDragEventListeners(fieldDiv);
        
        container.appendChild(fieldDiv);
        
        // Set up field type specific behavior
        const typeSelector = fieldDiv.querySelector('.field-type-selector');
        this.updateFieldType(typeSelector);
        
        this.updateFieldPositions();
        this.updateJsonPreview();
        
        console.log(`➕ Added field of type: ${defaultType}`);
    },

    // Add drag and drop event listeners to a field
    addDragEventListeners(fieldDiv) {
        // Drag start
        fieldDiv.addEventListener('dragstart', (e) => {
            this.dragState.isDragging = true;
            this.dragState.draggedElement = fieldDiv;
            this.dragState.draggedIndex = this.getFieldIndex(fieldDiv);
            
            fieldDiv.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', fieldDiv.outerHTML);
            
            // Show drop indicator
            this.dragState.dropIndicator.style.display = 'block';
            
            console.log('🎯 Drag started for field:', this.dragState.draggedIndex);
        });

        // Drag end
        fieldDiv.addEventListener('dragend', (e) => {
            this.dragState.isDragging = false;
            fieldDiv.classList.remove('dragging');
            
            // Hide drop indicator
            this.dragState.dropIndicator.style.display = 'none';
            
            // Clean up any remaining visual indicators
            document.querySelectorAll('.metadata-field').forEach(field => {
                field.classList.remove('drag-over');
            });
            
            console.log('🎯 Drag ended');
        });

        // Drag over (for drop zones)
        fieldDiv.addEventListener('dragover', (e) => {
            if (!this.dragState.isDragging) return;
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            const afterElement = this.getDragAfterElement(fieldDiv, e.clientY);
            const container = document.getElementById('metadataFields');
            
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
            const targetIndex = this.getFieldIndex(fieldDiv);
            const draggedIndex = this.dragState.draggedIndex;
            
            if (targetIndex !== draggedIndex) {
                this.reorderFields(draggedIndex, targetIndex);
                console.log(`🎯 Field moved from position ${draggedIndex} to ${targetIndex}`);
            }
        });

        // Visual feedback
        fieldDiv.addEventListener('dragenter', (e) => {
            if (!this.dragState.isDragging) return;
            fieldDiv.classList.add('drag-over');
        });

        fieldDiv.addEventListener('dragleave', (e) => {
            if (!this.dragState.isDragging) return;
            fieldDiv.classList.remove('drag-over');
        });
    },

    // Get the element that should come after the dragged element
    getDragAfterElement(container, y) {
        const draggableElements = [...container.parentNode.querySelectorAll('.metadata-field:not(.dragging)')];
        
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

    // Get field index in the container
    getFieldIndex(fieldDiv) {
        const container = document.getElementById('metadataFields');
        const fields = Array.from(container.querySelectorAll('.metadata-field'));
        return fields.indexOf(fieldDiv);
    },

    // Get field position for display
    getFieldPosition(fieldDiv) {
        return this.getFieldIndex(fieldDiv) + 1;
    },

    // Reorder fields in the DOM and update positions
    reorderFields(fromIndex, toIndex) {
        const container = document.getElementById('metadataFields');
        const fields = Array.from(container.querySelectorAll('.metadata-field'));
        
        if (fromIndex < 0 || fromIndex >= fields.length || toIndex < 0 || toIndex >= fields.length) {
            return;
        }
        
        const draggedField = fields[fromIndex];
        
        // Remove the dragged field from DOM
        draggedField.remove();
        
        // Insert at new position
        if (toIndex >= fields.length - 1) {
            container.appendChild(draggedField);
        } else {
            const targetField = fields[toIndex + (fromIndex < toIndex ? 1 : 0)];
            container.insertBefore(draggedField, targetField);
        }
        
        this.updateFieldPositions();
        this.updateJsonPreview();
    },

    // Update position indicators for all fields with cleaner text
    updateFieldPositions() {
        const fields = document.querySelectorAll('.metadata-field');
        fields.forEach((field, index) => {
            const positionIndicator = field.querySelector('.position-number');
            if (positionIndicator) {
                positionIndicator.textContent = `Pos: ${index + 1}`;
            }
        });
    },

    // Remove metadata field
    removeField(button) {
        button.closest('.metadata-field').remove();
        this.updateFieldPositions();
        this.updateJsonPreview();
    },

    // Enhanced update field type with Group support
    updateFieldType(select) {
        const fieldDiv = select.closest('.metadata-field');
        const optionsDiv = fieldDiv.querySelector('.field-specific-options');
        const fieldNameInput = fieldDiv.querySelector('.field-name-input');
        const requiredLabel = fieldDiv.querySelector('.required-label');
        const type = select.value;
        
        // Clear specific options
        optionsDiv.innerHTML = '';
        
        // Handle Group fields specially
        if (type === 'group') {
            // Groups don't need field names or required checkbox
            fieldNameInput.style.display = 'none';
            requiredLabel.style.display = 'none';
            
            // Add group-specific styling
            fieldDiv.classList.add('metadata-field-group');
            
            // Group preview
            optionsDiv.innerHTML = `
                <div class="group-preview" style="
                    background: rgba(124, 58, 237, 0.1); 
                    border: 1px solid rgba(124, 58, 237, 0.3); 
                    border-radius: 8px; 
                    padding: 12px; 
                    margin-top: 8px;
                    text-align: center;
                    color: #a855f7;
                    font-style: italic;
                ">
                    📋 This will create a visual group separator in the form
                </div>
            `;
            
            console.log('🏷️ Configured field as Group');
        } else {
            // Normal fields - show field name and required checkbox
            fieldNameInput.style.display = 'block';
            requiredLabel.style.display = 'flex';
            fieldDiv.classList.remove('metadata-field-group');
            
            // Type-specific options
            if (type === 'dropdown') {
                optionsDiv.innerHTML = `
                    <input type="text" class="dropdown-options-input" placeholder="Options (comma-separated): Option1, Option2, Option3" 
                           onchange="metadataEditor.updateJsonPreview()" style="width: 100%;">
                `;
            } else if (type === 'number') {
                optionsDiv.innerHTML = `
                    <div style="display: flex; gap: 10px;">
                        <input type="number" class="number-min-input" placeholder="Min" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                        <input type="number" class="number-max-input" placeholder="Max" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                    </div>
                `;
            }
        }
    },

    // Enhanced JSON preview with proper Group field support
    updateJsonPreview() {
        const fields = document.querySelectorAll('.metadata-field');
        const metadata = {};
        const fieldOrder = [];
        
        fields.forEach((field, index) => {
            const nameInput = field.querySelector('.field-name-input');
            const labelInput = field.querySelector('.field-label-input');
            const descInput = field.querySelector('.field-description-input');
            const typeSelect = field.querySelector('.field-type-selector');
            const requiredCheckbox = field.querySelector('.required-checkbox');
            
            const fieldType = typeSelect.value;
            const label = labelInput.value.trim();
            const description = descInput ? descInput.value.trim() : '';
            const required = requiredCheckbox.checked;
            
            // Handle Group fields specially
            if (fieldType === 'group') {
                // Groups use label as the key, not field name
                const groupName = label || `Group_${index + 1}`;
                const groupKey = `${groupName}_group`; // Add _group suffix for groups
                
                const fieldData = {
                    type: 'group',
                    label: groupName,
                    position: index + 1
                };
                
                // Add description if present
                if (description) {
                    fieldData.description = description;
                }
                
                metadata[groupKey] = fieldData;
                fieldOrder.push(groupKey);
                
                console.log(`📋 Group field: ${groupKey}`, fieldData);
            } else {
                // Normal fields
                const name = nameInput.value.trim();
                
                if (name) {
                    const fieldData = {
                        type: fieldType,
                        label: label || name,
                        value: this.getDefaultValueForType(fieldType),
                        required: required,
                        position: index + 1
                    };
                    
                    // Add description if present
                    if (description) {
                        fieldData.description = description;
                    }
                    
                    // Type-specific options
                    if (fieldType === 'dropdown') {
                        const optionsInput = field.querySelector('.dropdown-options-input');
                        if (optionsInput && optionsInput.value) {
                            fieldData.options = optionsInput.value.split(',').map(s => s.trim());
                        }
                    } else if (fieldType === 'number') {
                        const minInput = field.querySelector('.number-min-input');
                        const maxInput = field.querySelector('.number-max-input');
                        if (minInput && minInput.value) fieldData.min = parseInt(minInput.value);
                        if (maxInput && maxInput.value) fieldData.max = parseInt(maxInput.value);
                    }
                    
                    metadata[name] = fieldData;
                    fieldOrder.push(name);
                    
                    console.log(`📝 Normal field: ${name}`, fieldData);
                }
            }
        });
        
        // Create enhanced metadata object with field order
        const enhancedMetadata = {
            fields: metadata,
            fieldOrder: fieldOrder,
            totalFields: fieldOrder.length
        };
        
        document.getElementById('jsonPreview').textContent = JSON.stringify(enhancedMetadata, null, 2);
        console.log('📊 JSON Preview updated:', enhancedMetadata);
    },

    // Default values for different field types (unchanged)
    getDefaultValueForType(type) {
        switch (type) {
            case 'number': return 0;
            case 'checkbox': return false;
            case 'date': return '';
            default: return '';
        }
    },

    // Default values for schema types (unchanged)
    getDefaultValueForSchemaType(type) {
        switch (type) {
            case 'string': return '';
            case 'number':
            case 'integer': return 0;
            case 'boolean': return false;
            case 'array': return [];
            case 'object': return {};
            default: return '';
        }
    },

    // Clear all metadata fields
    clearFields() {
        document.getElementById('metadataFields').innerHTML = '';
        this.updateJsonPreview();
    },

    // Load JSON template (unchanged but enhanced to handle fieldOrder)
    async loadFromJson() {
        // Check if we're in Electron environment
        if (window.electronAPI && window.electronAPI.loadJsonFile) {
            try {
                const result = await window.electronAPI.loadJsonFile();
                if (result.success) {
                    this.processJsonData(result.content);
                } else {
                    alert(result.message || 'Failed to load JSON file');
                }
            } catch (error) {
                alert('Error loading JSON file: ' + error.message);
            }
        } else {
            // Browser fallback
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const jsonData = JSON.parse(e.target.result);
                            this.processJsonData(jsonData);
                        } catch (error) {
                            alert('Error parsing JSON file: ' + error.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }
    },

    // Process loaded JSON data (enhanced to handle fieldOrder)
    processJsonData(jsonData) {
        try {
            // Check if it's an elabFTW export
            if (jsonData.elabftw && jsonData.extra_fields) {
                // Convert elabFTW format
                const metadata = this.convertElabFTWToMetadata(jsonData);
                this.loadMetadataIntoEditor(metadata);
                
                // Info message
                alert(`elabFTW export loaded successfully!\nFields: ${Object.keys(metadata.fields || metadata).length}`);
            } else if (jsonData.$schema || (jsonData.type === 'object' && jsonData.properties)) {
                // Convert JSON Schema
                const metadata = this.convertJsonSchemaToMetadata(jsonData);
                this.loadMetadataIntoEditor(metadata);
                
                // Info message
                alert(`JSON Schema loaded successfully!\nTitle: ${jsonData.title || 'Unknown'}\nFields: ${Object.keys(metadata.fields || metadata).length}`);
            } else {
                // Normal metadata JSON - check for enhanced format
                if (jsonData.fields && jsonData.fieldOrder) {
                    // Enhanced format with field order
                    this.loadMetadataIntoEditor(jsonData);
                } else {
                    // Legacy format - convert to enhanced
                    const enhancedMetadata = {
                        fields: jsonData,
                        fieldOrder: Object.keys(jsonData)
                    };
                    this.loadMetadataIntoEditor(enhancedMetadata);
                }
            }
        } catch (error) {
            alert('Error processing JSON file: ' + error.message);
        }
    },

    // Convert JSON Schema to internal metadata format (updated for enhanced format)
    convertJsonSchemaToMetadata(schema) {
        const metadata = {};
        const fieldOrder = [];
        
        if (schema.properties) {
            Object.entries(schema.properties).forEach(([key, prop]) => {
                // Map JSON Schema types to our internal types
                let internalType = 'text';
                switch (prop.type) {
                    case 'string':
                        if (prop.format === 'date') {
                            internalType = 'date';
                        } else if (prop.enum) {
                            internalType = 'dropdown';
                        } else {
                            internalType = 'text';
                        }
                        break;
                    case 'number':
                    case 'integer':
                        internalType = 'number';
                        break;
                    case 'boolean':
                        internalType = 'checkbox';
                        break;
                    default:
                        internalType = 'text';
                }
                
                const metaField = {
                    type: internalType,
                    label: prop.title || key,
                    value: prop.default || this.getDefaultValueForSchemaType(prop.type),
                    required: schema.required && schema.required.includes(key),
                    position: fieldOrder.length + 1
                };
                
                // Add description if available
                if (prop.description) {
                    metaField.description = prop.description;
                }
                
                // Handle enum for dropdowns
                if (prop.enum) {
                    metaField.options = prop.enum;
                }
                
                // Handle number constraints
                if (internalType === 'number') {
                    if (prop.minimum !== undefined) metaField.min = prop.minimum;
                    if (prop.maximum !== undefined) metaField.max = prop.maximum;
                }
                
                metadata[key] = metaField;
                fieldOrder.push(key);
            });
        }
        
        return {
            fields: metadata,
            fieldOrder: fieldOrder
        };
    },

    // Convert elabFTW format to internal format (enhanced with field order)
    convertElabFTWToMetadata(elabftwData) {
        const metadata = {};
        const fieldOrder = [];
        
        if (!elabftwData.extra_fields) {
            console.warn('No extra_fields found');
            return { fields: metadata, fieldOrder: fieldOrder };
        }
        
        // Process groups (if present)
        const groups = {};
        if (elabftwData.elabftw && elabftwData.elabftw.extra_fields_groups) {
            elabftwData.elabftw.extra_fields_groups.forEach(group => {
                groups[group.id] = group.name;
            });
        }
        
        // Sort by position if available
        const sortedFields = Object.entries(elabftwData.extra_fields).sort((a, b) => {
            const posA = a[1].position || 999;
            const posB = b[1].position || 999;
            return posA - posB;
        });
        
        // Convert fields
        sortedFields.forEach(([fieldName, fieldData]) => {
            // Map type from elabFTW to internal format
            let internalType = 'text';
            switch (fieldData.type) {
                case 'select':
                    internalType = 'dropdown';
                    break;
                case 'checkbox':
                    internalType = 'checkbox';
                    break;
                case 'number':
                    internalType = 'number';
                    break;
                case 'date':
                    internalType = 'date';
                    break;
                case 'text':
                    internalType = fieldData.multiline ? 'textarea' : 'text';
                    break;
            }
            
            // Convert value
            let value = fieldData.value;
            if (internalType === 'checkbox') {
                value = fieldData.value === 'on';
            } else if (internalType === 'number') {
                value = parseFloat(fieldData.value) || 0;
            }
            
            // Create metadata object
            const metaField = {
                type: internalType,
                label: fieldName,
                value: value,
                required: fieldData.required || false,
                position: fieldData.position || fieldOrder.length + 1
            };
            
            // Add description
            if (fieldData.description) {
                metaField.description = fieldData.description;
            }
            
            // Dropdown options
            if (internalType === 'dropdown' && fieldData.options) {
                metaField.options = fieldData.options;
            }
            
            // Number limits
            if (internalType === 'number') {
                if (fieldData.min !== undefined) metaField.min = fieldData.min;
                if (fieldData.max !== undefined) metaField.max = fieldData.max;
            }
            
            // Add field with safe name
            const safeName = fieldName.replace(/[^a-zA-Z0-9_-]/g, '_');
            metadata[safeName] = metaField;
            fieldOrder.push(safeName);
        });
        
        return {
            fields: metadata,
            fieldOrder: fieldOrder
        };
    },

    // Enhanced load metadata into editor with proper Group support
    loadMetadataIntoEditor(metadataInput) {
        this.clearFields();
        
        let metadata, fieldOrder;
        
        // Handle both legacy and enhanced formats
        if (metadataInput.fields && metadataInput.fieldOrder) {
            // Enhanced format
            metadata = metadataInput.fields;
            fieldOrder = metadataInput.fieldOrder;
        } else {
            // Legacy format - use alphabetical order
            metadata = metadataInput;
            fieldOrder = Object.keys(metadata);
        }
        
        console.log('🔄 Loading metadata with field order:', fieldOrder);
        
        // Load fields in the specified order
        fieldOrder.forEach(key => {
            const fieldData = metadata[key];
            if (!fieldData) return;
            
            console.log(`📝 Loading field: ${key}`, fieldData);
            
            if (fieldData.type === 'group') {
                // Add group field with special handling
                this.addField('group'); // Create a group field
                
                const lastField = document.querySelector('.metadata-field:last-child');
                const labelInput = lastField.querySelector('.field-label-input');
                const descInput = lastField.querySelector('.field-description-input');
                const typeSelect = lastField.querySelector('.field-type-selector');
                
                // Group fields use label as the identifier
                labelInput.value = fieldData.label || key.replace('_group', '');
                typeSelect.value = 'group';
                
                // Add description
                if (descInput && fieldData.description) {
                    descInput.value = fieldData.description;
                }
                
                // Update field type to set up Group UI
                this.updateFieldType(typeSelect);
                
                console.log(`🏷️ Loaded group field: ${key}`);
            } else {
                // Add normal field
                this.addField(fieldData.type); // Pass the field type
                
                const lastField = document.querySelector('.metadata-field:last-child');
                const nameInput = lastField.querySelector('.field-name-input');
                const labelInput = lastField.querySelector('.field-label-input');
                const descInput = lastField.querySelector('.field-description-input');
                const typeSelect = lastField.querySelector('.field-type-selector');
                const requiredCheckbox = lastField.querySelector('.required-checkbox');
                
                nameInput.value = key;
                labelInput.value = fieldData.label || key;
                typeSelect.value = fieldData.type || 'text';
                requiredCheckbox.checked = fieldData.required || false;
                
                // Add description
                if (descInput && fieldData.description) {
                    descInput.value = fieldData.description;
                }
                
                this.updateFieldType(typeSelect);
                
                // Set type-specific values
                if (fieldData.type === 'dropdown' && fieldData.options) {
                    const optionsInput = lastField.querySelector('.dropdown-options-input');
                    if (optionsInput) {
                        optionsInput.value = fieldData.options.join(', ');
                    }
                } else if (fieldData.type === 'number') {
                    const minInput = lastField.querySelector('.number-min-input');
                    const maxInput = lastField.querySelector('.number-max-input');
                    if (minInput && fieldData.min !== undefined) minInput.value = fieldData.min;
                    if (maxInput && fieldData.max !== undefined) maxInput.value = fieldData.max;
                }
                
                console.log(`📝 Loaded normal field: ${key}`);
            }
        });
        
        this.updateFieldPositions();
        this.updateJsonPreview();
        
        console.log(`✅ Loaded ${fieldOrder.length} fields including groups`);
    },

    // Add group header (unchanged)
    addGroupHeader(key, fieldData) {
        const container = document.getElementById('metadataFields');
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'metadata-group';
        groupDiv.innerHTML = `
            <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.3); 
                        border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                <h4 style="color: #a855f7; margin: 0 0 5px 0;">${fieldData.label}</h4>
                ${fieldData.description ? `<p style="color: #9ca3af; font-size: 12px; margin: 0;">${fieldData.description}</p>` : ''}
            </div>
        `;
        
        container.appendChild(groupDiv);
    },

    // Enhanced collect metadata with proper Group support
    collectMetadata() {
        const fields = document.querySelectorAll('.metadata-field');
        const metadata = {};
        const fieldOrder = [];
        
        fields.forEach((field, index) => {
            const nameInput = field.querySelector('.field-name-input');
            const labelInput = field.querySelector('.field-label-input');
            const descInput = field.querySelector('.field-description-input');
            const typeSelect = field.querySelector('.field-type-selector');
            const requiredCheckbox = field.querySelector('.required-checkbox');
            
            const fieldType = typeSelect.value;
            const label = labelInput.value.trim();
            const description = descInput ? descInput.value.trim() : '';
            const required = requiredCheckbox.checked;
            
            // Handle Group fields specially
            if (fieldType === 'group') {
                const groupName = label || `Group_${index + 1}`;
                const groupKey = `${groupName}_group`;
                
                const fieldData = {
                    type: 'group',
                    label: groupName,
                    position: index + 1
                };
                
                // Add description if present
                if (description) {
                    fieldData.description = description;
                }
                
                metadata[groupKey] = fieldData;
                fieldOrder.push(groupKey);
                
                console.log(`📋 Collected group: ${groupKey}`, fieldData);
            } else {
                // Normal fields
                const fieldName = nameInput.value.trim();
                
                if (fieldName) {
                    const fieldData = {
                        type: fieldType,
                        label: label || fieldName,
                        value: this.getDefaultValueForType(fieldType),
                        required: required,
                        position: index + 1
                    };
                    
                    // Add description if present
                    if (description) {
                        fieldData.description = description;
                    }
                    
                    // Type-specific options
                    if (fieldType === 'dropdown') {
                        const optionsInput = field.querySelector('.dropdown-options-input');
                        if (optionsInput && optionsInput.value) {
                            fieldData.options = optionsInput.value.split(',').map(s => s.trim());
                        }
                    } else if (fieldType === 'number') {
                        const minInput = field.querySelector('.number-min-input');
                        const maxInput = field.querySelector('.number-max-input');
                        if (minInput && minInput.value) fieldData.min = parseInt(minInput.value);
                        if (maxInput && maxInput.value) fieldData.max = parseInt(maxInput.value);
                    }
                    
                    metadata[fieldName] = fieldData;
                    fieldOrder.push(fieldName);
                    
                    console.log(`📝 Collected field: ${fieldName}`, fieldData);
                }
            }
        });
        
        // Return enhanced metadata format
        const result = {
            fields: metadata,
            fieldOrder: fieldOrder,
            totalFields: fieldOrder.length
        };
        
        console.log('📊 Collected metadata:', result);
        return result;
    }
};

window.metadataEditor = metadataEditor;
console.log('✅ Enhanced Metadata Editor loaded with Drag & Drop support');