// Enhanced Actions for Template Management with File Storage Support + More Menu
// FIXED VERSION - Combines template file management with existing more menu functionality

// =================== IMMEDIATE FUNCTION DEFINITIONS ===================
// These functions are available immediately, even before DOM is loaded

// Immediate toggleMoreMenu function - available before DOM loaded
window.toggleMoreMenu = function() {
    console.log('🔧 toggleMoreMenu called');
    
    // Check if enhancedActions is available
    if (typeof enhancedActions !== 'undefined' && enhancedActions.toggleMoreMenu) {
        enhancedActions.toggleMoreMenu();
    } else {
        console.log('⏳ enhancedActions not ready yet, using fallback...');
        
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

// Immediate closeMoreMenu function
window.closeMoreMenu = function() {
    console.log('🔧 closeMoreMenu called');
    if (typeof enhancedActions !== 'undefined' && enhancedActions.closeMoreMenu) {
        enhancedActions.closeMoreMenu();
    } else {
        // Fallback
        const overlay = document.getElementById('slideOutOverlay');
        const panel = document.getElementById('slideOutPanel');
        const trigger = document.getElementById('moreMenuTrigger');
        
        if (overlay && panel && trigger) {
            overlay.classList.remove('active');
            panel.classList.remove('active');
            trigger.classList.remove('active');
            document.body.style.overflow = '';
        }
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
        console.log('🔧 Initializing Enhanced Actions with More Menu...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update panel content initially
        this.updatePanelContent();
        
        console.log('✅ Enhanced Actions initialized with More Menu support');
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
        if (window.templateManager) {
            const originalSelect = window.templateManager.select;
            if (originalSelect) {
                window.templateManager.select = function(index) {
                    const result = originalSelect.call(this, index);
                    enhancedActions.updatePanelContent();
                    return result;
                };
            }
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
        
        // Update template info if panel elements exist
        this.updateTemplateInfo(currentTemplate);
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
        // This would update action buttons if they exist in the panel
        const hasTemplate = !!template;
        const canEdit = hasTemplate && template.isOwn !== false;
        
        // Update action buttons if they exist
        const duplicateAction = document.getElementById('duplicateAction');
        const exportAction = document.getElementById('exportAction');
        const deleteAction = document.getElementById('deleteActionPanel');
        
        if (duplicateAction) {
            if (hasTemplate) {
                duplicateAction.classList.remove('disabled');
                duplicateAction.style.opacity = '1';
            } else {
                duplicateAction.classList.add('disabled');
                duplicateAction.style.opacity = '0.4';
            }
        }
        
        if (exportAction) {
            if (hasTemplate) {
                exportAction.classList.remove('disabled');
                exportAction.style.opacity = '1';
            } else {
                exportAction.classList.add('disabled');
                exportAction.style.opacity = '0.4';
            }
        }
        
        if (deleteAction) {
            if (canEdit) {
                deleteAction.classList.remove('disabled');
                deleteAction.style.opacity = '1';
            } else {
                deleteAction.classList.add('disabled');
                deleteAction.style.opacity = '0.4';
            }
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
        
        const button = actionEl.querySelector('.panel-action-button, button');
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

window.showStorageInfo = async function() {
    // ... existing code ...
    // ... existing code ...
    // ... existing code ...
}; // <- DAS IST DAS ENDE VON showStorageInfo

// 📍 FÜGE HIER DIE NEUE FUNKTION HINZU (DIREKT NACH DER SCHLIESSENDEN KLAMMER):

    // FIXED: Enhanced refresh storage info function with safe path handling
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
            
            // FIXED: Safe user path retrieval
            let userPath = 'General folder';
            try {
                if (window.storage.getUserStoragePath) {
                    userPath = window.storage.getUserStoragePath();
                }
            } catch (error) {
                console.warn('Could not get user storage path:', error);
                userPath = 'Templates folder';
            }
            
            const isUserManagement = window.storage.isUserManagementActive ? 
                window.storage.isUserManagementActive() : false;
            
            // Get user-specific information safely
            let userInfo = { username: 'Unknown', groupname: 'Unknown' };
            try {
                if (window.storage.getCurrentUserContext) {
                    userInfo = window.storage.getCurrentUserContext();
                }
            } catch (error) {
                console.warn('Could not get user context:', error);
            }
            
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
                            📁 ${userPath}
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
                            📁 ${userPath}
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
            
            // Show migration options if needed
            const migrationOptions = document.getElementById('migrationOptions');
            if (migrationOptions) {
                const shouldShowMigration = stats.fileStorageEnabled && 
                                (stats.templates?.localStorage || 0) > 0 && 
                                !stats.migrationCompleted;
                migrationOptions.style.display = shouldShowMigration ? 'block' : 'none';
                console.log(`📋 Migration options: ${shouldShowMigration ? 'shown' : 'hidden'}`);
            }
            
            // Update open directory button
            const openDirBtn = document.getElementById('openDirBtn');
            if (openDirBtn) {
                openDirBtn.disabled = !stats.fileStorageEnabled;
                openDirBtn.style.opacity = stats.fileStorageEnabled ? '1' : '0.5';
                
                // Update button text to include user context
                if (isUserManagement && stats.fileStorageEnabled) {
                    openDirBtn.textContent = `📂 Open User Folder`;
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


// NEW: Force cleanup of localStorage templates
window.forceCleanupTemplates = async function() {
    if (!window.storage || !window.storage.forceCleanReload) {
        alert('Storage cleanup not available');
        return;
    }
    
    const confirmMessage = `🧹 Clean up duplicate templates?\n\nThis will:\n• Remove all localStorage template data\n• Keep only file-based templates\n• Cannot be undone\n\nContinue?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log('🧹 Starting template cleanup...');
        
        // Show loading indicator
        if (window.templateManager && window.templateManager.showLoadingState) {
            window.templateManager.showLoadingState();
        }
        
        // Perform cleanup
        const templates = await window.storage.forceCleanReload();
        
        // Update template manager
        if (window.templateManager) {
            window.templateManager.templates = templates;
            window.templateManager.invalidateCache();
            window.templateManager.buildSearchIndex();
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
        }
        
        const message = `✅ Templates cleaned successfully!\n\nNow showing ${templates.length} file-based templates only.`;
        alert(message);
        
        console.log(`✅ Template cleanup completed. Now showing ${templates.length} templates.`);
        
    } catch (error) {
        console.error('❌ Template cleanup failed:', error);
        alert('Cleanup failed: ' + error.message);
    }
};

// NEW: Export all templates to file
window.exportAllTemplates = async function() {
    if (!window.templateManager || !window.templateManager.templates) {
        alert('No templates available to export');
        return;
    }
    
    try {
        console.log('📤 Exporting all templates...');
        
        const templates = window.templateManager.templates;
        const userTemplates = templates.filter(template => 
            !window.storage.isDefaultTemplate(template)
        );
        
        if (userTemplates.length === 0) {
            alert('No user templates found to export');
            return;
        }
        
        // Clean templates for export (remove UI properties)
        const cleanTemplates = userTemplates.map(template => {
            if (window.utils && window.utils.cleanTemplateForStorage) {
                return window.utils.cleanTemplateForStorage(template);
            }
            return template;
        });
        
        // Use Electron API if available
        if (window.electronAPI && window.electronAPI.exportTemplatesToLocation) {
            const result = await window.electronAPI.exportTemplatesToLocation(cleanTemplates, 'multiple');
            
            if (result.success) {
                alert(`✅ Exported ${cleanTemplates.length} templates to:\n${result.filePath}`);
            } else {
                alert(`❌ Export failed: ${result.message}`);
            }
        } else {
            // Fallback: Download as JSON file in browser
            const dataStr = JSON.stringify(cleanTemplates, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `metafold_templates_${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            
            alert(`✅ Downloaded ${cleanTemplates.length} templates as JSON file`);
        }
        
        console.log(`✅ Exported ${cleanTemplates.length} templates successfully`);
        
    } catch (error) {
        console.error('❌ Export failed:', error);
        alert('Export failed: ' + error.message);
    }
};

// NEW: Import templates from file
window.importTemplatesFromFile = async function() {
    try {
        console.log('📥 Importing templates from file...');
        
        // Use Electron API if available
        if (window.electronAPI && window.electronAPI.importTemplatesFromFile) {
            const result = await window.electronAPI.importTemplatesFromFile();
            
            if (result.success && result.templates && result.templates.length > 0) {
                // Add imported templates to current collection
                const importedCount = result.templates.length;
                
                // Add user context to imported templates
                const userInfo = window.storage.getCurrentUserContext();
                const enhancedTemplates = result.templates.map(template => ({
                    ...template,
                    createdBy: template.createdBy || userInfo.username,
                    createdByGroup: template.createdByGroup || userInfo.groupname,
                    importedAt: new Date().toISOString(),
                    importedFrom: result.filePath || 'Unknown'
                }));
                
                // Add to template manager
                if (window.templateManager) {
                    enhancedTemplates.forEach(template => {
                        window.templateManager.templates.push(template);
                    });
                    
                    // Save to storage
                    if (window.storage) {
                        await window.storage.saveTemplates(window.templateManager.templates);
                    }
                    
                    // Refresh UI
                    window.templateManager.invalidateCache();
                    window.templateManager.buildSearchIndex();
                    window.templateManager.renderList();
                    window.templateManager.updateTemplateInfo();
                }
                
                alert(`✅ Successfully imported ${importedCount} templates from:\n${result.filePath}`);
                console.log(`✅ Imported ${importedCount} templates successfully`);
                
            } else {
                alert('❌ No templates found in selected file or import cancelled');
            }
        } else {
            // Fallback: File input in browser
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                try {
                    const text = await file.text();
                    const templates = JSON.parse(text);
                    
                    if (!Array.isArray(templates)) {
                        throw new Error('File does not contain a valid template array');
                    }
                    
                    // Process imported templates similar to Electron version
                    const userInfo = window.storage.getCurrentUserContext();
                    const enhancedTemplates = templates.map(template => ({
                        ...template,
                        createdBy: template.createdBy || userInfo.username,
                        createdByGroup: template.createdByGroup || userInfo.groupname,
                        importedAt: new Date().toISOString(),
                        importedFrom: file.name
                    }));
                    
                    // Add to template manager
                    if (window.templateManager) {
                        enhancedTemplates.forEach(template => {
                            window.templateManager.templates.push(template);
                        });
                        
                        // Save to storage
                        if (window.storage) {
                            await window.storage.saveTemplates(window.templateManager.templates);
                        }
                        
                        // Refresh UI
                        window.templateManager.invalidateCache();
                        window.templateManager.buildSearchIndex();
                        window.templateManager.renderList();
                        window.templateManager.updateTemplateInfo();
                    }
                    
                    alert(`✅ Successfully imported ${enhancedTemplates.length} templates from ${file.name}`);
                    
                } catch (error) {
                    console.error('❌ Import failed:', error);
                    alert('Import failed: ' + error.message);
                }
            };
            
            input.click();
        }
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        alert('Import failed: ' + error.message);
    }
};

// NEW: Show template file management menu
window.showTemplateFileMenu = function() {
    const userInfo = window.storage.getCurrentUserContext();
    const storageEnabled = window.storage.fileStorageEnabled;
    const autoRefreshActive = window.templateManager?.autoRefreshInterval ? 'Active' : 'Inactive';
    
    const menuHTML = `
        <div id="templateFileMenu" style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.15);
            z-index: 10000;
            min-width: 400px;
            font-family: system-ui, -apple-system, sans-serif;
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #374151;">📁 Template File Management</h3>
                <button onclick="document.getElementById('templateFileMenu').remove()" 
                        style="background: none; border: none; font-size: 18px; cursor: pointer; color: #9ca3af;">✕</button>
            </div>
            
            <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 14px;">
                <strong>📊 Current Status:</strong><br>
                User: ${userInfo.username} (${userInfo.groupname})<br>
                File Storage: ${storageEnabled ? '✅ Enabled' : '❌ Disabled'}<br>
                Auto-refresh: ${autoRefreshActive}<br>
                Templates: ${window.templateManager?.templates?.length || 0}
            </div>
            
            <div style="display: grid; gap: 10px;">
                <button onclick="showTemplateDirectory(); document.getElementById('templateFileMenu').remove();" 
                        style="padding: 10px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📁 Open Template Folder
                </button>
                
                <button onclick="refreshTemplatesFromFiles(); document.getElementById('templateFileMenu').remove();" 
                        style="padding: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Refresh from Files
                </button>
                
                <button onclick="exportAllTemplates(); document.getElementById('templateFileMenu').remove();" 
                        style="padding: 10px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📤 Export All Templates
                </button>
                
                <button onclick="importTemplatesFromFile(); document.getElementById('templateFileMenu').remove();" 
                        style="padding: 10px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📥 Import Templates
                </button>
                
                <hr style="margin: 10px 0; border: none; border-top: 1px solid #e5e7eb;">
                
                <button onclick="forceCleanupTemplates(); document.getElementById('templateFileMenu').remove();" 
                        style="padding: 10px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🧹 Clean Duplicate Templates
                </button>
                
                <button onclick="showStorageInfo(); document.getElementById('templateFileMenu').remove();" 
                        style="padding: 10px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    ℹ️ Storage Information
                </button>
            </div>
        </div>
        
        <div id="templateFileMenuOverlay" onclick="document.getElementById('templateFileMenu').remove();" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 9999;
        "></div>
    `;
    
    // Remove existing menu if present
    const existingMenu = document.getElementById('templateFileMenu');
    if (existingMenu) {
        existingMenu.remove();
    }
    const existingOverlay = document.getElementById('templateFileMenuOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }
    
    // Add new menu
    document.body.insertAdjacentHTML('beforeend', menuHTML);
};

// NEW: Restart auto-refresh for templates
window.restartAutoRefresh = function() {
    if (!window.templateManager) {
        console.warn('Template manager not available');
        return;
    }
    
    try {
        // Stop existing auto-refresh
        window.templateManager.stopAutoRefresh();
        
        // Start new auto-refresh
        setTimeout(() => {
            window.templateManager.startAutoRefresh();
            console.log('🔄 Auto-refresh restarted');
            
            if (window.templateManager.showTemporaryMessage) {
                window.templateManager.showTemporaryMessage('🔄 Auto-refresh restarted!', 'success');
            }
        }, 1000);
        
    } catch (error) {
        console.error('❌ Failed to restart auto-refresh:', error);
        alert('Failed to restart auto-refresh: ' + error.message);
    }
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

// NEW: Restore templates from backup
window.restoreTemplateBackup = async function() {
    try {
        console.log('📥 Restoring templates from backup...');
        
        const confirmMessage = `⚠️ Restore templates from backup?\n\nThis will:\n• Replace all current templates\n• Cannot be undone\n\nCreate a backup first?`;
        
        if (confirm(confirmMessage)) {
            // Create current backup first
            await createTemplateBackup();
        }
        
        // Use Electron API if available
        if (window.electronAPI && window.electronAPI.loadJsonFile) {
            const result = await window.electronAPI.loadJsonFile();
            
            if (result.success && result.data) {
                let backupData = result.data;
                
                // Handle different backup formats
                if (backupData.templates && Array.isArray(backupData.templates)) {
                    // New backup format with metadata
                    const restoredTemplates = backupData.templates;
                    
                    // Update template manager
                    if (window.templateManager) {
                        window.templateManager.templates = restoredTemplates;
                        
                        // Save to storage
                        if (window.storage) {
                            await window.storage.saveTemplates(restoredTemplates);
                        }
                        
                        // Refresh UI
                        window.templateManager.invalidateCache();
                        window.templateManager.buildSearchIndex();
                        window.templateManager.renderList();
                        window.templateManager.updateTemplateInfo();
                    }
                    
                    const backupInfo = backupData.metadata ? 
                        `\nBackup from: ${new Date(backupData.metadata.createdAt).toLocaleString()}\nOriginal user: ${backupData.metadata.user}` : '';
                    
                    alert(`✅ Templates restored successfully!\n\nRestored: ${restoredTemplates.length} templates${backupInfo}`);
                    
                } else if (Array.isArray(backupData)) {
                    // Legacy backup format (just templates array)
                    const restoredTemplates = backupData;
                    
                    // Update template manager
                    if (window.templateManager) {
                        window.templateManager.templates = restoredTemplates;
                        
                        // Save to storage
                        if (window.storage) {
                            await window.storage.saveTemplates(restoredTemplates);
                        }
                        
                        // Refresh UI
                        window.templateManager.invalidateCache();
                        window.templateManager.buildSearchIndex();
                        window.templateManager.renderList();
                        window.templateManager.updateTemplateInfo();
                    }
                    
                    alert(`✅ Templates restored successfully!\n\nRestored: ${restoredTemplates.length} templates (legacy format)`);
                    
                } else {
                    alert('❌ Invalid backup file format');
                }
                
            } else {
                alert('❌ Failed to load backup file or operation cancelled');
            }
        } else {
            alert('❌ Backup restore not available in browser mode');
        }
        
    } catch (error) {
        console.error('❌ Backup restore failed:', error);
        alert('Backup restore failed: ' + error.message);
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

// =================== MORE MENU PANEL ACTIONS ===================

// Duplicate current template from panel
window.duplicateCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('duplicateAction');
    
    if (!template) {
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'No template selected');
        }
        return;
    }
    
    if (enhancedActions.setActionLoading) {
        enhancedActions.setActionLoading(actionEl, true);
    }
    
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
        
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template duplicated successfully!');
        }
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
        }, 1500);
        
        console.log('✅ Template duplicated successfully');
        
    } catch (error) {
        console.error('❌ Error duplicating template:', error);
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to duplicate template');
        }
    } finally {
        if (enhancedActions.setActionLoading) {
            enhancedActions.setActionLoading(actionEl, false);
        }
    }
};

// Export current template from panel
window.exportCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('exportAction');
    
    if (!template) {
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'No template selected');
        }
        return;
    }
    
    if (enhancedActions.setActionLoading) {
        enhancedActions.setActionLoading(actionEl, true);
    }
    
    if (enhancedActions.showProgress) {
        enhancedActions.showProgress('Preparing template for export...', 25);
    }
    
    try {
        console.log('📤 Exporting template:', template.name);
        
        // Check if Electron API is available
        if (!window.electronAPI || !window.electronAPI.exportTemplatesToLocation) {
            throw new Error('Export functionality not available (requires Electron)');
        }
        
        if (enhancedActions.showProgress) {
            enhancedActions.showProgress('Saving template file...', 75);
        }
        
        // Clean template for export
        const cleanTemplate = window.utils.cleanTemplateForStorage(template);
        
        // Use Electron API to export
        const result = await window.electronAPI.exportTemplatesToLocation([cleanTemplate], 'single');
        
        if (result.success) {
            if (enhancedActions.showActionFeedback) {
                enhancedActions.showActionFeedback(actionEl, 'success', 'Template exported successfully!');
            }
            if (enhancedActions.showProgress) {
                enhancedActions.showProgress('Export completed!', 100);
            }
            
            // Show success message with file path
            if (window.app && window.app.showSuccess) {
                window.app.showSuccess(`Template exported to: ${result.filePath}`);
            }
            
            setTimeout(() => {
                if (enhancedActions.hideProgress) {
                    enhancedActions.hideProgress();
                }
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
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', `Export failed: ${error.message}`);
        }
        if (enhancedActions.hideProgress) {
            enhancedActions.hideProgress();
        }
        
        if (window.app && window.app.showError) {
            window.app.showError(`Export failed: ${error.message}`);
        }
    } finally {
        if (enhancedActions.setActionLoading) {
            enhancedActions.setActionLoading(actionEl, false);
        }
    }
};

// Delete current template from panel
window.deleteCurrentTemplate = async function() {
    const template = window.templateManager?.currentTemplate;
    const actionEl = document.getElementById('deleteActionPanel');
    
    if (!template) {
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'No template selected');
        }
        return;
    }
    
    if (!template.isOwn) {
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'Can only delete your own templates');
        }
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
    
    if (enhancedActions.setActionLoading) {
        enhancedActions.setActionLoading(actionEl, true);
    }
    
    try {
        console.log('🗑️ Deleting template:', template.name);
        
        // Use template manager's delete function
        await window.templateManager.deleteCurrent();
        
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template deleted successfully!');
        }
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
        }, 1500);
        
        console.log('✅ Template deleted successfully');
        
    } catch (error) {
        console.error('❌ Error deleting template:', error);
        if (enhancedActions.showActionFeedback) {
            enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to delete template');
        }
    } finally {
        if (enhancedActions.setActionLoading) {
            enhancedActions.setActionLoading(actionEl, false);
        }
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
});

// Make enhancedActions globally available
window.enhancedActions = enhancedActions;

console.log('✅ Enhanced Actions module loaded with More Menu + Template File Management functionality');