// Template Type Manager - FIXED for async settingsManager AND Search Index

const templateTypeManager = {
    currentType: 'folders', // 'folders' or 'experiments'


    // Switch template type
    switchType(type) {
        if (type !== 'folders' && type !== 'experiments') {
            console.warn('Invalid template type:', type);
            return;
        }

        console.log(`🔧 Switching template type: ${this.currentType} → ${type}`);
        
        this.currentType = type;
        this.updateUI();
        
        // IMPORTANT: Prevent automatic template creation
        if (window.templateManager) {
            // Clear current template selection SAFELY
            window.templateManager.currentTemplate = null;
            window.templateManager.selectedIndex = -1;
            
            // Clear experiment form to prevent auto-rendering with undefined template
            const experimentFields = document.getElementById('experimentFields');
            if (experimentFields) {
                experimentFields.innerHTML = '';
            }
            
            // Clear template info display
            const templateInfo = document.getElementById('templateInfo');
            if (templateInfo) {
                templateInfo.textContent = 'No template selected';
                templateInfo.className = 'template-info';
            }
            
            // CRITICAL FIX: Update search index when switching type
            console.log('🔧 Fixing search index for type switch to:', type);
            
            // Clear all caches - exactly like the manual fix
            window.templateManager.allTemplates = [];
            window.templateManager.searchState.searchCache.clear();
            window.templateManager.searchState.searchIndex.clear();
            
            // Clear search input if active
            if (window.templateManager.searchState.isSearching) {
                const searchInput = document.getElementById('templateSearchInput');
                if (searchInput) {
                    searchInput.value = '';
                }
                window.templateManager.clearSearch();
            }
            
            // Re-render template list FIRST (before rebuilding index)
            window.templateManager.renderList();
            
            // Rebuild index after a delay - exactly like the manual fix
            setTimeout(() => {
                console.log('🔧 Rebuilding search index for:', type);
                const templates = window.templateManager.getAllTemplates();
                console.log(`📊 Got ${templates.length} templates`);
                
                window.templateManager.buildSearchIndex();
                console.log(`✅ Search index rebuilt with ${window.templateManager.searchState.searchIndex.size} entries`);
                
                // Re-render with updated index
                window.templateManager.renderList();
                window.templateManager.updateSharedToggleVisibility();
                window.templateManager.updateTemplateInfo();
            }, 100);
        }

        // Hide template details when switching
        const templateDetails = document.getElementById('templateDetails');
        if (templateDetails) {
            templateDetails.style.display = 'none';
        }

        // Update integration options visibility - ASYNC VERSION
        this.updateIntegrationVisibility();
        
        console.log(`✅ Template type switched to: ${type}`);
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