// =================== GLOBALE OMERO EVENT-HANDLER FÜR INDEX.HTML ===================
// Diese Funktionen müssen in einer JS-Datei sein, die NACH allen OMERO-Modulen geladen wird
// Empfohlener Ort: Am Ende von app.js oder in einer separaten Datei nach allen OMERO-Importen

// =================== GLOBAL EVENT HANDLERS ===================

// Global function for group selection handling (called from index.html)
function handleOMEROGroupSelection() {
    console.log('🔬 Global OMERO group selection handler called');
    
    if (window.omeroUIIntegration && window.omeroUIIntegration.handleGroupSelection) {
        window.omeroUIIntegration.handleGroupSelection();
    } else {
        console.warn('⚠️ omeroUIIntegration.handleGroupSelection not available');
        
        // Fallback handling
        const groupSelect = document.getElementById('omeroGroupSelect');
        const projectSelect = document.getElementById('omeroProjectSelect');
        
        if (groupSelect && projectSelect) {
            const selectedGroupId = groupSelect.value;
            
            if (selectedGroupId === 'refresh') {
                // Refresh groups
                if (window.omeroUIIntegration && window.omeroUIIntegration.loadGroupsForDropdown) {
                    window.omeroUIIntegration.loadGroupsForDropdown();
                }
            } else {
                // Load projects for selected group
                if (window.omeroUIIntegration && window.omeroUIIntegration.loadProjectsForGroupCached) {
                    window.omeroUIIntegration.loadProjectsForGroupCached(selectedGroupId);
                } else if (window.omeroUIIntegration && window.omeroUIIntegration.loadProjectsForGroup) {
                    window.omeroUIIntegration.loadProjectsForGroup(selectedGroupId);
                }
            }
        }
    }
}

// Global function for project selection handling (called from index.html)
function handleOMEROProjectSelection() {
    console.log('🔬 Global OMERO project selection handler called');
    
    if (window.omeroUIIntegration && window.omeroUIIntegration.handleProjectSelection) {
        window.omeroUIIntegration.handleProjectSelection();
    } else {
        console.warn('⚠️ omeroUIIntegration.handleProjectSelection not available');
        
        // Fallback handling
        const projectSelect = document.getElementById('omeroProjectSelect');
        const groupSelect = document.getElementById('omeroGroupSelect');
        
        if (projectSelect && projectSelect.value === 'refresh') {
            const selectedGroupId = groupSelect?.value || 'all';
            
            // Refresh projects for current group
            if (window.omeroUIIntegration && window.omeroUIIntegration.loadProjectsForGroupCached) {
                window.omeroUIIntegration.loadProjectsForGroupCached(selectedGroupId);
            } else if (window.omeroUIIntegration && window.omeroUIIntegration.loadProjectsForGroup) {
                window.omeroUIIntegration.loadProjectsForGroup(selectedGroupId);
            }
            
            // Reset selection
            setTimeout(() => {
                if (projectSelect.querySelector('option[value=""]')) {
                    projectSelect.value = '';
                }
            }, 100);
        }
    }
}

// =================== UTILITY FUNCTIONS ===================

// Initialize OMERO UI with enhanced caching (call this on page load)
async function initializeOMEROUIWithCaching() {
    console.log('🔬 Initializing OMERO UI with caching...');
    
    try {
        // Wait for all modules to be loaded
        if (!window.omeroUIIntegration) {
            console.log('⚠️ Waiting for omeroUIIntegration to load...');
            // Wait up to 5 seconds for modules to load
            let attempts = 0;
            while (!window.omeroUIIntegration && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }
        }
        
        if (!window.omeroUIIntegration) {
            console.error('❌ omeroUIIntegration not available after waiting');
            return;
        }
        
        // Initialize with cache warming if available
        if (window.omeroUIIntegration.initWithCacheWarming) {
            await window.omeroUIIntegration.initWithCacheWarming();
        } else {
            console.log('🔬 Cache warming not available, using standard init');
            if (window.omeroUIIntegration.init) {
                await window.omeroUIIntegration.init();
            }
        }
        
        console.log('✅ OMERO UI initialized successfully');
        
    } catch (error) {
        console.error('❌ Error initializing OMERO UI:', error);
    }
}

// Show debug information about OMERO integration
function debugOMEROIntegration() {
    console.log('🔬 === OMERO INTEGRATION DEBUG ===');
    
    // Check module availability
    const modules = [
        'omeroGroups',
        'omeroProjects', 
        'omeroUIIntegration',
        'metaFoldOMEROIntegration',
        'omeroAuth'
    ];
    
    modules.forEach(moduleName => {
        const module = window[moduleName];
        console.log(`${moduleName}:`, module ? '✅ Available' : '❌ Missing');
        
        if (module && module.getCacheStatus) {
            console.log(`  Cache Status:`, module.getCacheStatus());
        }
    });
    
    // Check UI elements
    const uiElements = [
        'omeroGroupSelect',
        'omeroProjectSelect',
        'sendToOMERO'
    ];
    
    console.log('UI Elements:');
    uiElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        console.log(`  ${elementId}:`, element ? '✅ Present' : '❌ Missing');
        if (element && element.tagName === 'SELECT') {
            console.log(`    Options: ${element.options.length}`);
            console.log(`    Selected: "${element.value}"`);
        }
    });
    
    // Check current settings
    if (window.settingsManager) {
        window.settingsManager.get('omero.enabled').then(enabled => {
            console.log('OMERO Enabled:', enabled);
        });
    }
    
    console.log('================================');
}

// Manual cache refresh (useful for testing)
async function refreshOMEROCache() {
    console.log('🔬 Manually refreshing OMERO cache...');
    
    try {
        // Clear and refresh groups
        if (window.omeroGroups) {
            if (window.omeroGroups.clearCache) {
                window.omeroGroups.clearCache();
            }
            
            if (window.omeroGroups.forceRefreshGroups) {
                await window.omeroGroups.forceRefreshGroups();
            }
        }
        
        // Reload UI
        if (window.omeroUIIntegration && window.omeroUIIntegration.loadGroupsForDropdown) {
            await window.omeroUIIntegration.loadGroupsForDropdown();
        }
        
        console.log('✅ OMERO cache refreshed successfully');
        
    } catch (error) {
        console.error('❌ Error refreshing OMERO cache:', error);
    }
}

// =================== INITIALIZATION ===================

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for all modules to load, then initialize
        setTimeout(initializeOMEROUIWithCaching, 1000);
    });
} else {
    // DOM already ready
    setTimeout(initializeOMEROUIWithCaching, 1000);
}

// Make functions globally available for console debugging
window.debugOMEROIntegration = debugOMEROIntegration;
window.refreshOMEROCache = refreshOMEROCache;
window.handleOMEROGroupSelection = handleOMEROGroupSelection;
window.handleOMEROProjectSelection = handleOMEROProjectSelection;