// FIX 2: Integration Options Update Functions for 4-Category System
// This file provides fixed integration update functions

// FIXED: Update elabFTW options visibility based on category
async function updateElabFTWOptions() {
    console.log('🧪 UI: Updating elabFTW options visibility');
    
    try {
        const elabftwOption = document.getElementById('elabftwOption');
        const elabftwEnabled = await window.settingsManager.get('elabftw.enabled');
        const elabftwAutoSync = await window.settingsManager.get('elabftw.auto_sync');
        
        if (!elabftwOption) {
            console.warn('🧪 UI: elabFTW option element not found');
            return;
        }
        
        // FIXED: Check if elabFTW is enabled AND current category supports it
        // For now, allow elabFTW for all categories (you can restrict if needed)
        const shouldShow = elabftwEnabled === true;
        
        if (shouldShow) {
            elabftwOption.style.display = 'block';
            console.log('🧪 UI: elabFTW options shown (enabled in settings)');
            
            // Update auto-sync info
            const autoInfo = document.getElementById('elabftwAutoInfo');
            const manualOption = document.getElementById('elabftwManualOption');
            
            if (elabftwAutoSync) {
                if (autoInfo) autoInfo.style.display = 'block';
                if (manualOption) manualOption.style.display = 'none';
            } else {
                if (autoInfo) autoInfo.style.display = 'none';
                if (manualOption) manualOption.style.display = 'block';
            }
        } else {
            elabftwOption.style.display = 'none';
            console.log('🧪 UI: elabFTW options hidden (disabled in settings)');
        }
        
        console.log('✅ UI: elabFTW options updated');
        
    } catch (error) {
        console.error('🧪 UI: Error updating elabFTW options:', error);
    }
}

// FIXED: Update OMERO options visibility based on category
async function updateOMEROOptions() {
    console.log('🔬 UI: Updating OMERO options visibility');
    
    try {
        const omeroOption = document.getElementById('omeroOption');
        const omeroEnabled = await window.settingsManager.get('omero.enabled');
        const omeroAutoSync = await window.settingsManager.get('omero.auto_sync');
        
        if (!omeroOption) {
            console.warn('🔬 UI: OMERO option element not found');
            return;
        }
        
        // FIXED: Check if OMERO is enabled AND current category supports it
        // For now, allow OMERO for all categories (you can restrict if needed)
        const shouldShow = omeroEnabled === true;
        
        if (shouldShow) {
            omeroOption.style.display = 'block';
            console.log('🔬 UI: OMERO options shown (enabled in settings)');
            
            // Update auto-sync info
            const autoInfo = document.getElementById('omeroAutoInfo');
            const manualOption = document.getElementById('omeroManualOption');
            
            if (omeroAutoSync) {
                if (autoInfo) autoInfo.style.display = 'block';
                if (manualOption) manualOption.style.display = 'none';
            } else {
                if (autoInfo) autoInfo.style.display = 'none';
                if (manualOption) manualOption.style.display = 'block';
            }
        } else {
            omeroOption.style.display = 'none';
            console.log('🔬 UI: OMERO options hidden (disabled in settings)');
        }
        
        console.log('✅ UI: OMERO options updated');
        
    } catch (error) {
        console.error('🔬 UI: Error updating OMERO options:', error);
    }
}

// FIXED: Update all integration options
async function updateIntegrationOptions() {
    console.log('🔄 UI: Updating all integration options');
    
    try {
        await updateElabFTWOptions();
        await updateOMEROOptions();
        
        console.log('✅ UI: All integration options updated');
    } catch (error) {
        console.error('❌ UI: Error updating integration options:', error);
    }
}

// Global function to switch template type (called from HTML buttons)
function switchTemplateType(categoryId) {
    if (window.templateTypeManager && window.templateTypeManager.switchType) {
        window.templateTypeManager.switchType(categoryId);
    } else {
        console.error('❌ templateTypeManager not available');
    }
}

console.log('✅ FIXED: Integration options update functions loaded');