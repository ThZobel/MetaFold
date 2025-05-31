// Template Manager (with unified styling and English translation)

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
                createdAt: existingTemplate.createdAt
            };
            
            this.templates[index] = updatedTemplate;
            
            if (window.storage) {
                window.storage.saveTemplates(this.templates);
            }
            
            this.renderList();
            console.log('✅ Template updated:', template.name);
        }
    },

    // Get current type safely
    getCurrentType() {
        // Safe fallback if templateTypeManager is not available
        if (window.templateTypeManager && window.templateTypeManager.currentType) {
            return window.templateTypeManager.currentType;
        }
        // Default fallback
        return 'folders';
    },

    // Get all templates (including group templates) - FIXED VERSION
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
                        t.createdBy !== 'System' // Exclude system templates
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
        // Fallback color
        return '#666';
    },

    // Safe user initials
    getUserInitials(username) {
        if (window.userManager && window.userManager.getUserInitials) {
            return window.userManager.getUserInitials(username);
        }
        // Fallback initials
        return username ? username.substring(0, 2).toUpperCase() : '??';
    },

    // Render template list - FIXED VERSION with unified colors and English
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
                    <p>No ${typeLabel} available yet.<br>Create your first template!</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = allTemplates.map((template, index) => {
            const badge = template.type === 'experiment' ? 
                '<span class="template-badge experiment">Exp</span>' : 
                '<span class="template-badge">Folder</span>';
            
            // Use normal colors for ALL templates (no differentiation between own/shared)
            const color = this.getUserColor(template.createdBy);
            const initials = this.getUserInitials(template.createdBy);
            
            return `
                <div class="template-item ${this.selectedIndex === index ? 'active' : ''}" 
                     data-is-own="${template.isOwn}"
                     onclick="templateManager.select(${index})">
                    <div class="template-header">
                        <div class="template-avatar" style="background-color: ${color}">
                            ${initials}
                        </div>
                        <div class="template-info">
                            <h3>${template.name} ${badge}</h3>
                            <small>by ${template.createdBy || 'Unknown'} (${template.createdByGroup || 'Unknown'})</small>
                            ${!template.isOwn ? '<span class="shared-badge">📋 Shared</span>' : ''}
                        </div>
                        ${!template.isOwn ? `
                            <button class="copy-template-btn" 
                                    onclick="event.stopPropagation(); templateManager.copyTemplate(${index})"
                                    title="Copy template"
                                    style="
                                        background: #28a745;
                                        color: white;
                                        border: none;
                                        padding: 0.25rem 0.5rem;
                                        border-radius: 3px;
                                        cursor: pointer;
                                        font-size: 0.8rem;
                                        margin-left: auto;
                                    ">
                                📋 Copy
                            </button>
                        ` : ''}
                    </div>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 5px;">
                        ${template.description || 'No description'}
                    </p>
                </div>
            `;
        }).join('');
    },

    // Copy template (safe version)
    copyTemplate(index) {
        const template = this.allTemplates[index];
        if (!template || template.isOwn) return;

        const copiedTemplate = {
            ...template,
            name: `${template.name} (Copy)`,
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
        console.log(`✅ Template "${template.name}" copied`);
    },

    // Select template
    select(index) {
        const allTemplates = this.getAllTemplates();
        const template = allTemplates[index];
        
        if (!template) return;

        this.selectedIndex = index;
        this.currentTemplate = template;
        
        this.renderList();
        
        // Safe DOM updates
        const detailsElement = document.getElementById('templateDetails');
        if (detailsElement) {
            detailsElement.style.display = 'block';
        }
        
        const preview = document.getElementById('folderPreview');
        if (preview) {
            preview.textContent = this.currentTemplate.structure || 'No structure defined';
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
        
        console.log('✅ Template selected:', template.name);
    },

    // Edit current template
    editCurrent() {
        if (!this.currentTemplate || !this.currentTemplate.isOwn) return;
        
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
        if (!this.currentTemplate || !this.currentTemplate.isOwn) return;
        
        if (confirm(`Delete template "${this.currentTemplate.name}"?`)) {
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
                console.log('✅ Template deleted');
            }
        }
    }
};

window.templateManager = templateManager;
console.log('✅ templateManager loaded (unified colors + English)');