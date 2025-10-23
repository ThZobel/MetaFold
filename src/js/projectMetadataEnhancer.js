// =================================================================
// Project Metadata Enhancer
// Adds project name and template info to metadata BEFORE saving
// =================================================================

const projectMetadataEnhancer = {
    
    /**
     * Enhance metadata with project name and template info
     * @param {Object} metadata - Original metadata from experiment form
     * @param {string} projectName - Project name from input field
     * @param {Object} template - Current template object
     * @returns {Object} Enhanced metadata
     */
    enhanceMetadata(metadata, projectName, template) {
        if (!metadata || typeof metadata !== 'object') {
            console.warn('⚠️ Invalid metadata object, creating new one');
            metadata = {};
        }
        
        // Clone metadata to avoid modifying original
        const enhanced = JSON.parse(JSON.stringify(metadata));
        
        // Add project name as top-level field (for easy access)
        enhanced.projectName = projectName;
        
        // Add template information
        if (template) {
            enhanced.templateInfo = {
                name: template.name || 'Unknown Template',
                type: template.type || 'unknown',
                description: template.description || '',
                category: template.category || null,
                createdBy: template.createdBy || null,
                createdByGroup: template.createdByGroup || null
            };
            
            console.log('📋 Added template info to metadata:', enhanced.templateInfo.name);
        }
        
        // Add creation timestamp
        enhanced.createdAt = new Date().toISOString();
        
        console.log('✅ Metadata enhanced with project name and template info');
        
        return enhanced;
    },
    
    /**
     * Patch projectManager.createProject to auto-enhance metadata
     */
    patchProjectManager() {
        if (!window.projectManager) {
            console.warn('⚠️ projectManager not available for patching');
            return false;
        }
        
        const original = window.projectManager.createProject;
        if (!original) {
            console.warn('⚠️ projectManager.createProject not found');
            return false;
        }
        
        // Store original
        window.projectManager._originalCreateProject = original;
        
        // Create patched version
        window.projectManager.createProject = async function() {
            try {
                // Get project name from input
                const projectNameInput = document.getElementById('projectName');
                const projectNameValue = projectNameInput ? projectNameInput.value.trim() : '';
                
                // Get template
                const template = window.templateManager?.currentTemplate;
                
                // Get original metadata
                const originalMetadata = window.experimentForm?.collectData() || null;
                
                if (originalMetadata && projectNameValue) {
                    // Enhance metadata BEFORE it's used
                    const enhancedMetadata = projectMetadataEnhancer.enhanceMetadata(
                        originalMetadata,
                        projectNameValue,
                        template
                    );
                    
                    // Temporarily replace collectData to return enhanced metadata
                    const originalCollectData = window.experimentForm.collectData;
                    window.experimentForm.collectData = () => enhancedMetadata;
                    
                    try {
                        // Call original createProject
                        return await window.projectManager._originalCreateProject.call(this);
                    } finally {
                        // Restore original collectData
                        window.experimentForm.collectData = originalCollectData;
                    }
                } else {
                    // No metadata or project name - call original without enhancement
                    return await window.projectManager._originalCreateProject.call(this);
                }
                
            } catch (error) {
                console.error('❌ Error in patched createProject:', error);
                // Fallback to original
                return await window.projectManager._originalCreateProject.call(this);
            }
        };
        
        console.log('✅ projectManager.createProject patched for metadata enhancement');
        return true;
    },
    
    /**
     * Initialize the enhancer
     */
    init() {
        console.log('🔧 Initializing Project Metadata Enhancer...');
        
        // Wait for dependencies
        const checkAndPatch = () => {
            if (window.projectManager && window.templateManager && window.experimentForm) {
                this.patchProjectManager();
                console.log('✅ Project Metadata Enhancer initialized');
            } else {
                console.log('⏳ Waiting for dependencies...');
                setTimeout(checkAndPatch, 500);
            }
        };
        
        setTimeout(checkAndPatch, 1000);
    }
};

// Make globally available
window.projectMetadataEnhancer = projectMetadataEnhancer;

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => projectMetadataEnhancer.init(), 100);
    });
} else {
    setTimeout(() => projectMetadataEnhancer.init(), 100);
}

console.log('✅ Project Metadata Enhancer module loaded');
