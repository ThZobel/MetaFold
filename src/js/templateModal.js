// Template Modal Manager (FIXED: No more focus-breaking alerts)

const templateModal = {
    editingIndex: -1, // -1 = new template, >= 0 = editing existing

    // Show modal for new template
    async show() {
        this.editingIndex = -1;
        document.getElementById('modalTitle').textContent = 'Create New Template';
        
        // NEW: Inject category field dynamically if not present
        this.injectCategoryField();
        
        this.clearForm();
        this.toggleTypeContent();
        
        // NEW: Load category names and set default
        await this.loadCategoryNames();
        this.setCategory(window.templateTypeManager?.currentType || 'category1');
        
        document.getElementById('templateModal').style.display = 'block';
        
        // NEW: Inject "Save as New" button
        this.injectSaveAsNewButton();
        
        // FIXED: Ensure proper focus after modal opens
        setTimeout(() => {
            const firstInput = document.querySelector('#templateModal input:not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Open modal for editing
    async openForEdit(index, template) {
        this.editingIndex = index;
        document.getElementById('modalTitle').textContent = 'Edit Template';
        
        // NEW: Inject category field dynamically if not present
        this.injectCategoryField();
        
        this.populateForm(template);
        this.toggleTypeContent();
        
        // NEW: Load category names and set from template
        await this.loadCategoryNames();
        this.setCategory(template.category || 'category1');
        
        document.getElementById('templateModal').style.display = 'block';
        
        // NEW: Inject "Save as New" button
        this.injectSaveAsNewButton();
        
        // FIXED: Ensure proper focus after modal opens
        setTimeout(() => {
            const nameInput = document.getElementById('templateName');
            if (nameInput) {
                nameInput.focus();
                nameInput.select(); // Select all for easy editing
            }
        }, 100);
    },

    // Close modal
    close() {
        document.getElementById('templateModal').style.display = 'none';
        this.clearForm();
        this.editingIndex = -1;
        
        // FIXED: Restore focus to main content after modal closes
        setTimeout(() => {
            document.body.focus();
            if (window.repairInputFocus) {
                window.repairInputFocus();
            }
        }, 100);
    },

    // Clear form
    clearForm() {
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        // REMOVED: templateType field (now using category only)
        // REMOVED: document.getElementById('folderStructure').value = '';
        document.getElementById('experimentStructure').value = '';
        
        // Clear toggles
        document.getElementById('templateWriteFilesOnly').checked = false;
        document.getElementById('templateMultipleFolders').checked = false;
        
        // Clear metadata fields
        if (window.metadataEditor && window.metadataEditor.clearFields) {
            window.metadataEditor.clearFields();
        }
        
        // Clear any error messages
        this.clearMessages();
    },

    // Populate form with template data
    populateForm(template) {
        document.getElementById('templateName').value = template.name || '';
        document.getElementById('templateDescription').value = template.description || '';
        // REMOVED: templateType field (now using category only)
        
        // GEÄNDERT: Immer experimentStructure verwenden, unabhängig vom Template-Typ
        document.getElementById('experimentStructure').value = template.structure || '';
        
        // Load toggles
        document.getElementById('templateWriteFilesOnly').checked = template.options?.writeFilesOnly || false;
        document.getElementById('templateMultipleFolders').checked = template.options?.multipleFolders || false;
        
        // Load metadata into editor if it's an experiment template
        const isExperiment = template.type === 'experiment' || (template.metadata && Object.keys(template.metadata).length > 0);
        if (isExperiment && template.metadata && window.metadataEditor && window.metadataEditor.loadMetadataIntoEditor) {
            window.metadataEditor.loadMetadataIntoEditor(template.metadata);
        }
        
        // Clear any error messages
        this.clearMessages();
    },

    // Toggle between folder and experiment content
    // VEREINFACHT: Nur experimentTab anzeigen, folderTab existiert nicht mehr
    toggleTypeContent() {
        const experimentTab = document.getElementById('experimentTab');
        
        if (experimentTab) {
            experimentTab.style.display = 'block';
        }
    },

    // Switch between structure and metadata tabs
    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('#experimentTab .tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Remove active class from all tabs
        document.querySelectorAll('#experimentTab .tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab content
        if (tabName === 'structure') {
            document.getElementById('structureContent').classList.add('active');
            document.querySelector('#experimentTab .tab:first-child').classList.add('active');
        } else if (tabName === 'metadata') {
            document.getElementById('metadataContent').classList.add('active');
            document.querySelector('#experimentTab .tab:last-child').classList.add('active');
        }
    },

    // FIXED: Better error/success message display without focus-breaking alerts
    showMessage(message, type = 'info', autoHide = true) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Remove existing message
        this.clearMessages();
        
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.id = 'templateModalMessage';
        messageDiv.style.cssText = `
            position: absolute;
            top: 10px;
            left: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 6px;
            font-weight: 500;
            z-index: 10002;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            animation: slideDown 0.3s ease-out;
        `;
        
        // Style based on type
        switch (type) {
            case 'error':
                messageDiv.style.background = '#fee2e2';
                messageDiv.style.color = '#dc2626';
                messageDiv.style.border = '1px solid #f87171';
                messageDiv.innerHTML = `❌ ${message}`;
                break;
            case 'success':
                messageDiv.style.background = '#d1fae5';
                messageDiv.style.color = '#059669';
                messageDiv.style.border = '1px solid #34d399';
                messageDiv.innerHTML = `✅ ${message}`;
                break;
            case 'warning':
                messageDiv.style.background = '#fef3c7';
                messageDiv.style.color = '#d97706';
                messageDiv.style.border = '1px solid #fbbf24';
                messageDiv.innerHTML = `⚠️ ${message}`;
                break;
            default:
                messageDiv.style.background = '#dbeafe';
                messageDiv.style.color = '#2563eb';
                messageDiv.style.border = '1px solid #60a5fa';
                messageDiv.innerHTML = `ℹ️ ${message}`;
        }
        
        // Add animation CSS if not exists
        if (!document.getElementById('modalMessageStyles')) {
            const styles = document.createElement('style');
            styles.id = 'modalMessageStyles';
            styles.textContent = `
                @keyframes slideDown {
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(-20px); opacity: 0; }
                }
            `;
            document.head.appendChild(styles);
        }
        
        // Add to modal
        const modal = document.getElementById('templateModal');
        if (modal) {
            modal.appendChild(messageDiv);
            
            // Auto-hide success messages
            if (autoHide && type === 'success') {
                setTimeout(() => {
                    this.clearMessages();
                }, 3000);
            }
        }
        
        return messageDiv;
    },
    
    // Clear message
    clearMessages() {
        const existingMessage = document.getElementById('templateModalMessage');
        if (existingMessage) {
            existingMessage.style.animation = 'slideUp 0.3s ease-out';
            setTimeout(() => {
                if (existingMessage.parentNode) {
                    existingMessage.remove();
                }
            }, 300);
        }
    },

    // Show error with focus preservation
    showError(message) {
        this.showMessage(message, 'error', false);
        
        // CRITICAL: Preserve focus after error display
        setTimeout(() => {
            // Try to focus the field that caused the error
            if (message.includes('name')) {
                const nameInput = document.getElementById('templateName');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.style.borderColor = '#dc2626';
                    setTimeout(() => {
                        nameInput.style.borderColor = '';
                    }, 3000);
                }
            }
            
            // General focus repair
            if (window.repairInputFocus) {
                window.repairInputFocus();
            }
        }, 100);
    },

    // Show success message
    showSuccess(message) {
        this.showMessage(message, 'success', true);
    },

    // FIXED: Save method without focus-breaking alerts (made async for proper template refresh)
    async save() {
        console.log('🔧 Save method called');
        
        // Clear previous messages
        this.clearMessages();
        
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        
        // Determine type based on whether metadata exists
        const hasMetadata = window.metadataEditor && window.metadataEditor.collectMetadata && 
                          Object.keys(window.metadataEditor.collectMetadata() || {}).length > 0;
        const type = hasMetadata ? 'experiment' : 'folders';

        console.log('Form values:', { name, description, type, hasMetadata });

        // FIXED: Use showError instead of alert
        if (!name) {
            this.showError('Please enter a template name!');
            return;
        }

        // Additional validation
        if (name.length > 100) {
            this.showError('Template name is too long (max 100 characters)!');
            return;
        }
        
        if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
            this.showError('Template name contains invalid characters! Use only letters, numbers, spaces, hyphens and underscores.');
            return;
        }

        // GEÄNDERT: Immer experimentStructure auslesen
        let structure = document.getElementById('experimentStructure').value.trim();

        console.log('Structure:', structure);

        const category = this.getSelectedCategory(); // NEW: Get category
        
        let existingIntegrations = null;
        let existingProjectDefaults = null;
        if (this.editingIndex >= 0 && window.templateManager && window.templateManager.templates) {
            const existingTemplate = window.templateManager.templates[this.editingIndex];
            if (existingTemplate) {
                existingIntegrations = existingTemplate.integrations;
                existingProjectDefaults = existingTemplate.projectDefaults;
            }
        } else if (window.templateManager && window.templateManager.currentTemplate) {
            existingIntegrations = window.templateManager.currentTemplate.integrations;
            existingProjectDefaults = window.templateManager.currentTemplate.projectDefaults;
        }
        
        const template = {
            name: name,
            description: description,
            type: type,
            category: category, // NEW: Save category
            structure: structure,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString(),
            options: {
                writeFilesOnly: document.getElementById('templateWriteFilesOnly').checked,
                multipleFolders: document.getElementById('templateMultipleFolders').checked
            }
        };

        if (existingIntegrations) {
            template.integrations = JSON.parse(JSON.stringify(existingIntegrations));
        }
        if (existingProjectDefaults) {
            template.projectDefaults = JSON.parse(JSON.stringify(existingProjectDefaults));
        }

        // FIXED: Add metadata for experiments
        if (type === 'experiment' && window.metadataEditor && window.metadataEditor.collectMetadata) {
            const metadata = window.metadataEditor.collectMetadata();
            if (metadata && Object.keys(metadata).length > 0) {
                template.metadata = metadata;
                console.log('Metadata collected:', metadata);
            }
        }

        console.log('Final template object:', template);

        try {
            if (this.editingIndex >= 0) {
                // Update existing template
                if (window.templateManager && window.templateManager.update) {
                    await window.templateManager.update(this.editingIndex, template);
                    console.log('✅ Template updated successfully!');
                    
                    // FIXED: Reload templates to refresh UI after update
                    console.log('🔄 Refreshing template list after update...');
                    await window.templateManager.refresh();
                    
                    // FIXED: Show success message without alert
                    this.showSuccess(`Template "${name}" has been updated!`);
                    
                    // Close modal after brief delay to show success message
                    setTimeout(() => {
                        this.close();
                    }, 2000);
                } else {
                    throw new Error('templateManager.update not available');
                }
            } else {
                // Add new template
                if (window.templateManager && window.templateManager.add) {
                    await window.templateManager.add(template);
                    console.log('✅ Template added successfully!');
                    
                    // FIXED: Reload templates to refresh UI after adding
                    console.log('🔄 Refreshing template list after adding...');
                    await window.templateManager.refresh();
                    
                    // FIXED: Show success message without alert
                    this.showSuccess(`Template "${name}" has been created!`);
                    
                    // Close modal after brief delay to show success message
                    setTimeout(() => {
                        this.close();
                    }, 2000);
                } else {
                    throw new Error('templateManager.add not available');
                }
            }
            
        } catch (error) {
            console.error('❌ Error in save process:', error);
            
            // FIXED: Show error message without alert
            this.showError('Error while saving: ' + error.message);
        }
    },

    // FIXED: Enhanced form validation with better UX
    validateForm() {
        const name = document.getElementById('templateName').value.trim();
        
        // Determine type based on whether metadata exists
        const hasMetadata = window.metadataEditor && window.metadataEditor.collectMetadata && 
                          Object.keys(window.metadataEditor.collectMetadata() || {}).length > 0;
        const type = hasMetadata ? 'experiment' : 'folders';
        
        const errors = [];
        
        if (!name) {
            errors.push('Template name is required');
        } else if (name.length > 100) {
            errors.push('Template name is too long (max 100 characters)');
        } else if (!/^[a-zA-Z0-9_\-\s]+$/.test(name)) {
            errors.push('Template name contains invalid characters');
        }
        
        // Check for duplicate names
        if (window.templateManager && window.templateManager.templates) {
            const existingTemplate = window.templateManager.templates.find((t, index) => 
                t.name.toLowerCase() === name.toLowerCase() && 
                index !== this.editingIndex
            );
            if (existingTemplate) {
                errors.push('A template with this name already exists');
            }
        }
        
        // Validate structure if provided
        if (type === 'folders') {
            const structure = document.getElementById('experimentStructure').value.trim();
            if (structure && !this.validateStructure(structure)) {
                errors.push('Invalid folder structure format');
            }
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    },
    
    // Helper to validate structure format
    validateStructure(structure) {
        try {
            const lines = structure.split('\n').filter(line => line.trim());
            return lines.length > 0; // Basic validation - at least one line
        } catch (e) {
            return false;
        }
    },

    // NEW: Load category names from settings and update dropdown
    async loadCategoryNames() {
        console.log('📁 Loading category names from settings...');
        
        const categorySelect = document.getElementById('templateCategory');
        if (!categorySelect) {
            console.warn('Category select not found');
            return;
        }
        
        try {
            // Get category configurations from settings
            const categories = [];
            for (let i = 1; i <= 4; i++) {
                const categoryId = `category${i}`;
                const config = await window.settingsManager?.getCategoryConfig?.(categoryId);
                
                if (config) {
                    categories.push({
                        id: categoryId,
                        name: config.name || `Category ${i}`,
                        icon: config.icon || '📋',
                        color: config.color || '#6b7280'
                    });
                } else {
                    // Fallback if settings not available
                    const defaults = {
                        category1: { name: 'Main-Project', icon: '🎯', color: '#8b5cf6' },
                        category2: { name: 'Sub-Project', icon: '📊', color: '#06b6d4' },
                        category3: { name: 'Action', icon: '⚡', color: '#10b981' },
                        category4: { name: 'Misc', icon: '📋', color: '#f59e0b' }
                    };
                    const def = defaults[categoryId];
                    categories.push({
                        id: categoryId,
                        name: def.name,
                        icon: def.icon,
                        color: def.color
                    });
                }
            }
            
            // Update dropdown options
            categorySelect.innerHTML = categories.map(cat => 
                `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
            ).join('');
            
            console.log('✅ Category names loaded:', categories.map(c => c.name).join(', '));
            
        } catch (error) {
            console.error('Error loading category names:', error);
            // Keep default options if error occurs
        }
    },

    // NEW: Get selected category from dropdown
    getSelectedCategory() {
        const categorySelect = document.getElementById('templateCategory');
        if (!categorySelect) {
            return 'category1'; // Default fallback
        }
        return categorySelect.value || 'category1';
    },

    // NEW: Set category in dropdown
    setCategory(categoryId) {
        const categorySelect = document.getElementById('templateCategory');
        if (!categorySelect) {
            console.warn('Category select not found');
            return;
        }
        
        // Validate category ID
        const validCategories = ['category1', 'category2', 'category3', 'category4'];
        if (!validCategories.includes(categoryId)) {
            console.warn('Invalid category ID:', categoryId, '- using category1');
            categoryId = 'category1';
        }
        
        categorySelect.value = categoryId;
        console.log('📁 Category set to:', categoryId);
    },

    // NEW: Dynamically inject "Save as New" button into modal if not present
    injectSaveAsNewButton() {
        console.log('🔧 Checking for "Save as New" button...');
        
        // Check if button already exists (prevent duplicates)
        if (document.getElementById('saveAsNewBtn')) {
            console.log('✅ "Save as New" button already exists');
            return;
        }
        
        // Wait a bit for modal to be fully rendered
        setTimeout(() => {
            const modal = document.getElementById('templateModal');
            if (!modal || modal.style.display === 'none') {
                console.warn('⚠️ Modal not visible, skipping button injection');
                return;
            }
            
            // Find the Save button
            const buttons = modal.querySelectorAll('button');
            const saveBtn = Array.from(buttons).find(btn => 
                btn.textContent.includes('Save') && 
                !btn.textContent.includes('Cancel') &&
                !btn.textContent.includes('Copy')
            );
            
            if (saveBtn) {
                // Check if button already exists (double-check)
                const existingBtn = document.getElementById('saveAsNewBtn');
                if (existingBtn) {
                    console.log('✅ "Save as New" button already exists (double-check)');
                    return;
                }
                
                // Create "Save as New" button
                const newBtn = document.createElement('button');
                newBtn.id = 'saveAsNewBtn';
                newBtn.className = 'btn btn-secondary';
                newBtn.onclick = () => window.templateModal.saveAsNewTemplate();
                newBtn.textContent = '💾 Save as New';
                newBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                newBtn.style.borderColor = '#059669';
                newBtn.style.color = 'white';
                newBtn.style.marginRight = '8px';
                newBtn.title = 'Create a copy of this template with a new name';
                
                // Insert before the Save button
                saveBtn.parentNode.insertBefore(newBtn, saveBtn);
                
                console.log('✅ "Save as New" button injected successfully');
            } else {
                console.warn('⚠️ Save button not found in modal');
            }
        }, 150); // Small delay to ensure modal is rendered
    },
    
    // NEW: Dynamically inject category field into modal if not present
    injectCategoryField() {
        console.log('🔧 Checking for category field...');
        
        // Check if field already exists
        if (document.getElementById('templateCategory')) {
            console.log('✅ Category field already exists');
            return;
        }
        
        console.log('➕ Injecting category field dynamically...');
        
        // Find the templateDescription field as reference point
        const templateDescriptionField = document.getElementById('templateDescription');
        if (!templateDescriptionField) {
            console.error('❌ Could not find templateDescription field - cannot inject category field');
            return;
        }
        
        // Find the parent form group of templateDescription
        const templateDescriptionFormGroup = templateDescriptionField.closest('.form-group') || templateDescriptionField.parentElement;
        
        // Create the category field HTML
        const categoryFieldHTML = `
            <div class="form-group" id="templateCategoryGroup" style="margin-bottom: 20px; margin-top: 15px;">
                <label for="templateCategory" style="display: block; margin-bottom: 8px; font-weight: 600; color: #e0e0e0;">
                    📁 Template Category:
                </label>
                <select id="templateCategory" 
                        style="width: 100%; padding: 10px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: #e0e0e0; font-size: 14px;">
                    <option value="category1">🎯 Main-Project</option>
                    <option value="category2">📊 Sub-Project</option>
                    <option value="category3">⚡ Action</option>
                    <option value="category4">📋 Misc</option>
                </select>
                <small style="display: block; margin-top: 6px; color: #9ca3af; font-size: 12px;">
                    Choose which category this template belongs to. Category names can be customized in Settings.
                </small>
            </div>
        `;
        
        // Insert after the templateDescription form group
        if (templateDescriptionFormGroup.nextSibling) {
            templateDescriptionFormGroup.insertAdjacentHTML('afterend', categoryFieldHTML);
        } else {
            templateDescriptionFormGroup.parentElement.insertAdjacentHTML('beforeend', categoryFieldHTML);
        }
        
        console.log('✅ Category field injected successfully');
    },

    /**
     * NEW: Save current template as a NEW template (duplicate functionality)
     * Creates a copy of the currently edited template with a new name
     * 
     * Usage: Called when user clicks "Save as New Template" button
     * Result: Always creates a new template, never overwrites existing ones
     */
    async saveAsNewTemplate() {
        console.log('💾 Saving template as new template...');
        
        try {
            // === STEP 1: Get all form values ===
            const name = document.getElementById('templateName').value.trim();
            const description = document.getElementById('templateDescription').value.trim();
            const category = this.getSelectedCategory(); // Get category from dropdown
            
            // === STEP 2: Validate required fields ===
            if (!name) {
                this.showMessage('⚠️ Please enter a template name', 'error');
                return false;
            }
            
            // === STEP 3: Determine template type (Experiment or Folder) ===
            const hasMetadata = window.metadataEditor && window.metadataEditor.collectMetadata && 
                              Object.keys(window.metadataEditor.collectMetadata() || {}).length > 0;
            const type = hasMetadata ? 'experiment' : 'folders';
            
            // GEÄNDERT: Immer experimentStructure auslesen
            let structure = document.getElementById('experimentStructure').value.trim();
            let metadata = null;
            
            if (type === 'experiment') {
                // === EXPERIMENT TEMPLATE ===
                // Get metadata from the metadata editor
                if (window.metadataEditor && window.metadataEditor.collectMetadata) {
                    metadata = window.metadataEditor.collectMetadata();
                }
                
                // Validate: At least one of structure or metadata must be present
                if (!structure && (!metadata || Object.keys(metadata).length === 0)) {
                    this.showMessage('⚠️ Please add either a folder structure or metadata fields', 'error');
                    return false;
                }
            } else {
                // === FOLDER TEMPLATE ===
                // For folder templates, structure is required
                if (!structure) {
                    this.showMessage('⚠️ Please enter a folder structure', 'error');
                    return false;
                }
            }
            
            // === STEP 4: Preserve existing integrations and project defaults ===
            let existingIntegrations = null;
            let existingProjectDefaults = null;
            if (window.templateManager && window.templateManager.currentTemplate) {
                existingIntegrations = window.templateManager.currentTemplate.integrations;
                existingProjectDefaults = window.templateManager.currentTemplate.projectDefaults;
            }

            // === STEP 5: Create new template object ===
            const newTemplate = {
                name: name + ' (Copy)', // Automatically add "(Copy)" to name
                description: description || '',
                structure: structure,
                metadata: metadata || {},
                type: type,
                category: category,
                createdBy: window.userManager?.currentUser || 'Unknown',
                createdByGroup: window.userManager?.currentGroup || 'Unknown',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            if (existingIntegrations) {
                newTemplate.integrations = JSON.parse(JSON.stringify(existingIntegrations));
            }
            if (existingProjectDefaults) {
                newTemplate.projectDefaults = JSON.parse(JSON.stringify(existingProjectDefaults));
            }
            
            // === STEP 5: Handle duplicate names ===
            // Check if a template with this name already exists
            const existingTemplate = window.templateManager.templates.find(t => 
                t.name === newTemplate.name && 
                t.createdBy === newTemplate.createdBy
            );
            
            if (existingTemplate) {
                // Name already exists - add a number to make it unique
                let counter = 2;
                let uniqueName = `${name} (Copy ${counter})`;
                
                // Keep incrementing until we find a unique name
                while (window.templateManager.templates.find(t => 
                    t.name === uniqueName && 
                    t.createdBy === newTemplate.createdBy
                )) {
                    counter++;
                    uniqueName = `${name} (Copy ${counter})`;
                }
                
                newTemplate.name = uniqueName;
                console.log(`📝 Adjusted name to avoid duplicate: ${uniqueName}`);
            }
            
            // === STEP 6: Add template to manager ===
            await window.templateManager.add(newTemplate);
            
            // === STEP 7: Refresh template list ===
            console.log('🔄 Refreshing template list after adding...');
            await window.templateManager.refresh();
            
            // === STEP 8: Show success message ===
            this.showMessage(`✅ Template "${newTemplate.name}" created successfully!`, 'success');
            
            // === STEP 9: Close modal after short delay ===
            setTimeout(() => {
                this.close();
            }, 800);
            
            console.log(`✅ Template successfully saved as new: "${newTemplate.name}"`);
            return true;
            
        } catch (error) {
            console.error('❌ Error saving template as new:', error);
            this.showMessage(`❌ Error: ${error.message}`, 'error');
            return false;
        }
    }
};

// Make globally available
window.templateModal = templateModal;
console.log('✅ templateModal loaded (FIXED: Focus-safe notifications)');