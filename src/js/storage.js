// Storage manager with user support (backward compatible)

const storage = {
    userPrefix: 'default',
    isAvailable: true,

    // Set user prefix for storage keys
    setUserPrefix(prefix) {
        this.userPrefix = prefix;
        console.log(`📦 Storage prefix set to: ${prefix}`);
    },

    // Get storage key with user prefix
    getStorageKey(key) {
        return `metafold_${this.userPrefix}_${key}`;
    },

    // Example templates for first start - FIXED VERSION
    getDefaultTemplates() {
        // Only return default templates for the very first user ever
        const hasAnyUsers = localStorage.getItem('metafold_global_users');
        if (hasAnyUsers && JSON.parse(hasAnyUsers).length > 0) {
            return []; // No default templates for existing users
        }
        
        return [
            {
                name: "Web Project",
                description: "Standard web development structure",
                type: "folders",
                structure: `src/
  components/
  assets/
    images/
    css/
    js/
  pages/
  utils/
public/
docs/
tests/
package.json
README.md`,
                createdBy: 'System',
                createdByGroup: 'System',
                createdAt: new Date().toISOString()
            },
            {
                name: "Data Science Experiment",
                description: "Data analysis with metadata",
                type: "experiment", 
                structure: `data/
  raw/
  processed/
analysis/
  notebooks/
  scripts/
results/
  plots/
  reports/
README.md
experiment_log.md`,
                metadata: {
                    "experiment_name": { "type": "text", "label": "Experiment Name", "value": "", "required": true },
                    "researcher": { "type": "text", "label": "Researcher", "value": "", "required": true },
                    "start_date": { "type": "date", "label": "Start Date", "value": "", "required": false },
                    "hypothesis": { "type": "textarea", "label": "Hypothesis", "value": "", "required": true },
                    "data_source": { "type": "dropdown", "label": "Data Source", "options": ["Internal", "External", "Survey", "API"], "value": "", "required": false }
                },
                createdBy: 'System',
                createdByGroup: 'System',
                createdAt: new Date().toISOString()
            }
        ];
    },

    // Load templates (backward compatible)
    loadTemplates() {
        if (!this.isAvailable) return this.getDefaultTemplates();
        
        try {
            // Try new user-specific storage first
            const userKey = this.getStorageKey('templates');
            let stored = localStorage.getItem(userKey);
            
            // If no user-specific templates, try legacy storage
            if (!stored && this.userPrefix === 'default') {
                stored = localStorage.getItem('folderTemplates');
                if (stored) {
                    console.log('📦 Migrating legacy templates to new format');
                    const templates = JSON.parse(stored);
                    const migratedTemplates = this.addTemplateMetadata(templates);
                    this.saveTemplates(migratedTemplates);
                    return migratedTemplates;
                }
            }
            
            if (stored) {
                const templates = JSON.parse(stored);
                return this.addTemplateMetadata(templates);
            }
        } catch (error) {
            console.warn('Error loading templates:', error);
        }
        
        return this.getDefaultTemplates();
    },

    // Save templates
    saveTemplates(templates) {
        if (!this.isAvailable) return false;
        
        try {
            const templatesWithMeta = templates.map(template => ({
                ...template,
                createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
                createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
                createdAt: template.createdAt || new Date().toISOString()
            }));
            
            localStorage.setItem(
                this.getStorageKey('templates'), 
                JSON.stringify(templatesWithMeta)
            );
            return true;
        } catch (error) {
            console.warn('Error saving templates:', error);
            return false;
        }
    },

    // Add metadata to templates
    addTemplateMetadata(templates) {
        return templates.map(template => ({
            ...template,
            createdBy: template.createdBy || 'Unknown',
            createdByGroup: template.createdByGroup || 'Unknown',
            createdAt: template.createdAt || new Date().toISOString()
        }));
    },

    // Load group templates (placeholder for now)
    loadGroupTemplates(groupName) {
        if (!this.isAvailable || !groupName) return [];
        
        const allKeys = Object.keys(localStorage);
        const groupTemplates = [];
        
        allKeys.forEach(key => {
            // Look for templates from same group but different users
            if (key.startsWith(`metafold_${groupName}_`) && 
                key.endsWith('_templates') && 
                key !== this.getStorageKey('templates')) {
                try {
                    const templates = JSON.parse(localStorage.getItem(key));
                    if (templates && Array.isArray(templates)) {
                        groupTemplates.push(...this.addTemplateMetadata(templates));
                    }
                } catch (error) {
                    console.warn('Error loading group templates:', error);
                }
            }
        });
        
        return groupTemplates;
    },

    // Legacy compatibility methods
    addTemplate(template, templates) {
        templates.push(template);
        return this.saveTemplates(templates);
    },

    updateTemplate(index, template, templates) {
        if (index >= 0 && index < templates.length) {
            templates[index] = template;
            return this.saveTemplates(templates);
        }
        return false;
    },

    deleteTemplate(index, templates) {
        if (index >= 0 && index < templates.length) {
            templates.splice(index, 1);
            return this.saveTemplates(templates);
        }
        return false;
    }
};

window.storage = storage;
console.log('✅ storage loaded (with user support)');