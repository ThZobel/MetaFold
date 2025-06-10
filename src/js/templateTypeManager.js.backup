// Template Type Manager - Handles switching between folder and experiment templates

const templateTypeManager = {
    currentType: 'folders', // 'folders' or 'experiments'

    // Switch template type
    switchType(type) {
        if (type !== 'folders' && type !== 'experiments') {
            console.warn('Invalid template type:', type);
            return;
        }

        this.currentType = type;
        this.updateUI();
        
        // Re-render template list
        if (window.templateManager && window.templateManager.renderList) {
            window.templateManager.renderList();
        }

        // Hide template details when switching
        const templateDetails = document.getElementById('templateDetails');
        if (templateDetails) {
            templateDetails.style.display = 'none';
        }

        // Clear current template selection
        if (window.templateManager) {
            window.templateManager.currentTemplate = null;
        }

        // Update elabFTW options visibility
        this.updateElabFTWVisibility();
    },

    // Update UI to reflect current type
    updateUI() {
        // Update button states
        const foldersBtn = document.getElementById('foldersTypeBtn');
        const experimentsBtn = document.getElementById('experimentsTypeBtn');

        if (foldersBtn && experimentsBtn) {
            foldersBtn.classList.toggle('active', this.currentType === 'folders');
            experimentsBtn.classList.toggle('active', this.currentType === 'experiments');
        }
    },

    // Update elabFTW options visibility based on template type
    updateElabFTWVisibility() {
        const elabftwOption = document.getElementById('elabftwOption');
        
        if (elabftwOption) {
            // Only show elabFTW options for experiments
            if (this.currentType === 'experiments') {
                // Check if elabFTW is enabled in settings
                if (window.settingsManager && window.settingsManager.get('elabftw.enabled')) {
                    elabftwOption.style.display = 'block';
                    
                    // Update auto-sync vs manual options
                    if (window.updateElabFTWOptions) {
                        window.updateElabFTWOptions();
                    }
                } else {
                    elabftwOption.style.display = 'none';
                }
            } else {
                elabftwOption.style.display = 'none';
            }
        }
    },

    // Check if current type is experiment mode
    isExperimentMode() {
        return this.currentType === 'experiments';
    },

    // Check if current type is folder mode
    isFolderMode() {
        return this.currentType === 'folders';
    },

    // Initialize the type manager
    init() {
        this.updateUI();
        this.updateElabFTWVisibility();
        console.log('TemplateTypeManager initialized with type:', this.currentType);
    }
};

// Make globally available
window.templateTypeManager = templateTypeManager;