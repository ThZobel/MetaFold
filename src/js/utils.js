// Utility-Funktionen für die Anwendung

const appUtils = {
    // Sichere ID-Generierung für HTML-Elemente
    createSafeId(fieldName) {
        return fieldName.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Standard-Pfad basierend auf Plattform
    getDefaultPath() {
        if (window.utils) {
            return window.utils.getDefaultBasePath();
        }
        return 'C:\\Projekte\\';
    },

    // Default-Werte für verschiedene Feld-Typen
    getDefaultValueForType(type) {
        switch (type) {
            case 'number': return 0;
            case 'checkbox': return false;
            case 'date': return '';
            default: return '';
        }
    },

    // Default-Werte für Schema-Typen
    getDefaultValueForSchemaType(type) {
        switch (type) {
            case 'string': return '';
            case 'number':
            case 'integer': return 0;
            case 'boolean': return false;
            case 'array': return [];
            case 'object': return {};
            default: return '';
        }
    },

    // Pfad-Vorschau aktualisieren
    updatePathPreview() {
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        const preview = document.getElementById('fullPathPreview');
        
        if (basePath && projectName) {
            const separator = window.electronAPI && window.electronAPI.platform === 'win32' ? '\\' : '/';
            preview.textContent = basePath + separator + projectName;
            preview.style.color = '#10b981';
        } else {
            preview.textContent = 'Wähle Verzeichnis und Projekt-Name';
            preview.style.color = '#9ca3af';
        }
    },

    // Error-Nachricht anzeigen
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = `<strong>❌ Fehler!</strong><br>${message}`;
        errorMessage.style.display = 'block';
        
        // Nach 8 Sekunden ausblenden
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 8000);
    },

    // Success-Nachricht anzeigen
    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        
        // Nach 8 Sekunden ausblenden
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 8000);
    },

    // Nachrichten ausblenden
    hideMessages() {
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    },

    // Plattform-spezifische Anpassungen
    applyPlatformStyles() {
        if (window.electronAPI && window.electronAPI.platform === 'darwin') {
            document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        }
    },

    // Ordner öffnen (falls möglich)
    async openCreatedFolder(folderPath) {
        if (window.electronAPI) {
            try {
                await window.electronAPI.openFolder(folderPath);
            } catch (error) {
                console.error('Fehler beim Öffnen des Ordners:', error);
            }
        }
    }
};

// Global verfügbar machen als appUtils (um Konflikt zu vermeiden)
window.appUtils = appUtils;