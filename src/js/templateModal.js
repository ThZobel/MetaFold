// Template Modal Manager (Fixed with Metadata Support)

const templateModal = {
    editingIndex: -1, // -1 = new template, >= 0 = editing existing

    // Show modal for new template
    show() {
        this.editingIndex = -1;
        document.getElementById('modalTitle').textContent = 'Create New Template';
        this.clearForm();
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
    },

    // Open modal for editing
    openForEdit(index, template) {
        this.editingIndex = index;
        document.getElementById('modalTitle').textContent = 'Edit Template';
        this.populateForm(template);
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
    },

    // Close modal
    close() {
        document.getElementById('templateModal').style.display = 'none';
        this.clearForm();
        this.editingIndex = -1;
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

    // Save method (Fixed with Metadata Support)
    save() {
        console.log('🔧 Save method called');
        
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const type = document.getElementById('templateType').value;

        console.log('Form values:', { name, description, type });

        if (!name) {
            alert('Please enter a template name!');
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
                    alert(`Template "${name}" has been updated!`);
                } else {
                    throw new Error('templateManager.update not available');
                }
            } else {
                // Add new template
                if (window.templateManager && window.templateManager.add) {
                    window.templateManager.add(template);
                    console.log('✅ Template added successfully!');
                    alert(`Template "${name}" has been created!`);
                } else {
                    throw new Error('templateManager.add not available');
                }
            }
            
            // Close modal
            this.close();
            
        } catch (error) {
            console.error('❌ Error in save process:', error);
            alert('Error while saving: ' + error.message);
        }
    }
};

// Make globally available
window.templateModal = templateModal;
console.log('✅ templateModal loaded (Fixed with Metadata Support)');