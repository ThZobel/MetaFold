// Metadata-Editor für Experiment-Templates

const metadataEditor = {
    fieldCounter: 0,

    // Metadata-Feld hinzufügen
    addField() {
        const container = document.getElementById('metadataFields');
        const fieldId = 'field_' + (++this.fieldCounter);
        
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'metadata-field';
        fieldDiv.innerHTML = `
            <div class="metadata-field-header">
                <input type="text" placeholder="Feld-Name" onchange="metadataEditor.updateJsonPreview()" style="flex: 1; margin-right: 10px;">
                <div class="metadata-field-controls">
                    <label style="display: flex; align-items: center; margin-right: 10px; font-size: 12px;">
                        <input type="checkbox" onchange="metadataEditor.updateJsonPreview()" style="margin-right: 5px; width: auto;">
                        Required
                    </label>
                    <select class="field-type-selector" onchange="metadataEditor.updateFieldType(this); metadataEditor.updateJsonPreview()">
                        <option value="text">Text</option>
                        <option value="number">Zahl</option>
                        <option value="date">Datum</option>
                        <option value="textarea">Textbereich</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="group">Gruppe</option>
                    </select>
                    <button class="btn btn-danger btn-small" onclick="metadataEditor.removeField(this)">×</button>
                </div>
            </div>
            <div class="field-options">
                <input type="text" placeholder="Label" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <input type="text" placeholder="Beschreibung (optional)" onchange="metadataEditor.updateJsonPreview()" style="width: 100%; margin-bottom: 8px;">
                <div class="field-specific-options"></div>
            </div>
        `;
        
        container.appendChild(fieldDiv);
        this.updateJsonPreview();
    },

    // Metadata-Feld entfernen
    removeField(button) {
        button.closest('.metadata-field').remove();
        this.updateJsonPreview();
    },

    // Field-Type aktualisieren
    updateFieldType(select) {
        const fieldDiv = select.closest('.metadata-field');
        const optionsDiv = fieldDiv.querySelector('.field-specific-options');
        const type = select.value;
        
        optionsDiv.innerHTML = '';
        
        if (type === 'dropdown') {
            optionsDiv.innerHTML = `
                <input type="text" placeholder="Optionen (komma-getrennt): Option1, Option2, Option3" 
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

    // JSON-Vorschau aktualisieren
    updateJsonPreview() {
        const fields = document.querySelectorAll('.metadata-field');
        const metadata = {};
        
        fields.forEach(field => {
            const nameInput = field.querySelector('input[placeholder="Feld-Name"]');
            const labelInput = field.querySelector('input[placeholder="Label"]');
            const descInput = field.querySelector('input[placeholder*="Beschreibung"]');
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
                
                // Beschreibung hinzufügen falls vorhanden
                if (description) {
                    fieldData.description = description;
                }
                
                // Type-spezifische Optionen
                if (type === 'dropdown') {
                    const optionsInput = field.querySelector('input[placeholder*="Optionen"]');
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

    // Default-Werte für verschiedene Feld-Typen (lokale Kopie)
    getDefaultValueForType(type) {
        switch (type) {
            case 'number': return 0;
            case 'checkbox': return false;
            case 'date': return '';
            default: return '';
        }
    },

    // Default-Werte für Schema-Typen (lokale Kopie)
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

    // Alle Metadata-Felder löschen
    clearFields() {
        document.getElementById('metadataFields').innerHTML = '';
        this.updateJsonPreview();
    },

    // JSON-Template laden
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
                        
                        // Prüfen ob es ein JSON Schema ist
                        if (jsonData.$schema || (jsonData.type === 'object' && jsonData.properties)) {
                            // JSON Schema konvertieren
                            const metadata = this.convertJsonSchemaToMetadata(jsonData);
                            this.loadMetadataIntoEditor(metadata);
                            
                            // Info-Nachricht
                            alert(`JSON Schema erfolgreich geladen!\nTitel: ${jsonData.title || 'Unbekannt'}\nFelder: ${Object.keys(metadata).length}`);
                        } else {
                            // Normales Metadaten JSON
                            this.loadMetadataIntoEditor(jsonData);
                        }
                    } catch (error) {
                        alert('Fehler beim Laden der JSON-Datei: ' + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    },

    // JSON Schema zu internem Format konvertieren
    convertJsonSchemaToMetadata(schema) {
        const metadata = {};
        
        if (!schema.properties) {
            console.warn('Schema hat keine properties');
            return metadata;
        }
        
        // Flache Struktur für verschachtelte Properties erstellen
        const processProperties = (properties, requiredFields = [], prefix = '') => {
            Object.entries(properties).forEach(([key, prop]) => {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const isRequired = requiredFields.includes(key);
                
                if (prop.type === 'object' && prop.properties) {
                    // Verschachtelte Objekte: Group Header + einzelne Felder
                    metadata[fullKey + '_group'] = {
                        type: 'group',
                        label: prop.title || key,
                        description: prop.description || '',
                        value: '',
                        required: false
                    };
                    
                    // Rekursiv verschachtelte Properties verarbeiten
                    processProperties(prop.properties, prop.required || [], fullKey);
                } else {
                    // Normale Felder
                    let fieldType = 'text';
                    const fieldData = {
                        type: fieldType,
                        label: prop.title || key,
                        description: prop.description || '',
                        value: this.getDefaultValueForSchemaType(prop.type),
                        required: isRequired
                    };
                    
                    // Type Mapping
                    switch (prop.type) {
                        case 'string':
                            fieldType = 'text';
                            break;
                        case 'number':
                        case 'integer':
                            fieldType = 'number';
                            if (prop.minimum !== undefined) fieldData.min = prop.minimum;
                            if (prop.maximum !== undefined) fieldData.max = prop.maximum;
                            break;
                        case 'boolean':
                            fieldType = 'checkbox';
                            break;
                    }
                    
                    // Enum als Dropdown
                    if (prop.enum && Array.isArray(prop.enum)) {
                        fieldType = 'dropdown';
                        fieldData.options = prop.enum;
                    }
                    
                    fieldData.type = fieldType;
                    metadata[fullKey] = fieldData;
                }
            });
        };
        
        processProperties(schema.properties, schema.required || []);
        return metadata;
    },

    // Metadata in Editor laden
    loadMetadataIntoEditor(metadata) {
        this.clearFields();
        
        Object.entries(metadata).forEach(([key, fieldData]) => {
            if (fieldData.type === 'group') {
                // Group Header hinzufügen
                this.addGroupHeader(key, fieldData);
            } else {
                // Normales Feld hinzufügen
                this.addField();
                
                const lastField = document.querySelector('.metadata-field:last-child');
                const nameInput = lastField.querySelector('input[placeholder="Feld-Name"]');
                const labelInput = lastField.querySelector('input[placeholder="Label"]');
                const descInput = lastField.querySelector('input[placeholder*="Beschreibung"]');
                const typeSelect = lastField.querySelector('.field-type-selector');
                const requiredCheckbox = lastField.querySelector('input[type="checkbox"]');
                
                nameInput.value = key;
                labelInput.value = fieldData.label || key;
                typeSelect.value = fieldData.type || 'text';
                requiredCheckbox.checked = fieldData.required || false;
                
                // Beschreibung hinzufügen
                if (descInput && fieldData.description) {
                    descInput.value = fieldData.description;
                }
                
                this.updateFieldType(typeSelect);
                
                // Type-spezifische Werte setzen
                if (fieldData.type === 'dropdown' && fieldData.options) {
                    const optionsInput = lastField.querySelector('input[placeholder*="Optionen"]');
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

    // Group Header hinzufügen
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

    // Alle Felder sammeln und als Metadata-Objekt zurückgeben
    collectMetadata() {
        const fields = document.querySelectorAll('.metadata-field');
        const metadata = {};
        
        fields.forEach(field => {
            const nameInput = field.querySelector('input[placeholder="Feld-Name"]');
            const labelInput = field.querySelector('input[placeholder="Label"]');
            const descInput = field.querySelector('input[placeholder*="Beschreibung"]');
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
                
                // Beschreibung hinzufügen falls vorhanden
                if (description) {
                    fieldData.description = description;
                }
                
                // Type-spezifische Optionen
                if (fieldType === 'dropdown') {
                    const optionsInput = field.querySelector('input[placeholder*="Optionen"]');
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