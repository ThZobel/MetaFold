// Template Modal Manager (FIXED: No more focus-breaking alerts)

const templateModal = {
    editingIndex: -1, // -1 = new template, >= 0 = editing existing

    // Show modal for new template
    show() {
        this.editingIndex = -1;
        document.getElementById('modalTitle').textContent = 'Create New Template';
        this.clearForm();
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
        
        // FIXED: Ensure proper focus after modal opens
        setTimeout(() => {
            const firstInput = document.querySelector('#templateModal input:not([disabled])');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    },

    // Open modal for editing
    openForEdit(index, template) {
        this.editingIndex = index;
        document.getElementById('modalTitle').textContent = 'Edit Template';
        this.populateForm(template);
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
        
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
        document.getElementById('templateType').value = 'folders';
        document.getElementById('folderStructure').value = '';
        document.getElementById('experimentStructure').value = '';
        
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
        document.getElementById('templateType').value = template.type || 'folders';
        
        if (template.type === 'experiment') {
            document.getElementById('experimentStructure').value = template.structure || '';
            
            // Load metadata into editor
            if (template.metadata && window.metadataEditor && window.metadataEditor.loadMetadataIntoEditor) {
                window.metadataEditor.loadMetadataIntoEditor(template.metadata);
            }
        } else {
            document.getElementById('folderStructure').value = template.structure || '';
        }
        
        // Clear any error messages
        this.clearMessages();
    },

    // Toggle between folder and experiment content
    toggleTypeContent() {
        const type = document.getElementById('templateType').value;
        const folderTab = document.getElementById('folderTab');
        const experimentTab = document.getElementById('experimentTab');

        if (type === 'experiment') {
            folderTab.style.display = 'none';
            experimentTab.style.display = 'block';
        } else {
            folderTab.style.display = 'block';
            experimentTab.style.display = 'none';
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

    // FIXED: Save method without focus-breaking alerts
    save() {
        console.log('🔧 Save method called');
        
        // Clear previous messages
        this.clearMessages();
        
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const type = document.getElementById('templateType').value;

        console.log('Form values:', { name, description, type });

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

        let structure = '';
        if (type === 'experiment') {
            structure = document.getElementById('experimentStructure').value.trim();
        } else {
            structure = document.getElementById('folderStructure').value.trim();
        }

        console.log('Structure:', structure);

        const template = {
            name: name,
            description: description,
            type: type,
            structure: structure,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString()
        };

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
                    window.templateManager.update(this.editingIndex, template);
                    console.log('✅ Template updated successfully!');
                    
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
                    window.templateManager.add(template);
                    console.log('✅ Template added successfully!');
                    
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
        const type = document.getElementById('templateType').value;
        
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
            const structure = document.getElementById('folderStructure').value.trim();
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
    }
};

// Make globally available
window.templateModal = templateModal;
console.log('✅ templateModal loaded (FIXED: Focus-safe notifications)');