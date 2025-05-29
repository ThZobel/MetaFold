// Metadata Editor for Experiment Templates

const metadataEditor = {
    fieldCounter: 0,

    // Add metadata field
    addField() {
        const container = document.getElementById('metadataFields');
        const fieldId = 'field_' + (++this.fieldCounter);
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'metadata-field';
        fieldDiv.innerHTML = `
            <div class="metadata-field-header">
                <input type="text" placeholder="Field Name" onchange="metadataEditor.updateJsonPreview()" style="flex: 1; margin-right: 10px;">
                <div class="metadata-field-controls">
                    <label style="display: flex; align-items: center; margin-right: 10px; font-size: 12px;">
                        <input type="checkbox" onchange="metadataEditor.updateJsonPreview()" style="margin-right: 5px; width: auto;">
                        Required
                    </label>
                    <select class="field-type-selector" onchange="metadataEditor.updateFieldType(this); metadataEditor.updateJsonPreview()">
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="textarea">Text Area</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="group">Group</option>
                    </select>
                    <button class="btn btn-danger btn-small" onclick="metadataEditor.removeField(this)">×</button>
                </div>
            </div>
            <div class="field-options">
                <input type="text" placeholder="Label" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <input type="text" placeholder="Description (optional)" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <div class="field-specific-options"></div>
            </div>
        `;
        
        container.appendChild(fieldDiv);
        this.updateJsonPreview();
    },

    // Remove metadata field
    removeField(button) {
        button.closest('.metadata-field').remove();
        this.updateJsonPreview();
    },

    // Update field type
    updateFieldType(select) {
        const fieldDiv = select.closest('.metadata-field');
        const optionsDiv = fieldDiv.querySelector('.field-specific-options');
        const type = select.value;
        
        optionsDiv.innerHTML = '';
        
        if (type === 'dropdown') {
            optionsDiv.innerHTML = `
                <input type="text" placeholder="Options (comma-separated): Option1, Option2, Option3" 
                       onchange="metadataEditor.updateJsonPreview()" style="width: 100%;">
            `;
        } else if (type === 'number') {
            optionsDiv.innerHTML = `
                <div style="display: flex; gap: 10px;">
                    <input type="number" placeholder="Min" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                    <input type="number" placeholder="Max" onchange="metadataEditor.updateJsonPreview()" style="flex: 1;">
                </div>
            `;
        }
    },

    // Update JSON preview
    updateJsonPreview() {
        const fields = document.querySelectorAll('.metadata-field');
        const metadata = {};
        
        fields.forEach(field => {
            const nameInput = field.querySelector('input[placeholder="Field Name"]');
            const labelInput = field.querySelector('input[placeholder="Label"]');
            const descInput = field.querySelector('input[placeholder*="Description"]');
            const typeSelect = field.querySelector('.field-type-selector');
            const requiredCheckbox = field.querySelector('input[type="checkbox"]');
            
            const name = nameInput.value.trim();
            const label = labelInput.value.trim();
            const description = descInput ? descInput.value.trim() : '';
            const type = typeSelect.value;
            const required = requiredCheckbox.checked;
            
            if (name) {
                const fieldData = {
                    type: type,
                    label: label || name,
                    value: this.getDefaultValueForType(type),
                    required: required
                };
                
                // Add description if present
                if (description) {
                    fieldData.description = description;
                }
                
                // Type-specific options
                if (type === 'dropdown') {
                    const optionsInput = field.querySelector('input[placeholder*="Options"]');
                    if (optionsInput && optionsInput.value) {
                        fieldData.options = optionsInput.value.split(',').map(s => s.trim());
                    }
                } else if (type === 'number') {
                    const minInput = field.querySelector('input[placeholder="Min"]');
                    const maxInput = field.querySelector('input[placeholder="Max"]');
                    if (minInput && minInput.value) fieldData.min = parseInt(minInput.value);
                    if (maxInput && maxInput.value) fieldData.max = parseInt(maxInput.value);
                }
                
                metadata[name] = fieldData;
            }
        });
        
        document.getElementById('jsonPreview').textContent = JSON.stringify(metadata, null, 2);
    },

    // Default values for different field types (local copy)
    getDefaultValueForType(type) {
        switch (type) {
            case 'number': return 0;
            case 'checkbox': return false;
            case 'date': return '';
            default: return '';
        }
    },

    // Default values for schema types (local copy)
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

    // Load JSON template
    loadFromJson() {
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
                        
                        // Check if it's an elabFTW export
                        if (jsonData.elabftw && jsonData.extra_fields) {
                            // Convert elabFTW format
                            const metadata = this.convertElabFTWToMetadata(jsonData);
                            this.loadMetadataIntoEditor(metadata);
                            
                            // Info message
                            alert(`elabFTW export loaded successfully!\nFields: ${Object.keys(metadata).length}`);
                        } else if (jsonData.$schema || (jsonData.type === 'object' && jsonData.properties)) {
                            // Convert JSON Schema
                            const metadata = this.convertJsonSchemaToMetadata(jsonData);
                            this.loadMetadataIntoEditor(metadata);
                            
                            // Info message
                            alert(`JSON Schema loaded successfully!\nTitle: ${jsonData.title || 'Unknown'}\nFields: ${Object.keys(metadata).length}`);
                        } else {
                            // Normal metadata JSON
                            this.loadMetadataIntoEditor(jsonData);
                        }
                    } catch (error) {
                        alert('Error loading JSON file: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    },

    // Convert elabFTW format to internal format
    convertElabFTWToMetadata(elabftwData) {
        const metadata = {};
        
        if (!elabftwData.extra_fields) {
            console.warn('No extra_fields found');
            return metadata;
        }
        
        // Process groups (if present)
        const groups = {};
        if (elabftwData.elabftw && elabftwData.elabftw.extra_fields_groups) {
            elabftwData.elabftw.extra_fields_groups.forEach(group => {
                groups[group.id] = group.name;
            });
        }
        
        // Convert fields
        Object.entries(elabftwData.extra_fields).forEach(([fieldName, fieldData]) => {
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
                required: fieldData.required || false
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
        });
        
        return metadata;
    },

    // Load metadata into editor
    loadMetadataIntoEditor(metadata) {
        this.clearFields();
        
        Object.entries(metadata).forEach(([key, fieldData]) => {
            if (fieldData.type === 'group') {
                // Add group header
                this.addGroupHeader(key, fieldData);
            } else {
                // Add normal field
                this.addField();
                
                const lastField = document.querySelector('.metadata-field:last-child');
                const nameInput = lastField.querySelector('input[placeholder="Field Name"]');
                const labelInput = lastField.querySelector('input[placeholder="Label"]');
                const descInput = lastField.querySelector('input[placeholder*="Description"]');
                const typeSelect = lastField.querySelector('.field-type-selector');
                const requiredCheckbox = lastField.querySelector('input[type="checkbox"]');
                
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
                    const optionsInput = lastField.querySelector('input[placeholder*="Options"]');
                    if (optionsInput) {
                        optionsInput.value = fieldData.options.join(', ');
                    }
                } else if (fieldData.type === 'number') {
                    const minInput = lastField.querySelector('input[placeholder="Min"]');
                    const maxInput = lastField.querySelector('input[placeholder="Max"]');
                    if (minInput && fieldData.min !== undefined) minInput.value = fieldData.min;
                    if (maxInput && fieldData.max !== undefined) maxInput.value = fieldData.max;
                }
            }
        });
        
        this.updateJsonPreview();
    },

    // Add group header
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

    // Collect all fields and return as metadata object
    collectMetadata() {
        const fields = document.querySelectorAll('.metadata-field');
        const metadata = {};
        
        fields.forEach(field => {
            const nameInput = field.querySelector('input[placeholder="Field Name"]');
            const labelInput = field.querySelector('input[placeholder="Label"]');
            const descInput = field.querySelector('input[placeholder*="Description"]');
            const typeSelect = field.querySelector('.field-type-selector');
            const requiredCheckbox = field.querySelector('input[type="checkbox"]');
            
            const fieldName = nameInput.value.trim();
            const label = labelInput.value.trim();
            const description = descInput ? descInput.value.trim() : '';
            const fieldType = typeSelect.value;
            const required = requiredCheckbox.checked;
            
            if (fieldName) {
                const fieldData = {
                    type: fieldType,
                    label: label || fieldName,
                    value: this.getDefaultValueForType(fieldType),
                    required: required
                };
                
                // Add description if present
                if (description) {
                    fieldData.description = description;
                }
                
                // Type-specific options
                if (fieldType === 'dropdown') {
                    const optionsInput = field.querySelector('input[placeholder*="Options"]');
                    if (optionsInput && optionsInput.value) {
                        fieldData.options = optionsInput.value.split(',').map(s => s.trim());
                    }
                } else if (fieldType === 'number') {
                    const minInput = field.querySelector('input[placeholder="Min"]');
                    const maxInput = field.querySelector('input[placeholder="Max"]');
                    if (minInput && minInput.value) fieldData.min = parseInt(minInput.value);
                    if (maxInput && maxInput.value) fieldData.max = parseInt(maxInput.value);
                }
                
                metadata[fieldName] = fieldData;
            }
        });
        
        return metadata;
    }
};

window.metadataEditor = metadataEditor;