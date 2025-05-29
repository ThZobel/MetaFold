// Main App Controller

const app = {
    initialized: false,
    
    // App initialization
    init() {
        if (this.initialized) return;
        
        console.log('Starting app initialization...');
        
        try {
            // Check if basic modules are available
            if (typeof templateManager === 'undefined') {
                console.log('templateManager not yet available, waiting...');
                setTimeout(() => this.init(), 50);
                return;
            }
            
            // Initialize modules
            if (templateManager && typeof templateManager.init === 'function') {
                templateManager.init();
                console.log('templateManager initialized');
            }
            
            if (projectManager && typeof projectManager.init === 'function') {
                projectManager.init();
                console.log('projectManager initialized');
            }
            
            // Platform-specific adjustments
            if (appUtils && typeof appUtils.applyPlatformStyles === 'function') {
                appUtils.applyPlatformStyles();
            }
            
            // Event Listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('✅ App successfully initialized');
            
        } catch (error) {
            console.error('❌ Error during app initialization:', error);
            setTimeout(() => this.init(), 100);
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Close modal on click outside
        window.onclick = (event) => {
            const modal = document.getElementById('templateModal');
            if (event.target === modal && typeof templateModal !== 'undefined') {
                templateModal.close();
            }
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && typeof templateModal !== 'undefined') {
                templateModal.close();
            }
            
            if (event.ctrlKey && event.key === 'n' && typeof templateModal !== 'undefined') {
                event.preventDefault();
                templateModal.show();
            }
        });
        
        console.log('Event listeners set up');
    }
};

// Wait until DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => app.init(), 200);
    });
} else {
    // DOM already loaded
    setTimeout(() => app.init(), 200);
}