/**
 * Tab-Based Footer Control
 * Manages footer visibility based on active tab
 * Hides action buttons in Discover Projects Tab, keeps messages visible
 */

(function () {
    'use strict';

    console.log('🔧 Initializing Tab-Based Footer Control...');

    /**
     * Update footer visibility based on active tab
     */
    function updateFooterVisibility() {
        const discoverTab = document.getElementById('discoverTabContent');
        const createTab = document.getElementById('createTabContent');
        const footerActionsContainer = document.querySelector('.main-content-footer .footer-actions-container');

        // Buttons
        const createProjectBtn = document.getElementById('createProjectBtn');
        const sendToIntegrationsBtn = document.getElementById('sendToIntegrationsBtn');
        const editTemplateBtn = document.getElementById('editTemplateBtn');
        const clearTemplateBtn = document.getElementById('clearTemplateBtn');
        const saveTemplateBtn = document.getElementById('saveTemplateBtn');

        // Additional dynamic buttons
        const updateProjectBtn = document.getElementById('updateProjectBtn');
        const updateAndSendBtn = document.getElementById('updateAndSendBtn');

        if (!footerActionsContainer) {
            console.warn('⚠️ Footer actions container not found');
            return;
        }

        // Check which tab is active
        const isDiscoverTabActive = discoverTab && discoverTab.classList.contains('active');
        const isCreateTabActive = createTab && createTab.classList.contains('active');

        if (isCreateTabActive) {
            console.log('🎯 Create Tab active: Updating Create Project footer');

            footerActionsContainer.style.display = 'block';

            const currentTmpl = window.templateManager?.currentTemplate;
            const isLoadedProject = currentTmpl?.isLoadedProject === true;
            const hasTemplate = !!currentTmpl && !isLoadedProject;

            // Show Create Project specific buttons only when a normal template is active
            if (createProjectBtn) createProjectBtn.style.display = hasTemplate ? 'inline-block' : 'none';
            if (editTemplateBtn) editTemplateBtn.style.display = hasTemplate ? 'inline-block' : 'none';
            if (clearTemplateBtn) clearTemplateBtn.style.display = hasTemplate ? 'inline-block' : 'none';
            if (saveTemplateBtn) saveTemplateBtn.style.display = hasTemplate ? 'inline-block' : 'none';

            // Show Update / Send buttons when an existing project is loaded
            if (updateProjectBtn) updateProjectBtn.style.display = isLoadedProject ? 'inline-block' : 'none';
            if (updateAndSendBtn) updateAndSendBtn.style.display = isLoadedProject ? 'inline-block' : 'none';

            // Hide standalone Send to Integrations button
            if (sendToIntegrationsBtn) sendToIntegrationsBtn.style.display = 'none';

        } else {
            // For Discover Tab, Visualize Tab, Settings Tab, etc.: hide footer action buttons
            console.log('📁 Non-Create Tab active: Hiding footer actions container');

            footerActionsContainer.style.display = 'none';

            if (sendToIntegrationsBtn) sendToIntegrationsBtn.style.display = 'none';
            if (createProjectBtn) createProjectBtn.style.display = 'none';
            if (editTemplateBtn) editTemplateBtn.style.display = 'none';
            if (clearTemplateBtn) clearTemplateBtn.style.display = 'none';
            if (saveTemplateBtn) saveTemplateBtn.style.display = 'none';
            if (updateProjectBtn) updateProjectBtn.style.display = 'none';
            if (updateAndSendBtn) updateAndSendBtn.style.display = 'none';
        }
    }

    // Expose updateFooterVisibility globally
    window.updateFooterVisibility = updateFooterVisibility;

    /**
     * Hook into existing switchMainTab function
     */
    function hookSwitchMainTab() {
        const originalSwitchMainTab = window.switchMainTab;

        if (typeof originalSwitchMainTab === 'function') {
            window.switchMainTab = function (tabName) {
                // Call original function
                originalSwitchMainTab.call(this, tabName);

                // Update footer visibility after tab switch
                setTimeout(updateFooterVisibility, 50);
            };

            console.log('✅ switchMainTab hooked successfully');
        } else {
            console.warn('⚠️ switchMainTab function not found, creating new one');

            // Fallback: Create switchMainTab if it doesn't exist
            window.switchMainTab = function (tabName) {
                console.log('🔄 Switching to tab:', tabName);

                // Hide all tabs
                const tabs = document.querySelectorAll('.main-tab-content');
                tabs.forEach(tab => tab.classList.remove('active'));

                // Hide all tab buttons' active state
                const tabButtons = document.querySelectorAll('.main-tab');
                tabButtons.forEach(btn => btn.classList.remove('active'));

                // Show selected tab
                const selectedTab = document.getElementById(tabName + 'TabContent');
                const selectedButton = document.getElementById(tabName + 'Tab');

                if (selectedTab) selectedTab.classList.add('active');
                if (selectedButton) selectedButton.classList.add('active');

                // Update footer visibility
                setTimeout(updateFooterVisibility, 50);
            };
        }
    }

    /**
     * Initialize footer control
     */
    function init() {
        console.log('🚀 Tab Footer Control initializing...');

        // Hook into tab switching
        hookSwitchMainTab();

        // Set initial state
        updateFooterVisibility();

        console.log('✅ Tab Footer Control initialized');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded
        setTimeout(init, 100);
    }

    // Make updateFooterVisibility globally available for debugging
    window.updateFooterVisibility = updateFooterVisibility;

})();

console.log('✅ Tab Footer Control script loaded');
