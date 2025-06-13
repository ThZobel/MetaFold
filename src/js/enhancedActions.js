// Enhanced Actions with More Menu - MetaFold
// Add this to a new file: js/enhancedActions.js

const enhancedActions = {
    // Panel state
    isOpen: false,
    currentTemplate: null,
    
    // Initialize enhanced actions
    init() {
        console.log('🔧 Initializing Enhanced Actions...');
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update panel content initially
        this.updatePanelContent();
        
        console.log('✅ Enhanced Actions initialized');
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
        metaEl.innerHTML = `Created by <strong>${this.escapeHtml(creator)}</strong> (${this.escapeHtml(group)}) on ${createdDate}`;
        
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
        
        statsEl.innerHTML = stats.join('');
    },
    
    // Update action button states
    updateActionStates(template) {
        const duplicateAction = document.getElementById('duplicateAction');
        const exportAction = document.getElementById('exportAction');
        const deleteAction = document.getElementById('deleteActionPanel');
        
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
        
        // Add feedback class
        actionEl.classList.add(type);
        
        // Update description temporarily
        const descEl = actionEl.querySelector('.panel-action-description');
        if (descEl) {
            const originalText = descEl.textContent;
            descEl.textContent = message;
            
            // Restore original text after delay
            setTimeout(() => {
                descEl.textContent = originalText;
                actionEl.classList.remove(type);
            }, 3000);
        }
    },
    
    // Set action loading state
    setActionLoading(actionEl, loading) {
        if (!actionEl) return;
        
        if (loading) {
            actionEl.classList.add('loading');
        } else {
            actionEl.classList.remove('loading');
        }
    }
};

// Global functions for onclick handlers

// Toggle more menu
window.toggleMoreMenu = function() {
    enhancedActions.toggleMoreMenu();
};

// Close more menu
window.closeMoreMenu = function() {
    enhancedActions.closeMoreMenu();
};

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
        
        // Add to template manager
        if (window.templateManager && window.templateManager.add) {
            window.templateManager.add(duplicatedTemplate);
            
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template duplicated successfully!');
            
            // Close panel after success
            setTimeout(() => {
                enhancedActions.closeMoreMenu();
            }, 1500);
            
            console.log('✅ Template duplicated successfully');
        } else {
            throw new Error('Template manager not available');
        }
        
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
    
    try {
        console.log('📤 Exporting template:', template.name);
        
        // Prepare template for export
        const exportData = {
            name: template.name,
            description: template.description || '',
            type: template.type,
            structure: template.structure || '',
            metadata: template.metadata || {},
            createdBy: template.createdBy,
            createdByGroup: template.createdByGroup,
            createdAt: template.createdAt,
            exportedAt: new Date().toISOString(),
            exportedBy: window.userManager?.currentUser || 'Unknown',
            version: '1.1.0',
            source: 'MetaFold'
        };
        
        // Use Electron's save dialog if available
        if (window.electronAPI && window.electronAPI.saveJsonFile) {
            const result = await window.electronAPI.saveJsonFile(exportData);
            if (result.success) {
                enhancedActions.showActionFeedback(actionEl, 'success', 'Template exported successfully!');
            } else {
                throw new Error(result.message || 'Save failed');
            }
        } else {
            // Fallback: Browser download
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `${template.name.replace(/[^a-zA-Z0-9]/g, '_')}_template.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            enhancedActions.showActionFeedback(actionEl, 'success', 'Template downloaded!');
        }
        
        // Close panel after success
        setTimeout(() => {
            enhancedActions.closeMoreMenu();
        }, 1500);
        
        console.log('✅ Template exported successfully');
        
    } catch (error) {
        console.error('❌ Error exporting template:', error);
        enhancedActions.showActionFeedback(actionEl, 'error', 'Failed to export template');
    } finally {
        enhancedActions.setActionLoading(actionEl, false);
    }
};

// Make enhancedActions globally available
window.enhancedActions = enhancedActions;

console.log('✅ Enhanced Actions module loaded');