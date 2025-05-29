// Project-Manager für das Erstellen von Projekten

const projectManager = {
    // Pfad durchsuchen
    async browsePath() {
        if (window.electronAPI) {
            try {
                const selectedPath = await window.electronAPI.selectFolder();
                if (selectedPath) {
                    document.getElementById('targetPath').value = selectedPath;
                    this.updatePathPreview();
                }
            } catch (error) {
                console.error('Fehler beim Ordner auswählen:', error);
                alert('Fehler beim Öffnen des Datei-Dialogs');
            }
        } else {
            const path = prompt('Gib den gewünschten Pfad ein:', this.getDefaultPath());
            if (path) {
                document.getElementById('targetPath').value = path;
                this.updatePathPreview();
            }
        }
    },

    // Projekt erstellen
    async createProject() {
        if (!templateManager.currentTemplate) return;
        
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        
        if (!basePath || !projectName) {
            this.showError('Bitte wähle ein Basis-Verzeichnis und gib einen Projekt-Namen ein!');
            return;
        }

        // Experiment-Felder validieren (falls vorhanden)
        let experimentMetadata = null;
        if (templateManager.currentTemplate.type === 'experiment' && templateManager.currentTemplate.metadata) {
            const validationResult = experimentForm.validate();
            if (!validationResult.valid) {
                this.showError(validationResult.message);
                return;
            }
            experimentMetadata = experimentForm.collectData();
        }

        // Vorherige Nachrichten ausblenden
        this.hideMessages();
        
        if (window.electronAPI) {
            try {
                const result = await window.electronAPI.createProject(
                    basePath, 
                    projectName, 
                    templateManager.currentTemplate.structure,
                    experimentMetadata
                );
                
                if (result.success) {
                    // Pfad für Button escapen (doppelte Backslashes für Windows)
                    const escapedPath = result.projectPath.replace(/\\/g, '\\\\');
                    const successMessage = `
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <strong>✅ Erfolgreich!</strong><br>
                                Projekt "${projectName}" wurde in "${basePath}" erstellt.
                            </div>
                            <button class="btn btn-secondary" onclick="projectManager.openCreatedFolder('${escapedPath}')" style="margin-left: 15px; padding: 8px 16px;">
                                📂 Öffnen
                            </button>
                        </div>
                    `;
                    this.showSuccess(successMessage);
                } else {
                    this.showError(result.message);
                }
            } catch (error) {
                console.error('Fehler beim Erstellen des Projekts:', error);
                this.showError('Unerwarteter Fehler beim Erstellen des Projekts.');
            }
        } else {
            // Browser-Fallback
            const fullPath = basePath + (window.electronAPI && window.electronAPI.platform === 'win32' ? '\\' : '/') + projectName;
            const successMessage = `
                <strong>ℹ️ Browser-Modus</strong><br>
                Projekt würde in "${fullPath}" erstellt werden.<br>
                <small>Nutze die Desktop-App für echte Projekterstellung.</small>
            `;
            this.showSuccess(successMessage);
        }
    },

    // Standard-Pfad basierend auf Plattform (lokale Kopie)
    getDefaultPath() {
        if (window.utils) {
            return window.utils.getDefaultBasePath();
        }
        return 'C:\\Projekte\\';
    },

    // Pfad-Vorschau aktualisieren (lokale Kopie)
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

    // Error-Nachricht anzeigen (lokale Kopie)
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = `<strong>❌ Fehler!</strong><br>${message}`;
        errorMessage.style.display = 'block';
        
        // Nach 8 Sekunden ausblenden
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 8000);
    },

    // Success-Nachricht anzeigen (lokale Kopie)
    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        
        // Nach 8 Sekunden ausblenden
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 8000);
    },

    // Nachrichten ausblenden (lokale Kopie)
    hideMessages() {
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    },

    // Ordner öffnen (lokale Kopie)
    async openCreatedFolder(folderPath) {
        if (window.electronAPI) {
            try {
                await window.electronAPI.openFolder(folderPath);
            } catch (error) {
                console.error('Fehler beim Öffnen des Ordners:', error);
            }
        }
    },

    // Initialisierung
    init() {
        // Standard-Pfad setzen wenn Electron verfügbar
        if (window.utils) {
            document.getElementById('targetPath').value = window.utils.getDefaultBasePath();
        }
        
        // Path Preview Update Event Listeners
        document.getElementById('targetPath').addEventListener('input', () => this.updatePathPreview());
        document.getElementById('projectName').addEventListener('input', () => this.updatePathPreview());
    }
};
window.projectManager = projectManager;