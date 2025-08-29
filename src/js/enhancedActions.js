// Enhanced Actions with More Menu and Import/Export - MetaFold
// CORRECTED VERSION - Fixed duplicate function definitions and localStorage display

// =================== IMMEDIATE FUNCTION DEFINITIONS ===================
// These functions are available immediately, even before DOM is loaded

// Immediate toggleMoreMenu function - available before DOM loaded
window.toggleMoreMenu = function() {
    console.log('🔧 toggleMoreMenu called');
    
    // Check if enhancedActions is available
    if (typeof enhancedActions !== 'undefined' && enhancedActions.toggleMoreMenu) {
        enhancedActions.toggleMoreMenu();
    } else {
        console.log('⏳ enhancedActions not ready yet, waiting...');
        // Wait a bit and try again
        setTimeout(() => {
            if (typeof enhancedActions !== 'undefined' && enhancedActions.toggleMoreMenu) {
                enhancedActions.toggleMoreMenu();
            } else {
                console.error('❌ enhancedActions.toggleMoreMenu not available');
            }
        }, 100);
    }
};

// Globale toggleMoreMenu Funktion - ERSETZE die bestehende Definition
window.toggleMoreMenu = function() {
    console.log('🔧 toggleMoreMenu called globally (fixed version)');
    
    // Prüfe ob enhancedActions verfügbar ist
    if (window.enhancedActions && window.enhancedActions.toggleMoreMenu) {
        console.log('✅ Using enhancedActions.toggleMoreMenu');
        window.enhancedActions.toggleMoreMenu();
    } else {
        console.warn('⏳ enhancedActions not ready yet, using fallback...');
        
        // Fallback: Manuelles Toggle ohne enhancedActions
        const overlay = document.getElementById('slideOutOverlay');
        const panel = document.getElementById('slideOutPanel');
        const trigger = document.getElementById('moreMenuTrigger');
        
        if (overlay && panel && trigger) {
            const isActive = panel.classList.contains('active');
            
            if (isActive) {
                // Schließen
                overlay.classList.remove('active');
                panel.classList.remove('active');
                trigger.classList.remove('active');
                document.body.style.overflow = '';
                console.log('✅ More Menu closed (fallback)');
            } else {
                // Öffnen
                overlay.classList.add('active');
                panel.classList.add('active');
                trigger.classList.add('active');
                document.body.style.overflow = 'hidden';
                console.log('✅ More Menu opened (fallback)');
            }
        } else {
            console.error('❌ Required DOM elements not found:', {
                overlay: !!overlay,
                panel: !!panel,
                trigger: !!trigger
            });
        }
    }
};

// Other immediate functions for completeness
window.duplicateCurrentTemplate = function() {
    console.log('🔧 duplicateCurrentTemplate called');
    if (typeof enhancedActions !== 'undefined' && typeof window.duplicateCurrentTemplate !== 'undefined') {
        // Call the full implementation if available
        return;
    } else {
        console.warn('⚠️ Duplicate function not ready yet');
    }
};

window.exportCurrentTemplate = function() {
    console.log('🔧 exportCurrentTemplate called');
    if (typeof enhancedActions !== 'undefined' && typeof window.exportCurrentTemplate !== 'undefined') {
        // Call the full implementation if available
        return;
    } else {
        console.warn('⚠️ Export function not ready yet');
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
                        console.log(`⚠️ Template "${template.name}" already exists, skipping...`);
                        skippedCount++;
                        continue;
                    }
                    
                    try {
                        // Add template to manager
                        if (window.templateManager && window.templateManager.add) {
                            window.templateManager.add(template);
                            importedCount++;
                            console.log(`✅ Imported template: ${template.name}`);
                        } else {
                            console.error('❌ templateManager.add not available');
                            skippedCount++;
                        }
                    } catch (error) {
                        console.error(`❌ Error adding template "${template.name}":`, error);
                        skippedCount++;
                    }
                }
                
                enhancedActions.showProgress('Import completed!', 100);
                
                // Build comprehensive result message
                let message = '';
                let messageType = 'success';
                
                if (importedCount > 0) {
                    message = `Successfully imported ${importedCount} template(s)!`;
                    
                    if (skippedCount > 0) {
                        message += ` (${skippedCount} skipped - duplicates or errors)`;
                    }
                    
                    // Add fixes information if available
                    if (result.fixes && result.fixes.length > 0) {
                        message += `\n\n📝 Auto-fixes applied:\n• ${result.fixes.join('\n• ')}`;
                    }
                    
                    enhancedActions.showActionFeedback(actionEl, 'success', message);
                } else {
                    message = `No templates imported. ${skippedCount} templates were skipped (duplicates or errors).`;
                    messageType = 'warning';
                    enhancedActions.showActionFeedback(actionEl, 'warning', message);
                }
                
                // Show detailed success dialog with fixes info
                if (window.app && window.app.showSuccess && importedCount > 0) {
                    let detailedMessage = `Import Summary:\n• ${importedCount} templates imported\n• ${skippedCount} templates skipped`;
                    
                    if (result.fixes && result.fixes.length > 0) {
                        detailedMessage += `\n• ${result.fixes.length} templates auto-fixed`;
                        detailedMessage += `\n\nAuto-fixes applied:\n${result.fixes.map(fix => `• ${fix}`).join('\n')}`;
                    }
                    
                    window.app.showSuccess(detailedMessage);
                } else if (window.app && window.app.showWarning && importedCount === 0) {
                    window.app.showWarning(`No templates imported: ${skippedCount} templates were skipped (duplicates or errors).`);
                }
                
                // Refresh template list if any were imported
                if (importedCount > 0) {
                    setTimeout(() => {
                        if (window.templateManager && window.templateManager.renderList) {
                            window.templateManager.renderList();
                            console.log('🔄 Template list refreshed after import');
                        }
                    }, 500);
                }
                
            } else if (result.success && (!result.templates || result.templates.length === 0)) {
                enhancedActions.showActionFeedback(actionEl, 'error', 'No valid templates found in file');
                
                if (window.app && window.app.showError) {
                    window.app.showError('No valid templates found in the selected file. Please check that the file contains valid MetaFold template data.');
                }
            } else {
                throw new Error(result.message || 'Import cancelled or failed');
            }
            
            // Close panel after success
            setTimeout(() => {
                enhancedActions.closeMoreMenu();
                enhancedActions.hideProgress();
            }, 2000);
            
            console.log('✅ Enhanced template import completed');
            
        } catch (error) {
            console.error('❌ Error importing templates:', error);
            
            let errorMessage = `Import failed: ${error.message}`;
            
            // Provide helpful error messages for common issues
            if (error.message.includes('Invalid JSON')) {
                errorMessage = 'Import failed: The selected file is not a valid JSON file. Please check the file format.';
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

window.deleteCurrentTemplate = function() {
    console.log('🔧 deleteCurrentTemplate called');
    if (typeof enhancedActions !== 'undefined' && typeof window.deleteCurrentTemplate !== 'undefined') {
        // Call the full implementation if available
        return;
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
        
        // Close panel with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeMoreMenu();
            }
        });
        
        // Update panel when template changes
        // Hook into template manager selection
        if (window.templateManager) {
            const originalSelect = window.templateManager.select;
            window.templateManager.select = function(index) {
                const result = originalSelect.call(this, index);
                enhancedActions.updatePanelContent();
                return result;
            };
        }
    },
    
    // Toggle the more menu panel
    toggleMoreMenu() {
        if (this.isOpen) {
            this.closeMoreMenu();
        } else {
            this.openMoreMenu();
        }
    },
    
    // Open the more menu panel
    openMoreMenu() {
        console.log('📂 Opening More Menu...');
        
        // Update content before opening
        this.updatePanelContent();
        
        // Show overlay and panel
        const overlay = document.getElementById('slideOutOverlay');
        const panel = document.getElementById('slideOutPanel');
        const trigger = document.getElementById('moreMenuTrigger');
        
        if (overlay && panel && trigger) {
            overlay.classList.add('active');
            panel.classList.add('active');
            trigger.classList.add('active');
            
            this.isOpen = true;
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            console.log('✅ More Menu opened');
        }
    },
    
    // Close the more menu panel
    closeMoreMenu() {
        console.log('📁 Closing More Menu...');
        
        const overlay = document.getElementById('slideOutOverlay');
        const panel = document.getElementById('slideOutPanel');
        const trigger = document.getElementById('moreMenuTrigger');
        
        if (overlay && panel && trigger) {
            overlay.classList.remove('active');
            panel.classList.remove('active');
            trigger.classList.remove('active');
            
            this.isOpen = false;
            
            // Restore body scroll
            document.body.style.overflow = '';
            
            console.log('✅ More Menu closed');
        }
    },
    
    // Update panel content based on current template
    updatePanelContent() {
        const currentTemplate = window.templateManager?.currentTemplate;
        
        // Update template info
        this.updateTemplateInfo(currentTemplate);
        
        // Update action states
        this.updateActionStates(currentTemplate);
        
        this.currentTemplate = currentTemplate;
    },
    
    // Update template info display in panel
    updateTemplateInfo(template) {
        const nameEl = document.getElementById('panelTemplateName');
        const metaEl = document.getElementById('panelTemplateMeta');
        const statsEl = document.getElementById('panelTemplateStats');
        
        if (!nameEl || !metaEl || !statsEl) return;
        
        if (!template) {
            nameEl.innerHTML = '🧪 Select a template';
            metaEl.textContent = 'Choose a template to see available actions';
            statsEl.innerHTML = '';
            return;
        }
        
        // Template name and type
        const typeIcon = template.type === 'experiment' ? '🧪' : '📁';
        const typeName = template.type === 'experiment' ? 'Experiment' : 'Folder';
        nameEl.innerHTML = `${typeIcon} ${this.escapeHtml(template.name)}`;
        
        // Template metadata
        const createdDate = template.createdAt ? new Date(template.createdAt).toLocaleDateString() : 'Unknown';
        const creator = template.createdBy || 'Unknown';
        const group = template.createdByGroup || 'Unknown';
        
        // Check if template is stored as file
        const storageInfo = template._fileInfo ? 
            `📁 File: ${template._fileInfo.filename}` : 
            '💾 LocalStorage';
        
        metaEl.innerHTML = `Created by <strong>${this.escapeHtml(creator)}</strong> (${this.escapeHtml(group)}) on ${createdDate}<br><small style="color: #9ca3af;">${storageInfo}</small>`;
        
        // Template statistics
        let stats = [`<span>📊 Type: ${typeName}</span>`];
        
        if (template.structure && template.structure.trim()) {
            const lineCount = template.structure.split('\n').filter(line => line.trim()).length;
            stats.push(`<span>📁 Structure: ${lineCount} items</span>`);
        }
        
        if (template.metadata && Object.keys(template.metadata).length > 0) {
            const fieldCount = Object.keys(template.metadata).length;
            stats.push(`<span>📝 Fields: ${fieldCount}</span>`);
        }
        
        if (template.description) {
            stats.push(`<span>📄 Has description</span>`);
        }
        
        // Storage mode indicator
        if (window.storage) {
            stats.push(`<span>💾 Storage: ${window.storage.storageMode}</span>`);
        }
        
        statsEl.innerHTML = stats.join('');
    },
    
    // Update action button states
    updateActionStates(template) {
        const duplicateAction = document.getElementById('duplicateAction');
        const exportAction = document.getElementById('exportAction');
        const deleteAction = document.getElementById('deleteActionPanel');
        const importAction = document.getElementById('importAction');
        
        if (!duplicateAction || !exportAction || !deleteAction) return;
        
        const hasTemplate = !!template;
        const canEdit = hasTemplate && template.isOwn !== false; // Can edit own templates
        
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
        feedbackEl.style.display = 'block';
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            actionEl.classList.remove('success', 'error', 'warning');
            if (feedbackEl) {
                feedbackEl.style.display = 'none';
            }
        }, 3000);
    },
    
    // Set action loading state
    setActionLoading(actionEl, loading) {
        if (!actionEl) return;
        
        const button = actionEl.querySelector('.panel-action-button');
        if (button) {
            button.disabled = loading;
            if (loading) {
                actionEl.classList.add('loading');
            } else {
                actionEl.classList.remove('loading');
            }
        }
    },
    
    // Show progress for multi-step operations
    showProgress(message, percentage) {
        const progressDiv = document.getElementById('panelProgress');
        const progressMessage = progressDiv?.querySelector('.progress-message');
        const progressFill = progressDiv?.querySelector('.progress-fill');
        
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

// =================== FULL FUNCTION IMPLEMENTATIONS ===================

// Duplicate current template
window.duplicateCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('duplicateAction');
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'error', 'No template selected');
        return;
    }
    
    enhancedActions.setActionLoading(actionEl, true);
    
    try {
        console.log('📋 Duplicating template:', template.name);
        
        // Create duplicated template
        const duplicatedTemplate = {
            ...template,
            name: `${template.name} (Copy)`,
            description: `${template.description || ''} (Copy of original)`.trim(),
            createdBy: window.userManager?.currentUser || 'Unknown',
            createdByGroup: window.userManager?.currentGroup || 'Unknown',
            createdAt: new Date().toISOString(),
            originalTemplate: template.name,
            originalCreator: template.createdBy,
            isOwn: true
        };
        
        // Clean up properties that shouldn't be copied
        delete duplicatedTemplate.originalIndex;
        delete duplicatedTemplate.isShared;
        delete duplicatedTemplate.userColor;
        delete duplicatedTemplate.userInitials;
        delete duplicatedTemplate.updatedAt;
        delete duplicatedTemplate._fileInfo; // Don't copy file info
        
        // Add to template manager
        window.templateManager.templates.push(duplicatedTemplate);
        
        // Save all templates
        if (window.storage) {
            await window.storage.saveTemplates(window.templateManager.templates);
        }
        
        // Refresh UI
        window.templateManager.invalidateCache();
        window.templateManager.buildSearchIndex();
        window.templateManager.renderList();
        window.templateManager.updateTemplateInfo();
        
        enhancedActions.showActionFeedback(actionEl, 'success', 'Template duplicated successfully!');
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
        }, 1500);
        
        console.log('✅ Template duplicated successfully');
        
    } catch (error) {
        console.error('❌ Error duplicating template:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to duplicate template');
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Export current template
window.exportCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('exportAction');
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'error', 'No template selected');
        return;
    }
    
    enhancedActions.setActionLoading(actionEl, true);
    enhancedActions.showProgress('Preparing template for export...', 25);
    
    try {
        console.log('📤 Exporting template:', template.name);
        
        // Check if Electron API is available
        if (!window.electronAPI || !window.electronAPI.exportTemplatesToLocation) {
            throw new Error('Export functionality not available (requires Electron)');
        }
        
        enhancedActions.showProgress('Saving template file...', 75);
        
        // Clean template for export
        const cleanTemplate = window.utils.cleanTemplateForStorage(template);
        
        // Use Electron API to export
        const result = await window.electronAPI.exportTemplatesToLocation([cleanTemplate], 'single');
        
        if (result.success) {
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template exported successfully!');
            enhancedActions.showProgress('Export completed!', 100);
            
            // Show success message with file path
            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(`Template exported to: ${result.filePath}`);
            }
            
            setTimeout(() => {
                enhancedActions.hideProgress();
            }, 1000);
        } else {
            throw new Error(result.message || 'Export cancelled or failed');
        }
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
        }, 2000);
        
        console.log('✅ Template exported successfully');
        
    } catch (error) {
        console.error('❌ Error exporting template:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', `Export failed: ${error.message}`);
        enhancedActions.hideProgress();
        
        if (window.app && window.app.showError) {
            window.app.showError(`Export failed: ${error.message}`);
        }
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Import templates from file
window.importTemplatesFromFile = async function() {
    const actionEl = document.getElementById('importAction');
    
    enhancedActions.setActionLoading(actionEl, true);
    enhancedActions.showProgress('Opening file dialog...', 10);
    
    try {
        console.log('📥 Starting template import...');
        
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
            
            // Process each imported template
            for (const template of result.templates) {
                // Check if template already exists
                const exists = window.templateManager.templates.some(t => 
                    t.name === template.name && 
                    t.createdBy === template.createdBy
                );
                
                if (exists) {
                    console.log(`⚠️ Template "${template.name}" already exists, skipping...`);
                    skippedCount++;
                    continue;
                }
                
                // Clean template data
                const cleanTemplate = {
                    ...template,
                    createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
                    createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
                    createdAt: template.createdAt || new Date().toISOString(),
                    // Remove file info as this is a new import
                    _fileInfo: undefined
                };
                
                // Add to template manager
                window.templateManager.templates.push(cleanTemplate);
                importedCount++;
            }
            
            enhancedActions.showProgress('Saving imported templates...', 80);
            
            // Save all templates
            if (window.storage) {
                await window.storage.saveTemplates(window.templateManager.templates);
            }
            
            // Refresh UI
            window.templateManager.invalidateCache();
            window.templateManager.buildSearchIndex();
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
            
            enhancedActions.showProgress('Import completed!', 100);
            
            // Show result message
            let message = `Successfully imported ${importedCount} template(s)!`;
            if (skippedCount > 0) {
                message += ` (${skippedCount} duplicates skipped)`;
            }
            
            enhancedActions.showActionFeedback(actionEl, 'success', message);
            
            // Show detailed success dialog
            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(message);
            }
            
        } else if (result.success && (!result.templates || result.templates.length === 0)) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'No valid templates found in file');
        } else {
            throw new Error(result.message || 'Import cancelled or failed');
        }
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
            enhancedActions.hideProgress();
        }, 2000);
        
        console.log('✅ Template import completed');
        
    } catch (error) {
        console.error('❌ Error importing templates:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', `Import failed: ${error.message}`);
        enhancedActions.hideProgress();
        
        if (window.app && window.app.showError) {
            window.app.showError(`Import failed: ${error.message}`);
        }
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Delete current template
window.deleteCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('deleteActionPanel');
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'error', 'No template selected');
        return;
    }
    
    if (!template.isOwn) {
        enhancedActions.showActionFeedback(actionEl, 'error', 'Can only delete your own templates');
        return;
    }
    
    // Enhanced confirmation dialog
    const confirmMessage = `Delete template "${template.name}"?\n\n` +
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

// =================== STORAGE INFO FUNCTIONS ===================
// Fixed to use panel UI instead of alert windows

// Show storage info in panel UI instead of alert window
window.showStorageInfo = async function() {
    const storageInfoEl = document.getElementById('panelStorageInfo');
    const storageActionEl = document.getElementById('storageAction');
    
    if (!storageInfoEl) {
        console.error('❌ Storage info panel not found in DOM');
        console.log('🔍 Available panel elements:', {
            slideOutPanel: !!document.getElementById('slideOutPanel'),
            panelContent: !!document.querySelector('.panel-content'),
            storageAction: !!document.getElementById('storageAction')
        });
        
        // Fallback to alert if panel not found
        try {
            const stats = window.storage?.getStorageStats();
            if (stats) {
                alert(`Storage Information:
                
Mode: ${stats.storageMode || 'Unknown'}
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
    
    // Update action visual state
    if (storageActionEl) {
        if (isVisible) {
            storageActionEl.classList.remove('active');
        } else {
            storageActionEl.classList.add('active');
        }
    }
    
    if (!isVisible) {
        // Show loading state
        if (enhancedActions && enhancedActions.setActionLoading) {
            enhancedActions.setActionLoading(storageActionEl, true);
        }
        
        try {
            await window.refreshStorageInfo();
            console.log('✅ Storage info displayed in panel UI');
            
            // Show success feedback
            if (enhancedActions && enhancedActions.showActionFeedback) {
                enhancedActions.showActionFeedback(storageActionEl, 'success', 'Storage info loaded');
            }
        } catch (error) {
            console.error('❌ Error loading storage info:', error);
            if (enhancedActions && enhancedActions.showActionFeedback) {
                enhancedActions.showActionFeedback(storageActionEl, 'error', 'Failed to load storage info');
            }
        } finally {
            if (enhancedActions && enhancedActions.setActionLoading) {
                enhancedActions.setActionLoading(storageActionEl, false);
            }
        }
    }
};


    // Enhanced refresh storage info function with user path display
    window.refreshStorageInfo = async function() {
        if (!window.storage) {
            console.warn('⚠️ Storage manager not available');
            return;
        }
        
        try {
            console.log('🔄 Refreshing storage info...');
            
            // Get storage statistics
            const stats = window.storage.getStorageStats();
            const health = await window.storage.healthCheck();
            
            console.log('📊 Storage stats:', stats);
            console.log('🏥 Storage health:', health);
            
            // Update UI elements safely with null checks
            const updateElement = (id, value) => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = value;
                    console.log(`✅ Updated ${id}:`, value);
                } else {
                    console.warn(`⚠️ Element not found: ${id}`);
                }
            };
            
            // Get user-specific storage path for display
            const userPath = window.storage.getUserStoragePath ? 
                window.storage.getUserStoragePath() : 'General folder';
            
            const isUserManagement = window.storage.isUserManagementActive ? 
                window.storage.isUserManagementActive() : false;
            
                    // Get user-specific information
                    const userInfo = window.storage.getCurrentUserContext ? 
                        window.storage.getCurrentUserContext() : { username: 'Unknown', groupname: 'Unknown' };
                    
                                       
                    // Update all storage info fields
                    updateElement('storageModeValue', stats.mode || 'Unknown');
                    updateElement('fileStorageValue', stats.fileStorageEnabled ? '✅ Available' : '❌ Not Available');
                    updateElement('fileTemplatesValue', stats.templates?.files || '0');
                    updateElement('localTemplatesValue', stats.templates?.localStorage || '0');
                    
                    // Show user management status and path
                    if (isUserManagement) {
                        // Create or update user management status display
                        let userMgmtElement = document.getElementById('userManagementStatus');
                        if (!userMgmtElement) {
                            // Create the element if it doesn't exist
                            const storageDetails = document.querySelector('.storage-details');
                            if (storageDetails) {
                                userMgmtElement = document.createElement('div');
                                userMgmtElement.id = 'userManagementStatus';
                                userMgmtElement.className = 'storage-stat user-path-indicator';
                                storageDetails.appendChild(userMgmtElement);
                            }
                        }
                        
                        if (userMgmtElement) {
                            userMgmtElement.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span>👥 User Management:</span>
                                    <strong style="color: #10b981;">Active</strong>
                                </div>
                                <div style="font-size: 0.8em; margin-top: 4px; opacity: 0.8;">
                                    User: <strong>${userInfo.username}</strong> | Group: <strong>${userInfo.groupname}</strong>
                                </div>
                                <div style="font-size: 0.75em; margin-top: 4px; font-family: monospace; background: rgba(0,0,0,0.2); padding: 4px 6px; border-radius: 3px;">
                                    📁 templates/${userInfo.groupname}/${userInfo.username}/
                                </div>
                            `;
                            userMgmtElement.style.display = 'block';
                            console.log(`👥 User management status displayed: ${userInfo.username} (${userInfo.groupname})`);
                        }
                        
                        // Update migration text with user-specific path
                        const migrationText = document.getElementById('migrationText');
                        if (migrationText) {
                            migrationText.innerHTML = `
                                <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 10px;">
                                    Migrate your templates to user-specific file storage:
                                </p>
                                <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 4px; font-family: monospace; font-size: 0.8rem; margin-bottom: 10px;">
                                    📁 templates/${userInfo.groupname}/${userInfo.username}/
                                </div>
                            `;
                        }
                        
                    } else {
                        // Hide user management status if not active
                        const userMgmtElement = document.getElementById('userManagementStatus');
                        if (userMgmtElement) {
                            userMgmtElement.style.display = 'none';
                        }
                        
                        console.log('👤 Simple mode: No user management active');
                    }




            // Add user path display if user management is active
            const userPathElement = document.getElementById('userStoragePathValue');
            if (userPathElement) {
                if (isUserManagement) {
                    userPathElement.textContent = userPath;
                    userPathElement.style.display = 'inline';
                    console.log(`👥 User path displayed: ${userPath}`);
                } else {
                    userPathElement.style.display = 'none';
                }
            }
            
            // Show migration options if needed
            const migrationOptions = document.getElementById('migrationOptions');
            if (migrationOptions) {
            const shouldShowMigration = stats.fileStorageEnabled && 
                            (stats.templates?.localStorage || 0) > 0 && 
                            !stats.migrationCompleted;
                migrationOptions.style.display = shouldShowMigration ? 'block' : 'none';
                console.log(`📋 Migration options: ${shouldShowMigration ? 'shown' : 'hidden'}`);
                
                // Update migration text to include user path
                const migrationText = document.getElementById('migrationText');
                if (migrationText && shouldShowMigration && isUserManagement) {
                    migrationText.innerHTML = `
                        <p style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 10px;">
                            Migrate your templates from browser storage to user-specific files:<br>
                            <code style="background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 3px; font-size: 0.8rem;">
                                templates/${userPath}
                            </code>
                        </p>
                    `;
                }
            }
            
            // Update open directory button
            const openDirBtn = document.getElementById('openDirBtn');
            if (openDirBtn) {
                openDirBtn.disabled = !stats.fileStorageEnabled;
                openDirBtn.style.opacity = stats.fileStorageEnabled ? '1' : '0.5';
                
                // Update button text to include user context
                if (isUserManagement && stats.fileStorageEnabled) {
                    openDirBtn.textContent = `📂 Open User Folder (${userPath.replace('/', ' → ')})`;
                } else if (stats.fileStorageEnabled) {
                    openDirBtn.textContent = '📂 Open Templates Folder';
                }
                
                console.log(`📂 Open directory button: ${stats.fileStorageEnabled ? 'enabled' : 'disabled'}`);
            }
            
            console.log('✅ Storage info refreshed in panel UI with user context');
            
        } catch (error) {
            console.error('❌ Error refreshing storage info:', error);
            throw error;
        }
    };


    // Perform migration from panel - CORRECTED VERSION
    window.performMigrationFromPanel = async function() {
        // Check for the correct function name in templateManager
        if (!window.templateManager) {
            console.warn('⚠️ Template manager not available');
            return;
        }
        
        // The correct function name is 'migrateTemplates', not 'performMigration'
        if (!window.templateManager.migrateTemplates) {
            console.warn('⚠️ Template manager migration function not available');
            return;
        }
        
        const migrateBtnPanel = document.getElementById('migrateBtnPanel');
        if (migrateBtnPanel) {
            migrateBtnPanel.disabled = true;
            migrateBtnPanel.textContent = '🔄 Migrating...';
        }
        
        try {
            console.log('🚀 Starting migration from panel...');
            
            // Call the correct function name
            await window.templateManager.migrateTemplates();
            
            // Refresh storage info after migration
            setTimeout(() => {
                if (window.refreshStorageInfo) {
                    window.refreshStorageInfo();
                }
            }, 1000);
            
            console.log('✅ Migration completed from panel');
            
            // Show success feedback
            if (window.enhancedActions && window.enhancedActions.showActionFeedback) {
                const actionEl = document.getElementById('storageAction');
                window.enhancedActions.showActionFeedback(actionEl, 'success', 'Templates migrated to file storage!');
            }
            
        } catch (error) {
            console.error('❌ Migration error:', error);
            
            // Show error feedback
            if (window.enhancedActions && window.enhancedActions.showActionFeedback) {
                const actionEl = document.getElementById('storageAction');
                window.enhancedActions.showActionFeedback(actionEl, 'error', `Migration failed: ${error.message}`);
            }
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
        const result = await window.electronAPI.getTemplatesDirectory();
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
                // Call original function
                originalOpenMoreMenu.call(this);
                
                // Auto-refresh storage info if panel is visible
                setTimeout(() => {
                    const storageInfoEl = document.getElementById('panelStorageInfo');
                    if (storageInfoEl && storageInfoEl.style.display !== 'none') {
                        console.log('🔄 Auto-refreshing storage info on panel open');
                        window.refreshStorageInfo();
                    }
                }, 500);
            };
        }
    }
});

// Make enhancedActions globally available
window.enhancedActions = enhancedActions;

// Final debug check
console.log('🔍 Enhanced Actions final check:', {
    enhancedActions: typeof enhancedActions,
    toggleMoreMenu: typeof window.toggleMoreMenu,
    closeMoreMenu: typeof window.closeMoreMenu,
    showStorageInfo: typeof window.showStorageInfo,
    duplicateCurrentTemplate: typeof window.duplicateCurrentTemplate,
    exportCurrentTemplate: typeof window.exportCurrentTemplate,
    importTemplatesFromFile: typeof window.importTemplatesFromFile,
    deleteCurrentTemplate: typeof window.deleteCurrentTemplate
});

console.log('✅ Enhanced Actions module loaded with Import/Export functionality - alert() windows replaced with panel UI');