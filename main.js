const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const fs = require('fs').promises;
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png'),
        titleBarStyle: 'default',
        show: false
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers

// Ordner-Dialog
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Zielordner auswählen'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// Projekt erstellen (Haupt-API) - KORRIGIERT
ipcMain.handle('create-project', async (event, basePath, projectName, structure, metadata = null) => {
    try {
        // Pfad korrekt konstruieren - path.join normalisiert automatisch
        const projectPath = path.join(basePath, projectName);
        
        console.log(`📁 Erstelle Projekt: ${projectPath}`);
        
        // Projekt-Hauptordner erstellen
        await fs.mkdir(projectPath, { recursive: true });
        console.log(`📁 Projekt-Ordner erstellt: ${projectPath}`);
        
        // Ordnerstruktur erstellen
        await createFolderStructure(projectPath, structure);
        
        // Metadaten-JSON erstellen (falls vorhanden)
        if (metadata && Object.keys(metadata).length > 0) {
            await createMetadataFiles(projectPath, metadata);
        }
        
        // Pfad normalisieren für konsistente Rückgabe
        const normalizedPath = path.resolve(projectPath);
        
        return { 
            success: true, 
            message: 'Projekt erfolgreich erstellt!',
            projectPath: normalizedPath
        };
    } catch (error) {
        console.error('Fehler beim Erstellen des Projekts:', error);
        return { success: false, message: `Fehler: ${error.message}` };
    }
});

// Legacy-Support: Alte create-folders API
ipcMain.handle('create-folders', async (event, targetPath, structure) => {
    try {
        await createFolderStructure(targetPath, structure);
        return { success: true, message: 'Ordnerstruktur erfolgreich erstellt!' };
    } catch (error) {
        console.error('Fehler beim Erstellen der Ordner:', error);
        return { success: false, message: `Fehler: ${error.message}` };
    }
});

// Ordner im Explorer öffnen
ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// JSON-Datei laden (für Metadaten-Import)
ipcMain.handle('load-json-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        title: 'JSON-Datei auswählen'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        try {
            const content = await fs.readFile(result.filePaths[0], 'utf8');
            return { success: true, content: JSON.parse(content) };
        } catch (error) {
            return { success: false, message: `Fehler beim Laden der JSON-Datei: ${error.message}` };
        }
    }
    return { success: false, message: 'Keine Datei ausgewählt' };
});

// JSON-Datei speichern (für Metadaten-Export)
ipcMain.handle('save-json-file', async (event, data) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        title: 'JSON-Datei speichern'
    });
    
    if (!result.canceled && result.filePath) {
        try {
            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
            return { success: true, message: 'JSON-Datei erfolgreich gespeichert!' };
        } catch (error) {
            return { success: false, message: `Fehler beim Speichern der JSON-Datei: ${error.message}` };
        }
    }
    return { success: false, message: 'Speichern abgebrochen' };
});

// Helper Functions

// Verbesserte Ordnerstruktur-Erstellung
async function createFolderStructure(basePath, structure) {
    const lines = structure.split('\n').filter(line => line.trim() !== '');
    const pathStack = [basePath];
    
    console.log(`📋 Erstelle Struktur in: ${basePath}`);
    console.log(`📋 Struktur:\n${structure}`);
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Indentation bestimmen (2 Leerzeichen = 1 Ebene)
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        const depth = Math.floor(indent / 2);
        const name = line.trim();
        
        console.log(`📝 Verarbeite: "${line}" (depth: ${depth}, name: "${name}")`);
        
        // Stack auf korrekte Tiefe anpassen
        pathStack.splice(depth + 1);
        
        console.log(`📚 Stack nach Anpassung: [${pathStack.join(', ')}]`);
        
        if (name.endsWith('/')) {
            // Ordner erstellen
            const folderName = name.slice(0, -1);
            const folderPath = path.join(...pathStack, folderName);
            
            try {
                await fs.mkdir(folderPath, { recursive: true });
                console.log(`📁 Ordner erstellt: ${folderPath}`);
                
                pathStack.push(folderName);
                console.log(`📚 Stack nach Ordner-Hinzufügung: [${pathStack.join(', ')}]`);
                
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
                console.log(`📁 Ordner existiert bereits: ${folderPath}`);
                pathStack.push(folderName);
            }
        } else {
            // Datei erstellen
            const filePath = path.join(...pathStack, name);
            const dir = path.dirname(filePath);
            
            try {
                await fs.mkdir(dir, { recursive: true });
                
                // Prüfen ob Datei bereits existiert
                try {
                    await fs.access(filePath);
                    console.log(`📄 Datei existiert bereits: ${filePath}`);
                } catch {
                    // Datei existiert nicht, erstellen
                    await fs.writeFile(filePath, '', 'utf8');
                    console.log(`📄 Datei erstellt: ${filePath}`);
                }
            } catch (error) {
                throw error;
            }
        }
    }
    
    console.log(`✅ Ordnerstruktur-Erstellung abgeschlossen`);
}

// Metadaten-Dateien erstellen
async function createMetadataFiles(projectPath, metadata) {
    // Haupt-Metadaten-Datei
    const metadataPath = path.join(projectPath, 'metadata.json');
    const metadataContent = {};
    
    // Metadata-Template in ausfüllbares Format konvertieren
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        metadataContent[key] = {
            label: fieldInfo.label,
            type: fieldInfo.type,
            value: fieldInfo.value || getDefaultValueForType(fieldInfo.type)
        };
        
        // Zusätzliche Eigenschaften übernehmen
        if (fieldInfo.options) metadataContent[key].options = fieldInfo.options;
        if (fieldInfo.min !== undefined) metadataContent[key].min = fieldInfo.min;
        if (fieldInfo.max !== undefined) metadataContent[key].max = fieldInfo.max;
        if (fieldInfo.description) metadataContent[key].description = fieldInfo.description;
    });
    
    await fs.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2), 'utf8');
    console.log(`📄 Metadaten erstellt: ${metadataPath}`);
    
    // Zusätzlich: README mit Metadaten-Info erstellen (falls nicht vorhanden)
    const readmePath = path.join(projectPath, 'README.md');
    try {
        await fs.access(readmePath);
        console.log(`📄 README.md existiert bereits`);
    } catch {
        const readmeContent = generateReadmeWithMetadata(metadata);
        await fs.writeFile(readmePath, readmeContent, 'utf8');
        console.log(`📄 README.md mit Metadaten erstellt: ${readmePath}`);
    }
}

// README mit Metadaten generieren
function generateReadmeWithMetadata(metadata) {
    const date = new Date().toISOString().split('T')[0];
    let content = `# Projekt\n\n*Erstellt am: ${date}*\n\n## Metadaten\n\n`;
    
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        if (fieldInfo.type !== 'group') {
            const value = fieldInfo.value || '_Nicht ausgefüllt_';
            content += `- **${fieldInfo.label}**: ${value}\n`;
        }
    });
    
    content += `\n## Beschreibung\n\n*Hier kannst du eine Beschreibung deines Projekts hinzufügen.*\n`;
    
    return content;
}

// Default-Wert für Metadaten-Typen
function getDefaultValueForType(type) {
    switch (type) {
        case 'number': return 0;
        case 'checkbox': return false;
        case 'date': return new Date().toISOString().split('T')[0];
        case 'textarea': return '';
        case 'dropdown': return '';
        default: return '';
    }
}