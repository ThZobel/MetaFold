// Enhanced Actions with More Menu and Template File Management

// =================== IMMEDIATE FUNCTIONS (PREVENT UNDEFINED ERRORS) ===================

// Immediate fallback functions to prevent "undefined" errors during page load
window.toggleMoreMenu = function() {
    console.log('🔧 toggleMoreMenu called (immediate version)');
    
    if (typeof enhancedActions !== 'undefined' && enhancedActions.toggleMoreMenu) {
        enhancedActions.toggleMoreMenu();
    } else {
        // Basic fallback
        console.warn('⚠️ enhancedActions not ready, checking DOM elements...');
        
        const panel = document.getElementById('slideOutPanel');
        const overlay = document.getElementById('slideOutOverlay');
        
        if (panel && overlay) {
            const isOpen = panel.classList.contains('open');
            if (isOpen) {
                panel.classList.remove('open');
                overlay.classList.remove('open');
            } else {
                panel.classList.add('open');
                overlay.classList.add('open');
            }
        } else {
            console.log('🔍 Panel elements status:', {
                panel: !!panel,
                overlay: !!overlay,
                trigger: !!document.getElementById('moreMenuTrigger')
            });
        }
    }
};

window.closeMoreMenu = function() {
    console.log('🔧 closeMoreMenu called (immediate version)');
    
    if (typeof enhancedActions !== 'undefined' && enhancedActions.closeMoreMenu) {
        enhancedActions.closeMoreMenu();
    } else {
        // Basic fallback
        const panel = document.getElementById('slideOutPanel');
        const overlay = document.getElementById('slideOutOverlay');
        
        if (panel && overlay) {
            panel.classList.remove('open');
            overlay.classList.remove('open');
        }
    }
};

// Other immediate functions for completeness
window.duplicateCurrentTemplate = function() {
    console.log('🔧 duplicateCurrentTemplate called');
    if (typeof enhancedActions !== 'undefined' && enhancedActions.duplicateCurrentTemplate) {
        return enhancedActions.duplicateCurrentTemplate();
    } else {
        console.warn('⚠️ Duplicate function not ready yet');
    }
};

window.exportCurrentTemplate = function() {
    console.log('🔧 exportCurrentTemplate called');
    if (typeof enhancedActions !== 'undefined' && enhancedActions.exportCurrentTemplate) {
        return enhancedActions.exportCurrentTemplate();
    } else {
        console.warn('⚠️ Export function not ready yet');
    }
};

window.deleteCurrentTemplate = function() {
    console.log('🔧 deleteCurrentTemplate called');
    if (typeof enhancedActions !== 'undefined' && enhancedActions.deleteCurrentTemplate) {
        return enhancedActions.deleteCurrentTemplate();
    } else {
        console.warn('⚠️ Delete function not ready yet');
    }
};

console.log('✅ Immediate enhanced actions functions loaded');

// =================== ENHANCED ACTIONS OBJECT ===================

// Enhanced Actions Object - Combines all functionality
const enhancedActions = {
    // Panel state
    isOpen: false,
    currentTemplate: null,
    
    // Initialize enhanced actions
    init() {
        console.log('🔧 Initializing Enhanced Actions with Import/Export...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update panel content initially
        this.updatePanelContent();
        
        console.log('✅ Enhanced Actions initialized with Import/Export support');
    },
    
    // Setup event listeners
    setupEventListeners() {
        // Close panel when clicking outside (on overlay)
        const overlay = document.getElementById('slideOutOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeMoreMenu());
        }
        
        // Escape key to close panel
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMoreMenu();
            }
        });
    },
    
    // Toggle more menu panel
    toggleMoreMenu() {
        if (this.isOpen) {
            this.closeMoreMenu();
        } else {
            this.openMoreMenu();
        }
    },
    
    // Open more menu panel
    openMoreMenu() {
        console.log('📱 Opening More Menu...');
        
        // Update panel content with current template
        this.updatePanelContent();
        
        const panel = document.getElementById('slideOutPanel');
        const overlay = document.getElementById('slideOutOverlay');
        
        if (panel && overlay) {
            panel.classList.add('open');
            overlay.classList.add('open');
            this.isOpen = true;
            
            // Auto-refresh storage info when panel opens
            if (window.showStorageInfo) {
                setTimeout(() => window.showStorageInfo(), 100);
            }
        }
    },
    
    // Close more menu panel
    closeMoreMenu() {
        console.log('📱 Closing More Menu...');
        
        const panel = document.getElementById('slideOutPanel');
        const overlay = document.getElementById('slideOutOverlay');
        
        if (panel && overlay) {
            panel.classList.remove('open');
            overlay.classList.remove('open');
            this.isOpen = false;
        }
    },
    
    // Update panel content based on current state
    updatePanelContent() {
        const currentTemplate = window.templateManager?.currentTemplate;
        this.currentTemplate = currentTemplate;
        
        // Update template-specific actions
        this.updateTemplateActions();
        
        // Update template display in panel
        this.updateCurrentTemplateDisplay();
    },
    
    // Update current template display in panel
    updateCurrentTemplateDisplay() {
        const templateDisplayEl = document.getElementById('currentTemplateDisplay');
        if (!templateDisplayEl) return;
        
        if (this.currentTemplate) {
            templateDisplayEl.innerHTML = `
                <div class="current-template-info">
                    <div class="template-name">${this.escapeHtml(this.currentTemplate.name)}</div>
                    <div class="template-meta">
                        ${this.currentTemplate.type === 'experiment' ? '🧪 Experiment' : '📁 Folder'} • 
                        ${this.currentTemplate.createdBy || 'Unknown'}
                    </div>
                </div>
            `;
        } else {
            templateDisplayEl.innerHTML = `
                <div class="no-template-selected">
                    <div style="color: #6b7280; font-style: italic;">No template selected</div>
                </div>
            `;
        }
    },
    
    // Update template-specific action availability
    updateTemplateActions() {
        const duplicateAction = document.getElementById('duplicateAction');
        const exportAction = document.getElementById('exportAction');
        const deleteAction = document.getElementById('deleteAction');
        const importAction = document.getElementById('importAction');
        
        if (!duplicateAction || !exportAction || !deleteAction) {
            console.warn('⚠️ Some action elements not found in DOM');
            return;
        }
        
        const hasTemplate = !!this.currentTemplate;
        const canEdit = hasTemplate && this.currentTemplate.isOwn !== false; // Can edit own templates
        
        // Duplicate action - available for all templates
        if (hasTemplate) {
            duplicateAction.classList.remove('disabled');
            duplicateAction.style.opacity = '1';
        } else {
            duplicateAction.classList.add('disabled');
            duplicateAction.style.opacity = '0.4';
        }
        
        // Export action - available for all templates
        if (hasTemplate) {
            exportAction.classList.remove('disabled');
            exportAction.style.opacity = '1';
        } else {
            exportAction.classList.add('disabled');
            exportAction.style.opacity = '0.4';
        }
        
        // Delete action - only for own templates
        if (canEdit) {
            deleteAction.classList.remove('disabled');
            deleteAction.style.opacity = '1';
        } else {
            deleteAction.classList.add('disabled');
            deleteAction.style.opacity = '0.4';
        }
        
        // Import action - always available
        if (importAction) {
            importAction.classList.remove('disabled');
            importAction.style.opacity = '1';
        }
    },
    
    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    // Show action feedback
    showActionFeedback(actionEl, type, message) {
        if (!actionEl) return;
        
        // Remove existing feedback classes
        actionEl.classList.remove('success', 'error', 'warning');
        
        // Add new feedback class
        actionEl.classList.add(type);
        
        // Create or update feedback message
        let feedbackEl = actionEl.querySelector('.action-feedback');
        if (!feedbackEl) {
            feedbackEl = document.createElement('div');
            feedbackEl.className = 'action-feedback';
            actionEl.appendChild(feedbackEl);
        }
        
        feedbackEl.textContent = message;
        
        // Remove feedback after 3 seconds
        setTimeout(() => {
            actionEl.classList.remove(type);
            if (feedbackEl.parentNode) {
                feedbackEl.parentNode.removeChild(feedbackEl);
            }
        }, 3000);
    },
    
    // Set action loading state
    setActionLoading(actionEl, isLoading) {
        if (!actionEl) return;
        
        if (isLoading) {
            actionEl.classList.add('loading');
            actionEl.disabled = true;
            
            // Add loading indicator
            let loadingEl = actionEl.querySelector('.loading-indicator');
            if (!loadingEl) {
                loadingEl = document.createElement('span');
                loadingEl.className = 'loading-indicator';
                loadingEl.textContent = '...';
                actionEl.appendChild(loadingEl);
            }
        } else {
            actionEl.classList.remove('loading');
            actionEl.disabled = false;
            
            // Remove loading indicator
            const loadingEl = actionEl.querySelector('.loading-indicator');
            if (loadingEl && loadingEl.parentNode) {
                loadingEl.parentNode.removeChild(loadingEl);
            }
        }
    },
    
    // Show progress indicator
    showProgress(message, percentage) {
        const progressDiv = document.getElementById('panelProgress');
        const progressMessage = document.getElementById('progressMessage');
        const progressFill = document.getElementById('progressFill');
        
        if (progressDiv) {
            progressDiv.style.display = 'block';
            if (progressMessage) progressMessage.textContent = message;
            if (progressFill) progressFill.style.width = `${percentage}%`;
        }
    },
    
    // Hide progress indicator
    hideProgress() {
        const progressDiv = document.getElementById('panelProgress');
        if (progressDiv) {
            progressDiv.style.display = 'none';
        }
    }
};

// =================== TEMPLATE FILE MANAGEMENT FUNCTIONS ===================

// NEW: Manual refresh button for templates
window.refreshTemplatesFromFiles = async function() {
    if (!window.templateManager) {
        console.warn('Template manager not available');
        return;
    }
    
    console.log('🔄 Manual refresh triggered...');
    
    try {
        await window.templateManager.refresh();
    } catch (error) {
        console.error('❌ Manual refresh failed:', error);
        alert('Failed to refresh templates: ' + error.message);
    }
};

// NEW: Show current template directory
window.showTemplateDirectory = function() {
    if (!window.storage || !window.storage.getFullUserStoragePath) {
        alert('Storage information not available');
        return;
    }
    
    const path = window.storage.getFullUserStoragePath();
    const userInfo = window.storage.getCurrentUserContext();
    
    const message = `📁 Your templates are stored in:\n\n${path}\n\nUser: ${userInfo.username}\nGroup: ${userInfo.groupname}\n\n✨ You can copy .json template files directly into this folder and they will be automatically loaded!`;
    
    if (confirm(message + '\n\nOpen folder now?')) {
        if (window.electronAPI && window.electronAPI.openFolder) {
            window.electronAPI.openFolder(path);
        }
    }
};

// ENHANCED: Storage info with detailed breakdown
window.showStorageInfo = async function() {
    const storageInfoEl = document.getElementById('panelStorageInfo');
    const storageActionEl = document.getElementById('storageAction');
    
    if (!storageInfoEl) {
        console.error('❌ Storage info panel not found in DOM');
        
        // Fallback to alert if panel not found
        try {
            const stats = window.storage?.getStorageStats();
            if (stats) {
                alert(`Storage Information:
                
Mode: ${stats.mode || 'Unknown'}
File Storage: ${stats.fileStorageEnabled ? 'Enabled' : 'Disabled'}
Migration: ${stats.migrationCompleted ? 'Completed' : 'Pending'}

Templates:
- Total: ${stats.templates?.total || 0}
- In Files: ${stats.templates?.files || 0}
- In Browser: ${stats.templates?.localStorage || 0}
- System: ${stats.templates?.default || 0}`);
            } else {
                alert('Storage information not available');
            }
        } catch (error) {
            console.error('Error showing storage info:', error);
            alert('Error loading storage information');
        }
        return;
    }
    
    // Toggle visibility
    const isVisible = storageInfoEl.style.display !== 'none';
    storageInfoEl.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        // Refresh storage info
        try {
            const stats = window.storage?.getStorageStats();
            const health = window.storage?.healthCheck ? await window.storage.healthCheck() : {};
            
            console.log('📊 Storage stats:', stats);
            console.log('🏥 Storage health:', health);
            
            // Update UI elements safely with null checks
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                } else {
                    console.warn(`⚠️ Element not found: ${id}`);
                }
            };
            
            // Get user-specific information safely
            let userInfo = { username: 'Unknown', groupname: 'Unknown' };
            let userPath = 'General folder';
            try {
                if (window.storage.getCurrentUserContext) {
                    userInfo = window.storage.getCurrentUserContext();
                }
                if (window.storage.getUserStoragePath) {
                    userPath = window.storage.getUserStoragePath();
                }
            } catch (error) {
                console.warn('Could not get user context:', error);
            }
            
            const isUserManagement = window.storage.isUserManagementActive ? 
                window.storage.isUserManagementActive() : false;
            
            // Update all storage info fields
            updateElement('storageModeValue', stats?.mode || 'Unknown');
            updateElement('fileStorageValue', stats?.fileStorageEnabled ? 'Enabled' : 'Disabled');
            updateElement('migrationValue', stats?.migrationCompleted ? 'Completed' : 'Pending');
            updateElement('totalTemplatesValue', stats?.templates?.total || 0);
            updateElement('fileTemplatesValue', stats?.templates?.files || 0);
            updateElement('localTemplatesValue', stats?.templates?.localStorage || 0);
            updateElement('defaultTemplatesValue', stats?.templates?.default || 0);
            updateElement('currentUserValue', userInfo.username);
            updateElement('currentGroupValue', userInfo.groupname);
            updateElement('userManagementValue', isUserManagement ? 'Active' : 'Inactive');
            updateElement('storagePathValue', userPath);
            
        } catch (error) {
            console.error('❌ Error updating storage info:', error);
        }
    }
    
    // Update storage action button based on current state
    if (storageActionEl) {
        const needsMigration = window.storage?.shouldShowMigrationNotice?.() || false;
        if (needsMigration) {
            storageActionEl.textContent = '📁 Migrate to Files';
            storageActionEl.onclick = window.migrateToFileStorage;
        } else {
            storageActionEl.textContent = '🔄 Refresh Templates';
            storageActionEl.onclick = window.refreshTemplatesFromFiles;
        }
    }
};

// Import templates from file - ENHANCED VERSION
window.importTemplatesFromFile = async function() {
    const actionEl = document.getElementById('importAction');
    
    enhancedActions.setActionLoading(actionEl, true);
    enhancedActions.showProgress('Opening file dialog...', 10);
    
    try {
        console.log('📥 Starting enhanced template import...');
        
        // Check if Electron API is available
        if (!window.electronAPI || !window.electronAPI.importTemplatesFromFile) {
            throw new Error('Import functionality not available (requires Electron)');
        }
        
        enhancedActions.showProgress('Loading template file...', 30);
        
        // Use Electron API to import templates
        const result = await window.electronAPI.importTemplatesFromFile();
        
        if (result.success && result.templates && result.templates.length > 0) {
            enhancedActions.showProgress('Processing imported templates...', 60);
            
            let importedCount = 0;
            let skippedCount = 0;
            let updatedCount = 0;
            
            // Process each imported template
            for (const template of result.templates) {
                // Check if template already exists (by name and creator)
                const exists = window.templateManager.templates.some(t => 
                    t.name === template.name && 
                    t.createdBy === template.createdBy
                );
                
                if (exists) {
                    // Ask user for conflict resolution
                    const shouldUpdate = confirm(
                        `Template "${template.name}" already exists. Replace it?`
                    );
                    
                    if (shouldUpdate) {
                        // Update existing template
                        const existingIndex = window.templateManager.templates.findIndex(t => 
                            t.name === template.name && 
                            t.createdBy === template.createdBy
                        );
                        
                        if (existingIndex >= 0) {
                            window.templateManager.templates[existingIndex] = {
                                ...template,
                                updatedAt: new Date().toISOString()
                            };
                            updatedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                } else {
                    // Add new template
                    const newTemplate = {
                        ...template,
                        id: window.templateManager.generateTemplateId?.() || `template_${Date.now()}`,
                        createdAt: template.createdAt || new Date().toISOString()
                    };
                    
                    window.templateManager.templates.push(newTemplate);
                    importedCount++;
                }
            }
            
            enhancedActions.showProgress('Saving imported templates...', 90);
            
            // Save to storage
            if (window.storage) {
                await window.storage.saveTemplates(window.templateManager.templates);
            }
            
            // Refresh UI
            if (window.templateManager) {
                window.templateManager.invalidateCache();
                window.templateManager.buildSearchIndex();
                window.templateManager.renderList();
                window.templateManager.updateTemplateInfo();
            }
            
            enhancedActions.showProgress('Import completed!', 100);
            
            // Show success feedback
            const successMessage = `✅ Import completed!\n\nNew: ${importedCount}\nUpdated: ${updatedCount}\nSkipped: ${skippedCount}`;
            enhancedActions.showActionFeedback(actionEl, 'success', 
                `Imported ${importedCount + updatedCount} templates`);
            
            setTimeout(() => {
                alert(successMessage);
                enhancedActions.hideProgress();
            }, 500);
            
            console.log(`✅ Template import completed: ${importedCount} new, ${updatedCount} updated, ${skippedCount} skipped`);
            
        } else if (result.cancelled) {
            enhancedActions.showActionFeedback(actionEl, 'info', 'Import cancelled');
            enhancedActions.hideProgress();
        } else {
            throw new Error(result.message || 'No templates found in file');
        }
        
    } catch (error) {
        console.error('❌ Template import failed:', error);
        
        let errorMessage = 'Import failed: ' + error.message;
        
        // Provide more specific error messages
        if (error.message.includes('Invalid file format') || error.message.includes('JSON')) {
            errorMessage = 'Import failed: Invalid file format. Please select a valid template JSON file.';
        } else if (error.message.includes('project metadata')) {
            errorMessage = 'Import failed: This appears to be project metadata, not a template file. Please select a template export file.';
        } else if (error.message.includes('Import cancelled')) {
            errorMessage = 'Import cancelled by user.';
            enhancedActions.showActionFeedback(actionEl, 'info', errorMessage);
            enhancedActions.hideProgress();
            enhancedActions.setActionLoading(actionEl, false);
            return;
        }
        
        enhancedActions.showActionFeedback(actionEl, 'error', errorMessage);
        enhancedActions.hideProgress();
        
        if (window.app && window.app.showError) {
            window.app.showError(errorMessage);
        }
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Duplicate current template
window.duplicateCurrentTemplate = async function() {
    const actionEl = document.getElementById('duplicateAction');
    const template = window.templateManager?.currentTemplate;
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'warning', 'No template selected');
        return;
    }
    
    enhancedActions.setActionLoading(actionEl, true);
    
    try {
        console.log('📋 Duplicating template:', template.name);
        
        // Create duplicated template
        const duplicatedTemplate = {
            ...template,
            id: window.templateManager.generateTemplateId?.() || `template_${Date.now()}`,
            name: `${template.name} (Copy)`,
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Remove source-specific info
        delete duplicatedTemplate._fileInfo;
        delete duplicatedTemplate.isOwn;
        delete duplicatedTemplate.savedLocally;
        
        // Add to templates
        window.templateManager.templates.push(duplicatedTemplate);
        
        // Save to storage
        if (window.storage) {
            await window.storage.saveTemplates(window.templateManager.templates);
        }
        
        // Refresh UI
        if (window.templateManager) {
            window.templateManager.invalidateCache();
            window.templateManager.buildSearchIndex();
            window.templateManager.renderList();
        }
        
        enhancedActions.showActionFeedback(actionEl, 'success', 'Template duplicated successfully!');
        
        console.log('✅ Template duplicated:', duplicatedTemplate.name);
        
    } catch (error) {
        console.error('❌ Error duplicating template:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to duplicate template');
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Export current template
window.exportCurrentTemplate = async function() {
    const actionEl = document.getElementById('exportAction');
    const template = window.templateManager?.currentTemplate;
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'warning', 'No template selected');
        return;
    }
    
    enhancedActions.setActionLoading(actionEl, true);
    
    try {
        console.log('📤 Exporting template:', template.name);
        
        // Clean template for export
        const cleanTemplate = { ...template };
        delete cleanTemplate._fileInfo;
        delete cleanTemplate.isOwn;
        delete cleanTemplate.savedLocally;
        delete cleanTemplate.storageDisplay;
        delete cleanTemplate.storageIcon;
        delete cleanTemplate.userColor;
        delete cleanTemplate.userInitials;
        
        // Use Electron API if available
        if (window.electronAPI && window.electronAPI.exportTemplatesToLocation) {
            const result = await window.electronAPI.exportTemplatesToLocation([cleanTemplate], 'single');
            
            if (result.success) {
                enhancedActions.showActionFeedback(actionEl, 'success', 'Template exported successfully!');
                console.log('✅ Template exported to:', result.filePath);
            } else {
                throw new Error(result.message || 'Export failed');
            }
        } else {
            // Fallback: Download in browser
            const dataStr = JSON.stringify(cleanTemplate, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.json`;
            link.click();
            
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template downloaded!');
            console.log('✅ Template downloaded:', template.name);
        }
        
    } catch (error) {
        console.error('❌ Error exporting template:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to export template');
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Delete current template
window.deleteCurrentTemplate = async function() {
    const actionEl = document.getElementById('deleteAction');
    const template = window.templateManager?.currentTemplate;
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'warning', 'No template selected');
        return;
    }
    
    // Prevent deletion of system templates
    if (template.createdBy === 'System' || template.storageType === 'default') {
        enhancedActions.showActionFeedback(actionEl, 'error', 'Cannot delete system templates');
        return;
    }
    
    // Confirm deletion
    const confirmMessage = `⚠️ Delete Template?\n\n` +
        `Name: ${template.name}\n` +
        `Type: ${template.type === 'experiment' ? 'Experiment' : 'Folder'}\n` +
        `Created: ${template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown'}\n` +
        `Storage: ${template._fileInfo ? 'File' : 'LocalStorage'}\n\n` +
        `This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    enhancedActions.setActionLoading(actionEl, true);
    
    try {
        console.log('🗑️ Deleting template:', template.name);
        
        // Use template manager's delete function
        await window.templateManager.deleteCurrent();
        
        enhancedActions.showActionFeedback(actionEl, 'success', 'Template deleted successfully!');
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
        }, 1500);
        
        console.log('✅ Template deleted successfully');
        
    } catch (error) {
        console.error('❌ Error deleting template:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to delete template');
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// =================== TEMPLATE BACKUP & STATISTICS ===================

// NEW: Create a backup of all templates
window.createTemplateBackup = async function() {
    try {
        console.log('💾 Creating template backup...');
        
        if (!window.templateManager || !window.templateManager.templates) {
            alert('No templates available to backup');
            return;
        }
        
        const templates = window.templateManager.templates;
        const userInfo = window.storage.getCurrentUserContext();
        
        // Create backup data
        const backupData = {
            metadata: {
                createdAt: new Date().toISOString(),
                user: userInfo.username,
                group: userInfo.groupname,
                version: '1.0',
                templateCount: templates.length
            },
            templates: templates.map(template => {
                if (window.utils && window.utils.cleanTemplateForStorage) {
                    return window.utils.cleanTemplateForStorage(template);
                }
                return template;
            })
        };
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const filename = `metafold_backup_${userInfo.username}_${timestamp}.json`;
        
        // Use Electron API if available
        if (window.electronAPI && window.electronAPI.saveJsonFile) {
            const result = await window.electronAPI.saveJsonFile(backupData);
            
            if (result.success) {
                alert(`✅ Backup created successfully!\n\nFile: ${result.filePath}\nTemplates: ${templates.length}`);
            } else {
                alert(`❌ Backup failed: ${result.message}`);
            }
        } else {
            // Fallback: Download in browser
            const dataStr = JSON.stringify(backupData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = filename;
            link.click();
            
            alert(`✅ Backup downloaded!\n\nFile: ${filename}\nTemplates: ${templates.length}`);
        }
        
        console.log(`✅ Template backup created with ${templates.length} templates`);
        
    } catch (error) {
        console.error('❌ Backup creation failed:', error);
        alert('Backup creation failed: ' + error.message);
    }
};

// NEW: Show template statistics
window.showTemplateStatistics = function() {
    if (!window.templateManager || !window.templateManager.templates) {
        alert('No templates available for statistics');
        return;
    }
    
    const templates = window.templateManager.templates;
    const userInfo = window.storage.getCurrentUserContext();
    
    // Calculate statistics
    const stats = {
        total: templates.length,
        folders: templates.filter(t => t.type !== 'experiment').length,
        experiments: templates.filter(t => t.type === 'experiment').length,
        ownTemplates: templates.filter(t => t.createdBy === userInfo.username).length,
        sharedTemplates: templates.filter(t => t.createdBy !== userInfo.username && t.createdBy !== 'System').length,
        systemTemplates: templates.filter(t => t.createdBy === 'System').length,
        withFiles: templates.filter(t => t._fileInfo && t._fileInfo.filePath).length,
        withoutFiles: templates.filter(t => !t._fileInfo || !t._fileInfo.filePath).length
    };
    
    // Group by creator
    const byCreator = {};
    templates.forEach(template => {
        const creator = template.createdBy || 'Unknown';
        byCreator[creator] = (byCreator[creator] || 0) + 1;
    });
    
    // Group by group
    const byGroup = {};
    templates.forEach(template => {
        const group = template.createdByGroup || 'Unknown';
        byGroup[group] = (byGroup[group] || 0) + 1;
    });
    
    const creatorStats = Object.entries(byCreator)
        .map(([creator, count]) => `  ${creator}: ${count}`)
        .join('\n');
    
    const groupStats = Object.entries(byGroup)
        .map(([group, count]) => `  ${group}: ${count}`)
        .join('\n');
    
    const statisticsText = `
📊 Template Statistics
=====================

📈 Overview:
  Total Templates: ${stats.total}
  Folder Templates: ${stats.folders}
  Experiment Templates: ${stats.experiments}

👤 Ownership:
  Your Templates: ${stats.ownTemplates}
  Shared Templates: ${stats.sharedTemplates}
  System Templates: ${stats.systemTemplates}

💾 Storage:
  File-backed: ${stats.withFiles}
  In-memory only: ${stats.withoutFiles}

👥 By Creator:
${creatorStats}

🏢 By Group:
${groupStats}

📁 Current User: ${userInfo.username} (${userInfo.groupname})
🔄 Auto-refresh: ${window.templateManager?.autoRefreshInterval ? 'Active' : 'Inactive'}
    `;
    
    alert(statisticsText);
};

// NEW: Toggle auto-refresh on/off
window.toggleAutoRefresh = function() {
    if (!window.templateManager) {
        console.warn('Template manager not available');
        return;
    }
    
    try {
        if (window.templateManager.autoRefreshInterval) {
            // Auto-refresh is active, stop it
            window.templateManager.stopAutoRefresh();
            alert('🛑 Auto-refresh stopped');
            console.log('🛑 Auto-refresh stopped by user');
        } else {
            // Auto-refresh is inactive, start it
            window.templateManager.startAutoRefresh();
            alert('▶️ Auto-refresh started');
            console.log('▶️ Auto-refresh started by user');
        }
        
    } catch (error) {
        console.error('❌ Failed to toggle auto-refresh:', error);
        alert('Failed to toggle auto-refresh: ' + error.message);
    }
};

// =================== MIGRATION FUNCTIONS ===================

// Migrate templates to file storage
window.migrateToFileStorage = async function() {
    if (!window.storage || !window.storage.fileStorageEnabled) {
        alert('❌ File storage not available for migration');
        return;
    }
    
    const migrateBtnPanel = document.getElementById('storageAction');
    
    try {
        if (migrateBtnPanel) {
            migrateBtnPanel.disabled = true;
            migrateBtnPanel.textContent = '🔄 Migrating...';
        }
        
        console.log('📦 Starting template migration to file storage...');
        
        const result = await window.storage.migrateToFileStorage();
        
        if (result.success) {
            alert(`✅ Migration completed!\n\n${result.message}\n\nMigrated: ${result.migratedCount} templates`);
            
            // Refresh templates after migration
            if (window.templateManager && window.templateManager.refresh) {
                await window.templateManager.refresh();
            }
            
            // Hide migration notice
            if (window.storage.migrationCompleted !== undefined) {
                window.storage.migrationCompleted = true;
            }
            
        } else {
            alert(`❌ Migration failed: ${result.message}`);
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        alert('Migration failed: ' + error.message);
    } finally {
        if (migrateBtnPanel) {
            migrateBtnPanel.disabled = false;
            migrateBtnPanel.textContent = '📁 Migrate to Files';
        }
    }
};

// Open templates directory
window.openTemplatesDirectory = async function() {
    if (!window.electronAPI || !window.electronAPI.getTemplatesDirectory) {
        console.warn('⚠️ Directory access not available in browser mode');
        alert('Directory access not available in browser mode');
        return;
    }
    
    try {
        console.log('📂 Opening templates directory...');
        const userInfo = window.storage.getCurrentUserContext();
        const result = await window.electronAPI.getTemplatesDirectory(userInfo);
        if (result.success) {
            await window.electronAPI.openFolder(result.directory);
            console.log('✅ Templates directory opened:', result.directory);
        } else {
            console.error('❌ Could not access templates directory:', result.message);
            alert('Could not access templates directory: ' + result.message);
        }
    } catch (error) {
        console.error('❌ Error opening templates directory:', error);
        alert('Error opening directory: ' + error.message);
    }
};

// =================== INITIALIZATION ===================

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 DOM ready, initializing Enhanced Actions...');
    enhancedActions.init();
    
    // Override the immediate functions now that enhancedActions is ready
    window.toggleMoreMenu = function() {
        console.log('🔧 toggleMoreMenu called (DOM ready version)');
        if (enhancedActions && enhancedActions.toggleMoreMenu) {
            enhancedActions.toggleMoreMenu();
        } else {
            console.error('❌ enhancedActions.toggleMoreMenu not available');
        }
    };

    window.closeMoreMenu = function() {
        console.log('🔧 closeMoreMenu called (DOM ready version)');
        if (enhancedActions && enhancedActions.closeMoreMenu) {
            enhancedActions.closeMoreMenu();
        } else {
            console.error('❌ enhancedActions.closeMoreMenu not available');
        }
    };
    
    // Auto-refresh storage info when panel opens
    if (enhancedActions) {
        const originalOpenMoreMenu = enhancedActions.openMoreMenu;
        if (originalOpenMoreMenu) {
            enhancedActions.openMoreMenu = function() {
                originalOpenMoreMenu.call(this);
                // Auto-refresh storage info
                setTimeout(() => {
                    if (window.showStorageInfo) {
                        window.showStorageInfo();
                    }
                }, 200);
            };
        }
    }
});

// Make enhancedActions globally available
window.enhancedActions = enhancedActions;

console.log('✅ Enhanced Actions module loaded with More Menu + Template File Management functionality');