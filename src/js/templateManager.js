// Template Manager for managing templates

const templateManager = {
    templates: [],
    currentTemplate: null,

    // Initialization
    init() {
        this.templates = storage.loadTemplates();
        storage.saveTemplates(this.templates); // For initial save of default templates
        this.renderList();
    },

    // Render template list
    renderList() {
        const listContainer = document.getElementById('templateList');
        const filteredTemplates = this.templates.filter(t => 
            (templateTypeManager.currentType === 'folders' && t.type !== 'experiment') ||
            (templateTypeManager.currentType === 'experiments' && t.type === 'experiment')
        );
        
        if (filteredTemplates.length === 0) {
            const typeLabel = templateTypeManager.currentType === 'folders' ? 'Folder Templates' : 'Experiment Templates';
            listContainer.innerHTML = `
                <div class="empty-state">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                    </svg>
                    <p>No ${typeLabel} available yet.<br>Create your first template!</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filteredTemplates.map(template => {
            const index = this.templates.indexOf(template);
            const badge = template.type === 'experiment' ? 
                '<span class="template-badge experiment">Exp</span>' : 
                '<span class="template-badge">Folder</span>';
            
            return `
                <div class="template-item ${this.currentTemplate === template ? 'active' : ''}" 
                     onclick="templateManager.select(${index})">
                    <h3>${template.name} ${badge}</h3>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 5px;">
                        ${template.description || 'No description'}
                    </p>
                </div>
            `;
        }).join('');
    },

    // Select template
    select(index) {
        // Clear field values when new template is chosen
        if (this.currentTemplate !== this.templates[index]) {
            experimentForm.clearSavedFieldValues();
        }
        
        this.currentTemplate = this.templates[index];
        document.getElementById('templateDetails').style.display = 'block';
        
        // Update folder structure preview
        const preview = document.getElementById('folderPreview');
        preview.textContent = this.currentTemplate.structure;
        
        // Show/hide experiment form
        const experimentFormDiv = document.getElementById('experimentForm');
        if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
            experimentFormDiv.style.display = 'block';
            experimentForm.render(this.currentTemplate.metadata);
        } else {
            experimentFormDiv.style.display = 'none';
        }
        
        this.renderList();
    },

    // Add template
    add(template) {
        this.templates.push(template);
        storage.saveTemplates(this.templates);
        this.renderList();
    },

    // Update template
    update(index, template) {
        if (index >= 0 && index < this.templates.length) {
            this.templates[index] = template;
            if (this.currentTemplate === this.templates[index]) {
                this.currentTemplate = template;
                const templateInfoSection = document.getElementById('templateInfoSection');
                if (templateInfoSection) {
                    templateInfoSection.classList.add('active');
                }
                if (window.projectManager && window.projectManager.updateTemplateInfo) {
                    window.projectManager.updateTemplateInfo();
                }
            }
            storage.saveTemplates(this.templates);
            this.renderList();
            
            // If edited, update details
            if (this.currentTemplate === template) {
                const preview = document.getElementById('folderPreview');
                preview.textContent = this.currentTemplate.structure;
                
                // Re-render experiment form if needed
                if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
                    experimentForm.render(this.currentTemplate.metadata);
                }
            }
        }
    },

    // Edit current template
    editCurrent() {
        if (!this.currentTemplate) return;
        
        const editingIndex = this.templates.indexOf(this.currentTemplate);
        templateModal.openForEdit(editingIndex, this.currentTemplate);
    },

    // Delete current template
    deleteCurrent() {
        if (!this.currentTemplate) return;
        
        if (confirm(`Do you really want to delete the template "${this.currentTemplate.name}"?`)) {
            const index = this.templates.indexOf(this.currentTemplate);
            this.templates.splice(index, 1);
            storage.saveTemplates(this.templates);
            
            this.currentTemplate = null;
            document.getElementById('templateDetails').style.display = 'none';
            this.renderList();
        }
    },

    // Delete template by index
    delete(index) {
        if (index >= 0 && index < this.templates.length) {
            if (this.currentTemplate === this.templates[index]) {
                this.currentTemplate = null;
                document.getElementById('templateDetails').style.display = 'none';
            }
            this.templates.splice(index, 1);
            storage.saveTemplates(this.templates);
            this.renderList();
        }
    }
};

// Make globally available
window.templateManager = templateManager;