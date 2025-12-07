/**
 * Initialize Components
 * Loads dynamic components at startup.
 */
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏗️ Initializing components...');

    try {
        // Load Settings Modal
        await window.componentLoader.load('settings-modal-container', 'components/modals/settings-modal.html');

        // Load Left Sidebar
        await window.componentLoader.load('left-sidebar-container', 'components/sidebars/left-sidebar.html');

        // Load Create Project Tab
        await window.componentLoader.load('createTabContent', 'components/tabs/create-project-tab.html');

        // Load Discover Projects Tab
        await window.componentLoader.load('discoverTabContent', 'components/tabs/discover-projects-tab.html');

        // Load Visualize Data Tab
        await window.componentLoader.load('visualizeTabContent', 'components/tabs/visualize-data-tab.html');

        // Load Right Sidebar
        await window.componentLoader.load('right-sidebar-container', 'components/sidebars/right-sidebar.html');
        // Initialize sidebar integration (toggles, visibility) after loading
        if (window.sidebarIntegration && window.sidebarIntegration.init) {
            window.sidebarIntegration.init();
        }

        // Load Template Modal
        await window.componentLoader.load('templateModal', 'components/modals/template-modal.html');

        // Load Slide-out Panel (depends on Create Project Tab)
        await window.componentLoader.load('slide-out-panel-container', 'components/panels/slide-out-panel.html');

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
