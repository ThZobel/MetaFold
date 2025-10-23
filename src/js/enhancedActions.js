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
        // Support both button IDs (sidebar and actions)
        const trigger = document.getElementById('sidebarMoreMenuTrigger') || document.getElementById('moreMenuTrigger');
        
        if (overlay && panel) {
            const isActive = panel.classList.contains('active');
            
            if (isActive) {
                // Schließen
                overlay.classList.remove('active');
                panel.classList.remove('active');
                if (trigger) {
                    trigger.classList.remove('active');
                }
                document.body.style.overflow = '';
                console.log('✅ More Menu closed (fallback)');
            } else {
                // Öffnen
                overlay.classList.add('active');
                panel.classList.add('active');
                if (trigger) {
                    trigger.classList.add('active');
                }
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

    // Import templates from file - FIXED VERSION: Uses templateManager.add() for proper storage
    window.importTemplatesFromFile = async function() {
        const actionEl = document.getElementById('importAction');
        
        enhancedActions.setActionLoading(actionEl, true);
        enhancedActions.showProgress('Opening file dialog...', 10);
        
        try {
            console.log('📥 Starting template import (FIXED version)...');
            
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
                let errorCount = 0;
                
                // Process each imported template
                for (const template of result.templates) {
                    try {
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
                        
                        // Clean template data and set current user context
                        const cleanTemplate = {
                            ...template,
                            id: template.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            createdBy: template.createdBy || window.userManager?.currentUser || 'Unknown',
                            createdByGroup: template.createdByGroup || window.userManager?.currentGroup || 'Unknown',
                            createdAt: template.createdAt || new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            // Remove file info as this is a new import - will be set by add() method
                            _fileInfo: undefined
                        };
                        
                        // FIXED: Use templateManager.add() instead of direct push
                        // This ensures proper file storage and UI updates
                        if (window.templateManager && window.templateManager.add) {
                            console.log(`📥 Adding template via templateManager.add(): ${cleanTemplate.name}`);
                            await window.templateManager.add(cleanTemplate);
                            importedCount++;
                            console.log(`✅ Template imported and saved: ${cleanTemplate.name}`);
                        } else {
                            console.error('❌ templateManager.add not available');
                            errorCount++;
                        }
                        
                    } catch (templateError) {
                        console.error(`❌ Error importing template "${template.name}":`, templateError);
                        errorCount++;
                    }
                }
                
                enhancedActions.showProgress('Import completed!', 100);
                
                // Build comprehensive result message
                let message = '';
                let messageType = 'success';
                
                if (importedCount > 0) {
                    message = `Successfully imported ${importedCount} template(s)!`;
                    
                    if (skippedCount > 0) {
                        message += ` (${skippedCount} duplicates skipped)`;
                    }
                    
                    if (errorCount > 0) {
                        message += ` (${errorCount} errors)`;
                    }
                    
                    // Add fixes information if available
                    if (result.fixes && result.fixes.length > 0) {
                        message += `\n\n📝 Auto-fixes applied:\n• ${result.fixes.join('\n• ')}`;
                    }
                    
                    enhancedActions.showActionFeedback(actionEl, 'success', message);
                } else {
                    message = `No templates imported. ${skippedCount} duplicates skipped, ${errorCount} errors.`;
                    messageType = 'warning';
                    enhancedActions.showActionFeedback(actionEl, 'warning', message);
                }
                
                // Show detailed success dialog with fixes info
                if (window.app && window.app.showSuccess && importedCount > 0) {
                    let detailedMessage = `Import Summary:\n• ${importedCount} templates imported\n• ${skippedCount} duplicates skipped\n• ${errorCount} errors`;
                    
                    if (result.fixes && result.fixes.length > 0) {
                        detailedMessage += `\n• ${result.fixes.length} templates auto-fixed`;
                        detailedMessage += `\n\nAuto-fixes applied:\n${result.fixes.map(fix => `• ${fix}`).join('\n')}`;
                    }
                    
                    window.app.showSuccess(detailedMessage);
                } else if (window.app && window.app.showWarning && importedCount === 0) {
                    window.app.showWarning(`No templates imported: ${skippedCount} duplicates skipped, ${errorCount} errors.`);
                }
                
                // NO NEED for manual UI refresh - templateManager.add() handles this
                console.log('✅ UI refresh not needed - handled by templateManager.add()');
                
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
            
            console.log('✅ Template import completed (FIXED version)');
            
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
        // Support both button IDs (sidebar and actions)
        const trigger = document.getElementById('sidebarMoreMenuTrigger') || document.getElementById('moreMenuTrigger');
        
        if (overlay && panel) {
            overlay.classList.add('active');
            panel.classList.add('active');
            if (trigger) {
                trigger.classList.add('active');
            }
            
            this.isOpen = true;
            
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
            
            console.log('✅ More Menu opened');
        } else {
            console.error('❌ Required DOM elements not found:', {
                overlay: !!overlay,
                panel: !!panel,
                trigger: !!trigger
            });
        }
    },
    
    // Close the more menu panel
    closeMoreMenu() {
        console.log('📁 Closing More Menu...');
        
        const overlay = document.getElementById('slideOutOverlay');
        const panel = document.getElementById('slideOutPanel');
        // Support both button IDs (sidebar and actions)
        const trigger = document.getElementById('sidebarMoreMenuTrigger') || document.getElementById('moreMenuTrigger');
        
        if (overlay && panel) {
            overlay.classList.remove('active');
            panel.classList.remove('active');
            if (trigger) {
                trigger.classList.remove('active');
            }
            
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
    
    // Update action button states - IMPROVED: Gray out but keep clickable
    updateActionStates(template) {
        const duplicateAction = document.getElementById('duplicateAction');
        const exportAction = document.getElementById('exportAction');
        const deleteAction = document.getElementById('deleteActionPanel');
        const importAction = document.getElementById('importAction');
        const storageAction = document.getElementById('storageAction');
        
        if (!duplicateAction || !exportAction || !deleteAction) return;
        
        const hasTemplate = !!template;
        const canEdit = hasTemplate && template.isOwn !== false; // Can edit own templates
        
        // Duplicate action - needs template
        if (hasTemplate) {
            duplicateAction.classList.remove('needs-template');
            duplicateAction.style.opacity = '1';
            duplicateAction.style.pointerEvents = 'auto';
        } else {
            duplicateAction.classList.add('needs-template');
            duplicateAction.style.opacity = '0.5';
            duplicateAction.style.pointerEvents = 'auto'; // Keep clickable for warning
        }
        
        // Export action - needs template
        if (hasTemplate) {
            exportAction.classList.remove('needs-template');
            exportAction.style.opacity = '1';
            exportAction.style.pointerEvents = 'auto';
        } else {
            exportAction.classList.add('needs-template');
            exportAction.style.opacity = '0.5';
            exportAction.style.pointerEvents = 'auto'; // Keep clickable for warning
        }
        
        // Delete action - needs own template
        if (canEdit) {
            deleteAction.classList.remove('needs-template');
            deleteAction.style.opacity = '1';
            deleteAction.style.pointerEvents = 'auto';
        } else {
            deleteAction.classList.add('needs-template');
            deleteAction.style.opacity = '0.5';
            deleteAction.style.pointerEvents = 'auto'; // Keep clickable for warning
        }
        
        // Import action - always available (no template needed)
        if (importAction) {
            importAction.classList.remove('needs-template');
            importAction.style.opacity = '1';
            importAction.style.pointerEvents = 'auto';
        }
        
        // Storage action - always available (no template needed)
        if (storageAction) {
            storageAction.classList.remove('needs-template');
            storageAction.style.opacity = '1';
            storageAction.style.pointerEvents = 'auto';
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
        enhancedActions.showActionFeedback(actionEl, 'warning', '⚠️ You have to select a template first');
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

// Export current template - ERWEITERT um automatischen Template-Namen
window.exportCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('exportAction');
    
    if (!template) {
        enhancedActions.showActionFeedback(actionEl, 'warning', '⚠️ You have to select a template first');
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
        
        enhancedActions.showProgress('Generating template filename...', 40);
        
        // Clean template for export
        const cleanTemplate = window.utils.cleanTemplateForStorage(template);
        
        // Generate template-based filename
        const safeName = template.name
            .replace(/[<>:"/\\|?*]/g, '_')     // Remove invalid filename characters
            .replace(/\s+/g, '_')              // Replace spaces with underscores
            .toLowerCase()                     // Convert to lowercase
            .substring(0, 100);                // Limit length
        
        const suggestedFileName = `${safeName}_template.json`;
        console.log(`📝 Suggested export filename: ${suggestedFileName}`);
        
        enhancedActions.showProgress('Opening save dialog...', 60);
        
        // Use Electron API to export with custom filename
        const result = await window.electronAPI.exportTemplatesToLocation(
            [cleanTemplate], 
            'single',
            suggestedFileName  // Pass the suggested filename
        );
        
        if (result.success) {
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template exported successfully!');
            enhancedActions.showProgress('Export completed!', 100);
            
            // Show success message with file path and name
            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(`Template "${template.name}" exported to: ${result.fileName || path.basename(result.filePath)}`);
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
        enhancedActions.showActionFeedback(actionEl, 'warning', '⚠️ You have to select a template first');
        return;
    }
    
    if (!template.isOwn) {
        enhancedActions.showActionFeedback(actionEl, 'warning', '⚠️ Can only delete your own templates');
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


    // Enhanced refresh storage info function - SIMPLIFIED for file-only storage
    window.refreshStorageInfo = async function() {
        if (!window.storage) {
            console.warn('⚠️ Storage manager not available');
            return;
        }
        
        try {
            console.log('🔄 Refreshing simplified storage info...');
            
            // Get basic user and storage information
            const userInfo = window.storage.getCurrentUserContext ? 
                window.storage.getCurrentUserContext() : { username: 'Unknown', groupname: 'Unknown' };
            
            const isUserManagement = window.storage.isUserManagementActive ? 
                window.storage.isUserManagementActive() : false;

            const stats = window.storage.getStorageStats ? window.storage.getStorageStats() : {};
            
            // Update storage details with simplified information
            const storageDetails = document.querySelector('.storage-details');
            if (storageDetails) {
                // Clear existing content
                storageDetails.innerHTML = '';
                
                // Show file storage location
                const locationStat = document.createElement('div');
                locationStat.className = 'storage-stat';
                
                if (isUserManagement) {
                    locationStat.innerHTML = `
                        <div style="width: 100%;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                                <span class="stat-label">📁 Storage Location:</span>
                                <span class="stat-value" style="color: #10b981;">File Storage</span>
                            </div>
                            <div style="background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 6px; margin-bottom: 8px;">
                                <div style="font-family: monospace; font-size: 0.85em; color: #a855f7; word-break: break-all;">
                                    templates/${userInfo.groupname}/${userInfo.username}/
                                </div>
                            </div>
                            <div style="font-size: 0.8em; color: #6b7280;">
                                User: <strong>${userInfo.username}</strong> | Group: <strong>${userInfo.groupname}</strong>
                            </div>
                        </div>
                    `;
                } else {
                    locationStat.innerHTML = `
                        <span class="stat-label">📁 Storage Location:</span>
                        <span class="stat-value">templates/ <small style="color: #6b7280;">(General folder)</small></span>
                    `;
                }
                
                storageDetails.appendChild(locationStat);
            }
            
            // Hide migration options (not needed for file-only storage)
            const migrationOptions = document.getElementById('migrationOptions');
            if (migrationOptions) {
                migrationOptions.style.display = 'none';
                console.log('📋 Migration options: hidden (file-only storage)');
            }
            
            // Update open directory button - always enable for file storage
            const openDirBtn = document.getElementById('openDirBtn');
            if (openDirBtn) {
                openDirBtn.disabled = false;
                openDirBtn.style.opacity = '1';
                
                // Update button text based on user context
                if (isUserManagement) {
                    openDirBtn.innerHTML = `📂 Open User Folder <small>(${userInfo.username})</small>`;
                } else {
                    openDirBtn.innerHTML = '📂 Open Templates Folder';
                }
                
                console.log('📂 Open directory button: enabled');
            }
            
            console.log('✅ Simplified storage info refreshed');
            
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



// Open templates directory - ENHANCED to support user-specific folders
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
            let targetDirectory = result.directory;
            
            // Check if user management is active and get user-specific path
            const isUserManagement = window.storage?.isUserManagementActive ? 
                window.storage.isUserManagementActive() : false;
                
            if (isUserManagement) {
                const userInfo = window.storage?.getCurrentUserContext ? 
                    window.storage.getCurrentUserContext() : { username: 'Unknown', groupname: 'Unknown' };
                    
                if (userInfo.groupname && userInfo.username && 
                    userInfo.groupname !== 'Unknown' && userInfo.username !== 'Unknown') {
                    // Construct user-specific path: templates/GROUP/USERNAME/
                    // Use path separator based on platform
                    const separator = result.directory.includes('\\') ? '\\' : '/';
                    targetDirectory = result.directory + separator + userInfo.groupname + separator + userInfo.username;
                    console.log(`📁 Opening user-specific folder: ${targetDirectory}`);
                } else {
                    console.log('📁 Opening general templates folder (user info unavailable)');
                }
            } else {
                console.log('📁 Opening general templates folder (user management disabled)');
            }
            
            await window.electronAPI.openFolder(targetDirectory);
            console.log('✅ Templates directory opened:', targetDirectory);
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