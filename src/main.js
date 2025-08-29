const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const OMEROProxyServer = require('./js/proxyManager.js');

let mainWindow;

// Global proxy manager instance
let omeroProxyServer = null;

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

// Graceful shutdown handler - stop proxy server when app closes
app.on('before-quit', async (event) => {
    if (omeroProxyServer && omeroProxyServer.getStatus().running) {
        console.log('🔬 Stopping OMERO proxy server before app shutdown...');
        event.preventDefault(); // Prevent immediate quit
        
        try {
            await omeroProxyServer.stop();
            console.log('✅ OMERO proxy server stopped successfully');
        } catch (error) {
            console.error('❌ Error stopping OMERO proxy server:', error);
        }
        
        // Now allow the app to quit
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Generate stable filename without timestamps
function generateStableTemplateFilename(template) {
    const safeName = (template.name || 'template')
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // Remove special chars
        .replace(/\s+/g, '_')               // Replace spaces with underscores
        .toLowerCase()                      // Lowercase
        .substring(0, 50);                  // Limit length

    const safeUser = (template.createdBy || 'unknown')
        .replace(/[^a-zA-Z0-9\-_]/g, '')
        .toLowerCase()
        .substring(0, 20);

    const templateType = template.type || 'template';
    
    // Simple, stable filename: templatename_user_type.json
    return `${safeName}_${safeUser}_${templateType}.json`;
}

// Check if filename is stable (doesn't contain timestamps)
function isStableFilename(filename) {
    // Check if filename contains timestamp patterns like _202X_ or long numeric sequences
    const timestampPattern = /_20\d{2}[01]\d[0-3]\d/; // YYYYMMDD pattern
    const longNumberPattern = /\d{10,}/; // 10+ consecutive digits (timestamps)
    
    return !timestampPattern.test(filename) && !longNumberPattern.test(filename);
}

// Clean template for file storage
function cleanTemplateForFileStorage(template) {
    const clean = { ...template };
    
    // Remove UI-specific properties
    delete clean._uiState;
    delete clean._dirty;
    delete clean._selected;
    delete clean._lastModified;
    delete clean._searchIndex;
    delete clean._cachedHtml;
    delete clean._renderCache;
    delete clean.userDisplayName;
    delete clean.groupDisplayName;
    delete clean.userColor;
    delete clean.userInitials;
    delete clean.isOwn;
    delete clean.isShared;
    delete clean.originalIndex;
    
    // Ensure essential fields exist
    return {
        ...clean,
        id: clean.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: clean.name || 'Unnamed Template',
        type: clean.type || 'experiment',
        createdBy: clean.createdBy || 'Unknown',
        createdByGroup: clean.createdByGroup || 'Unknown',
        createdAt: clean.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

// =================== SECURE STORAGE API ===================

// Check if safeStorage is available
ipcMain.handle('secure-storage-available', () => {
    try {
        return safeStorage.isEncryptionAvailable();
    } catch (error) {
        console.warn('safeStorage not available:', error.message);
        return false;
    }
});

// Encrypt sensitive data
ipcMain.handle('encrypt-data', (event, plaintext) => {
    try {
        if (!plaintext || plaintext.trim() === '') {
            return { success: true, encrypted: '', method: 'empty' };
        }
        
        if (safeStorage.isEncryptionAvailable()) {
            const buffer = safeStorage.encryptString(plaintext);
            const encrypted = buffer.toString('base64');
            console.log('🔐 Data encrypted using safeStorage');
            return { 
                success: true, 
                encrypted: encrypted,
                method: 'safeStorage'
            };
        } else {
            // Fallback: Return plaintext for browser-side encryption
            console.log('⚠️ safeStorage not available, using fallback method');
            return { 
                success: true, 
                encrypted: plaintext,
                method: 'fallback'
            };
        }
    } catch (error) {
        console.error('❌ Encryption failed:', error);
        return { 
            success: false, 
            error: error.message,
            encrypted: plaintext // Fallback to plaintext
        };
    }
});

// Decrypt sensitive data
ipcMain.handle('decrypt-data', (event, encryptedData, method = 'safeStorage') => {
    try {
        if (!encryptedData || encryptedData.trim() === '') {
            return { success: true, decrypted: '' };
        }
        
        if (method === 'safeStorage' && safeStorage.isEncryptionAvailable()) {
            const buffer = Buffer.from(encryptedData, 'base64');
            const decrypted = safeStorage.decryptString(buffer);
            console.log('🔓 Data decrypted using safeStorage');
            return { 
                success: true, 
                decrypted: decrypted 
            };
        } else {
            // For fallback method, return as-is (will be handled by browser-side crypto)
            return { 
                success: true, 
                decrypted: encryptedData 
            };
        }
    } catch (error) {
        console.error('❌ Decryption failed:', error);
        return { 
            success: false, 
            error: error.message,
            decrypted: encryptedData // Fallback to original data
        };
    }
});

// Migrate plaintext credentials to encrypted
ipcMain.handle('migrate-credentials', async (event, credentials) => {
    try {
        const migratedCredentials = {};
        
        for (const [key, value] of Object.entries(credentials)) {
            if (value && typeof value === 'string' && value.trim() !== '') {
                const encryptResult = await ipcMain.emit('encrypt-data', event, value);
                const result = encryptResult[0]; // Get the first result from the event
                
                migratedCredentials[key] = {
                    encrypted: result?.encrypted || value,
                    method: result?.method || 'fallback'
                };
                console.log(`🔄 Migrated credential: ${key.replace(/password|key/gi, '***')}`);
            } else {
                migratedCredentials[key] = { encrypted: '', method: 'none' };
            }
        }
        
        return { success: true, migrated: migratedCredentials };
    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: error.message };
    }
});

// Generate secure random salt
ipcMain.handle('generate-salt', () => {
    try {
        const crypto = require('crypto');
        const salt = crypto.randomBytes(32).toString('hex');
        return { success: true, salt: salt };
    } catch (error) {
        console.error('❌ Salt generation failed:', error);
        return { success: false, error: error.message };
    }
});

// Secure credential storage with metadata
ipcMain.handle('store-secure-credential', async (event, key, value, metadata = {}) => {
    try {
        if (!value || value.trim() === '') {
            return { success: true, stored: '', method: 'empty' };
        }

        const timestamp = new Date().toISOString();
        const credentialData = {
            value: value,
            timestamp: timestamp,
            metadata: metadata
        };

        if (safeStorage.isEncryptionAvailable()) {
            const buffer = safeStorage.encryptString(JSON.stringify(credentialData));
            const encrypted = buffer.toString('base64');
            
            console.log(`🔐 Credential '${key.replace(/password|key/gi, '***')}' encrypted and stored`);
            
            return {
                success: true,
                stored: encrypted,
                method: 'safeStorage',
                timestamp: timestamp
            };
        } else {
            // Mark for browser-side encryption
            return {
                success: true,
                stored: JSON.stringify(credentialData),
                method: 'fallback',
                timestamp: timestamp
            };
        }
    } catch (error) {
        console.error('❌ Secure credential storage failed:', error);
        return {
            success: false,
            error: error.message,
            stored: value // Fallback
        };
    }
});

// Retrieve secure credential with metadata
ipcMain.handle('retrieve-secure-credential', async (event, encryptedData, method = 'safeStorage') => {
    try {
        if (!encryptedData || encryptedData.trim() === '') {
            return { success: true, value: '', metadata: {}, timestamp: null };
        }

        let credentialData;

        if (method === 'safeStorage' && safeStorage.isEncryptionAvailable()) {
            const buffer = Buffer.from(encryptedData, 'base64');
            const decrypted = safeStorage.decryptString(buffer);
            credentialData = JSON.parse(decrypted);
            console.log('🔓 Secure credential retrieved and decrypted');
        } else {
            // Try to parse as JSON, fallback to plain string
            try {
                credentialData = JSON.parse(encryptedData);
            } catch {
                credentialData = { value: encryptedData, timestamp: null, metadata: {} };
            }
        }

        return {
            success: true,
            value: credentialData.value || '',
            metadata: credentialData.metadata || {},
            timestamp: credentialData.timestamp || null
        };
    } catch (error) {
        console.error('❌ Secure credential retrieval failed:', error);
        return {
            success: false,
            error: error.message,
            value: encryptedData, // Fallback
            metadata: {},
            timestamp: null
        };
    }
});

// =================== EXISTING IPC HANDLERS ===================

// Folder Dialog
ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Select Target Folder'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

// Create Project (Main API) - EXTENDED for optional folder structure
ipcMain.handle('create-project', async (event, basePath, projectName, structure, metadata = null) => {
    try {
        // Construct path correctly - path.join normalizes automatically
        const projectPath = path.join(basePath, projectName);
        
        console.log(`📁 Creating project: ${projectPath}`);
        
        // Create main project folder
        await fs.mkdir(projectPath, { recursive: true });
        console.log(`📁 Project folder created: ${projectPath}`);
        
        // Only create folder structure if present
        if (structure && structure.trim() !== '') {
            await createFolderStructure(projectPath, structure);
        } else {
            console.log(`📋 No folder structure defined - skipping structure creation`);
        }
        
        // Metadaten-JSON erstellen (falls vorhanden)
        if (metadata && Object.keys(metadata).length > 0) {
            await createMetadataFiles(projectPath, metadata, projectName);
        }
        
        // Adjust success message based on created content
        let message = 'Project created successfully!';
        const hasStructure = structure && structure.trim() !== '';
        const hasMetadata = metadata && Object.keys(metadata).length > 0;
        
        if (!hasStructure && hasMetadata) {
            message = 'Project with metadata created successfully!';
        } else if (hasStructure && hasMetadata) {
            message = 'Project with folder structure and metadata created successfully!';
        } else if (hasStructure && !hasMetadata) {
            message = 'Project with folder structure created successfully!';
        }
        
        // Normalize path for consistent return
        const normalizedPath = path.resolve(projectPath);
        
        return { 
            success: true, 
            message: message,
            projectPath: normalizedPath,
            hasStructure: hasStructure,
            hasMetadata: hasMetadata
        };
    } catch (error) {
        console.error('Error creating project:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
});

// Legacy Support: Old create-folders API
ipcMain.handle('create-folders', async (event, targetPath, structure) => {
    try {
        await createFolderStructure(targetPath, structure);
        return { success: true, message: 'Folder structure created successfully!' };
    } catch (error) {
        console.error('Error creating folders:', error);
        return { success: false, message: `Error: ${error.message}` };
    }
});

// Open folder in explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Load JSON file (for metadata import)
ipcMain.handle('load-json-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        title: 'Select JSON File'
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
        try {
            const content = await fs.readFile(result.filePaths[0], 'utf8');
            return { success: true, content: JSON.parse(content) };
        } catch (error) {
            return { success: false, message: `Error loading JSON file: ${error.message}` };
        }
    }
    return { success: false, message: 'No file selected' };
});

// Save JSON file (for metadata export)
ipcMain.handle('save-json-file', async (event, data) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        filters: [
            { name: 'JSON Files', extensions: ['json'] }
        ],
        title: 'Save JSON File'
    });
    
    if (!result.canceled && result.filePath) {
        try {
            await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
            return { success: true, message: 'JSON file saved successfully!' };
        } catch (error) {
            return { success: false, message: `Error saving JSON file: ${error.message}` };
        }
    }
    return { success: false, message: 'Save cancelled' };
});


// Save JSON file directly to specified path (for metadata updates)
ipcMain.handle('save-json-file-direct', async (event, filePath, data) => {
    try {
        // Ensure the directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        
        // Write the JSON file
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
        
        console.log(`✅ JSON file saved directly: ${filePath}`);
        return { 
            success: true, 
            message: 'JSON file saved successfully!',
            filePath: filePath 
        };
    } catch (error) {
        console.error('❌ Error saving JSON file directly:', error);
        return { 
            success: false, 
            message: `Error saving JSON file: ${error.message}` 
        };
    }
});

// Open URL
ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        console.error('Error opening external URL:', error);
        return { success: false, error: error.message };
    }
});

// Insert integration links into existing README.html
ipcMain.handle('insert-links-into-readme', async (event, projectPath, elabftwUrl, omeroUrl) => {
    try {
        console.log(`📄 IPC: Inserting integration links into existing README.html: ${projectPath}`);
        
        const readmePath = path.join(projectPath, 'README.html');
        
        // Read existing README.html
        let htmlContent = await fs.readFile(readmePath, 'utf8');
        
        // Create integration links HTML
        let linksHtml = `
            <section class="section integration-section">
                <h2 class="section-title">
                    <span class="section-icon">🔗</span>
                    Integration Links
                </h2>
                <div class="integration-links">`;

        if (elabftwUrl) {
            linksHtml += `
                    <a href="${elabftwUrl}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">🧪</span>
                        <span class="link-text">Open in elabFTW</span>
                    </a>`;
        }

        if (omeroUrl) {
            linksHtml += `
                    <a href="${omeroUrl}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">🔬</span>
                        <span class="link-text">Open in OMERO</span>
                    </a>`;
        }

        linksHtml += `
                </div>
            </section>`;

        // Add CSS for integration links if not already present
        const integrationCSS = `
        /* Integration Links Styles */
        .integration-section {
            background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.05));
            border: 1px solid rgba(34, 197, 94, 0.2);
            border-left: 4px solid #22c55e;
        }

        .integration-links {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .integration-link {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 12px;
            text-decoration: none;
            color: #e0e0e0;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .integration-link:hover {
            background: rgba(34, 197, 94, 0.1);
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
            border-color: rgba(34, 197, 94, 0.3);
        }

        .integration-link:visited {
            color: #e0e0e0;
        }

        .link-icon {
            font-size: 1.5rem;
            margin-right: 15px;
            min-width: 30px;
        }

        .link-text {
            font-size: 1rem;
            font-weight: 500;
        }`;

        // Insert CSS if not already present
        if (!htmlContent.includes('integration-section')) {
            htmlContent = htmlContent.replace('</style>', integrationCSS + '\n        </style>');
        }

        // Insert links section after the header and before other content
        // Look for the main content start
        const contentStart = htmlContent.indexOf('<main class="content">');
        if (contentStart !== -1) {
            const insertPosition = htmlContent.indexOf('>', contentStart) + 1;
            htmlContent = htmlContent.slice(0, insertPosition) + linksHtml + htmlContent.slice(insertPosition);
        }

        // Write updated README
        await fs.writeFile(readmePath, htmlContent, 'utf8');
        
        console.log(`✅ IPC: Integration links inserted successfully into README.html`);
        
        return {
            success: true,
            message: 'Integration links inserted into README.html',
            path: readmePath
        };
        
    } catch (error) {
        console.error('❌ IPC: Error inserting links into README:', error);
        return {
            success: false,
            message: error.message,
            error: error.toString()
        };
    }
});

// =================== ENHANCED TEMPLATE FILE STORAGE ===================

    // Get templates directory with user/group support
    function getTemplatesDirectory(userInfo = null) {
        // GEÄNDERT: Verwende Home Directory statt userData
        const homePath = app.getPath('home');
        let templatesDir = path.join(homePath, 'MetaFold', 'Templates');
        
        // Add user/group specific paths if provided
        if (userInfo) {
            const { username, groupname } = userInfo;
            
            if (groupname && groupname !== 'Unknown' && groupname !== 'Default') {
                // Group-specific directory
                templatesDir = path.join(templatesDir, sanitizeFilename(groupname));
                
                if (username && username !== 'Unknown' && username !== 'User') {
                    // User-specific within group
                    templatesDir = path.join(templatesDir, sanitizeFilename(username));
                }
            } else if (username && username !== 'Unknown' && username !== 'User') {
                // User-specific directory without group
                templatesDir = path.join(templatesDir, sanitizeFilename(username));
            }
        }
        
        console.log(`📁 Templates directory (Home): ${templatesDir}`);
        return templatesDir;
    }

    // Get storage location information for UI display
    function getStorageLocationInfo() {
        const homePath = app.getPath('home');
        const templatesDir = path.join(homePath, 'MetaFold', 'Templates');
        
        return {
            currentPath: templatesDir,
            fullPath: templatesDir,
            userFriendlyPath: `~/MetaFold/Templates/`,
            isHomeDirectory: true,
            basePath: homePath
        };
    }

// Ensure templates directory exists
async function ensureTemplatesDirectory(userInfo = null) {
    const templatesDir = getTemplatesDirectory(userInfo);
    try {
        await fs.access(templatesDir);
    } catch (error) {
        // Directory doesn't exist, create it
        await fs.mkdir(templatesDir, { recursive: true });
        console.log('📁 Created templates directory:', templatesDir);
    }
    return templatesDir;
}

// Sanitize filename to remove invalid characters
function sanitizeFilename(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

// Generate template filename
function generateTemplateFilename(templateName, templateId = null) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = sanitizeFilename(templateName);
    const id = templateId || Date.now();
    return `template_${safeName}_${id}_${timestamp}.json`;
}

// Save template to file
ipcMain.handle('save-template-to-file', async (event, template, userInfo = null) => {
    try {
        console.log(`💾 Saving template "${template.name}"...`);
        
        // Ensure templates directory exists
        const templatesDir = await ensureTemplatesDirectory(userInfo);
        
        let filename;
        let filePath;
        let isUpdate = false;
        
        // ===== DATEINAME-LOGIK =====
        // 1. Prüfe ob Template bereits eine Datei hat (_fileInfo)
        if (template._fileInfo && template._fileInfo.filename) {
            // BESTEHENDE DATEI - Namen beibehalten
            filename = template._fileInfo.filename;
            filePath = path.join(templatesDir, filename);
            isUpdate = true;
            console.log(`📝 Updating existing file: ${filename}`);
        } else {
            // NEUE DATEI - Stabilen Namen generieren
            filename = generateStableTemplateFilename(template);
            filePath = path.join(templatesDir, filename);
            isUpdate = false;
            console.log(`📄 Creating new file: ${filename}`);
        }
        
        // Clean template data before saving
        const cleanTemplate = cleanTemplateForFileStorage(template);
        
        // Add/update file metadata
        cleanTemplate._fileInfo = {
            filename: filename,
            filePath: filePath,
            savedAt: new Date().toISOString(),
            source: 'file',
            directory: templatesDir,
            stable: true,
            version: '2.0',
            isUpdate: isUpdate // Track whether this was an update or new file
        };
        
        // Write to file
        await fs.writeFile(filePath, JSON.stringify(cleanTemplate, null, 2), 'utf8');
        
        if (isUpdate) {
            console.log(`✅ Template "${template.name}" updated in existing file: ${filename}`);
        } else {
            console.log(`✅ Template "${template.name}" saved to new file: ${filename}`);
        }
        
        return {
            success: true,
            filePath: filePath,
            filename: filename,
            directory: templatesDir,
            message: isUpdate ? 'Template updated successfully' : 'Template saved successfully',
            savedAt: cleanTemplate._fileInfo.savedAt,
            isUpdate: isUpdate
        };
        
    } catch (error) {
        console.error('❌ Error saving template:', error);
        return {
            success: false,
            error: error.message,
            message: `Failed to save template: ${error.message}`
        };
    }
});


// Load template from file
ipcMain.handle('load-template-from-file', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const template = JSON.parse(content);
        
        // Update file info with current stats
        const stats = await fs.stat(filePath);
        if (template._fileInfo) {
            template._fileInfo.lastModified = stats.mtime;
            template._fileInfo.fileSize = stats.size;
        }
        
        console.log(`✅ Template loaded from file: ${path.basename(filePath)}`);
        
        return {
            success: true,
            template: template
        };
    } catch (error) {
        console.error('❌ Error loading template from file:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

    // Load all templates for user
    ipcMain.handle('load-all-templates', async (event, userInfo = null) => {
        try {
            console.log('📂 Loading templates from current user directory...');
            
            // WICHTIG: Verwende AKTUELLEN User-Ordner, nicht Template-Info
            const templatesDir = await ensureTemplatesDirectory(userInfo);
            const files = await fs.readdir(templatesDir);
            
            // Alle JSON-Dateien finden
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            console.log(`📂 Found ${jsonFiles.length} JSON files in ${templatesDir}`);
            
            const templates = [];
            const errors = [];
            
            // ===== ENHANCED FILENAME-TO-NAME FUNCTION =====
            const generateEnhancedNameFromFilename = (filename) => {
                let name = filename.replace('.json', '');
                
                return name
                    // Replace underscores and hyphens with spaces
                    .replace(/[_-]/g, ' ')
                    
                    // Handle camelCase (e.g., "LSM980" stays together)
                    .replace(/([a-z])([A-Z])/g, '$1 $2')
                    
                    // Clean up multiple spaces
                    .replace(/\s+/g, ' ')
                    
                    // Capitalize each word
                    .replace(/\b\w/g, l => l.toUpperCase())
                    
                    // Handle special cases for scientific terms
                    .replace(/\bLsm\b/g, 'LSM')        // LSM should stay uppercase
                    .replace(/\bRdm\b/g, 'RDM')        // RDM should stay uppercase  
                    .replace(/\bOmero\b/g, 'OMERO')    // OMERO should stay uppercase
                    .replace(/\bApi\b/g, 'API')        // API should stay uppercase
                    .replace(/\bDna\b/g, 'DNA')        // DNA should stay uppercase
                    .replace(/\bRna\b/g, 'RNA')        // RNA should stay uppercase
                    
                    .trim();
            };
            
            // Jede JSON-Datei laden
            for (const file of jsonFiles) {
                const filePath = path.join(templatesDir, file);
                
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    let template = JSON.parse(content);
                    
                    console.log(`📄 Loading: ${file}`);
                    
                    // ===== FILENAME-BASED NAMING =====
                    // Store original name for reference
                    template.originalName = template.name;
                    template.sourceFilename = file;
                    
                    // Generate new unique name from filename
                    const uniqueName = generateEnhancedNameFromFilename(file);
                    template.name = uniqueName;
                    
                    console.log(`🔧 Template name updated: "${template.originalName}" → "${template.name}" (from ${file})`);
                    
                    // Add helpful metadata
                    template.fileBasedNaming = true;
                    template.nameSource = 'filename';
                    template.lastFileUpdate = new Date().toISOString();
                    
                    // ===== EXISTING AUTO-CORRECTION LOGIC =====
                    // Fallback if name generation failed
                    if (!template.name || template.name === 'undefined' || template.name.trim() === '') {
                        template.name = file.replace('.json', '').replace(/[_-]/g, ' ');
                        console.log(`🔧 Fallback name generation: "${template.name}"`);
                    }
                    
                    // Auto-fix type
                    if (!template.type) {
                        template.type = template.metadata && Object.keys(template.metadata).length > 0 ? 'experiment' : 'folders';
                        console.log(`🔧 Auto-fixed type: "${template.type}"`);
                    }
                    
                    // WICHTIG: Überschreibe createdBy/createdByGroup mit AKTUELLEM User
                    // Das verhindert, dass fremde Gruppen-Ordner erstellt werden
                    if (userInfo) {
                        template.createdBy = userInfo.username || template.createdBy || 'Manual';
                        template.createdByGroup = userInfo.groupname || template.createdByGroup || 'Manual';
                        console.log(`👤 Updated user info: ${template.createdBy} (${template.createdByGroup})`);
                    }
                    
                    // Ensure timestamps
                    if (!template.createdAt) {
                        template.createdAt = new Date().toISOString();
                    }
                    
                    if (!template.updatedAt) {
                        template.updatedAt = template.createdAt;
                    }
                    
                    // Ensure template ID
                    if (!template.id) {
                        template.id = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    }
                    
                    // _fileInfo hinzufügen/aktualisieren
                    const stats = await fs.stat(filePath);
                    template._fileInfo = {
                        ...(template._fileInfo || {}),
                        filename: file,
                        filePath: filePath,
                        lastModified: stats.mtime.toISOString(),
                        fileSize: stats.size,
                        source: 'file',
                        directory: templatesDir,
                        stable: isStableFilename(file),
                        version: '2.0' // Version for tracking improvements
                    };
                    
                    // ENTFERNE NUR ÜBERFLÜSSIGE FELDER - metadata.fields bleibt unverändert!
                    delete template.migrationMetadata;
                    delete template.savedLocally;
                    delete template.storageType;
                    delete template.storageDisplay;
                    delete template.storageIcon;
                    delete template.recoveredAt;
                    // projectDefaults kann bleiben - wird manchmal gebraucht
                    
                    templates.push(template);
                    console.log(`✅ Template loaded: "${template.name}" (${templates.length}/${jsonFiles.length})`);
                    
                } catch (fileError) {
                    console.warn(`⚠️ Error loading ${file}:`, fileError.message);
                    errors.push({ file, error: fileError.message });
                }
            }
            
            // ===== FINAL SUMMARY =====
            console.log(`\n📊 === TEMPLATE LOADING SUMMARY ===`);
            console.log(`📁 Directory: ${templatesDir}`);
            console.log(`📄 JSON files found: ${jsonFiles.length}`);
            console.log(`✅ Templates loaded: ${templates.length}`);
            console.log(`❌ Loading errors: ${errors.length}`);
            
            if (templates.length > 0) {
                console.log(`📋 Loaded templates:`);
                templates.forEach((template, i) => {
                    console.log(`  ${i+1}. "${template.name}" (${template.type}) from ${template._fileInfo.filename}`);
                });
            }
            
            if (errors.length > 0) {
                console.log(`❌ Failed to load:`);
                errors.forEach((error, i) => {
                    console.log(`  ${i+1}. ${error.file}: ${error.error}`);
                });
            }
            
            console.log(`📊 === END SUMMARY ===\n`);
            
            return {
                success: true,
                templates: templates,  
                directory: templatesDir,
                loadedCount: templates.length,
                errorCount: errors.length,
                errors: errors,
                // Note: duplicateCount removed since we're not doing deduplication
                summary: {
                    totalFiles: jsonFiles.length,
                    successfullyLoaded: templates.length,
                    failed: errors.length,
                    fileBasedNaming: true
                }
            };
            
        } catch (error) {
            console.error('❌ Error loading templates:', error);
            return {
                success: false,
                error: error.message,
                templates: [],
                loadedCount: 0,
                errorCount: 1,
                errors: [{ file: 'system', error: error.message }]
            };
        }
    });


// Update template file
// Diese Funktion ist für explizite Updates von bestehenden Templates

ipcMain.handle('update-template-file', async (event, templateData) => {
    try {
        if (!templateData._fileInfo || !templateData._fileInfo.filePath) {
            // Fallback to save-template-to-file if no file info
            console.log('⚠️ No file info found, treating as new file');
            return await ipcMain.emit('save-template-to-file', event, templateData);
        }
        
        const filePath = templateData._fileInfo.filePath;
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            // File doesn't exist, save as new
            console.log('⚠️ Original file not found, creating new file');
            return await ipcMain.emit('save-template-to-file', event, templateData);
        }
        
        console.log(`📝 Updating template file: ${path.basename(filePath)}`);
        
        // Clean template data
        const cleanTemplate = cleanTemplateForFileStorage(templateData);
        
        // Update file info
        cleanTemplate._fileInfo = {
            ...templateData._fileInfo,
            savedAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            isUpdate: true
        };
        
        // Write updated data
        await fs.writeFile(filePath, JSON.stringify(cleanTemplate, null, 2), 'utf8');
        
        // Get updated stats
        const stats = await fs.stat(filePath);
        
        console.log(`✅ Template updated: ${path.basename(filePath)}`);
        
        return {
            success: true,
            filename: cleanTemplate._fileInfo.filename,
            filePath: filePath,
            fileSize: stats.size,
            updatedAt: cleanTemplate._fileInfo.savedAt,
            isUpdate: true
        };
        
    } catch (error) {
        console.error('❌ Error updating template file:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Delete template file
ipcMain.handle('delete-template-file', async (event, filePath) => {
    try {
        console.log(`🗑️ Deleting template file: ${filePath}`);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            console.log(`⚠️ Template file already deleted or doesn't exist: ${filePath}`);
            return { success: true, message: 'File already deleted' };
        }
        
        // Read template before deletion (for logging)
        let templateName = 'Unknown';
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const template = JSON.parse(content);
            templateName = template.name || 'Unknown';
        } catch {
            // Could not read template, continue with deletion
        }
        
        // Delete the file
        await fs.unlink(filePath);
        
        console.log(`✅ Template file deleted successfully: ${templateName} (${path.basename(filePath)})`);
        
        return {
            success: true,
            message: `Template "${templateName}" deleted successfully`,
            deletedFile: path.basename(filePath)
        };
        
    } catch (error) {
        console.error('❌ Error deleting template file:', error);
        return {
            success: false,
            error: error.message,
            message: `Failed to delete template file: ${error.message}`
        };
    }
});

// Get templates directory path
ipcMain.handle('get-templates-directory', async (event, userInfo = null) => {
    try {
        const templatesDir = await ensureTemplatesDirectory(userInfo);
        return {
            success: true,
            directory: templatesDir
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Export templates to location
ipcMain.handle('export-templates-to-location', async (event, templates, exportType = 'single') => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: exportType === 'bulk' ? 'Export All Templates' : 'Export Template',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            defaultPath: exportType === 'bulk' ? 'metafold_templates_export.json' : 'template_export.json'
        });
        
        if (!result.canceled && result.filePath) {
            const dataToExport = exportType === 'bulk' ? { templates, exportDate: new Date().toISOString() } : templates;
            await fs.writeFile(result.filePath, JSON.stringify(dataToExport, null, 2), 'utf8');
            
            return {
                success: true,
                message: `Templates exported successfully to ${result.filePath}`,
                filePath: result.filePath
            };
        }
        
        return {
            success: false,
            message: 'Export cancelled'
        };
    } catch (error) {
        console.error('❌ Error exporting templates:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Import templates from file
ipcMain.handle('import-templates-from-file', async () => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Import Templates',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            properties: ['openFile']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            const content = await fs.readFile(result.filePaths[0], 'utf8');
            const data = JSON.parse(content);
            
            // Handle both single template and bulk export formats
            let templates = [];
            if (Array.isArray(data)) {
                templates = data;
            } else if (data.templates && Array.isArray(data.templates)) {
                templates = data.templates;
            } else if (data.name) {
                // Single template
                templates = [data];
            }
            
            return {
                success: true,
                templates: templates,
                count: templates.length
            };
        }
        
        return {
            success: false,
            message: 'Import cancelled'
        };
    } catch (error) {
        console.error('❌ Error importing templates:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Bulk export templates
ipcMain.handle('bulk-export-templates', async (event, templates, options = {}) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Bulk Export Templates',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            defaultPath: `metafold_templates_backup_${new Date().toISOString().split('T')[0]}.json`
        });
        
        if (!result.canceled && result.filePath) {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                templateCount: templates.length,
                templates: templates,
                metadata: options.metadata || {}
            };
            
            await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
            
            return {
                success: true,
                message: `Exported ${templates.length} templates successfully`,
                filePath: result.filePath,
                count: templates.length
            };
        }
        
        return {
            success: false,
            message: 'Export cancelled'
        };
    } catch (error) {
        console.error('❌ Error in bulk export:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// Bulk import templates
ipcMain.handle('bulk-import-templates', async (event, options = {}) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Bulk Import Templates',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            properties: ['openFile', 'multiSelections']
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            let allTemplates = [];
            const errors = [];
            
            for (const filePath of result.filePaths) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);
                    
                    if (data.templates && Array.isArray(data.templates)) {
                        allTemplates = allTemplates.concat(data.templates);
                    } else if (Array.isArray(data)) {
                        allTemplates = allTemplates.concat(data);
                    } else if (data.name) {
                        allTemplates.push(data);
                    }
                } catch (error) {
                    errors.push({ file: path.basename(filePath), error: error.message });
                }
            }
            
            return {
                success: true,
                templates: allTemplates,
                totalImported: allTemplates.length,
                filesProcessed: result.filePaths.length,
                errors: errors
            };
        }
        
        return {
            success: false,
            message: 'Import cancelled'
        };
    } catch (error) {
        console.error('❌ Error in bulk import:', error);
        return {
            success: false,
            error: error.message
        };
    }
});

// =================== PROJECT SCANNER API ===================

// Scan directory recursively for MetaFold projects
ipcMain.handle('scan-metafold-projects', async (event, basePath, maxDepth = 5) => {
    try {
        console.log(`🔍 Scanning for MetaFold projects in: ${basePath}`);
        
        const projects = await scanForMetaFoldProjects(basePath, maxDepth);
        
        console.log(`✅ Found ${projects.length} MetaFold projects`);
        return { 
            success: true, 
            projects: projects,
            scannedPath: basePath,
            projectCount: projects.length
        };
    } catch (error) {
        console.error('❌ Error scanning for MetaFold projects:', error);
        return { 
            success: false, 
            message: `Error scanning projects: ${error.message}`,
            projects: []
        };
    }
});

// Get detailed project information
ipcMain.handle('get-project-details', async (event, projectPath) => {
    try {
        console.log(`📋 Getting project details for: ${projectPath}`);
        
        const details = await getProjectDetails(projectPath);
        
        return { 
            success: true, 
            details: details
        };
    } catch (error) {
        console.error('❌ Error getting project details:', error);
        return { 
            success: false, 
            message: `Error getting project details: ${error.message}`
        };
    }
});

// Get project statistics
ipcMain.handle('get-projects-statistics', async (event, projects) => {
    try {
        const stats = analyzeProjectStatistics(projects);
        
        return { 
            success: true, 
            statistics: stats
        };
    } catch (error) {
        console.error('❌ Error analyzing project statistics:', error);
        return { 
            success: false, 
            message: `Error analyzing statistics: ${error.message}`
        };
    }
});

// =================== HELPER FUNCTIONS ===================

// Improved folder structure creation
async function createFolderStructure(basePath, structure) {
    const lines = structure.split('\n').filter(line => line.trim() !== '');
    const pathStack = [basePath];
    
    console.log(`📋 Creating structure in: ${basePath}`);
    console.log(`📋 Structure:\n${structure}`);
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Determine indentation (2 spaces = 1 level)
        const indentMatch = line.match(/^(\s*)/);
        const indent = indentMatch ? indentMatch[1].length : 0;
        const depth = Math.floor(indent / 2);
        const name = line.trim();
        
        console.log(`📝 Processing: "${line}" (depth: ${depth}, name: "${name}")`);
        
        // Adjust stack to correct depth
        pathStack.splice(depth + 1);
        
        console.log(`📚 Stack after adjustment: [${pathStack.join(', ')}]`);
        
        if (name.endsWith('/')) {
            // Create folder
            const folderName = name.slice(0, -1);
            const folderPath = path.join(...pathStack, folderName);
            
            try {
                await fs.mkdir(folderPath, { recursive: true });
                console.log(`📁 Folder created: ${folderPath}`);
                
                pathStack.push(folderName);
                console.log(`📚 Stack after folder addition: [${pathStack.join(', ')}]`);
                
            } catch (error) {
                if (error.code !== 'EEXIST') {
                    throw error;
                }
                console.log(`📁 Folder already exists: ${folderPath}`);
                pathStack.push(folderName);
            }
        } else {
            // Create file
            const filePath = path.join(...pathStack, name);
            const dir = path.dirname(filePath);
            
            try {
                await fs.mkdir(dir, { recursive: true });
                
                // Check if file already exists
                try {
                    await fs.access(filePath);
                    console.log(`📄 File already exists: ${filePath}`);
                } catch {
                    // File doesn't exist, create it
                    await fs.writeFile(filePath, '', 'utf8');
                    console.log(`📄 File created: ${filePath}`);
                }
            } catch (error) {
                throw error;
            }
        }
    }
    
    console.log(`✅ Folder structure creation completed`);
}

// Storage location info API
ipcMain.handle('get-storage-location-info', async (event) => {
    try {
        const info = getStorageLocationInfo();
        return {
            success: true,
            ...info
        };
    } catch (error) {
        console.error('❌ Error getting storage location info:', error);
        return {
            success: false,
            message: error.message
        };
    }
});

ipcMain.handle('start-omero-proxy', async (event, settings = {}) => {
    try {
        console.log('🚀 Starting OMERO proxy server...');
        console.log('📋 Settings:', settings);
        
        // Initialize proxy if not exists
        if (!omeroProxyServer) {
            omeroProxyServer = new OMEROProxyServer(
                settings.proxyPort || 3000,
                settings.serverUrl || 'https://omero-imaging.uni-muenster.de'
            );
        }
        
        // Start the proxy server
        const result = await omeroProxyServer.start(settings);
        
        if (result.success) {
            console.log('✅ OMERO proxy server started successfully');
            console.log(`🔗 Proxy URL: http://localhost:${result.port}/omero-api`);
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to start OMERO proxy server:', error);
        return {
            success: false,
            message: `Failed to start OMERO proxy server: ${error.message}`,
            error: error.message
        };
    }
});


/**
 * Stop OMERO Proxy Server
 * Handler für das Beenden des Proxy-Servers
 */
ipcMain.handle('stop-omero-proxy', async (event) => {
    try {
        console.log('🛑 Stopping OMERO proxy server...');
        
        if (!omeroProxyServer) {
            return {
                success: true,
                message: 'OMERO proxy server was not running',
                status: 'stopped'
            };
        }
        
        const result = await omeroProxyServer.stop();
        
        if (result.success) {
            console.log('✅ OMERO proxy server stopped successfully');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to stop OMERO proxy server:', error);
        return {
            success: false,
            message: `Failed to stop OMERO proxy server: ${error.message}`,
            error: error.message
        };
    }
});

/**
 * Get OMERO Proxy Server Status
 * Handler für Status-Abfragen
 */
ipcMain.handle('get-omero-proxy-status', async (event) => {
    try {
        if (!omeroProxyServer) {
            return {
                running: false,
                status: 'not_initialized',
                message: 'OMERO proxy server not initialized'
            };
        }
        
        const status = omeroProxyServer.getStatus();
        console.log('📊 OMERO proxy status requested:', status);
        
        return {
            success: true,
            ...status
        };
        
    } catch (error) {
        console.error('❌ Failed to get OMERO proxy status:', error);
        return {
            success: false,
            running: false,
            status: 'error',
            message: `Failed to get proxy status: ${error.message}`,
            error: error.message
        };
    }
});

/**
 * Restart OMERO Proxy Server
 * Handler für Proxy-Neustart (z.B. bei Settings-Änderungen)
 */
ipcMain.handle('restart-omero-proxy', async (event, settings = {}) => {
    try {
        console.log('🔄 Restarting OMERO proxy server...');
        
        // Stop existing proxy if running
        if (omeroProxyServer && omeroProxyServer.getStatus().running) {
            console.log('🛑 Stopping existing proxy...');
            await omeroProxyServer.stop();
        }
        
        // Reset proxy instance to apply new settings
        omeroProxyServer = new OMEROProxyServer(
            settings.proxyPort || 3000,
            settings.serverUrl || 'https://omero-imaging.uni-muenster.de'
        );
        
        // Start with new settings
        console.log('🚀 Starting proxy with new settings...');
        const result = await omeroProxyServer.start(settings);
        
        if (result.success) {
            console.log('✅ OMERO proxy server restarted successfully');
            console.log(`🔗 New proxy URL: http://localhost:${result.port}/omero-api`);
        }
        
        return {
            ...result,
            restarted: true
        };
        
    } catch (error) {
        console.error('❌ Failed to restart OMERO proxy server:', error);
        return {
            success: false,
            message: `Failed to restart OMERO proxy server: ${error.message}`,
            error: error.message,
            restarted: false
        };
    }
});

/**
 * Check if OMERO Proxy Port is Available
 * Handler für Port-Verfügbarkeits-Checks
 */
ipcMain.handle('check-omero-proxy-port', async (event, port = 3000) => {
    try {
        const net = require('net');
        
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(port, 'localhost', () => {
                const actualPort = server.address().port;
                server.close(() => {
                    resolve({
                        success: true,
                        available: true,
                        port: actualPort,
                        message: `Port ${actualPort} is available`
                    });
                });
            });
            
            server.on('error', (error) => {
                resolve({
                    success: true,
                    available: false,
                    port: port,
                    message: `Port ${port} is not available`,
                    error: error.code
                });
            });
        });
        
    } catch (error) {
        console.error('❌ Failed to check port availability:', error);
        return {
            success: false,
            available: false,
            port: port,
            message: `Failed to check port ${port}: ${error.message}`,
            error: error.message
        };
    }
});

// =================== HELPER FUNCTIONS ===================

/**
 * Get current OMERO settings for proxy initialization
 * Diese Funktion hilft beim Laden der aktuellen OMERO-Settings
 */
async function getCurrentOMEROSettings() {
    // Diese Funktion kann später erweitert werden, um Settings aus
    // der settings-Datei zu laden, falls nötig
    return {
        serverUrl: 'https://omero-imaging.uni-muenster.de',
        proxyPort: 3000,
        autoStart: true
    };
}

/**
 * Log proxy activity for debugging
 * Hilfs-Funktion für erweiterte Logging-Funktionalität
 */
function logProxyActivity(activity, details = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔬 OMERO Proxy: ${activity}`, details);
}

// Create metadata files - ONLY ELABFTW FORMAT + ENHANCED README
async function createMetadataFiles(projectPath, metadata, projectName = null) {
    // 1. elabftw-metadata.json (elabFTW-compatible format)
    const elabftwPath = path.join(projectPath, 'elabftw-metadata.json');
    const elabftwContent = convertToElabFTWFormat(metadata);
    
    await fs.writeFile(elabftwPath, JSON.stringify(elabftwContent, null, 2), 'utf8');
    console.log(`📄 elabFTW metadata created: ${elabftwPath}`);
    
    // Create enhanced README.html with metadata info - ALWAYS CREATE/OVERWRITE for experiments
    const readmePath = path.join(projectPath, 'README.html');
    const readmeContent = generateReadmeHtmlWithMetadata(metadata, projectName);
    await fs.writeFile(readmePath, readmeContent, 'utf8');
    console.log(`📄 Enhanced README.html with experiment metadata created: ${readmePath}`);
    }

// Convert to elabFTW format
function convertToElabFTWFormat(metadata) {
    const elabftwData = {
        extra_fields: {},
        elabftw: {
            display_main_text: true
        }
    };
    
    const groups = new Map(); // Collect all groups
    let groupIdCounter = 1;
    let positionCounter = 1;
    
    // First pass: identify groups
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        if (fieldInfo.type === 'group') {
            const groupId = groupIdCounter++;
            groups.set(key, {
                id: groupId,
                name: fieldInfo.label || key
            });
        }
    });
    
    // Add groups to elabftw.extra_fields_groups
    if (groups.size > 0) {
        elabftwData.elabftw.extra_fields_groups = [];
        groups.forEach(group => {
            elabftwData.elabftw.extra_fields_groups.push(group);
        });
    }
    
    // Second pass: convert fields
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        // Skip group headers (handled separately)
        if (fieldInfo.type === 'group') {
            return;
        }
        
        // IMPORTANT: ensure value
        let safeValue = fieldInfo.value;
        
        // Base field properties
        const elabField = {
            type: mapFieldTypeToElabFTW(fieldInfo.type)
        };
        
        // Adjust value by type
        switch (fieldInfo.type) {
			case 'checkbox':
				// elabFTW expects "on" for true, "" for false
				elabField.value = (safeValue === true || safeValue === 'true' || safeValue === 'on') ? "on" : "";
				break;
			case 'number':
				// Save numbers as string
				elabField.value = String(safeValue !== undefined && safeValue !== null && safeValue !== '' ? safeValue : 0);
				break;
            case 'dropdown':
                // Dropdown value as string
                elabField.value = String(safeValue || '');
                break;
            default:
                // All others as string
                elabField.value = String(safeValue || '');
        }
        
        // Position only if needed
        if (positionCounter > 1) {
            elabField.position = positionCounter;
        }
        positionCounter++;
        
        // Add description
        if (fieldInfo.description) {
            elabField.description = fieldInfo.description;
        }
        
        // Optional properties
        if (fieldInfo.required) {
            elabField.required = true;
        }
        
        // Mark textarea as multiline
        if (fieldInfo.type === 'textarea') {
            elabField.multiline = true;
        }
        
        // Dropdown options - IMPORTANT: as simple string array!
        if (fieldInfo.type === 'dropdown' && fieldInfo.options) {
            elabField.options = fieldInfo.options.map(opt => String(opt));
        }
        
        // Number constraints
        if (fieldInfo.type === 'number') {
            if (fieldInfo.min !== undefined) elabField.min = fieldInfo.min;
            if (fieldInfo.max !== undefined) elabField.max = fieldInfo.max;
        }
        
        // Assign to group (if field belongs to a group)
        if (key.includes('.')) {
            // Extract group name from nested field name
            const parts = key.split('.');
            const possibleGroupKey = parts[0] + '_group';
            
            if (groups.has(possibleGroupKey)) {
                elabField.group_id = groups.get(possibleGroupKey).id;
            }
        }
        
        // Add field (use label as key if available)
        const fieldKey = fieldInfo.label || key;
        elabftwData.extra_fields[fieldKey] = elabField;
    });
    
    return elabftwData;
}

// Map field types to elabFTW types
function mapFieldTypeToElabFTW(type) {
    const typeMap = {
        'text': 'text',
        'number': 'number',
        'date': 'date',
        'textarea': 'text', // elabFTW has no separate textarea
        'dropdown': 'select',
        'checkbox': 'checkbox'
    };
    
    return typeMap[type] || 'text';
}

// Generate README with metadata - ENHANCED for experiments
function generateReadmeWithMetadata(metadata, projectName = null) {
    const date = new Date().toISOString().split('T')[0];
    const formattedDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // Start with project header
    let content = '';
    if (projectName) {
        content += `# ${projectName}\n\n`;
    } else {
        content += `# Project\n\n`;
    }
    
    content += `**Created:** ${formattedDate}\n\n`;
    
    // Add metadata section
    content += `## Experiment Metadata\n\n`;
    
    let hasMetadata = false;
    Object.entries(metadata).forEach(([key, fieldInfo]) => {
        if (fieldInfo.type !== 'group') {
            hasMetadata = true;
            const value = fieldInfo.value || '_Not filled_';
            const label = fieldInfo.label || key;
            
			// Format different types appropriately
			let formattedValue = value;
			if (fieldInfo.type === 'checkbox') {
				// Fix checkbox display: check the actual boolean value
				formattedValue = (value === true || value === 'true' || value === 'on') ? '✅ Yes' : '❌ No';
			} else if (fieldInfo.type === 'date' && value) {
				try {
					const dateObj = new Date(value);
					if (!isNaN(dateObj.getTime())) {
						formattedValue = dateObj.toLocaleDateString('en-US');
					} else {
						formattedValue = value || '_Not filled_';
					}
				} catch (e) {
					formattedValue = value || '_Not filled_';
				}
			} else if (fieldInfo.type === 'textarea' && value && value.length > 50) {
				// For long text, use blockquote format
				formattedValue = `\n> ${value.replace(/\n/g, '\n> ')}`;
			} else {
				formattedValue = value || '_Not filled_';
			}
            
            content += `- **${label}:** ${formattedValue}\n`;
            
            // Add description if available
            if (fieldInfo.description) {
                content += `  - *${fieldInfo.description}*\n`;
            }
        }
    });
    
    if (!hasMetadata) {
        content += `*No metadata fields defined.*\n\n`;
    } else {
        content += `\n`;
    }
    
    // Add project description section
    content += `## Project Description\n\n`;
    content += `*Add your project description here. Describe the purpose, methodology, expected outcomes, and any important notes about this experiment.*\n\n`;
    
    // Add sections for experiment documentation
    content += `## Methodology\n\n`;
    content += `*Describe your experimental methodology, procedures, and protocols here.*\n\n`;
    
    content += `## Results\n\n`;
    content += `*Document your findings, observations, and results here.*\n\n`;
    
    content += `## Notes\n\n`;
    content += `*Add any additional notes, observations, or important information here.*\n\n`;
    
    // Add footer with generation info
    content += `---\n`;
    content += `*This README was automatically generated by MetaFold on ${formattedDate}*\n`;
    
    return content;
}
    // Generate HTML README with metadata info instead of Markdown
    function generateReadmeHtmlWithMetadata(metadata, projectName) {
        const currentDate = new Date();
        const formattedDate = currentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let htmlContent = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${projectName} - MetaFold Project</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #e0e0e0;
                background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
                min-height: 100vh;
                padding: 20px;
            }

            .container {
                max-width: 1000px;
                margin: 0 auto;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(20px);
                overflow: hidden;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            }

            .header {
                background: linear-gradient(135deg, #7c3aed, #a855f7);
                padding: 30px;
                text-align: center;
            }

            .project-title {
                font-size: 2.2rem;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            }

            .project-subtitle {
                font-size: 1.1rem;
                opacity: 0.9;
                font-weight: 300;
            }

            .content {
                padding: 30px;
            }

            .section {
                margin-bottom: 30px;
                padding: 25px;
                background: rgba(255, 255, 255, 0.03);
                border-radius: 15px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .section-title {
                font-size: 1.5rem;
                font-weight: 600;
                margin-bottom: 15px;
                color: #a855f7;
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .section-icon {
                font-size: 1.8rem;
                background: linear-gradient(135deg, #7c3aed, #a855f7);
                padding: 8px;
                border-radius: 10px;
                box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
            }

            .metadata-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                gap: 15px;
                margin-top: 20px;
            }

            .metadata-item {
                background: rgba(0, 0, 0, 0.2);
                padding: 15px;
                border-radius: 10px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }

            .metadata-label {
                font-weight: 600;
                color: #a855f7;
                font-size: 0.9rem;
                margin-bottom: 5px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .metadata-value {
                color: #e0e0e0;
                font-size: 1rem;
                word-wrap: break-word;
            }

            .metadata-description {
                color: #9ca3af;
                font-size: 0.8rem;
                font-style: italic;
                margin-top: 5px;
            }

            .empty-section {
                text-align: center;
                color: #9ca3af;
                font-style: italic;
                padding: 20px;
            }

            .editable-section {
                background: linear-gradient(135deg, rgba(234, 88, 12, 0.1), rgba(220, 38, 38, 0.05));
                border: 1px solid rgba(234, 88, 12, 0.2);
                border-left: 4px solid #ea580c;
            }

            .edit-placeholder {
                color: #9ca3af;
                font-style: italic;
                background: rgba(0, 0, 0, 0.2);
                padding: 15px;
                border-radius: 8px;
                border: 1px dashed rgba(255, 255, 255, 0.2);
                min-height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .footer {
                background: rgba(0, 0, 0, 0.3);
                padding: 20px;
                text-align: center;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                color: #6b7280;
                font-size: 0.9rem;
            }

            .creation-info {
                background: rgba(124, 58, 237, 0.2);
                padding: 10px 20px;
                border-radius: 20px;
                border: 1px solid rgba(124, 58, 237, 0.3);
                display: inline-block;
                font-weight: 500;
            }

            .no-metadata {
                text-align: center;
                color: #9ca3af;
                font-style: italic;
                padding: 30px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 10px;
            }

            @media (max-width: 768px) {
                .container {
                    margin: 10px;
                    border-radius: 15px;
                }
                
                .header {
                    padding: 20px;
                }
                
                .project-title {
                    font-size: 1.8rem;
                }
                
                .content {
                    padding: 20px;
                }
                
                .section {
                    padding: 20px;
                }
                
                .metadata-grid {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <header class="header">
                <h1 class="project-title">🧬 ${projectName}</h1>
                <p class="project-subtitle">MetaFold Laboratory Project</p>
            </header>

            <main class="content">`;

        // Metadata section
        if (metadata && Object.keys(metadata).length > 0) {
            htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">📊</span>
                        Experiment Metadata
                    </h2>
                    <div class="metadata-grid">`;

            let hasMetadata = false;
            
            // Group fields by type for better organization
            const groupFields = [];
            const normalFields = [];
            
            Object.entries(metadata).forEach(([key, fieldInfo]) => {
                if (fieldInfo && typeof fieldInfo === 'object') {
                    if (fieldInfo.type === 'group') {
                        groupFields.push([key, fieldInfo]);
                    } else {
                        normalFields.push([key, fieldInfo]);
                    }
                }
            });

            // Process normal fields first
            normalFields.forEach(([key, fieldInfo]) => {
                if (fieldInfo.type !== 'group') {
                    hasMetadata = true;
                    const label = fieldInfo.label || key;
                    let value = fieldInfo.value;
                    
                    // Format value based on type
                    let formattedValue;
                    if (fieldInfo.type === 'checkbox') {
                        formattedValue = value ? '✅ Yes' : '❌ No';
                    } else if (fieldInfo.type === 'date' && value) {
                        try {
                            const dateObj = new Date(value);
                            if (!isNaN(dateObj.getTime())) {
                                formattedValue = dateObj.toLocaleDateString('en-US');
                            } else {
                                formattedValue = value || '<em>Not filled</em>';
                            }
                        } catch (e) {
                            formattedValue = value || '<em>Not filled</em>';
                        }
                    } else if (fieldInfo.type === 'textarea' && value && value.length > 100) {
                        // For long text, truncate with expand option
                        formattedValue = value.substring(0, 100) + '...';
                    } else {
                        formattedValue = value || '<em>Not filled</em>';
                    }
                    
                    htmlContent += `
                        <div class="metadata-item">
                            <div class="metadata-label">${label}</div>
                            <div class="metadata-value">${formattedValue}</div>`;
                    
                    if (fieldInfo.description) {
                        htmlContent += `<div class="metadata-description">${fieldInfo.description}</div>`;
                    }
                    
                    htmlContent += `</div>`;
                }
            });

            // Add group headers as visual separators if any exist
            if (groupFields.length > 0) {
                groupFields.forEach(([key, fieldInfo]) => {
                    htmlContent += `
                        <div class="metadata-item" style="grid-column: 1 / -1; background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.1)); border: 1px solid rgba(124, 58, 237, 0.3);">
                            <div class="metadata-label" style="font-size: 1rem; color: #c084fc;">${fieldInfo.label}</div>`;
                    if (fieldInfo.description) {
                        htmlContent += `<div class="metadata-description">${fieldInfo.description}</div>`;
                    }
                    htmlContent += `</div>`;
                });
            }

            htmlContent += `</div>`;
            
            if (!hasMetadata) {
                htmlContent += `<div class="no-metadata">No metadata fields have been filled out yet.</div>`;
            }

            htmlContent += `</section>`;
        } else {
            htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">📊</span>
                        Experiment Metadata
                    </h2>
                    <div class="no-metadata">No metadata template was used for this project.</div>
                </section>`;
        }

        // Editable sections for user content
        htmlContent += `
                <section class="section editable-section">
                    <h2 class="section-title">
                        <span class="section-icon">📝</span>
                        Project Description
                    </h2>
                    <div class="edit-placeholder">
                        Click here to add your project description. Describe the purpose, methodology, expected outcomes, and any important notes about this experiment.
                    </div>
                </section>

                <section class="section editable-section">
                    <h2 class="section-title">
                        <span class="section-icon">🔬</span>
                        Methodology
                    </h2>
                    <div class="edit-placeholder">
                        Add your experimental methodology, procedures, and protocols here.
                    </div>
                </section>

                <section class="section editable-section">
                    <h2 class="section-title">
                        <span class="section-icon">📈</span>
                        Results
                    </h2>
                    <div class="edit-placeholder">
                        Document your findings, observations, and results here.
                    </div>
                </section>

                <section class="section editable-section">
                    <h2 class="section-title">
                        <span class="section-icon">💭</span>
                        Notes
                    </h2>
                    <div class="edit-placeholder">
                        Add any additional notes, observations, or important information here.
                    </div>
                </section>
            </main>

            <footer class="footer">
                <div class="creation-info">
                    🧬 Generated by MetaFold on ${formattedDate}
                </div>
            </footer>
        </div>

        <script>
            // Make editable sections clickable
            document.addEventListener('DOMContentLoaded', function() {
                const editablePlaceholders = document.querySelectorAll('.edit-placeholder');
                
                editablePlaceholders.forEach(placeholder => {
                    placeholder.addEventListener('click', function() {
                        const currentText = this.textContent.trim();
                        const isPlaceholder = currentText.startsWith('Click here') || currentText.startsWith('Add your') || currentText.startsWith('Document your');
                        
                        const textarea = document.createElement('textarea');
                        textarea.style.cssText = \`
                            width: 100%;
                            min-height: 100px;
                            background: rgba(0, 0, 0, 0.3);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            border-radius: 8px;
                            color: #e0e0e0;
                            padding: 15px;
                            font-family: inherit;
                            font-size: 0.95rem;
                            line-height: 1.5;
                            resize: vertical;
                        \`;
                        textarea.value = isPlaceholder ? '' : currentText;
                        textarea.placeholder = currentText;
                        
                        this.replaceWith(textarea);
                        textarea.focus();
                        
                        textarea.addEventListener('blur', function() {
                            const newDiv = document.createElement('div');
                            newDiv.className = 'edit-placeholder';
                            
                            if (this.value.trim()) {
                                newDiv.textContent = this.value;
                                newDiv.style.fontStyle = 'normal';
                                newDiv.style.background = 'rgba(0, 0, 0, 0.3)';
                                newDiv.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                            } else {
                                newDiv.textContent = this.placeholder;
                            }
                            
                            this.replaceWith(newDiv);
                        });
                        
                        textarea.addEventListener('keydown', function(e) {
                            if (e.key === 'Escape') {
                                this.blur();
                            }
                        });
                    });
                });
            });
        </script>
    </body>
    </html>`;

        return htmlContent;
    }

// Default value for metadata types
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

// Main scanning function - recursively finds MetaFold projects
async function scanForMetaFoldProjects(basePath, maxDepth, currentDepth = 0) {
    const projects = [];
    
    if (currentDepth >= maxDepth) {
        console.log(`⚠️ Maximum depth (${maxDepth}) reached at: ${basePath}`);
        return projects;
    }
    
    try {
        // Check if current directory is a MetaFold project
        const metadataPath = path.join(basePath, 'elabftw-metadata.json');
        
        try {
            await fs.access(metadataPath);
            // This directory contains elabftw-metadata.json - it's a MetaFold project!
            const project = await parseMetaFoldProject(basePath);
            if (project) {
                projects.push(project);
                console.log(`📁 Found MetaFold project: ${project.name} (${project.path})`);
            }
        } catch (accessError) {
            // No elabftw-metadata.json in this directory, continue scanning
        }
        
        // Recursively scan subdirectories
        const entries = await fs.readdir(basePath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subPath = path.join(basePath, entry.name);
                
                // Skip hidden directories and common non-project directories
                if (shouldSkipDirectory(entry.name)) {
                    continue;
                }
                
                try {
                    const subProjects = await scanForMetaFoldProjects(subPath, maxDepth, currentDepth + 1);
                    projects.push(...subProjects);
                } catch (subError) {
                    console.warn(`⚠️ Error scanning subdirectory ${subPath}:`, subError.message);
                    // Continue with other directories
                }
            }
        }
        
    } catch (error) {
        console.warn(`⚠️ Error accessing directory ${basePath}:`, error.message);
    }
    
    return projects;
}

// Parse a single MetaFold project directory
async function parseMetaFoldProject(projectPath) {
    try {
        const metadataPath = path.join(projectPath, 'elabftw-metadata.json');
        const readmePath = path.join(projectPath, 'README.md');
        
        // Read metadata
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        
        // Read README if it exists
        let readmeContent = null;
        try {
            readmeContent = await fs.readFile(readmePath, 'utf8');
        } catch (readmeError) {
            // README is optional
        }
        
        // Get directory stats
        const stats = await fs.stat(projectPath);
        
        // Extract project name from directory path
        const projectName = path.basename(projectPath);
        
        // Analyze metadata
        const metadataAnalysis = analyzeProjectMetadata(metadata);
        
        // Build project object
        const project = {
            name: projectName,
            path: projectPath,
            relativePath: projectPath, // Will be updated by caller if needed
            created: stats.birthtime || stats.ctime,
            modified: stats.mtime,
            size: await getDirectorySize(projectPath),
            
            // Metadata information
            metadata: metadata,
            metadataFieldCount: metadataAnalysis.fieldCount,
            metadataTypes: metadataAnalysis.types,
            
            // Content information
            hasReadme: readmeContent !== null,
            readmePreview: readmeContent ? readmeContent.substring(0, 200) + '...' : null,
            
            // Project structure
            depth: 0, // Will be calculated by caller
            parentPath: path.dirname(projectPath),
            
            // Quick access info
            type: 'metafold-project',
            version: '1.1.0' // MetaFold version that created this
        };
        
        return project;
        
    } catch (error) {
        console.error(`❌ Error parsing MetaFold project at ${projectPath}:`, error);
        return null;
    }
}

// Analyze metadata structure
function analyzeProjectMetadata(metadata) {
    const analysis = {
        fieldCount: 0,
        types: {},
        hasRequiredFields: false,
        completedFields: 0
    };
    
    if (metadata && metadata.extra_fields) {
        const fields = metadata.extra_fields;
        analysis.fieldCount = Object.keys(fields).length;
        
        Object.values(fields).forEach(field => {
            const type = field.type || 'unknown';
            analysis.types[type] = (analysis.types[type] || 0) + 1;
            
            if (field.required) {
                analysis.hasRequiredFields = true;
            }
            
            if (field.value && field.value.trim() !== '') {
                analysis.completedFields++;
            }
        });
    }
    
    return analysis;
}

// Get directory size recursively
async function getDirectorySize(dirPath) {
    try {
        let totalSize = 0;
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
            const entryPath = path.join(dirPath, entry.name);
            
            if (entry.isDirectory()) {
                totalSize += await getDirectorySize(entryPath);
            } else {
                const stats = await fs.stat(entryPath);
                totalSize += stats.size;
            }
        }
        
        return totalSize;
    } catch (error) {
        console.warn(`⚠️ Error calculating directory size for ${dirPath}:`, error.message);
        return 0;
    }
}

// Check if directory should be skipped during scanning
function shouldSkipDirectory(dirName) {
    const skipPatterns = [
        // Hidden directories
        /^\./,
        // Version control
        /^\.git$/,
        /^\.svn$/,
        // Node.js
        /^node_modules$/,
        // Build directories
        /^build$/,
        /^dist$/,
        /^target$/,
        // Temporary directories
        /^tmp$/,
        /^temp$/,
        // Cache directories
        /^cache$/,
        /^\.cache$/,
        // OS specific
        /^__pycache__$/,
        /^\.DS_Store$/,
        /^Thumbs\.db$/
    ];
    
    return skipPatterns.some(pattern => pattern.test(dirName));
}

// Get detailed information about a specific project
async function getProjectDetails(projectPath) {
    try {
        const project = await parseMetaFoldProject(projectPath);
        if (!project) {
            throw new Error('Not a valid MetaFold project');
        }
        
        // Get additional details
        const entries = await fs.readdir(projectPath, { withFileTypes: true });
        
        const details = {
            ...project,
            fileCount: entries.filter(entry => entry.isFile()).length,
            directoryCount: entries.filter(entry => entry.isDirectory()).length,
            files: entries.filter(entry => entry.isFile()).map(entry => entry.name),
            directories: entries.filter(entry => entry.isDirectory()).map(entry => entry.name),
            
            // Check for nested MetaFold projects
            hasNestedProjects: false
        };
        
        // Check for nested projects
        for (const entry of entries) {
            if (entry.isDirectory()) {
                const subPath = path.join(projectPath, entry.name);
                const nestedMetadataPath = path.join(subPath, 'elabftw-metadata.json');
                
                try {
                    await fs.access(nestedMetadataPath);
                    details.hasNestedProjects = true;
                    break;
                } catch {
                    // No nested project in this directory
                }
            }
        }
        
        return details;
        
    } catch (error) {
        throw new Error(`Failed to get project details: ${error.message}`);
    }
}

// Analyze statistics across multiple projects
function analyzeProjectStatistics(projects) {
    const stats = {
        totalProjects: projects.length,
        totalSize: 0,
        averageFieldCount: 0,
        fieldTypes: {},
        projectsByDepth: {},
        creationDates: [],
        mostRecentProject: null,
        oldestProject: null,
        largestProject: null,
        
        // MetaFold specific statistics
        projectsWithReadme: 0,
        averageCompletionRate: 0,
        commonFieldTypes: {},
        projectHierarchy: {
            rootProjects: 0,
            nestedProjects: 0,
            maxDepth: 0
        }
    };
    
    if (projects.length === 0) {
        return stats;
    }
    
    let totalFieldCount = 0;
    let totalCompletedFields = 0;
    let totalPossibleFields = 0;
    
    projects.forEach(project => {
        // Basic stats
        stats.totalSize += project.size || 0;
        totalFieldCount += project.metadataFieldCount || 0;
        
        if (project.hasReadme) {
            stats.projectsWithReadme++;
        }
        
        // Field types analysis
        if (project.metadataTypes) {
            Object.entries(project.metadataTypes).forEach(([type, count]) => {
                stats.fieldTypes[type] = (stats.fieldTypes[type] || 0) + count;
            });
        }
        
        // Creation dates
        if (project.created) {
            stats.creationDates.push(project.created);
            
            if (!stats.mostRecentProject || project.created > stats.mostRecentProject.created) {
                stats.mostRecentProject = project;
            }
            
            if (!stats.oldestProject || project.created < stats.oldestProject.created) {
                stats.oldestProject = project;
            }
        }
        
        // Largest project
        if (!stats.largestProject || (project.size || 0) > (stats.largestProject.size || 0)) {
            stats.largestProject = project;
        }
        
        // Completion rate calculation
        if (project.metadata && project.metadata.extra_fields) {
            const fields = project.metadata.extra_fields;
            const fieldCount = Object.keys(fields).length;
            const completedCount = Object.values(fields).filter(field => 
                field.value && field.value.toString().trim() !== ''
            ).length;
            
            totalPossibleFields += fieldCount;
            totalCompletedFields += completedCount;
        }
    });
    
    // Calculate averages
    stats.averageFieldCount = totalFieldCount / projects.length;
    stats.averageCompletionRate = totalPossibleFields > 0 ? 
        (totalCompletedFields / totalPossibleFields) * 100 : 0;
    
    // Format sizes
    stats.totalSizeFormatted = formatBytes(stats.totalSize);
    stats.averageSizeFormatted = formatBytes(stats.totalSize / projects.length);
    
    return stats;
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}