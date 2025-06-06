// Template Manager (Enhanced with better user integration and UI)

const templateManager = {
    templates: [],
    currentTemplate: null,
    selectedIndex: -1,
    allTemplates: [],

    // Initialize template manager
    init() {
        console.log('🔧 Initializing templateManager...');
        try {
            this.templates = window.storage ? window.storage.loadTemplates() : [];
            this.renderList();
            this.updateTemplateInfo();
            console.log('✅ templateManager initialized with', this.templates.length, 'templates');
        } catch (error) {
            console.error('❌ Error in templateManager.init:', error);
            this.templates = [];
            this.renderList();
        }
    },

    // Add new template
    add(template) {
        console.log('➕ Adding template:', template);
        
        const enhancedTemplate = {
            ...template,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString()
        };
        
        this.templates.push(enhancedTemplate);
        
        if (window.storage) {
            const saved = window.storage.saveTemplates(this.templates);
            console.log('💾 Save result:', saved);
        }
        
        this.renderList();
        this.updateTemplateInfo();
        console.log('✅ Template added successfully');
    },

    // Update template
    update(index, template) {
        if (index >= 0 && index < this.templates.length) {
            const existingTemplate = this.templates[index];
            const updatedTemplate = {
                ...template,
                createdBy: existingTemplate.createdBy,
                createdByGroup: existingTemplate.createdByGroup,
                createdAt: existingTemplate.createdAt,
                updatedAt: new Date().toISOString()
            };
            
            this.templates[index] = updatedTemplate;
            
            if (window.storage) {
                window.storage.saveTemplates(this.templates);
            }
            
            this.renderList();
            this.updateTemplateInfo();
            console.log('✅ Template updated:', template.name);
        }
    },

    // Get current type safely
    getCurrentType() {
        if (window.templateTypeManager && window.templateTypeManager.currentType) {
            return window.templateTypeManager.currentType;
        }
        return 'folders';
    },

    // Get all templates (including group templates)
    getAllTemplates() {
        const currentType = this.getCurrentType();
        
        const ownTemplates = this.templates.filter(t => 
            (currentType === 'folders' && t.type !== 'experiment') ||
            (currentType === 'experiments' && t.type === 'experiment')
        );

        // Load group templates but exclude system templates and own templates
        let groupTemplates = [];
        try {
            if (window.storage && window.storage.loadGroupTemplates && window.userManager?.currentGroup) {
                groupTemplates = window.storage.loadGroupTemplates(window.userManager.currentGroup)
                    .filter(t => 
                        ((currentType === 'folders' && t.type !== 'experiment') ||
                        (currentType === 'experiments' && t.type === 'experiment')) &&
                        t.createdBy !== window.userManager?.currentUser &&
                        t.createdBy !== 'System'
                    );
            }
        } catch (error) {
            console.warn('Could not load group templates:', error);
            groupTemplates = [];
        }

        // Mark templates with proper indices
        const ownTemplatesMarked = ownTemplates.map((t, i) => ({ 
            ...t, 
            isOwn: true, 
            originalIndex: i
        }));
        
        const groupTemplatesMarked = groupTemplates.map(t => ({ 
            ...t, 
            isOwn: false, 
            originalIndex: -1
        }));

        this.allTemplates = [...ownTemplatesMarked, ...groupTemplatesMarked];
        return this.allTemplates;
    },

    // Safe user color generation
    getUserColor(username) {
        if (window.userManager && window.userManager.generateUserColor) {
            return window.userManager.generateUserColor(username);
        }
        return '#7c3aed';
    },

    // Safe user initials
    getUserInitials(username) {
        if (window.userManager && window.userManager.getUserInitials) {
            return window.userManager.getUserInitials(username);
        }
        return username ? username.substring(0, 2).toUpperCase() : '??';
    },

    // Update template info display
    updateTemplateInfo() {
        const infoElement = document.getElementById('templateInfo');
        if (!infoElement) return;

        if (!this.currentTemplate) {
            infoElement.textContent = 'No template selected';
            infoElement.className = 'template-info';
            return;
        }

        const template = this.currentTemplate;
        const hasStructure = template.structure && template.structure.trim() !== '';
        const hasMetadata = template.metadata && Object.keys(template.metadata).length > 0;
        
        let infoText = template.name;
        let infoClass = 'template-info success';
        
        if (template.type === 'experiment') {
            if (!hasStructure && !hasMetadata) {
                infoText += ' (No structure or metadata defined)';
                infoClass = 'template-info warning';
            } else if (!hasStructure && hasMetadata) {
                infoText += ' (Metadata only - no folder structure)';
                infoClass = 'template-info info';
            } else if (hasStructure && !hasMetadata) {
                infoText += ' (Structure only - no metadata)';
                infoClass = 'template-info warning';
            } else {
                infoText += ' (Complete experiment template)';
                infoClass = 'template-info success';
            }
        } else {
            if (!hasStructure) {
                infoText += ' (No structure defined)';
                infoClass = 'template-info error';
            } else {
                infoText += ' (Folder template ready)';
                infoClass = 'template-info success';
            }
        }
        
        infoElement.textContent = infoText;
        infoElement.className = infoClass;
    },

    // Render template list with enhanced UI
    renderList() {
        const listContainer = document.getElementById('templateList');
        if (!listContainer) {
            console.warn('templateList element not found');
            return;
        }

        const allTemplates = this.getAllTemplates();
        const currentType = this.getCurrentType();
        
        if (allTemplates.length === 0) {
            const typeLabel = currentType === 'folders' ? 'Folder Templates' : 'Experiment Templates';
            listContainer.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.6;">
                        ${currentType === 'folders' ? '📁' : '🧪'}
                    </div>
                    <p style="font-weight: 500; margin-bottom: 0.5rem;">No ${typeLabel} yet</p>
                    <p style="font-size: 0.9rem; opacity: 0.8;">Create your first template to get started!</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = allTemplates.map((template, index) => {
            const badge = template.type === 'experiment' ? 
                '<span class="template-badge experiment">🧪</span>' : 
                '<span class="template-badge">📁</span>';
            
            const color = this.getUserColor(template.createdBy);
            const initials = this.getUserInitials(template.createdBy);
            const isSelected = this.selectedIndex === index;
            
            const createdDate = new Date(template.createdAt).toLocaleDateString();
            const updatedDate = template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : null;
            
            // Copy link for shared templates
            const copyLink = !template.isOwn ? 
                `<span class="copy-link" onclick="event.stopPropagation(); templateManager.copyTemplate(${index})">📋 Copy to my templates</span>` : '';
            
            return `
                <div class="template-item ${isSelected ? 'active' : ''}" 
                     data-is-own="${template.isOwn}"
                     onclick="templateManager.select(${index})">
                    <div class="template-header">
                        <div class="template-avatar" style="background-color: ${color}">
                            ${initials}
                        </div>
                        <div class="template-info">
                            <h3>
                                ${template.name}
                                ${badge}
                                ${!template.isOwn ? '<span class="shared-badge">shared</span>' : ''}
                            </h3>
                            <div class="template-meta">
                                <span class="creator-info">by ${template.createdBy} (${template.createdByGroup})</span>
                                <span class="date-info">
                                    Created: ${createdDate}
                                    ${updatedDate ? ` • Updated: ${updatedDate}` : ''}
                                </span>
                                ${copyLink}
                            </div>
                        </div>
                    </div>
                    ${template.description ? `
                        <p class="template-description">${template.description}</p>
                    ` : ''}
                    ${template.isOwn ? `
                        <div class="owner-indicator" title="Your template"></div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    // Copy template with enhanced feedback
    copyTemplate(index) {
        const template = this.allTemplates[index];
        if (!template || template.isOwn) return;

        const copiedTemplate = {
            ...template,
            name: `${template.name} (Copy)`,
            description: `${template.description || ''} (Copied from ${template.createdBy})`.trim(),
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString(),
            originalCreatedBy: template.createdBy,
            originalCreatedByGroup: template.createdByGroup,
            copiedFrom: `${template.createdBy} (${template.createdByGroup})`,
            isOwn: true
        };

        // Clean up UI properties
        delete copiedTemplate.userColor;
        delete copiedTemplate.userInitials;
        delete copiedTemplate.originalIndex;

        this.templates.push(copiedTemplate);
        
        if (window.storage) {
            window.storage.saveTemplates(this.templates);
        }
        
        this.renderList();
        this.updateTemplateInfo();
        
        // Show success message
        if (window.app && window.app.showSuccess) {
            window.app.showSuccess(`Template "${template.name}" copied to your collection!`);
        }
        
        console.log(`✅ Template "${template.name}" copied`);
    },

    // Select template with enhanced feedback
    select(index) {
        const allTemplates = this.getAllTemplates();
        const template = allTemplates[index];
        
        if (!template) return;

        this.selectedIndex = index;
        this.currentTemplate = template;
        
        this.renderList();
        this.updateTemplateInfo();
        
        // Safe DOM updates
        const detailsElement = document.getElementById('templateDetails');
        if (detailsElement) {
            detailsElement.style.display = 'block';
        }
        
        const preview = document.getElementById('folderPreview');
        if (preview) {
            const structure = this.currentTemplate.structure || 'No structure defined';
            preview.textContent = structure;
        }
        
        // Handle experiment form safely
        const experimentFormDiv = document.getElementById('experimentForm');
        if (experimentFormDiv) {
            if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
                experimentFormDiv.style.display = 'block';
                if (window.experimentForm && window.experimentForm.render) {
                    window.experimentForm.render(this.currentTemplate.metadata);
                }
            } else {
                experimentFormDiv.style.display = 'none';
            }
        }
        
        // Update action buttons
        this.updateActionButtons();
        
        console.log('✅ Template selected:', template.name);
    },

    // Update action buttons based on template ownership
    updateActionButtons() {
        const editBtn = document.querySelector('.actions button[onclick*="editCurrentTemplate"]');
        const deleteBtn = document.querySelector('.actions button[onclick*="deleteCurrentTemplate"]');
        
        if (editBtn && deleteBtn) {
            const canEdit = this.currentTemplate && this.currentTemplate.isOwn;
            
            editBtn.disabled = !canEdit;
            deleteBtn.disabled = !canEdit;
            
            editBtn.style.opacity = canEdit ? '1' : '0.5';
            deleteBtn.style.opacity = canEdit ? '1' : '0.5';
            
            editBtn.title = canEdit ? 'Edit this template' : 'Can only edit your own templates';
            deleteBtn.title = canEdit ? 'Delete this template' : 'Can only delete your own templates';
        }
    },

    // Edit current template
    editCurrent() {
        if (!this.currentTemplate || !this.currentTemplate.isOwn) {
            if (window.app && window.app.showError) {
                window.app.showError('You can only edit your own templates. Copy this template first to make changes.');
            }
            return;
        }
        
        if (window.templateModal) {
            const editingIndex = this.templates.findIndex(t => 
                t.name === this.currentTemplate.name && 
                t.createdBy === this.currentTemplate.createdBy
            );
            
            if (editingIndex >= 0) {
                window.templateModal.openForEdit(editingIndex, this.templates[editingIndex]);
            }
        }
    },

    // Delete current template
    deleteCurrent() {
        if (!this.currentTemplate || !this.currentTemplate.isOwn) {
            if (window.app && window.app.showError) {
                window.app.showError('You can only delete your own templates.');
            }
            return;
        }
        
        if (confirm(`Delete template "${this.currentTemplate.name}"?\n\nThis action cannot be undone.`)) {
            const index = this.templates.findIndex(t => 
                t.name === this.currentTemplate.name && 
                t.createdBy === this.currentTemplate.createdBy
            );
            
            if (index >= 0) {
                this.templates.splice(index, 1);
                
                if (window.storage) {
                    window.storage.saveTemplates(this.templates);
                }
                
                this.currentTemplate = null;
                this.selectedIndex = -1;
                
                const detailsElement = document.getElementById('templateDetails');
                if (detailsElement) {
                    detailsElement.style.display = 'none';
                }
                
                this.renderList();
                this.updateTemplateInfo();
                
                if (window.app && window.app.showSuccess) {
                    window.app.showSuccess('Template deleted successfully.');
                }
                
                console.log('✅ Template deleted');
            }
        }
    }
};

window.templateManager = templateManager;
console.log('✅ templateManager loaded (Enhanced user integration)');