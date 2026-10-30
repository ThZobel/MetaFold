/**
 * Initialize Components
 * Loads dynamic components at startup.
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏗️ Initializing components...');

    try {
        // Load all independent HTML components in parallel for fast startup
        await Promise.all([
            window.componentLoader.load('settings-modal-container', 'components/modals/settings-modal.html'),
            window.componentLoader.load('facet-search-modal-container', 'components/modals/facet-search-modal.html'),
            window.componentLoader.load('left-sidebar-container', 'components/sidebars/left-sidebar.html'),
            window.componentLoader.load('createTabContent', 'components/tabs/create-project-tab.html'),
            window.componentLoader.load('discoverTabContent', 'components/tabs/discover-projects-tab.html'),
            window.componentLoader.load('visualizeTabContent', 'components/tabs/visualize-data-tab.html'),
            window.componentLoader.load('right-sidebar-container', 'components/sidebars/right-sidebar.html'),
            window.componentLoader.load('templateModal', 'components/modals/template-modal.html'),
            window.componentLoader.load('upload-modal-container', 'components/modals/upload-template-modal.html'),
            window.componentLoader.load('slide-out-panel-container', 'components/panels/slide-out-panel.html')
        ]);

        if (window.facetSearch && window.facetSearch.init) {
            window.facetSearch.init();
        }

        if (window.fileScanner && window.fileScanner._applyVisibility) {
            window.fileScanner._applyVisibility();
        }

        // Initialize sidebar integration (toggles, visibility) after loading
        if (window.sidebarIntegration && window.sidebarIntegration.init) {
            window.sidebarIntegration.init();
        }

        // We can load other components here in the future

        // Re-initialize managers that depend on DOM elements
        if (window.projectManager && window.projectManager.setupEventListeners) {
            window.projectManager.setupEventListeners();
            window.projectManager.updatePathPreview();
        }

        if (window.templateManager && window.templateManager.renderList) {
            window.templateManager.renderList();
            window.templateManager.updateTemplateInfo();
        }

        console.log('✅ All components initialized');
    } catch (error) {
        console.error('❌ Error initializing components:', error);
    }
});
