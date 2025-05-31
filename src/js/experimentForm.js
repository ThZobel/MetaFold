// Experiment Form for filling in metadata

const experimentForm = {
    savedFieldValues: {},

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

    // Render experiment form
    render(metadata) {
        const container = document.getElementById('experimentFields');
        container.innerHTML = '';
        
        // Sort fields so groups are positioned correctly
        const sortedEntries = Object.entries(metadata).sort(([a], [b]) => {
            // Group headers should come before their sub-fields
            if (a.endsWith('_group') && b.startsWith(a.replace('_group', '.'))) return -1;
            if (b.endsWith('_group') && a.startsWith(b.replace('_group', '.'))) return 1;
            return a.localeCompare(b);
        });
        
        sortedEntries.forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.type === 'group') {
                // Render group header
                this.renderGroupHeader(container, fieldName, fieldInfo);
                return;
            }
            
            // Normal fields
            this.renderField(container, fieldName, fieldInfo);
        });
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

    // Render single field
    renderField(container, fieldName, fieldInfo) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group';
        
        // Check if field belongs to a group (nested)
        if (fieldName.includes('.')) {
            fieldDiv.classList.add('nested-field');
        }
        
        const isRequired = fieldInfo.required || false;
        const requiredMark = isRequired ? ' <span style="color: #ef4444;">*</span>' : '';
        
        // Create safe ID for the field
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
                    <option value="">-- Select --</option>
                    ${optionsHtml}
                </select>`;
                break;
            case 'checkbox':
                const checked = savedValue === true || savedValue === 'true' ? 'checked' : '';
                inputHtml = `<input type="checkbox" id="${safeFieldId}" data-field-name="${fieldName}" ${checked} style="width: auto; margin-right: 8px;">`;
                break;
        }
        
        // Label with optional description 
        const labelHtml = fieldInfo.description ? 
            `${fieldInfo.label}${requiredMark} <small style="color: #9ca3af; font-weight: normal;">(${fieldInfo.description})</small>` :
            `${fieldInfo.label}${requiredMark}`;
        
        fieldDiv.innerHTML = `
            <label for="${safeFieldId}">${labelHtml}:</label>
            ${inputHtml}
        `;
        
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

    // Safe ID generation for HTML elements (local copy)
    createSafeId(fieldName) {
        return fieldName.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Validate experiment fields
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

    // Save current form values back to template - ENHANCED with paths
	saveTemplate() {
		if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
			alert('No template selected or no metadata available to save.');
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

		// Update the template's metadata with current form values
		const updatedTemplate = { ...templateManager.currentTemplate };
		
		// Merge current form values into template metadata
		Object.entries(currentData).forEach(([fieldName, value]) => {
			if (updatedTemplate.metadata[fieldName]) {
				updatedTemplate.metadata[fieldName].value = value;
			}
		});

		// Save project paths with template
		if (!updatedTemplate.projectDefaults) {
			updatedTemplate.projectDefaults = {};
		}
		updatedTemplate.projectDefaults.basePath = basePath;
		updatedTemplate.projectDefaults.projectName = projectName;

		// Update template in templateManager
		const templateIndex = templateManager.templates.indexOf(templateManager.currentTemplate);
		if (templateIndex >= 0) {
			templateManager.update(templateIndex, updatedTemplate);
			
			// Show success message
			this.showSaveMessage('✅ Template values and project paths saved successfully!');
			
			// Re-render form to show updated values
			setTimeout(() => {
				this.render(updatedTemplate.metadata);
			}, 100);
		} else {
			alert('Error: Could not find template to update.');
		}
	},

    // Collect current form values (similar to collectData but simpler) - NEW FUNCTION
    collectFormValues() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return null;
        }

        const formValues = {};

        Object.entries(templateManager.currentTemplate.metadata).forEach(([fieldName, fieldInfo]) => {
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

    // Show save message - NEW FUNCTION
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

    // Collect experiment data
    collectData() {
        if (!templateManager.currentTemplate || !templateManager.currentTemplate.metadata) {
            return null;
        }
    
        const metadata = {};
    
        Object.entries(templateManager.currentTemplate.metadata).forEach(([fieldName, fieldInfo]) => {
            if (fieldInfo.type === 'group') return; // Skip groups
        
            const safeFieldId = 'field_' + this.createSafeId(fieldName);
            const input = document.getElementById(safeFieldId);
            if (!input) return;
            
            let value = input.value;
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.type === 'number') {
                value = parseFloat(value) || 0;
            }
            // IMPORTANT: Ensure value is a primitive value
            else if (input.tagName === 'SELECT') {
                value = input.value || ''; // Ensure it's a string
            }
            
            metadata[fieldName] = {
                label: fieldInfo.label,
                type: fieldInfo.type,
                value: value,
                required: fieldInfo.required || false
            };
            
            // Carry over additional properties
            if (fieldInfo.options) metadata[fieldName].options = fieldInfo.options;
            if (fieldInfo.min !== undefined) metadata[fieldName].min = fieldInfo.min;
            if (fieldInfo.max !== undefined) metadata[fieldName].max = fieldInfo.max;
            if (fieldInfo.description) metadata[fieldName].description = fieldInfo.description;
        });
        
        return metadata;
    }
};

// Make globally available
window.experimentForm = experimentForm;