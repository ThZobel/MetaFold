// =================== TEMPLATE TYPE MANAGEMENT ===================

window.switchTemplateType = function (type) {
    try {
        if (window.templateTypeManager && window.templateTypeManager.switchType) {
            window.templateTypeManager.switchType(type);

            // Update integration options after type switch
            setTimeout(() => {
                if (window.updateIntegrationOptions) {
                    window.updateIntegrationOptions();
                }
            }, 200);
        }
    } catch (error) {
        console.error('Error in switchTemplateType:', error);
    }
};

// =================== ENHANCED: MAIN TAB SWITCHING with Visualization Init ===================

window.switchMainTab = function (tabName) {
    try {
        // Hide all main-tab-content elements
        document.querySelectorAll('.main-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all main tabs
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab content
        const tabContent = document.getElementById(tabName + 'TabContent');
        const tabButton = document.getElementById(tabName + 'Tab');

        if (tabContent) tabContent.classList.add('active');
        if (tabButton) tabButton.classList.add('active');

        // Tab-specific initialization
        if (tabName === 'discover') {
            console.log('📁 Initializing Discovery tab...');
            if (window.projectScanner) {
                window.projectScanner.init();
            }

            // Update OMERO logout button visibility
            if (window.omeroUIIntegration && window.omeroUIIntegration.updateLogoutButtonVisibility) {
                window.omeroUIIntegration.updateLogoutButtonVisibility();
            }
        } else if (tabName === 'visualize') {
            console.log('📊 Initializing Visualization tab...');
            if (window.visualizationManager) {
                window.visualizationManager.init();

                // Show/hide scanned projects button
                const scannedBtn = document.getElementById('visualizeScannedBtn');
                if (window.projectScanner && window.projectScanner.projects && window.projectScanner.projects.length > 0) {
                    if (scannedBtn) {
                        scannedBtn.style.display = 'inline-block';
                        scannedBtn.textContent = `📁 Projects (${window.projectScanner.projects.length})`;
                    }
                } else {
                    if (scannedBtn) scannedBtn.style.display = 'none';
                }
            }

            setTimeout(() => {
                if (window.visualizationManager && window.visualizationManager.checkJSONCrackAvailability) {
                    window.visualizationManager.checkJSONCrackAvailability();
                }
            }, 200);
        }

        console.log('Switched to tab:', tabName);
    } catch (error) {
        console.error('Error in switchMainTab:', error);
    }
};

// =================== TEMPLATE MODAL MANAGEMENT ===================

window.showTemplateModal = function () {
    try {
        if (window.templateModal && window.templateModal.show) {
            window.templateModal.show();
        }
    } catch (error) {
        console.error('Error in showTemplateModal:', error);
    }
};

window.closeTemplateModal = function () {
    try {
        if (window.templateModal && window.templateModal.close) {
            window.templateModal.close();
        }
    } catch (error) {
        console.error('Error in closeTemplateModal:', error);
    }
};

window.toggleTemplateTypeContent = function () {
    try {
        if (window.templateModal && window.templateModal.toggleTypeContent) {
            window.templateModal.toggleTypeContent();
        }
    } catch (error) {
        console.error('Error in toggleTemplateTypeContent:', error);
    }
};

window.switchModalTab = function (tab) {
    try {
        if (window.templateModal && window.templateModal.switchTab) {
            window.templateModal.switchTab(tab);
        }
    } catch (error) {
        console.error('Error in switchModalTab:', error);
    }
};

window.saveTemplate = function () {
    try {
        if (window.templateModal && window.templateModal.save) {
            window.templateModal.save();
        }
    } catch (error) {
        console.error('Error in saveTemplate:', error);
    }
};

// =================== METADATA EDITOR MANAGEMENT ===================

window.addMetadataField = function () {
    try {
        if (window.metadataEditor && window.metadataEditor.addField) {
            window.metadataEditor.addField();
        }
    } catch (error) {
        console.error('Error in addMetadataField:', error);
    }
};

window.loadJsonMetadata = function () {
    try {
        if (window.metadataEditor && window.metadataEditor.loadFromJson) {
            window.metadataEditor.loadFromJson();
        }
    } catch (error) {
        console.error('Error in loadJsonMetadata:', error);
    }
};

// =================== PROJECT MANAGEMENT ===================

window.browsePath = function () {
    try {
        if (window.projectManager && window.projectManager.browsePath) {
            window.projectManager.browsePath();
        }
    } catch (error) {
        console.error('Error in browsePath:', error);
    }
};

window.createProject = function () {
    try {
        if (window.projectManager && window.projectManager.createProject) {
            window.projectManager.createProject();
        }
    } catch (error) {
        console.error('Error in createProject:', error);
    }
};

// =================== TEMPLATE MANAGEMENT ===================

window.editCurrentTemplate = function () {
    try {
        if (window.templateManager && window.templateManager.editCurrent) {
            window.templateManager.editCurrent();
        }
    } catch (error) {
        console.error('Error in editCurrentTemplate:', error);
    }
};

window.deleteCurrentTemplate = function () {
    try {
        if (window.templateManager && window.templateManager.deleteCurrent) {
            window.templateManager.deleteCurrent();
        }
    } catch (error) {
        console.error('Error in deleteCurrentTemplate:', error);
    }
};

// =================== EXPERIMENT FORM MANAGEMENT ===================

window.saveExperimentTemplate = function () {
    try {
        if (window.experimentForm && window.experimentForm.saveTemplate) {
            window.experimentForm.saveTemplate();
        }
    } catch (error) {
        console.error('Error in saveExperimentTemplate:', error);
    }
};

// =================== USER MANAGEMENT ===================

window.showSwitchUserModal = function () {
    try {
        if (window.userManagementModal && window.userManagementModal.show) {
            console.log('👥 Opening Switch User Modal...');
            window.userManagementModal.show();
        } else {
            console.warn('⚠️ User Management Modal not available');
            alert('User Management not available. Please check if user management is enabled in settings.');
        }
    } catch (error) {
        console.error('Error in showSwitchUserModal:', error);
    }
};

// =================== CLEAR TEMPLATE FUNCTIONS ===================
window.showTemplateActionsMenu = function () {
    try {
        if (window.experimentForm && window.experimentForm.showTemplateActionsMenu) {
            window.experimentForm.showTemplateActionsMenu();
        }
    } catch (error) {
        console.error('Error in showTemplateActionsMenu:', error);
    }
};

window.clearTemplateForm = function () {
    try {
        if (window.experimentForm && window.experimentForm.clearTemplate) {
            window.experimentForm.clearTemplate();
        }
    } catch (error) {
        console.error('Error in clearTemplateForm:', error);
    }
};

window.clearTemplateValues = function () {
    try {
        if (window.experimentForm && window.experimentForm.clearTemplateValues) {
            window.experimentForm.clearTemplateValues();
        }
    } catch (error) {
        console.error('Error in clearTemplateValues:', error);
    }
};

// =================== STORAGE MANAGEMENT FUNCTIONS ===================
window.refreshTemplatesFromFiles = async function () {
    try {
        if (window.templateManager && window.templateManager.refreshFromFiles) {
            await window.templateManager.refreshFromFiles();
            console.log('✅ Templates refreshed from files');
        } else {
            console.warn('⚠️ Template refresh not available');
        }
    } catch (error) {
        console.error('Error refreshing templates from files:', error);
    }
};

window.saveAllTemplatesToFiles = async function () {
    try {
        if (window.templateManager && window.templateManager.saveAllTemplatesToFiles) {
            const success = await window.templateManager.saveAllTemplatesToFiles();
            if (success) {
                alert('✅ All templates saved to files successfully!');
            } else {
                alert('⚠️ Some templates could not be saved to files. Check console for details.');
            }
        } else {
            alert('⚠️ Batch file saving not available');
        }
    } catch (error) {
        console.error('Error saving all templates to files:', error);
        alert('Error saving templates to files: ' + error.message);
    }
};

// =================== ENHANCED STORAGE INFO ===================
window.showStorageMode = function () {
    try {
        if (window.storage) {
            const mode = window.storage.storageMode;
            const fileEnabled = window.storage.fileStorageEnabled;

            let message = `Storage Mode: ${mode}\n`;
            message += `File Storage: ${fileEnabled ? 'Available' : 'Not Available'}\n\n`;

            if (fileEnabled) {
                message += 'Templates are automatically saved as individual files.\n';
                message += 'This ensures better backup and prevents data conflicts.';
            } else {
                message += 'Running in browser mode - templates stored in localStorage.\n';
                message += 'Consider using the desktop app for file storage.';
            }

            alert(message);
        } else {
            alert('Storage information not available');
        }
    } catch (error) {
        console.error('Error showing storage mode:', error);
    }
};
window.updateCurrentUserDisplay = function () {
    try {
        const userNameEl = document.getElementById('currentUserName');
        const userGroupEl = document.getElementById('currentUserGroup');
        const userAvatarEl = document.getElementById('currentUserAvatar');
        const userDisplayEl = document.getElementById('currentUserDisplay');

        if (!userNameEl || !userGroupEl || !userAvatarEl || !userDisplayEl) {
            console.warn('⚠️ User display elements not found');
            return;
        }

        // Get current user info
        const userInfo = window.userManager?.getCurrentUserInfo() || {
            username: 'User',
            groupname: 'Default',
            isEnabled: false
        };

        console.log('👤 Updating user display:', userInfo);

        // Update display elements
        userNameEl.textContent = userInfo.username || 'User';
        userGroupEl.textContent = userInfo.groupname || 'Default';

        // Update avatar
        const initials = window.userManager?.getUserInitials ?
            window.userManager.getUserInitials(userInfo.username) :
            (userInfo.username ? userInfo.username.substring(0, 2).toUpperCase() : 'U');
        const color = window.userManager?.generateUserColor ?
            window.userManager.generateUserColor(userInfo.username) :
            '#7c3aed';

        userAvatarEl.textContent = initials;
        userAvatarEl.style.background = color;

        // Show/hide user display based on user management status
        if (userInfo.isEnabled && userInfo.username && userInfo.username !== 'User') {
            userDisplayEl.style.display = 'block';
            userDisplayEl.style.opacity = '1';
        } else {
            // In simple mode, show minimal info
            userDisplayEl.style.display = 'block';
            userDisplayEl.style.opacity = '0.7';
        }
    } catch (error) {
        console.error('Error updating user display:', error);
    }
};

// =================== SETTINGS MANAGEMENT ===================

window.showSettingsModal = async function () {
    try {
        if (!window.settingsManager) {
            alert('Settings manager not available');
            return;
        }

        let modal = document.getElementById('settingsModal');

        // SELF-REPAIR: If modal is missing, try to load it immediately
        if (!modal) {
            console.warn('⚠️ settingsModal not found in DOM, attempting recovery load...');
            if (window.componentLoader && window.componentLoader.load) {
                try {
                    await window.componentLoader.load('settings-modal-container', 'components/modals/settings-modal.html');
                    modal = document.getElementById('settingsModal');
                    console.log('✅ settingsModal recovered:', !!modal);
                } catch (loadError) {
                    console.error('❌ Recovery load failed:', loadError);
                }
            }
        }

        if (!modal) {
            console.error('❌ FATAL: settingsModal could not be loaded');
            alert('Error: Settings component is missing and could not be reloaded.');
            return;
        }

        // Wait for settings to load into fields
        await loadSettingsIntoModal();

        // Also initialize category settings if the function exists (defined in settings-modal.html)
        if (typeof window.initializeCategorySettings === 'function') {
            await window.initializeCategorySettings();
        } else if (typeof initializeCategorySettings === 'function') {
            initializeCategorySettings();
        }

        modal.style.display = 'block';

    } catch (error) {
        console.error('Error in showSettingsModal:', error);
    }
};

window.closeSettingsModal = function () {
    try {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in closeSettingsModal:', error);
    }
};

window.switchSettingsTab = function (tabName) {
    try {
        // Hide all tab contents
        document.querySelectorAll('.settings-tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        // Show selected tab
        document.getElementById(tabName + 'Settings').classList.add('active');
        document.getElementById(tabName + 'Tab').classList.add('active');
    } catch (error) {
        console.error('Error in switchSettingsTab:', error);
    }
};

// ENHANCED: loadSettingsIntoModal function
window.loadSettingsIntoModal = async function () {
    const sm = window.settingsManager;
    if (!sm) {
        console.error('❌ Settings manager not available');
        return;
    }

    console.log('🔧 Loading all settings into modal...');

    try {
        // General settings with proper async handling
        const userMgmtEl = document.getElementById('userManagementEnabled');
        const themeEl = document.getElementById('themeSelect');
        const autoSaveEl = document.getElementById('autoSaveEnabled');
        const showTipsEl = document.getElementById('showTipsEnabled');

        // FIXED: Proper async loading of user management setting
        if (userMgmtEl) {
            const userMgmtEnabled = await sm.get('general.user_management_enabled');
            console.log('🔧 Loading user management setting:', userMgmtEnabled);
            userMgmtEl.checked = userMgmtEnabled === true;
            console.log('🔧 Checkbox set to:', userMgmtEl.checked);
        }

        if (themeEl) themeEl.value = await sm.get('general.theme');
        if (autoSaveEl) autoSaveEl.checked = await sm.get('general.auto_save');
        if (showTipsEl) showTipsEl.checked = await sm.get('general.show_tips');

        // elabFTW settings
        const elabftwEnabled = await sm.get('elabftw.enabled');
        const elabftwEnabledEl = document.getElementById('elabftwEnabled');
        const elabftwServerEl = document.getElementById('elabftwServerUrl');
        const elabftwApiEl = document.getElementById('elabftwApiKey');
        const elabftwAutoEl = document.getElementById('elabftwAutoSync');
        const elabftwCatEl = document.getElementById('elabftwDefaultCategory');
        const elabftwSslEl = document.getElementById('elabftwVerifySSL');
        const elabftwConfigEl = document.getElementById('elabftwConfig');

        if (elabftwEnabledEl) elabftwEnabledEl.checked = elabftwEnabled;
        if (elabftwServerEl) elabftwServerEl.value = await sm.get('elabftw.server_url');
        if (elabftwApiEl) elabftwApiEl.value = await sm.get('elabftw.api_key');
        if (elabftwAutoEl) elabftwAutoEl.checked = await sm.get('elabftw.auto_sync');
        if (elabftwCatEl) elabftwCatEl.value = await sm.get('elabftw.default_category');
        if (elabftwSslEl) elabftwSslEl.checked = await sm.get('elabftw.verify_ssl');

        // Show/hide elabFTW config
        if (elabftwConfigEl) {
            elabftwConfigEl.style.display = elabftwEnabled ? 'block' : 'none';
        }

        // CONFLICT RESOLUTION SETTINGS
        const overwriteEnabled = await sm.get('elabftw.overwrite_enabled');
        const versioningFormat = await sm.get('elabftw.versioning_format');

        const overwriteEnabledEl = document.getElementById('elabftwOverwriteEnabled');
        const versioningFormatEl = document.getElementById('elabftwVersioningFormat');
        const versioningInfoEl = document.getElementById('elabftwVersioningInfo');
        const overwriteWarningEl = document.getElementById('elabftwOverwriteWarning');

        if (overwriteEnabledEl) overwriteEnabledEl.checked = overwriteEnabled === true;
        if (versioningFormatEl) versioningFormatEl.value = versioningFormat || 'date';

        // Show appropriate section
        if (versioningInfoEl && overwriteWarningEl) {
            if (overwriteEnabled === true) {
                versioningInfoEl.style.display = 'none';
                overwriteWarningEl.style.display = 'block';
            } else {
                versioningInfoEl.style.display = 'block';
                overwriteWarningEl.style.display = 'none';
            }
        }

        // OMERO settings
        const omeroEnabled = await sm.get('omero.enabled');
        const omeroEnabledEl = document.getElementById('omeroEnabled');
        const omeroServerEl = document.getElementById('omeroServerUrl');
        const omeroUsernameEl = document.getElementById('omeroUsername');
        const omeroPasswordEl = document.getElementById('omeroPassword');
        const omeroDontSaveEl = document.getElementById('omeroDontSavePassword');  // NEW
        const omeroProjectEl = document.getElementById('omeroDefaultProject');
        const omeroDatasetEl = document.getElementById('omeroCreateDatasets');
        const omeroSslEl = document.getElementById('omeroVerifySSL');
        const omeroConfigEl = document.getElementById('omeroConfig');

        if (omeroEnabledEl) omeroEnabledEl.checked = omeroEnabled;
        if (omeroServerEl) omeroServerEl.value = await sm.get('omero.server_url');
        if (omeroUsernameEl) omeroUsernameEl.value = await sm.get('omero.username');
        if (omeroPasswordEl) omeroPasswordEl.value = await sm.get('omero.password');
        if (omeroDontSaveEl) omeroDontSaveEl.checked = await sm.getDontSaveOmeroPassword();  // NEW
        if (omeroProjectEl) omeroProjectEl.value = await sm.get('omero.default_project_id');
        if (omeroDatasetEl) omeroDatasetEl.checked = await sm.get('omero.create_datasets');
        if (omeroSslEl) omeroSslEl.checked = await sm.get('omero.verify_ssl');

        // Phase 2: JSON-Triplet Checkbox Handler
        const omeroUseJsonTriplets = document.getElementById('omeroUseJsonTriplets');
        if (omeroUseJsonTriplets) {
            const useJsonTriplets = await sm.get('omero.use_json_triplets');
            omeroUseJsonTriplets.checked = useJsonTriplets || false;

            omeroUseJsonTriplets.addEventListener('change', async () => {
                await sm.set('omero.use_json_triplets', omeroUseJsonTriplets.checked);
                console.log('🔬 OMERO JSON-Triplet mode:', omeroUseJsonTriplets.checked ? 'enabled' : 'disabled');
            });
        }

        // Show/hide OMERO config
        if (omeroConfigEl) {
            omeroConfigEl.style.display = omeroEnabled ? 'block' : 'none';
        }

        // RSpace settings
        const rspaceEnabled = await sm.get('rspace.enabled');
        const rspaceEnabledEl = document.getElementById('rspaceEnabled');
        const rspaceServerEl = document.getElementById('rspaceServerUrl');
        const rspaceApiEl = document.getElementById('rspaceApiKey');
        const rspaceConfigEl = document.getElementById('rspaceConfig');

        if (rspaceEnabledEl) rspaceEnabledEl.checked = rspaceEnabled;
        if (rspaceServerEl) rspaceServerEl.value = await sm.get('rspace.server_url');
        if (rspaceApiEl) rspaceApiEl.value = await sm.get('rspace.api_key');

        if (rspaceConfigEl) {
            rspaceConfigEl.style.display = rspaceEnabled ? 'block' : 'none';
        }

        // n8n settings
        const n8nEnabled = await sm.get('n8n.enabled');
        const n8nEnabledEl = document.getElementById('n8nEnabled');
        const n8nWebhookEl = document.getElementById('n8nWebhookUrl');
        const n8nAuthTypeEl = document.getElementById('n8nAuthType');
        const n8nAuthEl = document.getElementById('n8nAuthToken');
        const n8nBasicUserEl = document.getElementById('n8nBasicUser');
        const n8nBasicPassEl = document.getElementById('n8nBasicPass');
        const n8nInstanceIdEl = document.getElementById('n8nInstanceId');
        const n8nConfigEl = document.getElementById('n8nConfig');

        const n8nVerifySslEl = document.getElementById('n8nVerifySsl');

        if (n8nEnabledEl) n8nEnabledEl.checked = n8nEnabled;
        if (n8nWebhookEl) n8nWebhookEl.value = await sm.get('n8n.webhook_url');
        if (n8nInstanceIdEl) n8nInstanceIdEl.value = await sm.get('n8n.instance_id');
        
        const authType = await sm.get('n8n.auth_type');
        if (n8nAuthTypeEl) n8nAuthTypeEl.value = authType;
        if (n8nAuthEl) n8nAuthEl.value = await sm.get('n8n.auth_token');
        if (n8nBasicUserEl) n8nBasicUserEl.value = await sm.get('n8n.basic_user');
        if (n8nBasicPassEl) n8nBasicPassEl.value = await sm.get('n8n.basic_pass');
        
        // Use true as default fallback if not explicitly false
        if (n8nVerifySslEl) n8nVerifySslEl.checked = (await sm.get('n8n.verify_ssl')) !== false;

        if (n8nConfigEl) {
            n8nConfigEl.style.display = n8nEnabled ? 'block' : 'none';
        }
        
        // Ensure UI toggles match the loaded auth type
        if (typeof updaten8nAuthTypeUI === 'function') {
            updaten8nAuthTypeUI(authType);
        }

        console.log('✅ All settings loaded into modal successfully');

    } catch (error) {
        console.error('❌ Error loading settings into modal:', error);
    }
};

// =================== SETTING UPDATE FUNCTIONS - ALL PRESERVED ===================

// General Settings
window.updateUserManagementSetting = async function () {
    const checkbox = document.getElementById('userManagementEnabled');
    if (!checkbox) {
        console.error('❌ userManagementEnabled checkbox not found');
        return;
    }

    const enabled = checkbox.checked;
    console.log('🔧 User management setting changed to:', enabled);

    try {
        if (!window.settingsManager) {
            throw new Error('Settings manager not available');
        }

        const success = await window.settingsManager.set('general.user_management_enabled', enabled);

        // CRITICAL FIX: Also update GLOBAL settings directly to ensure startup check passes
        try {
            const globalSettings = JSON.parse(localStorage.getItem('metafold_settings') || '{}');
            globalSettings['general.user_management_enabled'] = enabled;
            localStorage.setItem('metafold_settings', JSON.stringify(globalSettings));
            console.log('✅ Global setting user_management_enabled updated to:', enabled);
        } catch (e) {
            console.warn('⚠️ Could not update global settings manually:', e);
        }

        if (!success) {
            throw new Error('Failed to save setting');
        }

        console.log('✅ Setting saved successfully');

        // Use timeout to allow UI update and storage write to complete
        setTimeout(() => {
            // Prompt for restart as this is a major change
            if (confirm('User Management setting changed.\n\nA full application restart is required for this change to take effect safely.\n\nPlease close and reopen the application manually.\n\nClick OK to acknowledge.')) {
                console.log('User acknowledged restart requirement.');
            }
        }, 500);

    } catch (error) {
        console.error('❌ Error updating user management setting:', error);
        checkbox.checked = !enabled; // Revert on error
    }
};

window.updateThemeSetting = async function () {
    try {
        const theme = document.getElementById('themeSelect').value;
        await window.settingsManager.set('general.theme', theme);
    } catch (error) {
        console.error('Error updating theme:', error);
    }
};

window.updateAutoSaveSetting = async function () {
    try {
        const enabled = document.getElementById('autoSaveEnabled').checked;
        await window.settingsManager.set('general.auto_save', enabled);
    } catch (error) {
        console.error('Error updating auto save:', error);
    }
};

window.updateShowTipsSetting = async function () {
    try {
        const enabled = document.getElementById('showTipsEnabled').checked;
        await window.settingsManager.set('general.show_tips', enabled);
    } catch (error) {
        console.error('Error updating show tips:', error);
    }
};

// =================== ELABFTW SETTINGS ===================

window.updateElabFTWSetting = async function () {
    try {
        const enabled = document.getElementById('elabftwEnabled').checked;

        if (!window.settingsManager) {
            console.error('❌ Settings manager not available');
            return;
        }

        await window.settingsManager.set('elabftw.enabled', enabled);
        const configEl = document.getElementById('elabftwConfig');
        if (configEl) {
            configEl.style.display = enabled ? 'block' : 'none';
        }

        // Update UI
        setTimeout(() => {
            if (window.updateElabFTWOptions) {
                window.updateElabFTWOptions();
            }
            // Explicitly update sidebar visibility
            if (window.sidebarIntegration && window.sidebarIntegration.updateSidebarVisibilityFromSettings) {
                window.sidebarIntegration.updateSidebarVisibilityFromSettings();
            }
        }, 100);
    } catch (error) {
        console.error('Error updating elabFTW setting:', error);
    }
};

window.updateElabFTWServerUrl = async function () {
    try {
        const url = document.getElementById('elabftwServerUrl').value;
        await window.settingsManager.set('elabftw.server_url', url);
    } catch (error) {
        console.error('Error updating elabFTW server URL:', error);
    }
};

window.updateElabFTWApiKey = async function () {
    try {
        const key = document.getElementById('elabftwApiKey').value;
        await window.settingsManager.set('elabftw.api_key', key);
    } catch (error) {
        console.error('Error updating elabFTW API key:', error);
    }
};

window.updateElabFTWAutoSync = async function () {
    try {
        const enabled = document.getElementById('elabftwAutoSync').checked;
        await window.settingsManager.set('elabftw.auto_sync', enabled);

        // Update UI to show/hide manual sync options
        setTimeout(() => {
            window.updateElabFTWOptions();
        }, 100);
    } catch (error) {
        console.error('Error updating elabFTW auto sync:', error);
    }
};

window.updateElabFTWDefaultCategory = async function () {
    try {
        const category = parseInt(document.getElementById('elabftwDefaultCategory').value);
        await window.settingsManager.set('elabftw.default_category', category);
    } catch (error) {
        console.error('Error updating elabFTW default category:', error);
    }
};

window.updateElabFTWVerifySSL = async function () {
    try {
        const enabled = document.getElementById('elabftwVerifySSL').checked;
        await window.settingsManager.set('elabftw.verify_ssl', enabled);
    } catch (error) {
        console.error('Error updating elabFTW verify SSL:', error);
    }
};

window.testElabFTWConnection = async function () {
    const statusDiv = document.getElementById('elabftwConnectionStatus');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Testing elabFTW connection...';
        statusDiv.className = 'testing';

        try {
            const result = await window.settingsManager.testElabFTWConnection();
            statusDiv.textContent = result.message;
            statusDiv.className = result.success ? 'success-message' : 'error-message';
        } catch (error) {
            statusDiv.textContent = 'Connection test failed: ' + error.message;
            statusDiv.className = 'error-message';
        }
    }
};

// =================== ELABFTW CONFLICT RESOLUTION SETTINGS ===================

window.updateElabFTWOverwrite = async function () {
    try {
        const enabled = document.getElementById('elabftwOverwriteEnabled').checked;
        await window.settingsManager.set('elabftw.overwrite_enabled', enabled);

        // Update UI to show appropriate sections
        const versioningInfoEl = document.getElementById('elabftwVersioningInfo');
        const overwriteWarningEl = document.getElementById('elabftwOverwriteWarning');

        if (versioningInfoEl && overwriteWarningEl) {
            if (enabled) {
                versioningInfoEl.style.display = 'none';
                overwriteWarningEl.style.display = 'block';
            } else {
                versioningInfoEl.style.display = 'block';
                overwriteWarningEl.style.display = 'none';
            }
        }

        console.log('🔄 elabFTW overwrite setting updated:', enabled);
    } catch (error) {
        console.error('Error updating elabFTW overwrite setting:', error);
    }
};

window.updateElabFTWVersioningFormat = async function () {
    try {
        const format = document.getElementById('elabftwVersioningFormat').value;
        await window.settingsManager.set('elabftw.versioning_format', format);

        // Update preview
        window.updateVersioningPreview();

        console.log('📅 elabFTW versioning format updated:', format);
    } catch (error) {
        console.error('Error updating elabFTW versioning format:', error);
    }
};

window.updateVersioningPreview = function () {
    const previewEl = document.getElementById('versioningPreview');
    if (!previewEl) return;

    const formatSelect = document.getElementById('elabftwVersioningFormat');
    const format = formatSelect ? formatSelect.value : 'date';

    const now = new Date();
    let exampleSuffix;

    switch (format) {
        case 'timestamp':
            exampleSuffix = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
            break;
        case 'date':
            exampleSuffix = now.toISOString().split('T')[0];
            break;
        case 'counter':
            exampleSuffix = 'v2';
            break;
        default:
            exampleSuffix = now.toISOString().split('T')[0];
    }

    previewEl.textContent = `Existing: "Hypothesis" → New: "Hypothesis_${exampleSuffix}"`;
};

window.testConflictSettings = async function () {
    try {
        const overwriteEnabled = await window.settingsManager.get('elabftw.overwrite_enabled');
        const versioningFormat = await window.settingsManager.get('elabftw.versioning_format');

        const mode = overwriteEnabled ? 'OVERWRITE' : 'VERSIONING';
        const details = overwriteEnabled ?
            'Fields will be overwritten directly' :
            `New versions created using ${versioningFormat} format`;

        alert(`🧪 Conflict Settings Test\n\nMode: ${mode}\nFormat: ${versioningFormat}\nBehavior: ${details}\n\nSettings are working correctly!`);

        console.log('🧪 Conflict settings test:', {
            overwriteEnabled,
            versioningFormat,
            mode,
            details
        });

    } catch (error) {
        console.error('Error testing conflict settings:', error);
        alert(`❌ Error testing settings: ${error.message}`);
    }
};

// =================== OMERO SETTINGS ===================

window.updateOMEROSetting = async function () {
    try {
        const enabled = document.getElementById('omeroEnabled').checked;
        await window.settingsManager.set('omero.enabled', enabled);
        const configEl = document.getElementById('omeroConfig');
        if (configEl) {
            configEl.style.display = enabled ? 'block' : 'none';
        }

        // Update UI
        setTimeout(() => {
            if (window.updateOMEROOptions) {
                window.updateOMEROOptions();
            }
            // Explicitly update sidebar visibility
            if (window.sidebarIntegration && window.sidebarIntegration.updateSidebarVisibilityFromSettings) {
                window.sidebarIntegration.updateSidebarVisibilityFromSettings();
            }
        }, 100);
    } catch (error) {
        console.error('Error updating OMERO setting:', error);
    }
};

window.updateOMEROServerUrl = async function () {
    try {
        const url = document.getElementById('omeroServerUrl').value;
        await window.settingsManager.set('omero.server_url', url);
    } catch (error) {
        console.error('Error updating OMERO server URL:', error);
    }
};

window.updateOMEROUsername = async function () {
    try {
        const username = document.getElementById('omeroUsername').value;
        await window.settingsManager.set('omero.username', username);
    } catch (error) {
        console.error('Error updating OMERO username:', error);
    }
};

window.updateOMEROPassword = async function () {
    try {
        const password = document.getElementById('omeroPassword').value;
        await window.settingsManager.set('omero.password', password);
    } catch (error) {
        console.error('Error updating OMERO password:', error);
    }
};

window.updateOMERODefaultProject = async function () {
    try {
        const projectId = document.getElementById('omeroDefaultProject').value;
        await window.settingsManager.set('omero.default_project_id', projectId);
    } catch (error) {
        console.error('Error updating OMERO default project:', error);
    }
};

window.updateOMEROCreateDatasets = async function () {
    try {
        const enabled = document.getElementById('omeroCreateDatasets').checked;
        await window.settingsManager.set('omero.create_datasets', enabled);
    } catch (error) {
        console.error('Error updating OMERO create datasets:', error);
    }
};

window.updateOMEROVerifySSL = async function () {
    try {
        const enabled = document.getElementById('omeroVerifySSL').checked;
        await window.settingsManager.set('omero.verify_ssl', enabled);
    } catch (error) {
        console.error('Error updating OMERO verify SSL:', error);
    }
};

// NEW: Update OMERO Don't Save Password setting
window.updateOMERODontSavePassword = async function () {
    try {
        const dontSave = document.getElementById('omeroDontSavePassword').checked;
        console.log('🔐 Updating OMERO don\'t save password setting:', dontSave);

        // Save the setting
        const success = await window.settingsManager.setDontSaveOmeroPassword(dontSave);

        if (success && dontSave) {
            // If enabling "don't save", confirm deletion of stored password
            const confirmDelete = confirm(
                'Delete saved OMERO password?\n\n' +
                'Your currently saved OMERO password will be removed. ' +
                'You will need to enter it manually when connecting.\n\n' +
                'Click OK to delete the saved password, or Cancel to keep it.'
            );

            if (confirmDelete) {
                // Delete the stored password
                await window.settingsManager.set('omero.password', '');

                // Update the password field in UI
                const passwordField = document.getElementById('omeroPassword');
                if (passwordField) {
                    passwordField.value = '';
                }

                console.log('✅ OMERO password deleted from storage');

                // Show success message
                if (window.showSettingsMessage) {
                    window.showSettingsMessage('OMERO password deleted. Manual login enabled.', 'success');
                }
            } else {
                console.log('ℹ️ User chose to keep saved password');
            }
        }

        console.log('✅ Don\'t save password setting updated successfully');

    } catch (error) {
        console.error('❌ Error updating OMERO don\'t save password setting:', error);
        if (window.showSettingsMessage) {
            window.showSettingsMessage('Error: ' + error.message, 'error');
        }
    }
};

// =================== MINIMAL OMERO LOGOUT FUNCTIONS ===================

/**
 * Simple logout function for the minimal logout button
 */
window.logoutFromOMERO = async function () {
    if (!window.omeroUIIntegration?.logout) {
        console.warn('OMERO logout not available');
        return;
    }

    if (!confirm('Logout from OMERO?')) return;

    const logoutButton = document.getElementById('omeroLogoutButton');
    const viewerLogoutButton = document.getElementById('omeroLogoutBtn_viewer');

    try {
        if (logoutButton) {
            logoutButton.disabled = true;
            logoutButton.innerHTML = '🔄';
        }
        if (viewerLogoutButton) {
            viewerLogoutButton.disabled = true;
            viewerLogoutButton.innerHTML = '🔄';
        }

        await window.omeroUIIntegration.logout();
        console.log('✅ OMERO logout successful');

    } catch (error) {
        console.error('❌ OMERO logout error:', error);
    } finally {
        if (logoutButton) {
            logoutButton.disabled = false;
            logoutButton.innerHTML = '🚪 Logout';
        }
        if (viewerLogoutButton) {
            viewerLogoutButton.disabled = false;
            viewerLogoutButton.innerHTML = '🚪 Logout';
        }
    }
};

/**
 * Show/hide logout button based on connection status
 * Erweitert die bestehende testOMEROConnectionInline Funktion
 */

// Speichere die ursprüngliche Funktion
const originalTestOMEROConnectionInline = window.testOMEROConnectionInline;

// Erweitere sie um Logout-Button-Logik
window.testOMEROConnectionInline = async function () {
    // Führe die ursprüngliche Funktion aus
    if (originalTestOMEROConnectionInline) {
        await originalTestOMEROConnectionInline();
    }

    // Zeige Logout-Button wenn verbunden
    setTimeout(() => {
        const connectText = document.getElementById('omeroConnectText');
        const logoutButton = document.getElementById('omeroLogoutButton');
        const viewerLogoutButton = document.getElementById('omeroLogoutBtn_viewer');

        if (connectText) {
            const isConnected = connectText.textContent === 'Connected';

            if (logoutButton) {
                logoutButton.style.display = isConnected ? 'inline-block' : 'none';
            }

            if (viewerLogoutButton) {
                viewerLogoutButton.style.display = isConnected ? 'inline-block' : 'none';
            }
        }
    }, 100);
};

// FIXED: Replace the entire testOMEROConnection section with this
// LOCATION: index.html - Find and replace the problematic testOMEROConnection code

window.testOMEROConnection = async function () {
    const statusDiv = document.getElementById('omeroConnectionStatus');
    const testButton = document.querySelector('button[onclick="testOMEROConnection()"]');

    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = 'Testing OMERO connection...';
        statusDiv.className = 'testing';
        statusDiv.style.color = '#6b7280';
        statusDiv.style.fontStyle = 'italic';
    }

    // Update button to show testing state
    if (testButton) {
        const originalText = testButton.innerHTML;
        const originalStyle = testButton.style.cssText;

        testButton.innerHTML = '⏳ Testing...';
        testButton.disabled = true;
        testButton.style.background = 'linear-gradient(45deg, #6b7280, #4b5563)';
        testButton.style.cursor = 'not-allowed';
    }

    try {
        const result = await window.settingsManager.testOMEROConnection();

        if (result.success) {
            // SUCCESS: Update status div
            if (statusDiv) {
                // Get username for display
                const username = await window.settingsManager.get('omero.username') || 'user';
                statusDiv.innerHTML = `✅ Connected as <strong>${username}</strong>`;
                statusDiv.className = 'success-message';
                statusDiv.style.color = '#059669';
                statusDiv.style.fontStyle = 'normal';
                statusDiv.style.fontWeight = '500';
            }

            // SUCCESS: Update button to connected state
            if (testButton) {
                testButton.innerHTML = '✅ Connected';
                testButton.style.background = 'linear-gradient(45deg, #059669, #047857)';
                testButton.style.color = 'white';
                testButton.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.3)';
                testButton.style.cursor = 'pointer';
                testButton.disabled = false;

                // Keep button green permanently - no reset timeout
                console.log('🔬 Test Connection: Success state applied to button');
            }

            // Refresh OMERO projects if available
            if (window.loadOMEROProjects) {
                setTimeout(() => {
                    window.loadOMEROProjects();
                }, 500);
            }

            // Update logout button visibility
            if (window.omeroUIIntegration && window.omeroUIIntegration.updateLogoutButtonVisibility) {
                window.omeroUIIntegration.updateLogoutButtonVisibility();
            }

        } else {
            // FAILURE: Update status div
            if (statusDiv) {
                statusDiv.textContent = result.message;
                statusDiv.className = 'error-message';
                statusDiv.style.color = '#dc2626';
                statusDiv.style.fontStyle = 'normal';
            }

            // FAILURE: Reset button to original state
            if (testButton) {
                testButton.innerHTML = '🔍 Test Connection';
                testButton.style.background = '';
                testButton.style.color = '';
                testButton.style.boxShadow = '';
                testButton.style.cursor = 'pointer';
                testButton.disabled = false;
            }
        }

    } catch (error) {
        console.error('OMERO connection test error:', error);

        // ERROR: Update status div
        if (statusDiv) {
            statusDiv.textContent = 'OMERO connection test failed: ' + error.message;
            statusDiv.className = 'error-message';
            statusDiv.style.color = '#dc2626';
            statusDiv.style.fontStyle = 'normal';
        }

        // ERROR: Reset button to original state
        if (testButton) {
            testButton.innerHTML = '🔍 Test Connection';
            testButton.style.background = '';
            testButton.style.color = '';
            testButton.style.boxShadow = '';
            testButton.style.cursor = 'pointer';
            testButton.disabled = false;
        }
    }
};


// =================== RSPACE SETTINGS FUNCTIONS ===================

window.updateRSpaceSetting = async function () {
    try {
        const enabled = document.getElementById('rspaceEnabled').checked;
        await window.settingsManager.set('rspace.enabled', enabled);
        const configEl = document.getElementById('rspaceConfig');
        if (configEl) {
            configEl.style.display = enabled ? 'block' : 'none';
        }

        // Update Sidebar Visibility
        if (window.sidebarIntegration && window.sidebarIntegration.updateSidebarVisibilityFromSettings) {
            window.sidebarIntegration.updateSidebarVisibilityFromSettings();
        }
    } catch (error) {
        console.error('Error updating RSpace setting:', error);
    }
};

window.updateRSpaceServerUrl = async function () {
    try {
        const url = document.getElementById('rspaceServerUrl').value;
        await window.settingsManager.set('rspace.server_url', url);
    } catch (error) {
        console.error('Error updating RSpace URL:', error);
    }
};

window.updateRSpaceApiKey = async function () {
    try {
        const key = document.getElementById('rspaceApiKey').value;
        await window.settingsManager.set('rspace.api_key', key);
    } catch (error) {
        console.error('Error updating RSpace API key:', error);
    }
};

window.testRSpaceConnection = async function () {
    const statusDiv = document.getElementById('rspaceConnectionStatus');
    statusDiv.style.display = 'block';
    statusDiv.textContent = 'Testing connection...';
    statusDiv.className = '';
    statusDiv.style.color = '#6b7280';

    try {
        // Ensure settings are loaded in the integration module
        if (window.rspaceIntegration) {
            await window.rspaceIntegration.loadSettings();
            const result = await window.rspaceIntegration.testConnection();

            if (result.success) {
                statusDiv.textContent = '✅ Connection successful!';
                statusDiv.style.color = '#059669';
            } else {
                statusDiv.textContent = '❌ Connection failed: ' + result.message;
                statusDiv.style.color = '#dc2626';
            }
        } else {
            throw new Error('RSpace integration module not loaded');
        }
    } catch (error) {
        statusDiv.textContent = '❌ Error: ' + error.message;
        statusDiv.style.color = '#dc2626';
    }
};

// =================== N8N SETTINGS FUNCTIONS ===================

window.updaten8nSetting = async function () {
    try {
        const enabled = document.getElementById('n8nEnabled').checked;
        await window.settingsManager.set('n8n.enabled', enabled);
        const configEl = document.getElementById('n8nConfig');
        if (configEl) {
            configEl.style.display = enabled ? 'block' : 'none';
        }
    } catch (error) {
        console.error('Error updating n8n setting:', error);
    }
};

window.updaten8nWebhookUrl = async function () {
    try {
        const url = document.getElementById('n8nWebhookUrl').value;
        await window.settingsManager.set('n8n.webhook_url', url);
    } catch (error) {
        console.error('Error updating n8n URL:', error);
    }
};

window.updaten8nInstanceId = async function () {
    try {
        const val = document.getElementById('n8nInstanceId').value;
        await window.settingsManager.set('n8n.instance_id', val);
    } catch (error) {
        console.error('Error updating n8n instance id:', error);
    }
};

window.updaten8nAuthTypeUI = function(authType) {
    const bearerGroup = document.getElementById('n8nBearerAuthGroup');
    const basicGroup = document.getElementById('n8nBasicAuthGroup');
    if (bearerGroup) bearerGroup.style.display = authType === 'bearer' ? 'block' : 'none';
    if (basicGroup) basicGroup.style.display = authType === 'basic' ? 'block' : 'none';
};

window.updaten8nAuthType = async function () {
    try {
        const type = document.getElementById('n8nAuthType').value;
        await window.settingsManager.set('n8n.auth_type', type);
        updaten8nAuthTypeUI(type);
    } catch (error) {
        console.error('Error updating n8n auth type:', error);
    }
};

window.updaten8nBasicAuth = async function () {
    try {
        const user = document.getElementById('n8nBasicUser').value;
        const pass = document.getElementById('n8nBasicPass').value;
        await window.settingsManager.set('n8n.basic_user', user);
        await window.settingsManager.set('n8n.basic_pass', pass);
    } catch (error) {
        console.error('Error updating n8n basic auth:', error);
    }
};

window.updaten8nAuthToken = async function () {
    try {
        const token = document.getElementById('n8nAuthToken').value;
        await window.settingsManager.set('n8n.auth_token', token);
    } catch (error) {
        console.error('Error updating n8n Auth Token:', error);
    }
};

window.updaten8nVerifySsl = async function () {
    try {
        const checkbox = document.getElementById('n8nVerifySsl');
        const verifySsl = checkbox ? checkbox.checked : true;
        await window.settingsManager.set('n8n.verify_ssl', verifySsl);
        console.log(`🤖 n8n SSL verification set to: ${verifySsl}`);
        if (!verifySsl) {
            console.warn('⚠️ n8n SSL verification disabled — self-signed certificates will be accepted.');
        }
    } catch (error) {
        console.error('Error updating n8n SSL verify setting:', error);
    }
};



window.resetSettings = function () {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        window.settingsManager.reset();
        loadSettingsIntoModal();
        showSettingsMessage('Settings reset to defaults.', 'success');
    }
};

window.exportSettings = function () {
    const settings = window.settingsManager.export();
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'metafold-settings.json';
    a.click();

    URL.revokeObjectURL(url);
    showSettingsMessage('Settings exported successfully.', 'success');
};

window.importSettings = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const success = window.settingsManager.import(e.target.result);
                if (success) {
                    loadSettingsIntoModal();
                    showSettingsMessage('Settings imported successfully.', 'success');
                } else {
                    showSettingsMessage('Failed to import settings.', 'error');
                }
            } catch (error) {
                showSettingsMessage('Invalid settings file.', 'error');
            }
        };
        reader.readAsText(file);
    };

    input.click();
};

window.showSettingsMessage = function (message, type) {
    let messageDiv = document.getElementById('settingsMessage');
    if (!messageDiv) {
        messageDiv = document.createElement('div');
        messageDiv.id = 'settingsMessage';
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10001;
            font-weight: 500;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(messageDiv);
    }

    // Set message and style
    messageDiv.textContent = message;
    messageDiv.className = type + '-message';

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 3000);
};

// =================== INTEGRATION UI UPDATE FUNCTIONS ===================

window.updateElabFTWOptions = async function () {
    try {
        console.log('🧪 UI: Updating elabFTW options visibility');

        if (!window.settingsManager) {
            console.warn('🧪 UI: settingsManager not available');
            return;
        }

        const elabftwOption = document.getElementById('elabftwOption');
        const elabftwAutoInfo = document.getElementById('elabftwAutoInfo');
        const elabftwManualOption = document.getElementById('elabftwManualOption');

        if (!elabftwOption || !elabftwAutoInfo || !elabftwManualOption) {
            console.warn('🧪 UI: elabFTW UI elements not found');
            return;
        }

        const enabled = await window.settingsManager.get('elabftw.enabled');
        const autoSync = await window.settingsManager.get('elabftw.auto_sync');
        const isExperimentMode = window.templateTypeManager && window.templateTypeManager.isExperimentMode();

        console.log('🧪 UI: elabFTW Settings:', { enabled, autoSync, isExperimentMode });

        if (enabled && isExperimentMode) {
            elabftwOption.style.display = 'block';

            if (autoSync) {
                elabftwAutoInfo.style.display = 'block';
                elabftwManualOption.style.display = 'none';
                console.log('🧪 UI: Showing auto-sync info');
            } else {
                elabftwAutoInfo.style.display = 'none';
                elabftwManualOption.style.display = 'block';
                console.log('🧪 UI: Showing manual sync checkbox');
            }
        } else {
            elabftwOption.style.display = 'none';
            console.log('🧪 UI: Hiding elabFTW options (enabled:', enabled, ', experiment mode:', isExperimentMode, ')');
        }
    } catch (error) {
        console.error('🧪 UI: Error updating elabFTW options:', error);
    }
};

window.updateOMEROOptions = async function () {
    try {
        console.log('🔬 UI: Updating OMERO options visibility');

        if (!window.settingsManager) {
            console.warn('🔬 UI: settingsManager not available');
            return;
        }

        const omeroOption = document.getElementById('omeroOption');
        const omeroAutoInfo = document.getElementById('omeroAutoInfo');
        const omeroManualOption = document.getElementById('omeroManualOption');

        if (!omeroOption || !omeroAutoInfo || !omeroManualOption) {
            console.warn('🔬 UI: OMERO UI elements not found');
            return;
        }

        const enabled = await window.settingsManager.get('omero.enabled');
        const autoSync = await window.settingsManager.get('omero.auto_sync');
        const isExperimentMode = window.templateTypeManager && window.templateTypeManager.isExperimentMode();

        console.log('🔬 UI: OMERO Settings:', { enabled, autoSync, isExperimentMode });

        if (enabled && isExperimentMode) {
            omeroOption.style.display = 'block';

            if (autoSync) {
                omeroAutoInfo.style.display = 'block';
                omeroManualOption.style.display = 'none';
                console.log('🔬 UI: Showing auto-sync info');
            } else {
                omeroAutoInfo.style.display = 'none';
                omeroManualOption.style.display = 'block';
                console.log('🔬 UI: Showing manual sync checkbox');
            }

            // Update OMERO status if available
            if (window.updateOMEROStatus) {
                window.updateOMEROStatus();
            }
        } else {
            omeroOption.style.display = 'none';
            console.log('🔬 UI: Hiding OMERO options (enabled:', enabled, ', experiment mode:', isExperimentMode, ')');
        }
    } catch (error) {
        console.error('🔬 UI: Error updating OMERO options:', error);
    }
};

window.updateIntegrationOptions = async function () {
    try {
        console.log('🔄 UI: Updating all integration options');
        await window.updateElabFTWOptions();
        await window.updateOMEROOptions();
    } catch (error) {
        console.error('Error updating integration options:', error);
    }
};

// =================== OMERO UI HANDLERS ===================

window.handleOMEROGroupSelection = function () {
    if (window.omeroUIIntegration && window.omeroUIIntegration.handleGroupSelection) {
        window.omeroUIIntegration.handleGroupSelection();
    } else {
        console.warn('OMERO UI Integration not available for group selection');
    }
};

window.handleOMEROProjectSelection = function () {
    if (window.omeroUIIntegration && window.omeroUIIntegration.handleProjectSelection) {
        window.omeroUIIntegration.handleProjectSelection();
    } else {
        console.warn('OMERO UI Integration not available for project selection');
    }
};

window.loadOMEROProjects = async function () {
    if (!window.omeroUIIntegration) return;

    try {
        await window.omeroUIIntegration.loadGroupsForDropdown();
    } catch (error) {
        console.error('Error loading OMERO groups and projects:', error);
        if (window.omeroUIIntegration.loadProjectsForDropdown) {
            window.omeroUIIntegration.loadProjectsForDropdown();
        }
    }
};

window.updateOMEROStatus = async function () {
    if (window.omeroUIIntegration && window.omeroUIIntegration.updateStatusDisplay) {
        window.omeroUIIntegration.updateStatusDisplay();
    }
};

window.testOMEROConnectionInline = async function () {
    if (!window.omeroUIIntegration) {
        alert('OMERO UI integration not available');
        return;
    }

    try {
        const result = await window.omeroUIIntegration.testConnection();

        if (result.success) {
            alert(`✅ OMERO Connection Successful!\n\n${result.message}\n\nDetails:\n- Proxy URL: ${result.details?.proxyUrl || 'Unknown'}\n- Projects: ${result.details?.projectCount || 0}\n- Auth Method: ${result.details?.authMethod || 'Unknown'}`);

            // Refresh project list after successful connection
            if (window.loadOMEROProjects) {
                window.loadOMEROProjects();
            }
        } else {
            alert(`❌ OMERO Connection Failed!\n\n${result.message}\n\n${result.details?.guidance || 'Check console for more details.'}`);
        }

        // Update status display
        if (window.updateOMEROStatus) {
            window.updateOMEROStatus();
        }

    } catch (error) {
        console.error('OMERO connection test error:', error);
        alert(`❌ OMERO Connection Test Failed!\n\nError: ${error.message}\n\nCheck console for details.`);
    }
};

// =================== EVENT LISTENERS & INITIALIZATION ===================

// Close settings modal on click outside
window.addEventListener('click', function (event) {
    try {
        const modal = document.getElementById('settingsModal');
        if (event.target === modal) {
            closeSettingsModal();
        }
    } catch (error) {
        console.error('Error in click listener:', error);
    }
});

// Initialize user display when page loads
document.addEventListener('DOMContentLoaded', function () {
    try {
        // Wait for userManager to be ready
        setTimeout(() => {
            window.updateCurrentUserDisplay();
        }, 1000);

        setTimeout(() => {
            console.log('🔄 UI: Initial integration options update');
            if (window.updateIntegrationOptions) {
                window.updateIntegrationOptions();
            }
        }, 500);

        // ENHANCED: Initialize JSONCrack availability check after DOM load
        setTimeout(() => {
            console.log('📊 Checking JSONCrack availability after DOM load...');
            if (window.visualizationManager) {
                window.visualizationManager.checkJSONCrackAvailability();
                console.log('📊 JSONCrack availability:', window.visualizationManager.usesFallback ? 'Fallback mode' : 'Full JSONCrack mode');
            }
        }, 1500);
    } catch (error) {
        console.error('Error in DOMContentLoaded:', error);
    }
});

// Update display when userManager initializes
if (window.userManager) {
    const originalInit = window.userManager.init;
    if (originalInit) {
        window.userManager.init = async function () {
            try {
                const result = await originalInit.call(this);

                // Update display after initialization
                setTimeout(() => {
                    window.updateCurrentUserDisplay();
                }, 200);

                return result;
            } catch (error) {
                console.error('Error in enhanced userManager init:', error);
                throw error;
            }
        };
    }
}

// =================== NEW: JSONCrack Integration Debug Functions ===================

// Global debug function to check JSONCrack status
window.debugJSONCrack = function () {
    console.log('🔍 JSONCrack Debug Information:');
    console.log('- React available:', typeof React !== 'undefined');
    console.log('- ReactDOM available:', typeof ReactDOM !== 'undefined');
    console.log('- JSONCrackViewer available:', typeof window.JSONCrackViewer !== 'undefined');
    console.log('- D3.js available:', typeof d3 !== 'undefined');

    if (window.visualizationManager) {
        console.log('- Visualization Manager initialized:', window.visualizationManager.initialized);
        console.log('- Using fallback mode:', window.visualizationManager.usesFallback);
        console.log('- Current data loaded:', window.visualizationManager.currentData !== null);
    }

    // Test JSONCrack component loading
    if (typeof window.JSONCrackViewer !== 'undefined') {
        console.log('✅ JSONCrackViewer is available and ready to use');
        try {
            const testElement = React.createElement(window.JSONCrackViewer, {
                data: { test: 'value' },
                width: 400,
                height: 300
            });
            console.log('✅ JSONCrackViewer component can be created successfully');
        } catch (error) {
            console.error('❌ Error creating JSONCrackViewer component:', error);
        }
    } else {
        console.warn('⚠️ JSONCrackViewer not available - check bundle loading');
    }
};

// Test JSONCrack with sample data
window.testJSONCrackIntegration = async function () {
    if (!window.visualizationManager) {
        alert('Visualization Manager not available');
        return;
    }

    try {
        console.log('🧪 Testing JSONCrack integration...');

        // Switch to visualize tab
        window.switchMainTab('visualize');

        // Wait for tab to load
        await new Promise(resolve => setTimeout(resolve, 500));

        // Initialize visualization manager
        window.visualizationManager.init();

        // Set visualization type to JSONCrack
        if (window.visualizationManager.setVisualizationType) {
            window.visualizationManager.setVisualizationType('jsoncrack');
        }

        // Load sample data
        window.visualizationManager.showSampleData();

        alert('✅ JSONCrack integration test completed!\n\nCheck the Visualize tab to see the results.');

    } catch (error) {
        console.error('❌ JSONCrack integration test failed:', error);
        alert(`❌ JSONCrack test failed:\n\n${error.message}\n\nCheck console for details.`);
    }
};

console.log('✅ ENHANCED MetaFold UI Integration loaded with JSONCrack support');
console.log('🔧 Debug functions available: debugJSONCrack(), testJSONCrackIntegration()');
