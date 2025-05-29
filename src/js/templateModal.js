// Template Modal for creating and editing templates

const templateModal = {
    editingIndex: -1,

    // Open modal for new template
    show() {
        this.editingIndex = -1;
        document.getElementById('modalTitle').textContent = 'Create New Template';
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        document.getElementById('folderStructure').value = '';
        document.getElementById('experimentStructure').value = '';
        document.getElementById('templateType').value = templateTypeManager.currentType === 'experiments' ? 'experiment' : 'folders';
        
        metadataEditor.clearFields();
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
    },

    // Open modal for editing
    openForEdit(index, template) {
        this.editingIndex = index;
        document.getElementById('modalTitle').textContent = 'Edit Template';
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateDescription').value = template.description || '';
        document.getElementById('templateType').value = template.type || 'folders';
        
        if (template.type === 'experiment') {
            document.getElementById('experimentStructure').value = template.structure;
            if (template.metadata) {
                metadataEditor.loadMetadataIntoEditor(template.metadata);
            }
        } else {
            document.getElementById('folderStructure').value = template.structure;
        }
        
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
    },

    // Close modal
    close() {
        document.getElementById('templateModal').style.display = 'none';
    },

    // Toggle template type content
    toggleTypeContent() {
        const type = document.getElementById('templateType').value;
        document.getElementById('folderTab').style.display = type === 'folders' ? 'block' : 'none';
        document.getElementById('experimentTab').style.display = type === 'experiment' ? 'block' : 'none';
    },

    // Switch tab (within experiment tab)
    switchTab(tab) {
        // Tab buttons
        document.querySelectorAll('#experimentTab .tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        // Tab contents
        document.getElementById('structureContent').style.display = tab === 'structure' ? 'block' : 'none';
        document.getElementById('metadataContent').style.display = tab === 'metadata' ? 'block' : 'none';
    },

    // Save template - EXTENDED VALIDATION
    save() {
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const type = document.getElementById('templateType').value;
        
        let structure = '';
        if (type === 'folders') {
            structure = document.getElementById('folderStructure').value.trim();
        } else {
            structure = document.getElementById('experimentStructure').value.trim();
        }

        // Basic validation: Name is always required
        if (!name) {
            alert('Please enter a name for the template!');
            return;
        }
        
        // Type-specific validation
        if (type === 'folders') {
            // Folder templates: Structure is required
            if (!structure) {
                alert('Folder templates require a folder structure!');
                return;
            }
        } else if (type === 'experiment') {
            // Experiment templates: Either structure or metadata required
            let hasMetadata = false;
            if (typeof metadataEditor !== 'undefined') {
                const metadata = metadataEditor.collectMetadata();
                hasMetadata = metadata && Object.keys(metadata).length > 0;
            }
            
            if (!structure && !hasMetadata) {
                alert('Experiment templates require either a folder structure or metadata fields!\n\nTip: Switch to the "Metadata" tab to add fields.');
                return;
            }
            
            // Helpful hint when only metadata
            if (!structure && hasMetadata) {
                const confirmResult = confirm(
                    'This template has no folder structure - only metadata files will be created.\n\n' +
                    'Do you want to continue?'
                );
                if (!confirmResult) {
                    return;
                }
            }
        }

        const template = { name, description, structure, type };
        
        // Add metadata for experiments
        if (type === 'experiment') {
            if (typeof metadataEditor !== 'undefined') {
                const metadata = metadataEditor.collectMetadata();
                template.metadata = metadata;
            }
        }

        // Check if templateManager is available
        if (typeof templateManager === 'undefined') {
            console.error('templateManager is not available');
            alert('Error: Template Manager not loaded. Please restart the app.');
            return;
        }

        if (this.editingIndex >= 0) {
            templateManager.update(this.editingIndex, template);
        } else {
            templateManager.add(template);
        }

        this.close();
    }
};

// Make globally available
window.templateModal = templateModal;