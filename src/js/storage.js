// Storage-Manager für Vorlagen und Einstellungen

const storage = {
    // Beispielvorlagen für ersten Start
    getDefaultTemplates() {
        return [
            {
                name: "Webprojekt",
                description: "Standard Webentwicklung Struktur",
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
                description: "Datenanalyse mit Metadaten",
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
                    "researcher": { "type": "text", "label": "Forscher", "value": "", "required": true },
                    "start_date": { "type": "date", "label": "Start Datum", "value": "", "required": false },
                    "hypothesis": { "type": "textarea", "label": "Hypothese", "value": "", "required": true },
                    "data_source": { "type": "dropdown", "label": "Datenquelle", "options": ["Internal", "External", "Survey", "API"], "value": "", "required": false }
                }
            }
        ];
    },

    // Vorlagen laden
    loadTemplates() {
        let stored = null;
        try {
            stored = localStorage.getItem('folderTemplates');
        } catch (e) {
            console.log('LocalStorage nicht verfügbar, nutze temporären Speicher');
        }
        
        if (stored) {
            return JSON.parse(stored);
        } else {
            return this.getDefaultTemplates();
        }
    },

    // Vorlagen speichern
    saveTemplates(templates) {
        try {
            localStorage.setItem('folderTemplates', JSON.stringify(templates));
            return true;
        } catch (e) {
            console.log('Konnte Vorlagen nicht dauerhaft speichern');
            return false;
        }
    },

    // Einzelne Vorlage hinzufügen
    addTemplate(template, templates) {
        templates.push(template);
        return this.saveTemplates(templates);
    },

    // Vorlage aktualisieren
    updateTemplate(index, template, templates) {
        if (index >= 0 && index < templates.length) {
            templates[index] = template;
            return this.saveTemplates(templates);
        }
        return false;
    },

    // Vorlage löschen
    deleteTemplate(index, templates) {
        if (index >= 0 && index < templates.length) {
            templates.splice(index, 1);
            return this.saveTemplates(templates);
        }
        return false;
    }
};

window.storage = storage;