// Template Modal Manager

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

    // Verbesserte save() Methode
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

    console.log('Final template object:', template);

    // Direct storage save test
    console.log('Testing direct storage save...');
    
    try {
        // Get current templates
        const currentTemplates = window.storage ? window.storage.loadTemplates() : [];
        console.log('Current templates count:', currentTemplates.length);
        
        // Add new template
        currentTemplates.push(template);
        
        // Save directly
        if (window.storage && window.storage.saveTemplates) {
            const saveResult = window.storage.saveTemplates(currentTemplates);
            console.log('Direct save result:', saveResult);
            
            if (saveResult) {
                console.log('✅ Template saved successfully!');
                
                // Refresh template list
                if (window.templateManager && window.templateManager.renderList) {
                    window.templateManager.templates = currentTemplates;
                    window.templateManager.renderList();
                }
                
                // Close modal
                this.close();
                
                // Show success
                alert(`Template "${name}" wurde gespeichert!`);
            } else {
                console.error('❌ Save returned false');
                alert('Fehler beim Speichern!');
            }
        } else {
            console.error('❌ storage.saveTemplates not available');
            alert('Storage nicht verfügbar!');
        }
        
    } catch (error) {
        console.error('❌ Error in save process:', error);
        alert('Fehler beim Speichern: ' + error.message);
    }
}
};

// Make globally available
window.templateModal = templateModal;
console.log('✅ templateModal loaded (with fixed save)');