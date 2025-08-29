// DEBUG FUNKTIONEN - Füge diese zu enhancedActions.js oder als separate debug.js hinzu


// Debug-Funktion: Status der Shared Templates Einstellung prüfen
window.debugSharedTemplates = async function() {
    console.log('🐛 === SHARED TEMPLATES DEBUG INFO ===');
    
    // 1. Current User Info
    const userInfo = window.userManager?.getCurrentUserInfo();
    console.log('👤 Current User:', userInfo);
    
    // 2. Settings Manager Status
    if (window.settingsManager) {
        try {
            const setting = await window.settingsManager.get('general.show_shared_templates');
            console.log('⚙️ Settings Manager Value:', setting);
            
            // Storage Key Check
            if (window.storage) {
                const storageKey = window.storage.getStorageKey('settings');
                console.log('🔑 Storage Key:', storageKey);
                
                const rawSettings = localStorage.getItem(storageKey);
                if (rawSettings) {
                    const parsed = JSON.parse(rawSettings);
                    console.log('💾 Raw Setting in Storage:', parsed['general.show_shared_templates']);
                } else {
                    console.log('💾 No settings found in storage for this key');
                }
            }
        } catch (error) {
            console.error('❌ Error reading from settings manager:', error);
        }
    } else {
        console.log('❌ Settings Manager not available');
    }
    
    // 3. Template Manager Status
    if (window.templateManager) {
        console.log('📂 TemplateManager State:', window.templateManager.searchState.showSharedTemplates);
        
        const checkbox = document.getElementById('showSharedTemplates');
        if (checkbox) {
            console.log('☑️ Checkbox State:', checkbox.checked);
        } else {
            console.log('❌ Checkbox not found');
        }
    }
    
    // 4. All User Storage Keys
    console.log('🗄️ All localStorage keys with "metafold":');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('metafold')) {
            console.log(`  - ${key}`);
        }
    }
    
    console.log('🐛 === END DEBUG INFO ===');
};

// Debug-Funktion: Shared Templates Einstellung für alle User anzeigen
window.debugAllUserSettings = function() {
    console.log('🐛 === ALL USER SETTINGS DEBUG ===');
    
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('metafold') && key.includes('settings')) {
            allKeys.push(key);
        }
    }
    
    allKeys.forEach(key => {
        try {
            const settings = JSON.parse(localStorage.getItem(key));
            const sharedSetting = settings['general.show_shared_templates'];
            console.log(`📂 ${key}: show_shared_templates = ${sharedSetting}`);
        } catch (error) {
            console.log(`❌ ${key}: Error parsing settings`);
        }
    });
    
    console.log('🐛 === END ALL USER SETTINGS ===');
};

// Debug-Funktion: Settings manuell für aktuellen User setzen
window.debugSetSharedTemplates = async function(value) {
    console.log(`🔧 Setting shared templates to: ${value}`);
    
    if (window.settingsManager) {
        try {
            await window.settingsManager.set('general.show_shared_templates', value);
            console.log('✅ Setting saved');
            
            // Update UI
            if (window.templateManager) {
                await window.templateManager.loadSharedTemplatesPreference();
                window.templateManager.renderList();
                console.log('✅ UI updated');
            }
        } catch (error) {
            console.error('❌ Error setting value:', error);
        }
    }
};

// Schnelle Test-Funktion
window.testUserSwitchSettings = async function() {
    console.log('🧪 === USER SWITCH SETTINGS TEST ===');
    
    // Aktuelle Einstellung anzeigen
    await window.debugSharedTemplates();
    
    console.log('💡 Use these functions to debug:');
    console.log('  - debugSharedTemplates() - Show current status');
    console.log('  - debugAllUserSettings() - Show all user settings'); 
    console.log('  - debugSetSharedTemplates(true/false) - Set manually');
    
    console.log('🧪 === END TEST ===');
};

console.log('🐛 Debug functions loaded. Use: debugSharedTemplates(), debugAllUserSettings(), testUserSwitchSettings()');

// Auto-Debug nach User-Switch (optional)
if (window.userManager) {
    const originalSwitchUser = window.userManager.switchUser;
    window.userManager.switchUser = async function(...args) {
        const result = await originalSwitchUser.apply(this, args);
        
        // Debug nach User-Switch
        setTimeout(async () => {
            console.log('🔍 Auto-Debug nach User-Switch:');
            await window.debugSharedTemplates();
        }, 1000);
        
        return result;
    };
}

// NEW: Debug template loading status
window.debugTemplateStatus = async function() {
    console.log('🐛 ===== TEMPLATE DEBUG STATUS =====');
    
    // Check storage availability
    console.log('📦 Storage Manager:');
    console.log('  - Available:', !!window.storage);
    if (window.storage) {
        console.log('  - Mode:', window.storage.storageMode);
        console.log('  - File Storage Enabled:', window.storage.fileStorageEnabled);
        console.log('  - User Prefix:', window.storage.userPrefix);
        
        // Get user context
        try {
            const userInfo = window.storage.getCurrentUserContext();
            console.log('  - User Info:', userInfo);
        } catch (error) {
            console.log('  - User Info Error:', error.message);
        }
        
        // Get storage stats
        try {
            const stats = window.storage.getStorageStats ? window.storage.getStorageStats() : {};
            console.log('  - Storage Stats:', stats);
        } catch (error) {
            console.log('  - Storage Stats Error:', error.message);
        }
    }
    
    // Check template manager
    console.log('📂 Template Manager:');
    console.log('  - Available:', !!window.templateManager);
    if (window.templateManager) {
        console.log('  - Templates Count:', window.templateManager.templates?.length || 0);
        console.log('  - Filtered Count:', window.templateManager.filteredTemplates?.length || 0);
        console.log('  - Current Type:', window.templateManager.getCurrentType?.() || 'Unknown');
        
        // Show first few templates
        if (window.templateManager.templates && window.templateManager.templates.length > 0) {
            console.log('  - First 3 templates:');
            window.templateManager.templates.slice(0, 3).forEach((template, index) => {
                console.log(`    ${index + 1}. "${template.name}" (${template.type || 'unknown'}) - Storage: ${template.storageType || 'unknown'}`);
            });
        }
    }
    
    // Check Electron API
    console.log('🖥️ Electron API:');
    console.log('  - Available:', !!window.electronAPI);
    if (window.electronAPI) {
        console.log('  - getTemplatesDirectory:', !!window.electronAPI.getTemplatesDirectory);
        console.log('  - loadAllTemplates:', !!window.electronAPI.loadAllTemplates);
        console.log('  - saveTemplateToFile:', !!window.electronAPI.saveTemplateToFile);
    }
    
    // Check user manager
    console.log('👤 User Manager:');
    console.log('  - Available:', !!window.userManager);
    if (window.userManager) {
        console.log('  - Current User:', window.userManager.getCurrentUser?.() || 'Unknown');
        console.log('  - Current Group:', window.userManager.getCurrentGroup?.() || 'Unknown');
    }
    
    // Test template loading
    console.log('🧪 Testing Template Loading:');
    try {
        if (window.storage && window.storage.loadTemplates) {
            const testTemplates = await window.storage.loadTemplates();
            console.log('  - ✅ loadTemplates() successful:', testTemplates.length, 'templates');
            
            if (testTemplates.length > 0) {
                console.log('  - Sample template:', {
                    name: testTemplates[0].name,
                    type: testTemplates[0].type,
                    storageType: testTemplates[0].storageType,
                    hasFileInfo: !!testTemplates[0]._fileInfo
                });
            }
        } else {
            console.log('  - ❌ loadTemplates() not available');
        }
    } catch (error) {
        console.log('  - ❌ loadTemplates() failed:', error.message);
    }
    
    console.log('🐛 ===== END DEBUG STATUS =====');
    
    // Return summary
    return {
        storage: !!window.storage,
        templateManager: !!window.templateManager,
        electronAPI: !!window.electronAPI,
        userManager: !!window.userManager,
        templatesCount: window.templateManager?.templates?.length || 0,
        storageMode: window.storage?.storageMode || 'unknown'
    };
};

// NEW: Quick fix function
window.quickFixTemplates = async function() {
    console.log('🔧 Attempting quick template fix...');
    
    try {
        // 1. Reinitialize storage
        if (window.storage && window.storage.initFileStorage) {
            console.log('📦 Reinitializing file storage...');
            await window.storage.initFileStorage();
        }
        
        // 2. Force refresh templates
        if (window.templateManager && window.templateManager.refreshFromFiles) {
            console.log('📂 Force refreshing templates from files...');
            await window.templateManager.refreshFromFiles();
        } else if (window.templateManager && window.templateManager.refresh) {
            console.log('📂 Refreshing templates...');
            await window.templateManager.refresh();
        }
        
        // 3. Check result
        const count = window.templateManager?.templates?.length || 0;
        console.log(`✅ Quick fix completed. Templates loaded: ${count}`);
        
        if (count === 0) {
            console.log('⚠️ Still no templates loaded. Running debug...');
            await window.debugTemplateStatus();
        }
        
        return count > 0;
    } catch (error) {
        console.error('❌ Quick fix failed:', error);
        return false;
    }
};

// NEW: Force complete reload
window.forceCompleteReload = async function() {
    console.log('🔄 Starting complete system reload...');
    
    try {
        // 1. Clear all caches
        if (window.templateManager) {
            window.templateManager.templates = [];
            window.templateManager.filteredTemplates = [];
            window.templateManager.currentTemplate = null;
            window.templateManager.selectedIndex = -1;
        }
        
        // 2. Reinitialize storage
        if (window.storage) {
            console.log('📦 Reinitializing storage...');
            await window.storage.initFileStorage();
        }
        
        // 3. Reinitialize template manager
        if (window.templateManager && window.templateManager.init) {
            console.log('📂 Reinitializing template manager...');
            await window.templateManager.init();
        }
        
        // 4. Refresh UI
        if (window.templateManager) {
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
        }
        
        const count = window.templateManager?.templates?.length || 0;
        console.log(`✅ Complete reload finished. Templates: ${count}`);
        
        alert(`🔄 Complete reload finished!\n\nTemplates loaded: ${count}`);
        
        return true;
    } catch (error) {
        console.error('❌ Complete reload failed:', error);
        alert('❌ Complete reload failed: ' + error.message);
        return false;
    }
};

// NEW: Test file storage connectivity
window.testFileStorage = async function() {
    console.log('🧪 Testing file storage connectivity...');
    
    if (!window.electronAPI) {
        console.log('❌ Electron API not available');
        return false;
    }
    
    try {
        // Test 1: Get templates directory
        console.log('📁 Test 1: Getting templates directory...');
        const userInfo = window.storage?.getCurrentUserContext() || { username: 'test', groupname: 'test' };
        const dirResult = await window.electronAPI.getTemplatesDirectory(userInfo);
        console.log('📁 Directory result:', dirResult);
        
        // Test 2: Load templates
        console.log('📂 Test 2: Loading templates...');
        const loadResult = await window.electronAPI.loadAllTemplates(userInfo);
        console.log('📂 Load result:', loadResult);
        
        // Test 3: Check if we can save (create test template)
        console.log('💾 Test 3: Testing save capability...');
        const testTemplate = {
            id: 'test_template_' + Date.now(),
            name: 'Test Template',
            type: 'folders',
            structure: 'test/',
            createdBy: userInfo.username,
            createdByGroup: userInfo.groupname,
            createdAt: new Date().toISOString()
        };
        
        const saveResult = await window.electronAPI.saveTemplateToFile(testTemplate, userInfo);
        console.log('💾 Save result:', saveResult);
        
        const allTestsPassed = dirResult.success && loadResult.success && saveResult.success;
        
        console.log(`🧪 File storage test ${allTestsPassed ? '✅ PASSED' : '❌ FAILED'}`);
        
        const resultText = `📊 File Storage Test Results:\n\n` +
            `📁 Directory Access: ${dirResult.success ? '✅ OK' : '❌ Failed'}\n` +
            `📂 Template Loading: ${loadResult.success ? '✅ OK' : '❌ Failed'}\n` +
            `💾 Template Saving: ${saveResult.success ? '✅ OK' : '❌ Failed'}\n\n` +
            `Overall: ${allTestsPassed ? '✅ All tests passed' : '❌ Some tests failed'}`;
        
        alert(resultText);
        
        return allTestsPassed;
    } catch (error) {
        console.error('❌ File storage test failed:', error);
        alert('❌ File storage test failed: ' + error.message);
        return false;
    }
};

// NEW: Cleanup and repair function
window.cleanupAndRepair = async function() {
    const confirmMessage = `🔧 Cleanup and Repair\n\nThis will:\n• Clear localStorage templates\n• Reset template manager\n• Reload from files only\n• Rebuild search index\n\nContinue?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    console.log('🔧 Starting cleanup and repair...');
    
    try {
        // 1. Cleanup localStorage
        if (window.storage && window.storage.cleanupLocalStorageTemplates) {
            console.log('🧹 Cleaning up localStorage...');
            await window.storage.cleanupLocalStorageTemplates();
        }
        
        // 2. Force reload
        if (window.storage && window.storage.forceCleanReload) {
            console.log('🔄 Force reloading templates...');
            await window.storage.forceCleanReload();
        }
        
        // 3. Rebuild everything
        if (window.templateManager) {
            console.log('🔨 Rebuilding template manager...');
            window.templateManager.invalidateCache();
            window.templateManager.buildSearchIndex();
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
        }
        
        const count = window.templateManager?.templates?.length || 0;
        console.log(`✅ Cleanup and repair completed. Templates: ${count}`);
        
        alert(`✅ Cleanup and repair completed!\n\nTemplates loaded: ${count}`);
        
        return true;
    } catch (error) {
        console.error('❌ Cleanup and repair failed:', error);
        alert('❌ Cleanup and repair failed: ' + error.message);
        return false;
    }

    
};

// =================== DEBUG-FUNKTION: GROUP-FELDER TESTEN ===================

// Füge diese Funktion zu debug.js hinzu oder als window-Funktion

window.debugGroupFields = function() {
    console.log('🐛 === GROUP FIELDS DEBUG ===');
    
    // 1. Template Manager Check
    if (window.templateManager && window.templateManager.currentTemplate) {
        const template = window.templateManager.currentTemplate;
        console.log('📂 Current template:', template.name);
        console.log('📂 Template type:', template.type);
        
        if (template.metadata) {
            const groupFields = Object.entries(template.metadata)
                .filter(([key, field]) => field && field.type === 'group');
            
            console.log(`📁 Found ${groupFields.length} group fields:`);
            groupFields.forEach(([key, field]) => {
                console.log(`   - ${key}: "${field.label}" (${field.fields ? field.fields.length : 0} fields)`);
            });
        } else {
            console.log('❌ No metadata found in template');
        }
    } else {
        console.log('❌ No current template found');
    }
    
    // 2. JSON Triplets Checkbox Check
    const checkbox = document.getElementById('omeroUseJsonTriplets');
    if (checkbox) {
        console.log('📋 JSON Triplets checkbox:', checkbox.checked ? 'ENABLED' : 'DISABLED');
    } else {
        console.log('❌ JSON Triplets checkbox not found');
    }
    
    // 3. OMERO Options Check
    if (window.projectManager && window.projectManager.getOMEROOptions) {
        const options = window.projectManager.getOMEROOptions();
        console.log('🔬 OMERO Options:', options);
        console.log('   - Template Metadata:', !!options.templateMetadata);
        console.log('   - JSON Triplets:', options.useJsonTriplets);
    }
    
    // 4. Test Group Conversion
    if (window.omeroAnnotations && window.templateManager.currentTemplate) {
        console.log('🧪 Testing group field conversion...');
        
        const groupPairs = window.omeroAnnotations.convertGroupFieldsToKeyOnlyPairs(
            window.templateManager.currentTemplate
        );
        
        console.log(`🧪 Would create ${groupPairs.length} group key-only pairs:`);
        groupPairs.forEach(([key, value]) => {
            console.log(`   "${key}" = "${value}"`);
        });
    }
    
    console.log('🐛 === DEBUG END ===');
};

// Test-Funktion: Simuliere Group-Field Export
window.testGroupExport = async function() {
    console.log('🧪 === TESTING GROUP EXPORT ===');
    
    if (!window.templateManager?.currentTemplate) {
        console.error('❌ No template selected for testing');
        return;
    }
    
    if (!window.experimentForm?.collectData) {
        console.error('❌ Experiment form not available');
        return;
    }
    
    try {
        // Collect current form data
        const formData = window.experimentForm.collectData();
        console.log('📋 Form data collected:', Object.keys(formData).length, 'fields');
        
        // Check JSON Triplets mode
        const checkbox = document.getElementById('omeroUseJsonTriplets');
        const useJsonTriplets = checkbox ? checkbox.checked : false;
        
        console.log('📋 JSON Triplets mode:', useJsonTriplets);
        
        // Test conversion
        if (window.omeroAnnotations) {
            if (useJsonTriplets) {
                console.log('📋 Would use JSON Triplets mode (no group key-only pairs)');
                const pairs = window.omeroAnnotations.convertMetadataToSimpleKeyValues(formData);
                console.log(`📋 Would create ${pairs.length} JSON triplet pairs`);
            } else {
                console.log('🔄 Would use Enhanced Key-Value mode (with group key-only pairs)');
                const pairs = window.omeroAnnotations.convertMetadataToSimpleKeyValuesWithGroups(
                    formData, 
                    window.templateManager.currentTemplate
                );
                console.log(`🔄 Would create ${pairs.length} total pairs (including groups)`);
                
                pairs.forEach(([key, value]) => {
                    if (value === '') {
                        console.log(`   📁 GROUP: "${key}" = "" (key-only)`);
                    } else {
                        console.log(`   📝 DATA:  "${key}" = "${value}"`);
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
    
    console.log('🧪 === TEST END ===');
};


console.log('✅ Debug functions loaded');