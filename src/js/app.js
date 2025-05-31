// Test App with userManager (Step 2)

const app = {
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        console.log('🚀 Starting MetaFold (Step 2: with userManager)...');
        
        try {
            // Check what modules are available
            console.log('=== AVAILABLE MODULES ===');
            const modules = ['storage', 'userManager', 'templateManager', 'templateTypeManager', 'templateModal', 'projectManager', 'settingsManager'];
            
            modules.forEach(module => {
                if (window[module]) {
                    console.log(`✅ ${module}: Available`);
                } else {
                    console.log(`❌ ${module}: Missing`);
                }
            });
            
            // Initialize userManager if available
            if (window.userManager) {
                console.log('🔧 Initializing userManager...');
                const userResult = await window.userManager.init();
                console.log('✅ User initialized:', userResult);
            }
            
            // Initialize other available modules
            this.initializeAvailableModules();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Platform-specific adjustments
            if (typeof appUtils !== 'undefined' && appUtils && typeof appUtils.applyPlatformStyles === 'function') {
                appUtils.applyPlatformStyles();
            }
            
            this.initialized = true;
            console.log('✅ MetaFold started successfully (Step 2)!');
            
            // Show current user info
            if (window.userManager) {
                this.showSuccess(`App gestartet! Benutzer: ${window.userManager.currentUser} (${window.userManager.currentGroup})`);
            } else {
                this.showSuccess('App gestartet! (ohne User-System)');
            }
            
        } catch (error) {
            console.error('❌ Error during app initialization:', error);
            this.showError('Fehler beim Starten: ' + error.message);
        }
    },

    initializeAvailableModules() {
        console.log('🔧 Initializing available modules...');
        
        // Initialize template type manager first (if available)
        if (window.templateTypeManager && typeof window.templateTypeManager.init === 'function') {
            try {
                window.templateTypeManager.init();
                console.log('✅ templateTypeManager initialized');
            } catch (error) {
                console.error('❌ Error initializing templateTypeManager:', error);
            }
        }

        // Initialize template manager
        if (window.templateManager && typeof window.templateManager.init === 'function') {
            try {
                window.templateManager.init();
                console.log('✅ templateManager initialized');
            } catch (error) {
                console.error('❌ Error initializing templateManager:', error);
            }
        }
        
        // Initialize project manager if available
        if (window.projectManager && typeof window.projectManager.init === 'function') {
            try {
                window.projectManager.init();
                console.log('✅ projectManager initialized');
            } catch (error) {
                console.error('❌ Error initializing projectManager:', error);
            }
        }

        // Initialize settings manager if available
        if (window.settingsManager && typeof window.settingsManager.init === 'function') {
            try {
                window.settingsManager.init();
                console.log('✅ settingsManager initialized');
            } catch (error) {
                console.error('❌ Error initializing settingsManager:', error);
            }
        }

        // Initialize metadata editor if available
        if (window.metadataEditor && typeof window.metadataEditor.init === 'function') {
            try {
                window.metadataEditor.init();
                console.log('✅ metadataEditor initialized');
            } catch (error) {
                console.error('❌ Error initializing metadataEditor:', error);
            }
        }

        // Initialize experiment form if available
        if (window.experimentForm && typeof window.experimentForm.init === 'function') {
            try {
                window.experimentForm.init();
                console.log('✅ experimentForm initialized');
            } catch (error) {
                console.error('❌ Error initializing experimentForm:', error);
            }
        }

        // Initialize template modal if available
        if (window.templateModal && typeof window.templateModal.init === 'function') {
            try {
                window.templateModal.init();
                console.log('✅ templateModal initialized');
            } catch (error) {
                console.error('❌ Error initializing templateModal:', error);
            }
        }
    },
    
    setupEventListeners() {
        // Close modal on click outside
        window.onclick = (event) => {
            const modal = document.getElementById('templateModal');
            if (event.target === modal && window.templateModal) {
                window.templateModal.close();
            }
        };

        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && window.templateModal) {
                window.templateModal.close();
            }
            
            if (event.ctrlKey && event.key === 'n' && window.templateModal) {
                event.preventDefault();
                window.templateModal.show();
            }
        });
        
        console.log('✅ Event listeners set up');
    },

    showSuccess(message) {
        console.log('✅ Success:', message);
        this.showMessage(message, 'success');
    },

    showError(message) {
        console.error('❌ Error:', message);
        this.showMessage(message, 'error');
    },

    showMessage(message, type) {
        const messageDiv = document.createElement('div');
        const isError = type === 'error';
        
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${isError ? '#fee' : '#efe'};
            color: ${isError ? '#c33' : '#363'};
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid ${isError ? '#fcc' : '#cfc'};
            max-width: 400px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        `;
        
        messageDiv.innerHTML = `
            <strong>${isError ? '⚠️' : '✅'} ${isError ? 'Fehler' : 'Erfolgreich'}</strong><br>
            ${message}
            <br><br>
            <button onclick="this.parentElement.remove()" style="background: ${isError ? '#c33' : '#363'}; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;">
                Schließen
            </button>
        `;
        
        document.body.appendChild(messageDiv);
        
        // Auto-remove after time
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, isError ? 15000 : 5000);
    }
};

// Wait until DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, starting app in 200ms...');
        setTimeout(() => app.init(), 200);
    });
} else {
    console.log('DOM already loaded, starting app in 200ms...');
    setTimeout(() => app.init(), 200);
}