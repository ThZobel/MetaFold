// COMPLETE USER MANAGEMENT TEST TOOL
// Use this after updating index.html to test everything

const userMgmtTest = {
    
    // Test the complete user management workflow
    async testCompleteWorkflow() {
        console.log('🔍 === COMPLETE USER MANAGEMENT WORKFLOW TEST ===');
        
        try {
            // 1. Test Settings Modal Opening
            console.log('📋 STEP 1: Testing Settings Modal');
            await this.testSettingsModal();
            
            // 2. Test Checkbox Toggle
            console.log('📋 STEP 2: Testing Checkbox Toggle');
            await this.testCheckboxToggle();
            
            // 3. Test User Selection
            console.log('📋 STEP 3: Testing User Selection');
            await this.testUserSelection();
            
            // 4. Test Template Separation
            console.log('📋 STEP 4: Testing Template Separation');
            await this.testTemplateSeparation();
            
            // 5. Test User Switching
            console.log('📋 STEP 5: Testing User Switching');
            await this.testUserSwitching();
            
            console.log('🎉 === COMPLETE WORKFLOW TEST FINISHED ===');
            
        } catch (error) {
            console.error('❌ Workflow test failed:', error);
        }
    },
    
    async testSettingsModal() {
        try {
            // Test if settings modal can be opened
            if (typeof window.showSettingsModal === 'function') {
                console.log('✅ showSettingsModal function exists');
                
                // Test if loadSettingsIntoModal works
                if (typeof window.loadSettingsIntoModal === 'function') {
                    await window.loadSettingsIntoModal();
                    console.log('✅ loadSettingsIntoModal works');
                    
                    // Check if checkbox is properly loaded
                    const checkbox = document.getElementById('userManagementEnabled');
                    if (checkbox) {
                        const actualSetting = await window.settingsManager.get('general.user_management_enabled');
                        console.log(`✅ Checkbox sync: Setting=${actualSetting}, Checkbox=${checkbox.checked}`);
                    } else {
                        console.log('❌ Checkbox not found');
                    }
                } else {
                    console.log('❌ loadSettingsIntoModal function missing');
                }
            } else {
                console.log('❌ showSettingsModal function missing');
            }
        } catch (error) {
            console.error('❌ Settings modal test failed:', error);
        }
    },
    
    async testCheckboxToggle() {
        try {
            const checkbox = document.getElementById('userManagementEnabled');
            if (!checkbox) {
                console.log('❌ Checkbox not found');
                return;
            }
            
            const initialState = checkbox.checked;
            console.log('📋 Initial checkbox state:', initialState);
            
            // Test toggle function exists
            if (typeof window.updateUserManagementSetting === 'function') {
                console.log('✅ updateUserManagementSetting function exists');
                
                // Test toggle (but don't actually change state if it's working)
                if (initialState) {
                    console.log('✅ User management is already enabled - checkbox toggle function ready');
                } else {
                    console.log('🔧 User management disabled - testing enable...');
                    checkbox.checked = true;
                    await window.updateUserManagementSetting();
                    
                    const newState = await window.settingsManager.get('general.user_management_enabled');
                    console.log('📋 After toggle test:', newState);
                }
            } else {
                console.log('❌ updateUserManagementSetting function missing');
            }
            
        } catch (error) {
            console.error('❌ Checkbox toggle test failed:', error);
        }
    },
    
    async testUserSelection() {
        try {
            if (!window.userManager) {
                console.log('❌ userManager not available');
                return;
            }
            
            console.log('📋 Current user info:');
            console.log('  - User:', window.userManager.currentUser);
            console.log('  - Group:', window.userManager.currentGroup);
            console.log('  - Initialized:', window.userManager.isInitialized);
            console.log('  - User count:', window.userManager.users?.length || 0);
            
            // Test if login modal is available
            if (window.loginModal && typeof window.loginModal.show === 'function') {
                console.log('✅ Login modal available');
            } else {
                console.log('❌ Login modal not available');
            }
            
            // Test user management modal
            if (window.userManagementModal && typeof window.userManagementModal.show === 'function') {
                console.log('✅ User management modal available');
            } else {
                console.log('❌ User management modal not available');
            }
            
        } catch (error) {
            console.error('❌ User selection test failed:', error);
        }
    },
    
    async testTemplateSeparation() {
        try {
            if (!window.templateManager) {
                console.log('❌ templateManager not available');
                return;
            }
            
            console.log('📋 Template system status:');
            console.log('  - Templates loaded:', window.templateManager.templates?.length || 0);
            console.log('  - Current template:', window.templateManager.currentTemplate?.name || 'None');
            
            // Test storage prefix
            if (window.storage) {
                console.log('  - Storage prefix:', window.storage.userPrefix);
                
                const expectedPrefix = window.userManager?.currentUser || 'default';
                if (window.storage.userPrefix === expectedPrefix) {
                    console.log('✅ Storage prefix correctly set for current user');
                } else {
                    console.log('⚠️ Storage prefix mismatch:', {
                        expected: expectedPrefix,
                        actual: window.storage.userPrefix
                    });
                }
            } else {
                console.log('❌ Storage not available');
            }
            
        } catch (error) {
            console.error('❌ Template separation test failed:', error);
        }
    },
    
    async testUserSwitching() {
        try {
            if (!window.userManager) {
                console.log('❌ userManager not available for switching test');
                return;
            }
            
            console.log('📋 User switching capabilities:');
            
            // Test if switching methods exist
            const methods = [
                'showUserSelection',
                'switchUser',
                'setCurrentUser',
                'showLoginModal'
            ];
            
            methods.forEach(method => {
                if (typeof window.userManager[method] === 'function') {
                    console.log(`✅ ${method} available`);
                } else {
                    console.log(`❌ ${method} missing`);
                }
            });
            
            // Test user history
            const userHistory = window.userManager.users || [];
            console.log('📋 User history:', userHistory);
            
            if (userHistory.length > 1) {
                console.log('✅ Multiple users available for switching');
            } else {
                console.log('📋 Only one user in history - switching capabilities ready');
            }
            
        } catch (error) {
            console.error('❌ User switching test failed:', error);
        }
    },
    
    // Test what happens when user management is disabled
    async testDisableUserManagement() {
        console.log('🔧 === TESTING USER MANAGEMENT DISABLE ===');
        
        try {
            const checkbox = document.getElementById('userManagementEnabled');
            if (!checkbox) {
                console.log('❌ Checkbox not found');
                return;
            }
            
            console.log('📋 Current state before disable:', checkbox.checked);
            
            // Disable it
            checkbox.checked = false;
            await window.updateUserManagementSetting();
            
            // Check results
            const newSetting = await window.settingsManager.get('general.user_management_enabled');
            console.log('📋 Setting after disable:', newSetting);
            console.log('📋 User manager state:', {
                currentUser: window.userManager?.currentUser,
                isInitialized: window.userManager?.isInitialized
            });
            
            // Re-enable it
            console.log('🔧 Re-enabling user management...');
            checkbox.checked = true;
            await window.updateUserManagementSetting();
            
            const finalSetting = await window.settingsManager.get('general.user_management_enabled');
            console.log('📋 Final setting after re-enable:', finalSetting);
            
        } catch (error) {
            console.error('❌ Disable test failed:', error);
        }
    },
    
    // Generate a comprehensive report
    async generateReport() {
        console.log('📊 === USER MANAGEMENT COMPREHENSIVE REPORT ===');
        
        const report = {
            timestamp: new Date().toISOString(),
            modules: {},
            settings: {},
            ui: {},
            functionality: {}
        };
        
        // Module availability
        const modules = ['settingsManager', 'userManager', 'loginModal', 'userManagementModal', 'templateManager', 'storage'];
        modules.forEach(module => {
            report.modules[module] = {
                available: !!window[module],
                hasInit: !!(window[module] && typeof window[module].init === 'function')
            };
        });
        
        // Settings
        if (window.settingsManager) {
            report.settings = {
                userManagementEnabled: await window.settingsManager.get('general.user_management_enabled'),
                isSecureStorageReady: window.settingsManager.isSecureStorageReady,
                settingsCount: Object.keys(window.settingsManager.settings || {}).length
            };
        }
        
        // UI State
        const checkbox = document.getElementById('userManagementEnabled');
        report.ui = {
            checkboxFound: !!checkbox,
            checkboxState: checkbox ? checkbox.checked : null,
            settingsModalFound: !!document.getElementById('settingsModal')
        };
        
        // User Manager State
        if (window.userManager) {
            report.functionality = {
                currentUser: window.userManager.currentUser,
                currentGroup: window.userManager.currentGroup,
                isInitialized: window.userManager.isInitialized,
                userCount: window.userManager.users?.length || 0,
                storagePrefix: window.storage?.userPrefix
            };
        }
        
        console.table(report.modules);
        console.table(report.settings);
        console.table(report.ui);
        console.table(report.functionality);
        
        // Summary
        const issues = [];
        if (!report.modules.userManager.available) issues.push('userManager missing');
        if (!report.modules.settingsManager.available) issues.push('settingsManager missing');
        if (!report.ui.checkboxFound) issues.push('checkbox missing');
        if (report.settings.userManagementEnabled !== report.ui.checkboxState) issues.push('UI not synced');
        if (!report.functionality.currentUser) issues.push('no current user');
        
        console.log('📋 ISSUES FOUND:', issues.length > 0 ? issues : ['None - everything looks good!']);
        
        return report;
    }
};

// Make it globally available
window.userMgmtTest = userMgmtTest;

console.log('🧪 Complete User Management Test Tool loaded!');
console.log('Usage:');
console.log('  userMgmtTest.testCompleteWorkflow() - Test everything');
console.log('  userMgmtTest.generateReport() - Generate detailed report');
console.log('  userMgmtTest.testDisableUserManagement() - Test disable/enable');
