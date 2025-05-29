// Template-Type-Manager für Folder/Experiment-Modi

const templateTypeManager = {
    currentType: 'folders',

    // Template-Typ wechseln
    switchType(type) {
        this.currentType = type;
        
        // UI Update
        document.getElementById('foldersTypeBtn').classList.remove('active');
        document.getElementById('experimentsTypeBtn').classList.remove('active');
        document.getElementById(type + 'TypeBtn').classList.add('active');
        
        // Nur rendern wenn templateManager bereits initialisiert ist
        if (typeof templateManager !== 'undefined' && templateManager.templates) {
            templateManager.renderList();
        }
    },

    // Aktuellen Typ zurückgeben
    getCurrentType() {
        return this.currentType;
    },

    // Prüfen ob aktueller Typ Experiments ist
    isExperimentMode() {
        return this.currentType === 'experiments';
    },

    // Prüfen ob aktueller Typ Folders ist
    isFolderMode() {
        return this.currentType === 'folders';
    }
};
window.templateTypeManager = templateTypeManager;