// =================================================================
// elabFTW Category Manager - Complete Implementation
// Speichere diese Datei als: js/elabftwCategoryManager.js
// =================================================================

const elabftwCategoryManager = {
    
    /**
     * Load elabFTW default category from settings and populate input field
     */
    async loadDefaultCategory() {
        try {
            const defaultCategory = await window.settingsManager.get('elabftw.default_category');
            console.log('📂 Loading elabFTW default category from settings:', defaultCategory);
            
            const categoryInput = document.getElementById('elabftwProjectCategory');
            if (categoryInput) {
                categoryInput.value = defaultCategory || '';
                console.log('✅ Category input populated:', defaultCategory);
            }
            
        } catch (error) {
            console.error('❌ Error loading elabFTW default category:', error);
        }
    },

    /**
     * Get current elabFTW category from project manager input
     * @returns {number} Category ID
     */
    getCurrentCategory() {
        const categoryInput = document.getElementById('elabftwProjectCategory');
        if (categoryInput && categoryInput.value.trim()) {
            const categoryId = parseInt(categoryInput.value.trim());
            return !isNaN(categoryId) ? categoryId : 0;
        }
        return 0;
    },

    /**
     * Save elabFTW category with template
     * @param {Object} template - Template object to enhance
     * @returns {Object} Enhanced template with elabFTW category
     */
    addCategoryToTemplate(template) {
        if (!template) return template;
        
        try {
            const categoryId = this.getCurrentCategory();
            
            // Initialize integrations structure if needed
            if (!template.integrations) {
                template.integrations = {};
            }
            
            if (!template.integrations.elabftw) {
                template.integrations.elabftw = {};
            }
            
            // Store category in template
            template.integrations.elabftw.defaultCategory = categoryId;
            
            console.log('📂 Added elabFTW category to template:', categoryId);
            return template;
            
        } catch (error) {
            console.error('❌ Error adding elabFTW category to template:', error);
            return template;
        }
    },

    /**
     * Load elabFTW category from template when template is selected
     * @param {Object} template - Selected template
     */
    loadCategoryFromTemplate(template) {
        if (!template) {
            // No template - load default from settings
            this.loadDefaultCategory();
            return;
        }
        
        try {
            let categoryId = null;
            
            // Try to get category from template integrations
            if (template.integrations?.elabftw?.defaultCategory !== undefined) {
                categoryId = template.integrations.elabftw.defaultCategory;
                console.log('📂 Found elabFTW category in template:', categoryId);
            }
            
            // Set input field value
            const categoryInput = document.getElementById('elabftwProjectCategory');
            if (categoryInput) {
                if (categoryId !== null) {
                    categoryInput.value = categoryId;
                    console.log('✅ Category input set from template:', categoryId);
                } else {
                    // Template has no category - load default from settings
                    this.loadDefaultCategory();
                }
            }
            
        } catch (error) {
            console.error('❌ Error loading elabFTW category from template:', error);
            // Fallback to settings default
            this.loadDefaultCategory();
        }
    },

    /**
     * Update settings when category input changes (optional)
     */
    async updateSettingsFromInput() {
        try {
            const categoryId = this.getCurrentCategory();
            await window.settingsManager.set('elabftw.default_category', categoryId);
            console.log('📂 Updated elabFTW default category in settings:', categoryId);
        } catch (error) {
            console.error('❌ Error updating elabFTW category in settings:', error);
        }
    },

    /**
     * Initialize category management
     */
    async init() {
        console.log('🔧 Initializing elabFTW category management...');
        
        try {
            // Load default category from settings
            await this.loadDefaultCategory();
            
            // Add optional event listener for category input changes
            const categoryInput = document.getElementById('elabftwProjectCategory');
            if (categoryInput) {
                categoryInput.addEventListener('change', () => {
                    // Optional: Update settings when user changes category
                    // this.updateSettingsFromInput();
                });
                console.log('✅ Category input listener added');
            }
            
            console.log('✅ elabFTW category management initialized');
            
        } catch (error) {
            console.error('❌ Error initializing elabFTW category management:', error);
        }
    },

    /**
     * Get category for elabFTW experiment creation
     * Uses project-specific category if set, otherwise settings default
     * @returns {Promise<number>} Category ID to use
     */
    async getCategoryForExperiment() {
        try {
            // First try project-specific category
            const projectCategoryId = this.getCurrentCategory();
            if (projectCategoryId > 0) {
                console.log('📂 Using project-specific category:', projectCategoryId);
                return projectCategoryId;
            }
            
            // Fallback to settings default
            const settingsCategory = await window.settingsManager.get('elabftw.default_category');
            const finalCategory = settingsCategory || 0;
            console.log('📂 Using settings default category:', finalCategory);
            return finalCategory;
            
        } catch (error) {
            console.error('❌ Error getting category for experiment:', error);
            return 0; // Safe fallback
        }
    }
};

// =================================================================
// INTEGRATION PATCHES - Diese Funktionen erweitern bestehende Code
// =================================================================

/**
 * PATCH für projectManager.createProject()
 * Füge diese Zeile NACH der Template-Validierung hinzu:
 */
function patchProjectManagerForCategory() {
    if (!window.projectManager) return;
    
    const originalCreateProject = window.projectManager.createProject;
    if (!originalCreateProject) return;
    
    window.projectManager.createProject = async function() {
        // Save category to template before creating project
        if (templateManager.currentTemplate && templateManager.currentTemplate.type === 'experiment') {
            templateManager.currentTemplate = elabftwCategoryManager.addCategoryToTemplate(templateManager.currentTemplate);
        }
        
        // Call original function
        return await originalCreateProject.call(this);
    };
    
    console.log('✅ ProjectManager patched for elabFTW category support');
}

/**
 * PATCH für templateManager.select()
 * Füge diese Integration zur Template-Auswahl hinzu:
 */
function patchTemplateManagerForCategory() {
    if (!window.templateManager) return;
    
    const originalSelect = window.templateManager.select;
    if (!originalSelect) return;
    
    window.templateManager.select = function(index) {
        // Call original function first
        const result = originalSelect.call(this, index);
        
        // Load category from selected template
        if (this.currentTemplate) {
            setTimeout(() => {
                elabftwCategoryManager.loadCategoryFromTemplate(this.currentTemplate);
            }, 100);
        }
        
        return result;
    };
    
    console.log('✅ TemplateManager patched for elabFTW category support');
}

/**
 * PATCH für settingsManager.createElabFTWExperiment()  
 * Diese Funktion verbessert die Category-Nutzung
 */
function patchSettingsManagerForCategory() {
    if (!window.settingsManager) return;
    
    const originalCreateExperiment = window.settingsManager.createElabFTWExperiment;
    if (!originalCreateExperiment) return;
    
    window.settingsManager.createElabFTWExperiment = async function(projectName, metadata, structure = '') {
        // Get the best category to use
        const categoryId = await elabftwCategoryManager.getCategoryForExperiment();
        
        // Temporarily override the settings category
        const originalCategory = await this.get('elabftw.default_category');
        await this.set('elabftw.default_category', categoryId);
        
        try {
            // Call original function
            const result = await originalCreateExperiment.call(this, projectName, metadata, structure);
            return result;
        } finally {
            // Restore original settings category
            await this.set('elabftw.default_category', originalCategory);
        }
    };
    
    console.log('✅ SettingsManager patched for elabFTW category support');
}

// =================================================================
// AUTO-INITIALIZATION
// =================================================================

/**
 * Auto-initialize when DOM is ready
 */
function autoInitialize() {
    // Wait for required dependencies
    const checkDependencies = () => {
        if (window.settingsManager && window.templateManager && window.projectManager) {
            console.log('🚀 Auto-initializing elabFTW category manager...');
            
            // Initialize category manager
            elabftwCategoryManager.init();
            
            // Apply patches
            patchProjectManagerForCategory();
            patchTemplateManagerForCategory();
            patchSettingsManagerForCategory();
            
            console.log('✅ elabFTW category manager fully initialized');
        } else {
            // Retry after 500ms
            setTimeout(checkDependencies, 500);
        }
    };
    
    // Start dependency check
    setTimeout(checkDependencies, 1000);
}

// =================================================================
// GLOBAL EXPORTS
// =================================================================

// Make globally available
window.elabftwCategoryManager = elabftwCategoryManager;

// Legacy compatibility functions
window.loadElabFTWDefaultCategory = () => elabftwCategoryManager.loadDefaultCategory();
window.getCurrentElabFTWCategory = () => elabftwCategoryManager.getCurrentCategory();
window.addElabFTWCategoryToTemplate = (template) => elabftwCategoryManager.addCategoryToTemplate(template);
window.loadElabFTWCategoryFromTemplate = (template) => elabftwCategoryManager.loadCategoryFromTemplate(template);
window.initElabFTWCategoryManagement = () => elabftwCategoryManager.init();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitialize);
} else {
    autoInitialize();
}

console.log('✅ elabFTW Category Manager loaded and ready');

// =================================================================