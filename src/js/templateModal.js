// Template-Modal für das Erstellen und Bearbeiten von Vorlagen

const templateModal = {
    editingIndex: -1,

    // Modal für neue Vorlage öffnen
    show() {
        this.editingIndex = -1;
        document.getElementById('modalTitle').textContent = 'Neue Vorlage erstellen';
        document.getElementById('templateName').value = '';
        document.getElementById('templateDescription').value = '';
        document.getElementById('folderStructure').value = '';
        document.getElementById('experimentStructure').value = '';
        document.getElementById('templateType').value = templateTypeManager.currentType === 'experiments' ? 'experiment' : 'folders';
        
        metadataEditor.clearFields();
        this.toggleTypeContent();
        document.getElementById('templateModal').style.display = 'block';
    },

    // Modal für Bearbeitung öffnen
    openForEdit(index, template) {
        this.editingIndex = index;
        document.getElementById('modalTitle').textContent = 'Vorlage bearbeiten';
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

    // Modal schließen
    close() {
        document.getElementById('templateModal').style.display = 'none';
    },

    // Template-Type-Content togglen
    toggleTypeContent() {
        const type = document.getElementById('templateType').value;
        document.getElementById('folderTab').style.display = type === 'folders' ? 'block' : 'none';
        document.getElementById('experimentTab').style.display = type === 'experiment' ? 'block' : 'none';
    },

    // Tab wechseln (innerhalb Experiment-Tab)
    switchTab(tab) {
        // Tab buttons
        document.querySelectorAll('#experimentTab .tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        // Tab contents
        document.getElementById('structureContent').style.display = tab === 'structure' ? 'block' : 'none';
        document.getElementById('metadataContent').style.display = tab === 'metadata' ? 'block' : 'none';
    },

    // Vorlage speichern
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

        if (!name || !structure) {
            alert('Bitte fülle mindestens Name und Ordnerstruktur aus!');
            return;
        }

        const template = { name, description, structure, type };
        
        // Metadaten für Experimente hinzufügen
        if (type === 'experiment') {
            if (typeof metadataEditor !== 'undefined') {
                const metadata = metadataEditor.collectMetadata();
                template.metadata = metadata;
            }
        }

        // Prüfen ob templateManager verfügbar ist
        if (typeof templateManager === 'undefined') {
            console.error('templateManager ist nicht verfügbar');
            alert('Fehler: Template-Manager nicht geladen. Bitte App neu starten.');
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

// Global verfügbar machen
window.templateModal = templateModal;