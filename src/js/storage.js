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

	// Save templates - ENHANCED with automatic group sharing
	saveTemplates(templates) {
		if (!this.isAvailable) return false;
		
		try {
			const templatesWithMeta = templates.map(template => ({
				...template,
				createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
				createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
				createdAt: template.createdAt || new Date().toISOString()
			}));
			
			// Save to user's own storage
			localStorage.setItem(
				this.getStorageKey('templates'), 
				JSON.stringify(templatesWithMeta)
			);
			
			// FIXED: Also save to group storage for sharing
			this.saveToGroupStorage(templatesWithMeta);
			
			return true;
		} catch (error) {
			console.warn('Error saving templates:', error);
			return false;
		}
	},

// NEW: Save templates to group storage for sharing
    saveToGroupStorage(templates) {
        const currentUser = window.userManager?.currentUser;
        const currentGroup = window.userManager?.currentGroup;
        
        if (!currentUser || !currentGroup || currentGroup === 'Unknown') {
            console.log('📝 No current group, skipping group template sharing');
            return;
        }

        try {
            const groupKey = `metafold_group_${currentGroup}_templates`;
            
            // Get existing group templates
            let existingGroupTemplates = [];
            try {
                const stored = localStorage.getItem(groupKey);
                existingGroupTemplates = stored ? JSON.parse(stored) : [];
            } catch (error) {
                console.warn('Could not load existing group templates:', error);
                existingGroupTemplates = [];
            }
            
            // Remove old templates from this user
            const filteredTemplates = existingGroupTemplates.filter(t => t.createdBy !== currentUser);
            
            // Add current user's templates for sharing
            const userTemplatesForGroup = templates.map(t => ({
                ...t,
                sharedBy: currentUser,
                sharedAt: new Date().toISOString()
            }));
            
            const updatedGroupTemplates = [...filteredTemplates, ...userTemplatesForGroup];
            
            // Save to group storage
            localStorage.setItem(groupKey, JSON.stringify(updatedGroupTemplates));
            
            console.log(`🤝 Shared ${templates.length} templates to group "${currentGroup}" (key: ${groupKey})`);
            
        } catch (error) {
            console.warn('Could not save to group templates:', error);
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
        if (!this.isAvailable || !groupName) {
            console.log('📚 No group name provided for loading group templates');
            return [];
        }

        try {
            const groupKey = `metafold_group_${groupName}_templates`;
            const stored = localStorage.getItem(groupKey);
            let groupTemplates = stored ? JSON.parse(stored) : [];
            
            // Filter out current user's templates (they see their own separately)
            const currentUser = window.userManager?.currentUser;
            if (currentUser) {
                groupTemplates = groupTemplates.filter(t => t.createdBy !== currentUser);
            }
            
            console.log(`🤝 Loaded ${groupTemplates.length} group templates from "${groupName}" (key: ${groupKey})`);
            return this.addTemplateMetadata(groupTemplates);
            
        } catch (error) {
            console.warn(`Could not load group templates for "${groupName}":`, error);
            return [];
        }
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