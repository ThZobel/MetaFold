// Template-Manager für die Verwaltung der Vorlagen

const templateManager = {
    templates: [],
    currentTemplate: null,

    // Initialisierung
    init() {
        this.templates = storage.loadTemplates();
        storage.saveTemplates(this.templates); // Für erste Speicherung der Default-Templates
        this.renderList();
    },

    // Template-Liste rendern
    renderList() {
        const listContainer = document.getElementById('templateList');
        const filteredTemplates = this.templates.filter(t => 
            (templateTypeManager.currentType === 'folders' && t.type !== 'experiment') ||
            (templateTypeManager.currentType === 'experiments' && t.type === 'experiment')
        );
        
        if (filteredTemplates.length === 0) {
            const typeLabel = templateTypeManager.currentType === 'folders' ? 'Ordner-Vorlagen' : 'Experiment-Vorlagen';
            listContainer.innerHTML = `
                <div class="empty-state">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
                    </svg>
                    <p>Noch keine ${typeLabel} vorhanden.<br>Erstelle deine erste Vorlage!</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = filteredTemplates.map(template => {
            const index = this.templates.indexOf(template);
            const badge = template.type === 'experiment' ? 
                '<span class="template-badge experiment">Exp</span>' : 
                '<span class="template-badge">Ordner</span>';
            
            return `
                <div class="template-item ${this.currentTemplate === template ? 'active' : ''}" 
                     onclick="templateManager.select(${index})">
                    <h3>${template.name} ${badge}</h3>
                    <p style="color: #9ca3af; font-size: 12px; margin-top: 5px;">
                        ${template.description || 'Keine Beschreibung'}
                    </p>
                </div>
            `;
        }).join('');
    },

    // Vorlage auswählen
    select(index) {
        // Feldwerte löschen wenn neues Template gewählt wird
        if (this.currentTemplate !== this.templates[index]) {
            experimentForm.clearSavedFieldValues();
        }
        
        this.currentTemplate = this.templates[index];
        document.getElementById('templateDetails').style.display = 'block';
        
        // Ordnerstruktur-Vorschau aktualisieren
        const preview = document.getElementById('folderPreview');
        preview.textContent = this.currentTemplate.structure;
        
        // Experiment-Formular anzeigen/verstecken
        const experimentFormDiv = document.getElementById('experimentForm');
        if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
            experimentFormDiv.style.display = 'block';
            experimentForm.render(this.currentTemplate.metadata);
        } else {
            experimentFormDiv.style.display = 'none';
        }
        
        this.renderList();
    },

    // Vorlage hinzufügen
    add(template) {
        this.templates.push(template);
        storage.saveTemplates(this.templates);
        this.renderList();
    },

    // Vorlage aktualisieren
    update(index, template) {
        if (index >= 0 && index < this.templates.length) {
            this.templates[index] = template;
            if (this.currentTemplate === this.templates[index]) {
                this.currentTemplate = template;
            }
            storage.saveTemplates(this.templates);
            this.renderList();
            
            // Falls bearbeitet wurde, Details aktualisieren
            if (this.currentTemplate === template) {
                const preview = document.getElementById('folderPreview');
                preview.textContent = this.currentTemplate.structure;
                
                // Experiment-Formular neu rendern falls nötig
                if (this.currentTemplate.type === 'experiment' && this.currentTemplate.metadata) {
                    experimentForm.render(this.currentTemplate.metadata);
                }
            }
        }
    },

    // Aktuelle Vorlage bearbeiten
    editCurrent() {
        if (!this.currentTemplate) return;
        
        const editingIndex = this.templates.indexOf(this.currentTemplate);
        templateModal.openForEdit(editingIndex, this.currentTemplate);
    },

    // Aktuelle Vorlage löschen
    deleteCurrent() {
        if (!this.currentTemplate) return;
        
        if (confirm(`Möchtest du die Vorlage "${this.currentTemplate.name}" wirklich löschen?`)) {
            const index = this.templates.indexOf(this.currentTemplate);
            this.templates.splice(index, 1);
            storage.saveTemplates(this.templates);
            
            this.currentTemplate = null;
            document.getElementById('templateDetails').style.display = 'none';
            this.renderList();
        }
    },

    // Template nach Index löschen
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

// Global verfügbar machen
window.templateManager = templateManager;