// Haupt-App-Controller

const app = {
    initialized: false,
    
    // App-Initialisierung
    init() {
        if (this.initialized) return;
        
        console.log('Starte App-Initialisierung...');
        
        try {
            // Prüfen ob grundlegende Module verfügbar sind
            if (typeof templateManager === 'undefined') {
                console.log('templateManager noch nicht verfügbar, warte...');
                setTimeout(() => this.init(), 50);
                return;
            }
            
            // Module initialisieren
            if (templateManager && typeof templateManager.init === 'function') {
                templateManager.init();
                console.log('templateManager initialisiert');
            }
            
            if (projectManager && typeof projectManager.init === 'function') {
                projectManager.init();
                console.log('projectManager initialisiert');
            }
            
            // Plattform-spezifische Anpassungen
            if (appUtils && typeof appUtils.applyPlatformStyles === 'function') {
                appUtils.applyPlatformStyles();
            }
            
            // Event Listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('✅ App erfolgreich initialisiert');
            
        } catch (error) {
            console.error('❌ Fehler bei App-Initialisierung:', error);
            setTimeout(() => this.init(), 100);
        }
    },

    // Event Listeners einrichten
    setupEventListeners() {
        // Modal schließen bei Klick außerhalb
        window.onclick = (event) => {
            const modal = document.getElementById('templateModal');
            if (event.target === modal && typeof templateModal !== 'undefined') {
                templateModal.close();
            }
        };

        // Keyboard-Shortcuts
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && typeof templateModal !== 'undefined') {
                templateModal.close();
            }
            
            if (event.ctrlKey && event.key === 'n' && typeof templateModal !== 'undefined') {
                event.preventDefault();
                templateModal.show();
            }
        });
        
        console.log('Event Listeners eingerichtet');
    }
};

// Warten bis DOM vollständig geladen ist
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => app.init(), 200);
    });
} else {
    // DOM bereits geladen
    setTimeout(() => app.init(), 200);
}