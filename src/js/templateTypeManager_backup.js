// Template Type Manager - FIXED for async settingsManager

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

        // Update integration options visibility - ASYNC VERSION
        this.updateIntegrationVisibility();
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

    // FIXED: Update integration options visibility - async version
    async updateIntegrationVisibility() {
        console.log('🔄 Updating integration visibility for type:', this.currentType);
        
        // Update both elabFTW and OMERO options
        if (window.updateIntegrationOptions) {
            await window.updateIntegrationOptions();
        } else {
            // Fallback: update each individually
            if (window.updateElabFTWOptions) {
                await window.updateElabFTWOptions();
            }
            if (window.updateOMEROOptions) {
                await window.updateOMEROOptions();
            }
        }
    },

    // DEPRECATED: Old synchronous method - kept for compatibility but logs warning
    updateElabFTWVisibility() {
        console.warn('⚠️ updateElabFTWVisibility() is deprecated - use updateIntegrationVisibility() instead');
        this.updateIntegrationVisibility();
    },

    // Check if current type is experiment mode
    isExperimentMode() {
        return this.currentType === 'experiments';
    },

    // Check if current type is folder mode
    isFolderMode() {
        return this.currentType === 'folders';
    },

    // FIXED: Initialize the type manager - async version
    async init() {
        this.updateUI();
        await this.updateIntegrationVisibility();
        console.log('✅ TemplateTypeManager initialized with type:', this.currentType);
    }
};

// Make globally available
window.templateTypeManager = templateTypeManager;