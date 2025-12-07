const sidebarIntegration = {
    init() {
        console.log('📋 Initializing Sidebar Integration...');
        this.initToggles();
        this.initCopyButtons();
        this.initHeaderClicks(); // NEW: Click header to toggle
        this.updateVisibility();

        // Initialize visibility based on global settings
        this.updateSidebarVisibilityFromSettings();

        // Listen for settings changes if possible (optional, but good practice)
        // For now, we rely on the settings modal to trigger updates or page reload
        window.addEventListener('settingsChanged', () => {
            this.updateSidebarVisibilityFromSettings();
        });

        // NEW: Listen for settings initialization
        window.addEventListener('settingsLoaded', () => {
            console.log('📋 Sidebar: Settings loaded event received');
            this.updateSidebarVisibilityFromSettings();
        });

        // NEW: Listen for template selection
        window.addEventListener('templateSelected', (e) => {
            console.log('📋 Sidebar: Template selected event received', e.detail);
            this.updateSidebarVisibilityFromSettings();
        });
    },

    async updateSidebarVisibilityFromSettings() {
        console.log('📋 Sidebar: Updating visibility from settings...');

        const elabCard = document.getElementById('elabftwIntegration');
        const omeroCard = document.getElementById('omeroIntegration');
        const rspaceCard = document.getElementById('rspaceIntegration');

        const elabToggle = document.getElementById('sendToElabFTW');
        const omeroToggle = document.getElementById('sendToOMERO');
        const rspaceToggle = document.getElementById('sendToRSpace');

        // Retry mechanism if settingsManager is not ready
        if (!window.settingsManager) {
            console.warn('⚠️ Sidebar: settingsManager not found, retrying in 500ms...');
            // Ensure they are hidden while waiting
            if (elabCard) elabCard.style.display = 'none';
            if (omeroCard) omeroCard.style.display = 'none';
            if (rspaceCard) rspaceCard.style.display = 'none';

            setTimeout(() => this.updateSidebarVisibilityFromSettings(), 500);
            return;
        }

        try {
            // 1. Get Global Settings (Master Switch for Visibility)
            const elabRaw = await window.settingsManager.get('elabftw.enabled');
            const omeroRaw = await window.settingsManager.get('omero.enabled');
            const rspaceRaw = await window.settingsManager.get('rspace.enabled');

            console.log('📋 Sidebar Settings Raw:', { elab: elabRaw, omero: omeroRaw, rspace: rspaceRaw });

            const elabEnabled = !!elabRaw;
            const omeroEnabled = !!omeroRaw;
            const rspaceEnabled = !!rspaceRaw;

            // 2. Apply Visibility to UI (Global Settings ONLY)
            if (elabCard) elabCard.style.display = elabEnabled ? 'block' : 'none';
            if (omeroCard) omeroCard.style.display = omeroEnabled ? 'block' : 'none';
            if (rspaceCard) rspaceCard.style.display = rspaceEnabled ? 'block' : 'none';

            // 3. Get Template Preferences (Toggle Switch State)
            let templateElab = true; // Default to enabled if template doesn't specify
            let templateOmero = true;
            let templateRSpace = true;

            if (window.templateManager && window.templateManager.currentTemplate) {
                const t = window.templateManager.currentTemplate;

                // Check if template has specific integration requirements
                if (t.integrations) {
                    if (t.integrations.elabftw === false) templateElab = false;
                    if (t.integrations.omero === false) templateOmero = false;
                    if (t.integrations.rspace === false) templateRSpace = false;
                }
            }

            // 4. Apply Toggle State (Template Settings)
            // Only update if the toggle exists and visibility is enabled
            if (elabToggle && elabEnabled) {
                elabToggle.checked = templateElab;
                this.toggleSection('elabftwBody', templateElab);
            }

            if (omeroToggle && omeroEnabled) {
                omeroToggle.checked = templateOmero;
                this.toggleSection('omeroBody', templateOmero);
            }

            if (rspaceToggle && rspaceEnabled) {
                rspaceToggle.checked = templateRSpace;
                this.toggleSection('rspaceBody', templateRSpace);
            }

            console.log('📋 Sidebar State Updated:', {
                Visibility: { elab: elabEnabled, omero: omeroEnabled, rspace: rspaceEnabled },
                Toggles: { elab: templateElab, omero: templateOmero, rspace: templateRSpace }
            });

        } catch (error) {
            console.error('❌ Error updating sidebar visibility:', error);
        }
    },

    initToggles() {
        // elabFTW Toggle
        const elabToggle = document.getElementById('sendToElabFTW');
        if (elabToggle) {
            // Set initial state
            this.toggleSection('elabftwBody', elabToggle.checked);

            elabToggle.addEventListener('change', () => {
                this.toggleSection('elabftwBody', elabToggle.checked);
                // Trigger any existing logic if needed
                if (typeof window.handleElabFTWChange === 'function') {
                    window.handleElabFTWChange();
                }
            });
        }

        // OMERO Toggle
        const omeroToggle = document.getElementById('sendToOMERO');
        if (omeroToggle) {
            // Set initial state
            this.toggleSection('omeroBody', omeroToggle.checked);

            omeroToggle.addEventListener('change', () => {
                this.toggleSection('omeroBody', omeroToggle.checked);
                // Existing logic is called via inline onchange in HTML, 
                // but we can also call it here to be safe or if we remove inline
                if (typeof window.handleSendToOMEROChange === 'function') {
                    // window.handleSendToOMEROChange(); 
                    // Don't call if inline is present to avoid double call, 
                    // but here we are just managing UI visibility
                }
            });
        }

        // RSpace Toggle
        const rspaceToggle = document.getElementById('sendToRSpace');
        if (rspaceToggle) {
            // Set initial state
            this.toggleSection('rspaceBody', rspaceToggle.checked);

            rspaceToggle.addEventListener('change', () => {
                this.toggleSection('rspaceBody', rspaceToggle.checked);
                if (rspaceToggle.checked && window.loadRSpaceFolders) {
                    window.loadRSpaceFolders();
                }
            });
        }
    },

    initHeaderClicks() {
        // Helper to add click listener to header
        const addHeaderListener = (cardId, toggleId) => {
            const card = document.getElementById(cardId);
            if (!card) return;

            const header = card.querySelector('.integration-header');
            if (!header) return;

            // Make it look clickable
            header.style.cursor = 'pointer';
            header.title = "Click to toggle integration";

            header.addEventListener('click', (e) => {
                // Prevent triggering if clicking the switch itself or its children
                if (e.target.closest('.switch')) return;

                const toggle = document.getElementById(toggleId);
                if (toggle) {
                    toggle.checked = !toggle.checked;
                    // Dispatch change event so listeners in initToggles fire
                    toggle.dispatchEvent(new Event('change'));
                }
            });
        };

        addHeaderListener('elabftwIntegration', 'sendToElabFTW');
        addHeaderListener('omeroIntegration', 'sendToOMERO');
        addHeaderListener('rspaceIntegration', 'sendToRSpace');
    },

    toggleSection(bodyId, isVisible) {
        const body = document.getElementById(bodyId);
        if (body) {
            if (isVisible) {
                body.style.display = 'block';
                // Add slide-down animation class if desired
            } else {
                body.style.display = 'none';
            }
        }
    },

    updateVisibility() {
        // This is now redundant as initToggles handles initial state, 
        // but keeping it for compatibility if called externally
        const elabToggle = document.getElementById('sendToElabFTW');
        if (elabToggle) {
            this.toggleSection('elabftwBody', elabToggle.checked);
        }

        const omeroToggle = document.getElementById('sendToOMERO');
        if (omeroToggle) {
            this.toggleSection('omeroBody', omeroToggle.checked);
        }

        const rspaceToggle = document.getElementById('sendToRSpace');
        if (rspaceToggle) {
            this.toggleSection('rspaceBody', rspaceToggle.checked);
            if (rspaceToggle.checked && window.loadRSpaceFolders) {
                window.loadRSpaceFolders();
            }
        }
    },

    initCopyButtons() {
        // Copy Path Button is handled globally via copyPathToClipboard function
        // which we will define below
    }
};

// Global function for Open Folder
window.openCurrentFolder = async function () {
    const previewDiv = document.getElementById('fullPathPreview');
    if (!previewDiv) return;

    const path = previewDiv.textContent;
    if (path === 'Choose directory...' || !path) {
        showToast('⚠️ No path selected to open');
        return;
    }

    try {
        if (window.electronAPI && window.electronAPI.openFolder) {
            const result = await window.electronAPI.openFolder(path);
            if (!result.success) {
                throw new Error(result.error || 'Unknown error');
            }
            // Optional: showToast('📂 Folder opened');
        } else {
            showToast('❌ Open folder not supported in this environment');
        }
    } catch (err) {
        console.error('Failed to open folder:', err);
        showToast('❌ Failed to open folder');
    }
};

// Global function for Copy Path
window.copyPathToClipboard = async function () {
    const previewDiv = document.getElementById('fullPathPreview');
    if (!previewDiv) return;

    const path = previewDiv.textContent;
    if (path === 'Choose directory...' || !path) {
        // Show small toast/tooltip
        showToast('⚠️ No path generated yet');
        return;
    }

    try {
        await navigator.clipboard.writeText(path);
        showToast('📋 Path copied to clipboard!');
    } catch (err) {
        console.error('Failed to copy path:', err);
        showToast('❌ Failed to copy path');
    }
};

// Helper for toast messages (simple implementation)
function showToast(message) {
    // Check if toast container exists, create if not
    let toast = document.getElementById('sidebarToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sidebarToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(30, 30, 46, 0.95);
            color: #fff;
            padding: 10px 20px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';

    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// elabFTW Category Helpers
let elabFTWCategoryDebounceTimer;

window.saveElabFTWCategoryToTemplate = function () {
    const categoryIdInput = document.getElementById('elabftwProjectCategory');
    if (!categoryIdInput) return;

    const categoryId = categoryIdInput.value.trim();

    // Update current template in memory if available
    if (window.templateManager && window.templateManager.currentTemplate) {
        if (!window.templateManager.currentTemplate.elabftw) {
            window.templateManager.currentTemplate.elabftw = {};
        }
        window.templateManager.currentTemplate.elabftw.categoryId = categoryId;
        console.log('🧪 Saved elabFTW category to template state:', categoryId);
    }
};

window.debounceElabFTWCategorySave = function () {
    clearTimeout(elabFTWCategoryDebounceTimer);
    elabFTWCategoryDebounceTimer = setTimeout(() => {
        window.saveElabFTWCategoryToTemplate();
    }, 500);
};

// Initialize when DOM is ready
// Note: init_components.js also calls init(), so we check if it's already done
// but adding listener here is safe as it just registers the object
document.addEventListener('DOMContentLoaded', () => {
    // We don't auto-init here because init_components.js handles the loading order
    // sidebarIntegration.init(); 
});

// Implement loadRSpaceFolders globally
window.loadRSpaceFolders = async function () {
    console.log('🧪 Loading RSpace folders...');
    const folderSelect = document.getElementById('rspaceFolderSelect');
    if (!folderSelect) return;

    if (!window.rspaceIntegration) {
        console.error('❌ RSpace Integration module not loaded');
        return;
    }

    try {
        // Show loading state
        const originalText = folderSelect.options[0].text;
        folderSelect.options[0].text = 'Loading...';
        folderSelect.disabled = true;

        // Fetch documents (folders are documents with type 'folder' or similar, 
        // but getDocuments returns everything. We might need to filter if RSpace distinguishes)
        // For now, we assume getDocuments returns a list where we can identify folders.
        // If getDocuments returns a structured object, we need to handle it.
        // Based on rspaceIntegration.js, it returns data directly from fetch.

        const data = await window.rspaceIntegration.getDocuments();

        // Reset select
        folderSelect.innerHTML = '<option value="">-- Root Folder --</option>';

        // Check data structure. RSpace API v1 /documents usually returns { documents: [...] } or just [...]
        let documents = [];
        if (data.documents) {
            documents = data.documents;
        } else if (Array.isArray(data)) {
            documents = data;
        } else if (data.page && data.page.content) {
            // Some RSpace APIs return page.content
            documents = data.page.content;
        }

        // Filter for folders if possible. Usually 'type' field.
        // If we don't know the type, we just list everything or check for 'folder' in name/type
        const folders = documents.filter(doc => {
            // Adjust this filter based on actual RSpace API response for folders
            // Common types: 'folder', 'notebook', 'document'
            // We probably want folders and notebooks to drop into.
            return doc.type === 'FOLDER' || doc.type === 'NOTEBOOK';
        });

        if (folders.length === 0 && documents.length > 0) {
            // If no folders found but documents exist, maybe we just show everything?
            // Or maybe the type check failed. Let's show all for now if we are unsure.
            console.warn('⚠️ No folders found with type FOLDER/NOTEBOOK, showing all items');
            documents.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.name;
                folderSelect.appendChild(option);
            });
        } else {
            folders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = folder.name;
                folderSelect.appendChild(option);
            });
        }

        console.log(`✅ Loaded ${folderSelect.options.length - 1} folders`);

    } catch (error) {
        console.error('❌ Error loading RSpace folders:', error);
        folderSelect.innerHTML = '<option value="">Error loading folders</option>';
    } finally {
        folderSelect.disabled = false;
    }
};

// Expose to window
window.sidebarIntegration = sidebarIntegration;
