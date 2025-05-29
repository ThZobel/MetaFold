// Storage manager for templates and settings

const storage = {
    // Example templates for first start
    getDefaultTemplates() {
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
README.md`
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
                }
            }
        ];
    },

    // Load templates
    loadTemplates() {
        let stored = null;
        try {
            stored = localStorage.getItem('folderTemplates');
        } catch (e) {
            console.log('LocalStorage not available, using temporary storage');
        }
        
        if (stored) {
            return JSON.parse(stored);
        } else {
            return this.getDefaultTemplates();
        }
    },

    // Save templates
    saveTemplates(templates) {
        try {
            localStorage.setItem('folderTemplates', JSON.stringify(templates));
            return true;
        } catch (e) {
            console.log('Could not save templates permanently');
            return false;
        }
    },

    // Add single template
    addTemplate(template, templates) {
        templates.push(template);
        return this.saveTemplates(templates);
    },

    // Update template
    updateTemplate(index, template, templates) {
        if (index >= 0 && index < templates.length) {
            templates[index] = template;
            return this.saveTemplates(templates);
        }
        return false;
    },

    // Delete template
    deleteTemplate(index, templates) {
        if (index >= 0 && index < templates.length) {
            templates.splice(index, 1);
            return this.saveTemplates(templates);
        }
        return false;
    }
};

window.storage = storage;