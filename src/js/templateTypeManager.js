// Template Type Manager for Folder/Experiment modes

const templateTypeManager = {
    currentType: 'folders',

    // Switch template type
    switchType(type) {
        this.currentType = type;
        
        // UI Update
        document.getElementById('foldersTypeBtn').classList.remove('active');
        document.getElementById('experimentsTypeBtn').classList.remove('active');
        document.getElementById(type + 'TypeBtn').classList.add('active');
        
        // Only render if templateManager is already initialized
        if (typeof templateManager !== 'undefined' && templateManager.templates) {
            templateManager.renderList();
        }
    },

    // Return current type
    getCurrentType() {
        return this.currentType;
    },

    // Check if current type is Experiments
    isExperimentMode() {
        return this.currentType === 'experiments';
    },

    // Check if current type is Folders
    isFolderMode() {
        return this.currentType === 'folders';
    }
};

window.templateTypeManager = templateTypeManager;