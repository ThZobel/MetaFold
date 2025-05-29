// Experiment-Form für das Ausfüllen der Metadaten

const experimentForm = {
    savedFieldValues: {},

    // Gespeicherte Feldwerte verwalten
    getSavedFieldValue(fieldName) {
        return this.savedFieldValues[fieldName];
    },

    saveFieldValue(fieldName, value) {
        this.savedFieldValues[fieldName] = value;
    },

    clearSavedFieldValues() {
        this.savedFieldValues = {};
    },

    // Experiment-Formular rendern
    render(metadata) {
        const container = document.getElementById('experimentFields');
        container.innerHTML = '';
        
        // Sortiere Felder, damit Gruppen richtig positioniert sind
        const sortedEntries = Object.entries(metadata).sort(([a], [b]) => {
            // Gruppen-Header sollten vor ihren Unterfeldern kommen
            if (a.endsWith('_group') && b.startsWith(a.replace('_group', '.'))) return -1;
            if (b.endsWith('_group') && a.startsWith(b.replace('_group', '.'))) return 1;
            return a.localeCompare(b);
        });
        
        sortedEntries.forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.type === 'group') {
                // Group Header rendern
                this.renderGroupHeader(container, fieldName, fieldInfo);
                return;
            }
            
            // Normale Felder
            this.renderField(container, fieldName, fieldInfo);
        });
    },

    // Group Header rendern
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

    // Einzelnes Feld rendern
    renderField(container, fieldName, fieldInfo) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group';
        
        // Prüfe ob das Feld zu einer Gruppe gehört (verschachtelt)
        if (fieldName.includes('.')) {
            fieldDiv.classList.add('nested-field');
        }
        
        const isRequired = fieldInfo.required || false;
        const requiredMark = isRequired ? ' <span style="color: #ef4444;">*</span>' : '';
        
        // Erstelle sichere ID für das Feld
        const safeFieldId = 'field_' + this.createSafeId(fieldName);
        
        let inputHtml = '';
        const savedValue = this.getSavedFieldValue(fieldName) || fieldInfo.value || '';
        
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
                    <option value="">-- Auswählen --</option>
                    ${optionsHtml}
                </select>`;
                break;
            case 'checkbox':
                const checked = savedValue === true || savedValue === 'true' ? 'checked' : '';
                inputHtml = `<input type="checkbox" id="${safeFieldId}" data-field-name="${fieldName}" ${checked} style="width: auto; margin-right: 8px;">`;
                break;
        }
        
        // Label mit optionaler Beschreibung 
        const labelHtml = fieldInfo.description ? 
            `${fieldInfo.label}${requiredMark} <small style="color: #9ca3af; font-weight: normal;">(${fieldInfo.description})</small>` :
            `${fieldInfo.label}${requiredMark}`;
        
        fieldDiv.innerHTML = `
            <label for="${safeFieldId}">${labelHtml}:</label>
            ${inputHtml}
        `;
        
        container.appendChild(fieldDiv);
        
        // Event Listener für Werte speichern
        const input = fieldDiv.querySelector(`#${safeFieldId}`);
        if (input) {
            input.addEventListener('change', () => {
                const realFieldName = input.getAttribute('data-field-name');
                this.saveFieldValue(realFieldName, input.type === 'checkbox' ? input.checked : input.value);
            });
        }
    },

    // Sichere ID-Generierung für HTML-Elemente (lokale Kopie)
    createSafeId(fieldName) {
        return fieldName.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Experiment-Felder validieren
    validate() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return { valid: true };
        }
        
        const missingFields = [];
        
        Object.entries(templateManager.currentTemplate.metadata).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.required && fieldInfo.type !== 'group') {
                const safeFieldId = 'field_' + this.createSafeId(fieldName);
                const input = document.getElementById(safeFieldId);
                if (!input) return;
                
                let value = input.value;
                if (input.type === 'checkbox') {
                    value = input.checked;
                }
                
                // Validierung je nach Typ
                if (fieldInfo.type === 'checkbox') {
                    // Checkboxen sind immer gültig
                } else if (!value || value.toString().trim() === '') {
                    missingFields.push(fieldInfo.label || fieldName);
                }
            }
        });
        
        if (missingFields.length > 0) {
            return {
                valid: false,
                message: `Bitte fülle alle Pflichtfelder aus: ${missingFields.join(', ')}`
            };
        }
        
        return { valid: true };
    },

    // Experiment-Daten sammeln
    collectData() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return null;
        }
        
        const metadata = {};
        
        Object.entries(templateManager.currentTemplate.metadata).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.type === 'group') return; // Gruppen überspringen
            
            const safeFieldId = 'field_' + this.createSafeId(fieldName);
            const input = document.getElementById(safeFieldId);
            if (!input) return;
            
            let value = input.value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = parseFloat(value) || 0;
            }
            
            metadata[fieldName] = {
                label: fieldInfo.label,
                type: fieldInfo.type,
                value: value,
                required: fieldInfo.required || false
            };
            
            // Zusätzliche Eigenschaften übernehmen
            if (fieldInfo.options) metadata[fieldName].options = fieldInfo.options;
            if (fieldInfo.min !== undefined) metadata[fieldName].min = fieldInfo.min;
            if (fieldInfo.max !== undefined) metadata[fieldName].max = fieldInfo.max;
            if (fieldInfo.description) metadata[fieldName].description = fieldInfo.description;
        });
        
        return metadata;
    }
};

// Global verfügbar machen
window.experimentForm = experimentForm;