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
        // ✅ FIXED: Field must be draggable for smooth drag operation
        fieldDiv.draggable = true;
        fieldDiv.setAttribute('data-field-id', fieldId);
        
        // Default field type - prioritize passed parameter
        const defaultType = fieldType || 'text';
        
        fieldDiv.innerHTML = `
            <div class="metadata-field-header">
                <div class="drag-handle" title="Drag to reorder">
                    <span class="drag-icon">⋮⋮</span>
                </div>
                <input type="text" class="field-name-input" placeholder="Field Name" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="flex: 1; margin-right: 10px;">
                <div class="field-position-indicator">
                    <span class="position-number">Pos: ${this.getFieldPosition(fieldDiv)}</span>
                </div>
                <div class="metadata-field-controls">
                    <label class="required-label" style="display: flex; align-items: center; margin-right: 10px; font-size: 12px;">
                        <input type="checkbox" class="required-checkbox" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="margin-right: 5px; width: auto;">
                        Required
                    </label>
                    <select class="field-type-selector" draggable="false" onchange="metadataEditor.updateFieldType(this); metadataEditor.updateJsonPreview()">
                        <option value="text" ${defaultType === 'text' ? 'selected' : ''}>Text</option>
                        <option value="number" ${defaultType === 'number' ? 'selected' : ''}>Number</option>
                        <option value="date" ${defaultType === 'date' ? 'selected' : ''}>Date</option>
                        <option value="textarea" ${defaultType === 'textarea' ? 'selected' : ''}>Text Area</option>
                        <option value="dropdown" ${defaultType === 'dropdown' ? 'selected' : ''}>Dropdown</option>
                        <option value="checkbox" ${defaultType === 'checkbox' ? 'selected' : ''}>Checkbox</option>
                        <option value="multicheckbox" ${defaultType === 'multicheckbox' ? 'selected' : ''}>Multi-Checkbox</option>
                        <option value="time" ${defaultType === 'time' ? 'selected' : ''}>Time</option>
                        <option value="url" ${defaultType === 'url' ? 'selected' : ''}>URL</option>
                        <option value="email" ${defaultType === 'email' ? 'selected' : ''}>E-Mail</option>
                        <option value="rating" ${defaultType === 'rating' ? 'selected' : ''}>Rating</option>
                        <option value="tags" ${defaultType === 'tags' ? 'selected' : ''}>Tags / IDs (Array)</option>
                        <option value="id_anchor" ${defaultType === 'id_anchor' ? 'selected' : ''}>Lineage Anchor (ID)</option>
                        <option value="derived_from" ${defaultType === 'derived_from' ? 'selected' : ''}>Derived From (Link)</option>
                        <option value="group" ${defaultType === 'group' ? 'selected' : ''}>Group</option>
                    </select>
                    <button class="btn btn-danger btn-small" onclick="metadataEditor.removeField(this)">×</button>
                </div>
            </div>
            <div class="field-options">
                <input type="text" class="field-label-input" placeholder="Label" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <input type="text" class="field-description-input" placeholder="Description (optional)" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
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
        // ✅ Get the drag handle for reference
        const dragHandle = fieldDiv.querySelector('.drag-handle');
        if (!dragHandle) {
            console.warn('⚠️ No drag handle found for field');
            return;
        }

        // ✅ CRITICAL FIX: Track where the mousedown actually happened
        let mouseDownTarget = null;
        
        fieldDiv.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
            console.log('🖱️ Mouse down on:', e.target, 'classes:', e.target.className);
        });

        // ✅ CRITICAL: Prevent drag from starting unless mousedown was on the handle
        fieldDiv.addEventListener('dragstart', (e) => {
            console.log('🔍 Drag attempt - mouseDownTarget:', mouseDownTarget);
            
            // Check if mousedown was on handle or its children
            const dragHandle = mouseDownTarget?.closest('.drag-handle');
            const isInput = mouseDownTarget?.tagName === 'INPUT' || 
                           mouseDownTarget?.tagName === 'SELECT' || 
                           mouseDownTarget?.tagName === 'TEXTAREA' || 
                           mouseDownTarget?.tagName === 'BUTTON';
            
            console.log('🔍 Mouse was on handle?', !!dragHandle, '| Was on input?', isInput);
            
            if (!dragHandle || isInput) {
                // Mousedown was NOT on handle - PREVENT DRAG
                e.preventDefault();
                console.log('❌ Drag prevented - mousedown was not on handle');
                mouseDownTarget = null; // Reset
                return;
            }
            
            // Mousedown was on handle - ALLOW DRAG
            console.log('✅ Drag ALLOWED - mousedown was on handle');
            this.dragState.isDragging = true;
            this.dragState.draggedElement = fieldDiv;
            this.dragState.draggedIndex = this.getFieldIndex(fieldDiv);
            
            fieldDiv.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', fieldDiv.outerHTML);
            
            // Show drop indicator
            this.dragState.dropIndicator.style.display = 'block';
            
            console.log('🎯 Drag started for field:', this.dragState.draggedIndex);
            
            // Reset mouseDownTarget
            mouseDownTarget = null;
        });

        // ✅ Drag end - on the field
        fieldDiv.addEventListener('dragend', (e) => {
            if (!this.dragState.isDragging) return;
            if (this.dragState.draggedElement !== fieldDiv) return;
            
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

        // ✅ Drag over - ON THE FIELD (for drop zones)
        fieldDiv.addEventListener('dragover', (e) => {
            if (!this.dragState.isDragging) return;
            
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            
            console.log('📍 Drag over field at index:', this.getFieldIndex(fieldDiv));
            
            const afterElement = this.getDragAfterElement(fieldDiv, e.clientY);
            const container = document.getElementById('metadataFields');
            
            if (afterElement == null) {
                container.appendChild(this.dragState.dropIndicator);
                console.log('📍 Drop indicator: appended to end');
            } else {
                container.insertBefore(this.dragState.dropIndicator, afterElement);
                console.log('📍 Drop indicator: before element at', this.getFieldIndex(afterElement));
            }
        });

        // ✅ Drop - ON THE FIELD
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

        // ✅ Visual feedback - ON THE FIELD
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
        // ✅ IMPROVED: More robust element detection
        const metadataContainer = document.getElementById('metadataFields');
        if (!metadataContainer) return null;
        
        const draggableElements = [...metadataContainer.querySelectorAll('.metadata-field:not(.dragging)')];
        
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
                           draggable="false" onchange="metadataEditor.updateJsonPreview()" style="width: 100%;">
                `;
            } else if (type === 'multicheckbox') {
                optionsDiv.innerHTML = `
                    <div style="margin-bottom: 8px;">
                        <input type="text" class="multicheckbox-options-input"
                               placeholder="Options (comma-separated): 405 nm, 488 nm, 561 nm, 640 nm"
                               draggable="false" onchange="metadataEditor.updateMultiCheckboxPreview(this); metadataEditor.updateJsonPreview()"
                               oninput="metadataEditor.updateMultiCheckboxPreview(this)"
                               style="width: 100%; margin-bottom: 8px;">
                        <div class="multicheckbox-editor-preview" style="
                            display: flex; flex-wrap: wrap; gap: 6px;
                            padding: 8px; min-height: 36px;
                            background: rgba(255,255,255,0.04);
                            border: 1px dashed rgba(255,255,255,0.15);
                            border-radius: 6px;
                        ">
                            <span style="color: #6b7280; font-size: 12px; align-self: center;">Preview appears here...</span>
                        </div>
                    </div>
                `;
            } else if (type === 'tags') {
                optionsDiv.innerHTML = `
                    <div class="tags-editor-container">
                        <div class="tags-editor-pills" style="
                            display: flex; flex-wrap: wrap; gap: 5px;
                            padding: 6px 8px; min-height: 34px;
                            background: rgba(255,255,255,0.04);
                            border: 1px solid rgba(255,255,255,0.15);
                            border-radius: 6px;
                            margin-bottom: 6px;
                        "></div>
                        <input type="text" class="tags-editor-input"
                               placeholder="Type a tag and press Enter or comma..."
                               draggable="false"
                               style="width: 100%; font-size: 12px;"
                               onkeydown="metadataEditor.handleTagInput(event, this)">
                        <small style="color: #6b7280; font-size: 11px; margin-top: 4px; display: block;">
                            Stored as JSON array. Press <kbd style='background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;'>Enter</kbd> or <kbd style='background:rgba(255,255,255,0.1);padding:1px 4px;border-radius:3px;'>,</kbd> to add a tag.
                        </small>
                    </div>
                `;
            } else if (type === 'number') {
                optionsDiv.innerHTML = `
                    <div style="display: flex; gap: 10px;">
                        <input type="number" class="number-min-input" placeholder="Min" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                        <input type="number" class="number-max-input" placeholder="Max" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                        <input type="text" class="number-unit-input" placeholder="Unit (e.g. µl, °C)" draggable="false" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                    </div>
                `;
            }
        }
    },

    // Live preview of pill-checkboxes in the editor while typing options
    updateMultiCheckboxPreview(inputEl) {
        const fieldDiv = inputEl.closest('.metadata-field');
        if (!fieldDiv) return;
        const previewDiv = fieldDiv.querySelector('.multicheckbox-editor-preview');
        if (!previewDiv) return;

        const raw = inputEl.value;
        const options = raw.split(',').map(s => s.trim()).filter(s => s.length > 0);

        if (options.length === 0) {
            previewDiv.innerHTML = '<span style="color: #6b7280; font-size: 12px; align-self: center;">Preview appears here...</span>';
            return;
        }

        previewDiv.innerHTML = options.map(opt => `
            <span class="multicheckbox-pill">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style="flex-shrink:0">
                    <rect x="0.5" y="0.5" width="11" height="11" rx="2.5" stroke="currentColor" stroke-opacity="0.6"/>
                </svg>
                ${opt}
            </span>
        `).join('');
    },

    // Extract metadata from the DOM
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
                    } else if (fieldType === 'multicheckbox') {
                        const optionsInput = field.querySelector('.multicheckbox-options-input');
                        if (optionsInput && optionsInput.value) {
                            fieldData.options = optionsInput.value.split(',').map(s => s.trim()).filter(s => s);
                        }
                        fieldData.value = []; // Default: nothing selected
                    } else if (fieldType === 'tags') {
                        // Tags: read current pills from the editor
                        const pillsContainer = field.querySelector('.tags-editor-pills');
                        if (pillsContainer) {
                            const tags = [...pillsContainer.querySelectorAll('.tag-pill-editor')]
                                .map(p => p.getAttribute('data-tag'));
                            fieldData.value = tags;
                        } else {
                            fieldData.value = [];
                        }
                    } else if (fieldType === 'number') {
                        const minInput = field.querySelector('.number-min-input');
                        const maxInput = field.querySelector('.number-max-input');
                        const unitInput = field.querySelector('.number-unit-input');
                        if (minInput && minInput.value) fieldData.min = parseInt(minInput.value);
                        if (maxInput && maxInput.value) fieldData.max = parseInt(maxInput.value);
                        if (unitInput && unitInput.value) fieldData.unit = unitInput.value;
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
        
        return enhancedMetadata;
    },

    // Enhanced JSON preview with proper Group field support
    updateJsonPreview() {
        const enhancedMetadata = this.collectMetadata();
        const previewEl = document.getElementById('jsonPreview');
        if (previewEl) {
            previewEl.textContent = JSON.stringify(enhancedMetadata, null, 2);
        }
        console.log('📊 JSON Preview updated:', enhancedMetadata);
    },

    // Default values for different field types (unchanged)
    getDefaultValueForType(type) {
        switch (type) {
            case 'number': return 0;
            case 'checkbox': return false;
            case 'multicheckbox': return [];
            case 'tags': return [];
            case 'date': return '';
            case 'time': return '';
            case 'url': return '';
            case 'email': return '';
            case 'rating': return 0;
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
                } else if (fieldData.type === 'multicheckbox' && fieldData.options) {
                    const optionsInput = lastField.querySelector('.multicheckbox-options-input');
                    if (optionsInput) {
                        optionsInput.value = fieldData.options.join(', ');
                        // Trigger live preview update
                        this.updateMultiCheckboxPreview(optionsInput);
                    }
                } else if (fieldData.type === 'number') {
                    const minInput = lastField.querySelector('.number-min-input');
                    const maxInput = lastField.querySelector('.number-max-input');
                    const unitInput = lastField.querySelector('.number-unit-input');
                    if (minInput && fieldData.min !== undefined) minInput.value = fieldData.min;
                    if (maxInput && fieldData.max !== undefined) maxInput.value = fieldData.max;
                    if (unitInput && fieldData.unit !== undefined) unitInput.value = fieldData.unit;
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

    // ===================== TAG INPUT HANDLERS =====================

    /**
     * Handle keydown in the tag editor input (Enter or comma adds a tag)
     */
    handleTagInput(event, inputEl) {
        if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            const value = inputEl.value.trim().replace(/,$/, '');
            if (value) {
                this._addEditorTag(inputEl, value);
                inputEl.value = '';
                this.updateJsonPreview();
            }
        } else if (event.key === 'Backspace' && inputEl.value === '') {
            // Remove last tag on Backspace when input is empty
            const pillsContainer = inputEl.closest('.tags-editor-container')?.querySelector('.tags-editor-pills');
            if (pillsContainer) {
                const lastPill = pillsContainer.querySelector('.tag-pill-editor:last-child');
                if (lastPill) {
                    lastPill.remove();
                    this.updateJsonPreview();
                }
            }
        }
    },

    /**
     * Add a tag pill to the editor tags container
     */
    _addEditorTag(inputEl, tagValue) {
        const pillsContainer = inputEl.closest('.tags-editor-container')?.querySelector('.tags-editor-pills');
        if (!pillsContainer) return;

        // Prevent duplicates
        const existing = [...pillsContainer.querySelectorAll('.tag-pill-editor')].map(p => p.getAttribute('data-tag'));
        if (existing.includes(tagValue)) return;

        const pill = document.createElement('span');
        pill.className = 'tag-pill-editor';
        pill.setAttribute('data-tag', tagValue);
        pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:rgba(13,148,136,0.2);border:1px solid rgba(13,148,136,0.5);color:#2dd4bf;border-radius:20px;padding:2px 8px;font-size:11px;';
        pill.innerHTML = `${tagValue} <span style="cursor:pointer;opacity:0.7;font-size:13px;line-height:1;" onclick="this.parentElement.remove();metadataEditor.updateJsonPreview()">×</span>`;
        pillsContainer.appendChild(pill);
    },

    // ==================== LINEAGE QUICK-ACTION METHODS ====================

    /**
     * Prompts for a prefix and adds a text field with key "<Prefix>_ID".
     * This creates an anchor node for the Knowledge Graph.
     */
    addLineageIdField() {
        this.addField('id_anchor');
        const lastField = document.querySelector('#metadataFields .metadata-field:last-child');
        if (lastField) {
            const nameInput = lastField.querySelector('.field-name-input');
            const labelInput = lastField.querySelector('.field-label-input');
            const descInput  = lastField.querySelector('.field-description-input');
            if (nameInput)  nameInput.value  = 'lineage_id';
            if (labelInput) labelInput.value  = 'Lineage ID';
            if (descInput)  descInput.value   = 'Creates an anchor point for the Knowledge Graph.';
            this.updateJsonPreview();
        }
        console.log(`🔑 Lineage ID field added: lineage_id`);
    },

    /**
     * Adds a hardcoded "derived_from" field with type "tags".
     * This creates a directed edge in the Knowledge Graph.
     */
    addDerivedFromField() {
        // Check if derived_from already exists
        const existing = document.querySelector('#metadataFields .field-name-input[value="derived_from"]');
        if (existing) {
            if (window.templateModal?.showMessage) {
                window.templateModal.showMessage('A \'derived_from\' field already exists in this template.', 'warning');
            }
            return;
        }

        this.addField('derived_from');
        const lastField = document.querySelector('#metadataFields .metadata-field:last-child');
        if (lastField) {
            const nameInput  = lastField.querySelector('.field-name-input');
            const labelInput = lastField.querySelector('.field-label-input');
            const descInput  = lastField.querySelector('.field-description-input');
            if (nameInput) {
                nameInput.value = 'derived_from';
                nameInput.readOnly = true; // Key is hardcoded
                nameInput.style.opacity = '0.6';
                nameInput.title = 'This key is fixed and cannot be changed (Knowledge Graph convention)';
            }
            if (labelInput) labelInput.value = 'Derived From (IDs)';
            if (descInput)  descInput.value  = 'Link this experiment to previous IDs (e.g. Parent Sample, Protocol).';
            this.updateJsonPreview();
        }
        console.log('🔗 derived_from field added');
    }
};

window.metadataEditor = metadataEditor;
console.log('✅ Enhanced Metadata Editor loaded with Drag & Drop support');