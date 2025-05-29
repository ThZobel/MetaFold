const { contextBridge, ipcRenderer } = require('electron');

// Sichere API für den Renderer-Prozess
contextBridge.exposeInMainWorld('electronAPI', {
    // Ordner-Dialog öffnen
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    
    // Projekt erstellen (Haupt-API)
    createProject: (basePath, projectName, structure, metadata = null) => 
        ipcRenderer.invoke('create-project', basePath, projectName, structure, metadata),
    
    // Ordnerstruktur erstellen (Legacy für Kompatibilität)
    createFolders: (targetPath, structure) => 
        ipcRenderer.invoke('create-folders', targetPath, structure),
    
    // Ordner im Explorer öffnen
    openFolder: (folderPath) => 
        ipcRenderer.invoke('open-folder', folderPath),
    
    // JSON-Datei laden
    loadJsonFile: () => ipcRenderer.invoke('load-json-file'),
    
    // JSON-Datei speichern
    saveJsonFile: (data) => ipcRenderer.invoke('save-json-file', data),
    
    // Plattform-Info
    platform: process.platform
});

// Erweiterte Utilities
contextBridge.exposeInMainWorld('utils', {
    // Pfad-Utilities
    joinPath: (...paths) => {
        return paths.join(process.platform === 'win32' ? '\\' : '/');
    },
    
    // Pfad normalisieren
    normalizePath: (inputPath) => {
        return inputPath.replace(/[/\\]+/g, process.platform === 'win32' ? '\\' : '/');
    },
    
    // Pfad-Separator für aktuelle Plattform
    getPathSeparator: () => {
        return process.platform === 'win32' ? '\\' : '/';
    },
    
    // Basis-Pfad für Plattform
    getDefaultBasePath: () => {
        switch (process.platform) {
            case 'win32':
                return 'C:\\Projekte';
            case 'darwin':
                return process.env.HOME + '/Projects';
            default:
                return process.env.HOME + '/projects';
        }
    },
    
    // Vollständigen Pfad konstruieren
    buildFullPath: (basePath, projectName) => {
        const separator = process.platform === 'win32' ? '\\' : '/';
        return basePath + separator + projectName;
    },
    
    // Prüfen ob Pfad absolut ist
    isAbsolutePath: (inputPath) => {
        if (process.platform === 'win32') {
            // Windows: C:\ oder \\server\share
            return /^[a-zA-Z]:\\/.test(inputPath) || /^\\\\/.test(inputPath);
        } else {
            // Unix-like: /path
            return inputPath.startsWith('/');
        }
    },
    
    // Aktuelles Datum in verschiedenen Formaten
    getCurrentDate: (format = 'iso') => {
        const now = new Date();
        switch (format) {
            case 'iso':
                return now.toISOString().split('T')[0]; // YYYY-MM-DD
            case 'de':
                return now.toLocaleDateString('de-DE'); // DD.MM.YYYY
            case 'timestamp':
                return now.toISOString();
            default:
                return now.toISOString().split('T')[0];
        }
    },
    
    // String-Utilities für Template-Namen
    sanitizeProjectName: (name) => {
        // Ungültige Zeichen für Ordnernamen entfernen/ersetzen
        return name
            .replace(/[<>:"/\\|?*]/g, '_') // Ungültige Zeichen durch _ ersetzen
            .replace(/\s+/g, '_') // Leerzeichen durch _ ersetzen
            .replace(/_+/g, '_') // Mehrfache _ reduzieren
            .replace(/^_+|_+$/g, ''); // _ am Anfang/Ende entfernen
    },
    
    // Validate ob ein Projekt-Name gültig ist
    isValidProjectName: (name) => {
        if (!name || name.trim().length === 0) return false;
        
        // Reservierte Namen prüfen (Windows)
        const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (reserved.includes(name.toUpperCase())) return false;
        
        // Ungültige Zeichen prüfen
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) return false;
        
        // Zu lange Namen vermeiden
        if (name.length > 100) return false;
        
        return true;
    },

    // Erweiterte Projekt-Utilities
    generateProjectId: () => {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Datei-Extension prüfen
    getFileExtension: (filename) => {
        return filename.split('.').pop().toLowerCase();
    },

    // Prüfen ob Pfad ein Ordner ist (anhand der Endung)
    isFolder: (pathName) => {
        return pathName.endsWith('/') || pathName.endsWith('\\') || !pathName.includes('.');
    },

    // Template-Statistiken
    getTemplateStats: (templates) => {
        return {
            total: templates.length,
            folders: templates.filter(t => t.type !== 'experiment').length,
            experiments: templates.filter(t => t.type === 'experiment').length
        };
    }
});