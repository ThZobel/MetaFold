const { app, BrowserWindow, dialog, ipcMain, shell, safeStorage, Menu, clipboard } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const OMEROProxyServer = require('./js/proxyManager.js');

let mainWindow;

// Global proxy manager instance
let omeroProxyServer = null;

function createMenuTemplate() {
    const template = [];

    // macOS App Menu (only on macOS)
    if (process.platform === 'darwin') {
        template.push({
            label: app.getName(),
            submenu: [
                {
                    label: 'About MetaFold',
                    click: showAboutDialog
                },
                { type: 'separator' },
                {
                    label: 'Services',
                    role: 'services',
                    submenu: []
                },
                { type: 'separator' },
                {
                    label: `Hide ${app.getName()}`,
                    accelerator: 'Command+H',
                    role: 'hide'
                },
                {
                    label: 'Hide Others',
                    accelerator: 'Command+Alt+H',
                    role: 'hideothers'
                },
                {
                    label: 'Show All',
                    role: 'unhide'
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'Command+Q',
                    click: () => app.quit()
                }
            ]
        });
    }

    // File Menu
    template.push({
        label: 'File',
        submenu: [
            {
                label: 'New Template',
                accelerator: 'CmdOrCtrl+N',
                click: () => {
                    mainWindow.webContents.send('menu-action', 'new-template');
                }
            },
            { type: 'separator' },
            {
                label: process.platform === 'darwin' ? 'Close Window' : 'Exit',
                accelerator: process.platform === 'darwin' ? 'Cmd+W' : 'Ctrl+Q',
                click: () => {
                    if (process.platform === 'darwin') {
                        mainWindow.close();
                    } else {
                        app.quit();
                    }
                }
            }
        ]
    });

    // View Menu
    template.push({
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: () => {
                    mainWindow.reload();
                }
            },
            {
                label: 'Force Reload',
                accelerator: 'CmdOrCtrl+Shift+R',
                click: () => {
                    mainWindow.webContents.reloadIgnoringCache();
                }
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click: () => {
                    mainWindow.webContents.toggleDevTools();
                }
            },
            { type: 'separator' },
            {
                label: 'Actual Size',
                accelerator: 'CmdOrCtrl+0',
                role: 'resetZoom'
            },
            {
                label: 'Zoom In',
                accelerator: 'CmdOrCtrl+Plus',
                role: 'zoomIn'
            },
            {
                label: 'Zoom Out',
                accelerator: 'CmdOrCtrl+-',
                role: 'zoomOut'
            },
            { type: 'separator' },
            {
                label: 'Toggle Fullscreen',
                accelerator: process.platform === 'darwin' ? 'Ctrl+Command+F' : 'F11',
                role: 'togglefullscreen'
            }
        ]
    });

    // Window Menu (mainly for macOS)
    if (process.platform === 'darwin') {
        template.push({
            label: 'Window',
            submenu: [
                {
                    label: 'Minimize',
                    accelerator: 'Command+M',
                    role: 'minimize'
                },
                {
                    label: 'Close',
                    accelerator: 'Command+W',
                    role: 'close'
                },
                { type: 'separator' },
                {
                    label: 'Bring All to Front',
                    role: 'front'
                }
            ]
        });
    }

    // Help Menu
    template.push({
        label: 'Help',
        submenu: [
            {
                label: 'Documentation',
                click: () => {
                    shell.openExternal('https://metafold-docs.readthedocs.io/en/latest/');
                }
            },
            {
                label: 'GitHub Repository',
                click: () => {
                    shell.openExternal('https://github.com/ThZobel/MetaFold');
                }
            },
            { type: 'separator' },
            {
                label: 'About MetaFold',
                click: showAboutDialog
            }
        ]
    });

    return template;
}


function showAboutDialog() {
    const aboutOptions = {
        type: 'info',
        title: 'About MetaFold',
        message: 'MetaFold',
        detail: `Laboratory Data Management & Experiment Organization

Version: ${app.getVersion()}
License: MIT

Developed by: Dr. Thomas Zobel
(with assistance from AI)

GitHub: https://github.com/ThZobel/MetaFold
Documentation: https://metafold-docs.readthedocs.io/en/latest/

Built for life sciences research workflows.`,
        buttons: ['OK'],
        defaultId: 0,
        noLink: false
    };

    dialog.showMessageBox(mainWindow, aboutOptions);
}

async function createWindow() {
    // Load saved window state
    const savedState = await loadWindowState();

    // Use saved state or defaults
    const windowOptions = {
        width: savedState?.width || 1200,
        height: savedState?.height || 800,
        x: savedState?.x,
        y: savedState?.y,
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
    };

    mainWindow = new BrowserWindow(windowOptions);

    // =================== DEVTOOLS PROTECTION ===================

    // Track if DevTools are currently allowed
    let devToolsAllowed = false;
    let currentMetaFoldUser = null;

    // IPC Handler: Check if current user is Admin
    ipcMain.handle('check-admin-user', async (event, username) => {
        currentMetaFoldUser = username;
        const isAdmin = username === 'Admin';
        console.log(`🔐 User "${username}" is ${isAdmin ? 'ADMIN' : 'NOT admin'}`);
        return { isAdmin };
    });

    // IPC Handler: Clipboard
    ipcMain.handle('write-to-clipboard', (event, text) => {
        clipboard.writeText(text);
        return { success: true };
    });

    // IPC Handler: Request to open DevTools (Admin only)
    ipcMain.handle('open-devtools', async (event) => {
        console.log('🔓 DevTools open requested by:', currentMetaFoldUser);

        if (currentMetaFoldUser === 'Admin') {
            devToolsAllowed = true;
            if (mainWindow && !mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.openDevTools();
                console.log('✅ DevTools opened for Admin');
            }
            return { success: true, message: 'DevTools enabled' };
        } else {
            console.warn('⚠️ Non-admin user attempted to open DevTools:', currentMetaFoldUser);
            return { success: false, message: 'Admin privileges required' };
        }
    });

    // IPC Handler: Close DevTools for non-admin
    ipcMain.handle('close-devtools', async (event) => {
        console.log('🔒 DevTools close requested');

        if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
            devToolsAllowed = false;
            console.log('✅ DevTools closed');
        }

        return { success: true };
    });

    // Monitor DevTools state
    if (mainWindow) {
        mainWindow.webContents.on('devtools-opened', () => {
            console.log('🔍 DevTools opened event detected');

            // If not admin, close immediately
            if (currentMetaFoldUser !== 'Admin' && !devToolsAllowed) {
                console.warn('⚠️ Unauthorized DevTools access detected');
                setTimeout(() => {
                    if (mainWindow && mainWindow.webContents.isDevToolsOpened()) {
                        mainWindow.webContents.closeDevTools();
                        console.log('🔒 DevTools auto-closed for non-admin');

                        // Show warning
                        mainWindow.webContents.send('security-warning', {
                            message: 'DevTools access requires administrator privileges.',
                            severity: 'warning'
                        });
                    }
                }, 100);
            }
        });

        // Prevent right-click context menu for non-admin users
        mainWindow.webContents.on('context-menu', (event, params) => {
            if (currentMetaFoldUser !== 'Admin') {
                // Block "Inspect Element" and similar
                event.preventDefault();
            }
        });

        // Block keyboard shortcuts for DevTools (F12, Ctrl+Shift+I, etc.)
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (currentMetaFoldUser !== 'Admin') {
                // Block F12
                if (input.key === 'F12') {
                    event.preventDefault();
                    console.log('🔒 F12 blocked for non-admin');
                }

                // Block Ctrl+Shift+I (Inspect)
                if (input.control && input.shift && input.key.toLowerCase() === 'i') {
                    event.preventDefault();
                    console.log('🔒 Ctrl+Shift+I blocked for non-admin');
                }

                // Block Ctrl+Shift+J (Console)
                if (input.control && input.shift && input.key.toLowerCase() === 'j') {
                    event.preventDefault();
                    console.log('🔒 Ctrl+Shift+J blocked for non-admin');
                }

                // Block Ctrl+Shift+C (Inspect Element)
                if (input.control && input.shift && input.key.toLowerCase() === 'c') {
                    event.preventDefault();
                    console.log('🔒 Ctrl+Shift+C blocked for non-admin');
                }
            }
        });
    }

    // Disable DevTools in production for non-admin by default
    if (!process.argv.includes('--dev')) {
        if (mainWindow) {
            mainWindow.webContents.on('dom-ready', () => {
                if (currentMetaFoldUser !== 'Admin') {
                    mainWindow.webContents.closeDevTools();
                    console.log('🔒 DevTools disabled for non-admin users');
                }
            });
        }
    }

    console.log('✅ DevTools protection system initialized');

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Apply saved fullscreen/maximized state
        if (savedState) {
            applyWindowState(mainWindow, savedState);
        }

        if (process.argv.includes('--dev')) {
            mainWindow.webContents.openDevTools();
        }

        console.log('✅ Window restored with saved state:', savedState ? 'Yes' : 'No (using defaults)');
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    const menuTemplate = createMenuTemplate();
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // Setup window state management
    setupWindowStateManagement(mainWindow);
}

// =================== WINDOW STATE MANAGEMENT ===================

/**
 * Save window state (size, position, fullscreen) to file
 */
function saveWindowState(window) {
    try {
        const bounds = window.getBounds();
        const isFullScreen = window.isFullScreen();
        const isMaximized = window.isMaximized();

        const windowState = {
            width: bounds.width,
            height: bounds.height,
            x: bounds.x,
            y: bounds.y,
            isFullScreen: isFullScreen,
            isMaximized: isMaximized,
            timestamp: new Date().toISOString()
        };

        // Save to file in user data directory for persistence
        const userDataPath = app.getPath('userData');
        const windowStatePath = path.join(userDataPath, 'window-state.json');

        fs.writeFile(windowStatePath, JSON.stringify(windowState, null, 2), 'utf8')
            .then(() => {
                console.log('💾 Window state saved:', windowState);
            })
            .catch(error => {
                console.error('❌ Failed to save window state:', error);
            });

    } catch (error) {
        console.error('❌ Error saving window state:', error);
    }
}

/**
 * Load window state from file
 * @returns {Object|null} - Saved window state or null
 */
async function loadWindowState() {
    try {
        const userDataPath = app.getPath('userData');
        const windowStatePath = path.join(userDataPath, 'window-state.json');

        const data = await fs.readFile(windowStatePath, 'utf8');
        const windowState = JSON.parse(data);

        console.log('📂 Window state loaded:', windowState);
        return windowState;

    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.warn('⚠️ Could not load window state:', error.message);
        }
        return null;
    }
}

/**
 * Apply saved window state to window
 * @param {BrowserWindow} window - Window to apply state to
 * @param {Object} state - Window state to apply
 */
function applyWindowState(window, state) {
    if (!state) return;

    try {
        // Validate bounds are within screen
        const { screen } = require('electron');
        const displayBounds = screen.getPrimaryDisplay().bounds;

        // Ensure window is visible on screen
        if (state.x >= 0 && state.y >= 0 &&
            state.x < displayBounds.width && state.y < displayBounds.height) {
            window.setBounds({
                x: state.x,
                y: state.y,
                width: state.width,
                height: state.height
            });
        } else {
            // Window would be off-screen, just apply size
            window.setSize(state.width, state.height);
        }

        // Apply fullscreen/maximized state
        if (state.isFullScreen) {
            window.setFullScreen(true);
        } else if (state.isMaximized) {
            window.maximize();
        }

        console.log('✅ Window state applied');

    } catch (error) {
        console.error('❌ Error applying window state:', error);
    }
}

/**
 * Setup window state management
 * @param {BrowserWindow} window - Window to manage
 */
function setupWindowStateManagement(window) {
    // Save state on various events

    // Save on resize
    window.on('resize', () => {
        if (!window.isFullScreen() && !window.isMaximized()) {
            saveWindowState(window);
        }
    });

    // Save on move
    window.on('move', () => {
        if (!window.isFullScreen() && !window.isMaximized()) {
            saveWindowState(window);
        }
    });

    // Save on enter/leave fullscreen
    window.on('enter-full-screen', () => {
        saveWindowState(window);
    });

    window.on('leave-full-screen', () => {
        saveWindowState(window);
    });

    // Save on maximize/unmaximize
    window.on('maximize', () => {
        saveWindowState(window);
    });

    window.on('unmaximize', () => {
        saveWindowState(window);
    });

    // Save final state before closing
    window.on('close', () => {
        saveWindowState(window);
    });

    console.log('✅ Window state management setup complete');
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
    console.log('🔴 App closing - initiating cleanup...');

    // Phase 5.1: Send app-closing event to renderer for OMERO logout
    if (mainWindow && !mainWindow.isDestroyed()) {
        console.log('📤 Sending app-closing event to renderer');
        mainWindow.webContents.send('app-closing');

        // Give renderer time to logout (but don't wait too long)
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Stop OMERO proxy server if running
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

    console.log('🟢 Cleanup complete - app will now quit');
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Generate stable filename without timestamps (FIXED: Short names only)
function generateStableTemplateFilename(template) {
    const safeName = (template.name || 'template')
        .replace(/[^a-zA-Z0-9\s\-_]/g, '')  // Remove special chars
        .replace(/\s+/g, '_')               // Replace spaces with underscores
        .toLowerCase()                      // Lowercase
        .substring(0, 80);                  // Increased limit

    // FIXED: Just name + .json, no user/type suffix
    return `${safeName}.json`;
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

// Multi-Folder Dialog
ipcMain.handle('select-folders', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'multiSelections'],
        title: 'Select Target Folders'
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths;
    }
    return null;
});

// Show Save Dialog
ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    if (!result.canceled && result.filePath) {
        return result.filePath;
    }
    return null;
});

ipcMain.handle('show-message-box', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
});

// Create Project (Main API) - EXTENDED for optional folder structure
ipcMain.handle('create-project', async (event, basePath, projectName, structure, metadata = null, options = {}) => {
    try {
        // Construct path correctly - path.join normalizes automatically
        const projectPath = options.skipFolder ? basePath : path.join(basePath, projectName);

        console.log(`📁 Target directory: ${projectPath}`);

        // Only create main project folder if not skipping
        if (!options.skipFolder) {
            await fs.mkdir(projectPath, { recursive: true });
            console.log(`📁 Project folder created: ${projectPath}`);
        } else {
            console.log(`📄 Skipping project folder creation, writing files to: ${projectPath}`);
        }

        // Only create folder structure if present and we are not skipping folders entirely
        if (structure && structure.trim() !== '' && !options.skipFolder) {
            await createFolderStructure(projectPath, structure);
        } else {
            console.log(`📋 No folder structure defined - skipping structure creation`);
        }

        // ✅ FIX: Metadaten-JSON erstellen mit korrektem Dateinamen UND projectName
        if (metadata && Object.keys(metadata).length > 0) {
            const metadataFilename = `${projectName}-metadata.json`;
            const metadataPath = path.join(projectPath, metadataFilename);
            
            let enhancedMetadata = { ...metadata, projectName: projectName };
            let isExtending = false;

            if (options.extend) {
                try {
                    const existingContent = await fs.readFile(metadataPath, 'utf8');
                    const existingMetadata = JSON.parse(existingContent);
                    const currentUser = options.userInfo?.username || 'Unknown';
                    const currentDate = new Date().toISOString();

                    // Track updates and intelligently merge fields
                    const mergedMetadata = { ...existingMetadata };
                    
                    Object.keys(enhancedMetadata).forEach(key => {
                        if (key === 'provenance' || key === 'projectName' || key === 'metafold_project_id' || key.startsWith('System.')) return;
                        
                        const newField = enhancedMetadata[key];
                        const oldField = existingMetadata[key];
                        
                        // Check if newField has a meaningful value
                        const hasNewValue = newField && typeof newField === 'object' && 
                                            newField.value !== undefined && newField.value !== null && 
                                            (Array.isArray(newField.value) ? newField.value.length > 0 : newField.value !== '');
                        
                        if (!hasNewValue) {
                            // If user left this field blank, keep the old one
                            return; 
                        }
                        
                        let isUpdated = false;
                        let isModified = false;
                        let mergedValue = newField.value;
                        
                        if (!oldField) {
                            isUpdated = true;
                            mergedMetadata[key] = { ...newField };
                        } else {
                            // Both exist, and new has value
                            const oldValue = oldField.value;
                            
                            // Array merge
                            if (Array.isArray(oldValue)) {
                                const newArray = Array.isArray(mergedValue) ? mergedValue : [mergedValue];
                                const mergedArray = [...new Set([...oldValue, ...newArray])];
                                
                                // Check if array changed
                                if (mergedArray.length !== oldValue.length || !mergedArray.every(v => oldValue.includes(v))) {
                                    isUpdated = true;
                                    isModified = true;
                                    mergedValue = mergedArray;
                                }
                            } else {
                                // String/Primitive merge (overwrite)
                                if (mergedValue !== oldValue) {
                                    isUpdated = true;
                                    isModified = true;
                                }
                            }
                            
                            if (isUpdated) {
                                mergedMetadata[key] = { 
                                    ...oldField, 
                                    ...newField, 
                                    value: mergedValue 
                                };
                            }
                        }
                        
                        if (isUpdated) {
                            mergedMetadata[key].lastUpdatedBy = currentUser;
                            mergedMetadata[key].lastUpdatedAt = currentDate;
                            if (isModified) {
                                mergedMetadata[key].isModified = true;
                            }
                            if (options.templateName) {
                                mergedMetadata[key].templateName = options.templateName;
                            }
                        }
                    });

                    // Keep system keys updated
                    if (enhancedMetadata.provenance) mergedMetadata.provenance = enhancedMetadata.provenance;
                    if (enhancedMetadata.projectName) mergedMetadata.projectName = enhancedMetadata.projectName;
                    
                    enhancedMetadata = mergedMetadata;
                    // Preserve original project ID if it exists
                    if (existingMetadata.metafold_project_id) {
                        enhancedMetadata.metafold_project_id = existingMetadata.metafold_project_id;
                    }
                    isExtending = true;
                    console.log(`✅ Extending existing metadata for ${projectName}`);
                } catch (err) {
                    console.warn(`⚠️ Could not read existing metadata for extension, creating new: ${err.message}`);
                }
            }

            if (!enhancedMetadata.metafold_project_id) {
                enhancedMetadata.metafold_project_id = require('crypto').randomUUID();
            }

            // Inject paths
            enhancedMetadata['System.ProjectAbsolutePath'] = {
                label: 'Project Absolute Path',
                type: 'text',
                value: projectPath,
                position: 900
            };
            enhancedMetadata['System.ProjectRelativePath'] = {
                label: 'Project Relative Path',
                type: 'text',
                value: path.relative(basePath, projectPath) || '.',
                position: 901
            };

            // Inject update history if extending
            if (isExtending && options.userInfo) {
                if (!enhancedMetadata['System.UpdateHistory']) {
                    enhancedMetadata['System.UpdateHistory'] = { value: [], type: 'history' };
                }
                
                const historyArray = Array.isArray(enhancedMetadata['System.UpdateHistory'].value) 
                    ? enhancedMetadata['System.UpdateHistory'].value 
                    : [];

                const updateEntry = {
                    date: new Date().toISOString(),
                    user: options.userInfo.username || 'Unknown',
                    group: options.userInfo.groupname || 'Unknown',
                    action: 'Metadata Extended'
                };
                
                historyArray.push(updateEntry);
                enhancedMetadata['System.UpdateHistory'] = { value: historyArray, type: 'history' };
                enhancedMetadata['System.LastUpdatedBy'] = { value: updateEntry.user, type: 'user' };
                enhancedMetadata['System.LastUpdatedAt'] = { value: updateEntry.date, type: 'date' };
            }

            // Clean empty fields and ensure templateName from metadata before saving
            Object.keys(enhancedMetadata).forEach(key => {
                // Keep special internal fields
                if (key === 'provenance' || key === 'projectName' || key === 'metafold_project_id' || key === 'metafold_integration' || key.startsWith('System.')) {
                    return;
                }
                const field = enhancedMetadata[key];
                if (field && typeof field === 'object' && 'value' in field) {
                    const val = field.value;
                    if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
                        delete enhancedMetadata[key];
                    } else if (!field.templateName && options.templateName) {
                        // Tag base template fields with their template name
                        field.templateName = options.templateName;
                    }
                }
            });

            // Erstelle Metadaten-JSON mit ${projectName}-metadata.json
            await fs.writeFile(metadataPath, JSON.stringify(enhancedMetadata, null, 2), 'utf8');
            console.log(`✅ Metadata file ${isExtending ? 'updated' : 'created'} with projectName: ${metadataFilename}`);

            // Erstelle README.html mit enhanced Metadaten
            const readmeHtml = generateReadmeHtmlWithMetadata(enhancedMetadata, projectName);
            const readmeFilename = `${projectName}-README.html`;
            const readmePath = path.join(projectPath, readmeFilename);
            await fs.writeFile(readmePath, readmeHtml, 'utf8');
            console.log(`✅ README file created: ${readmeFilename}`);
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
            return {
                success: true,
                content: JSON.parse(content),
                filePath: result.filePaths[0],
                fileName: path.basename(result.filePaths[0])
            };
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
            return { success: true, message: 'JSON file saved successfully!', filePath: result.filePath };
        } catch (error) {
            return { success: false, message: `Error saving JSON file: ${error.message}` };
        }
    }
    return { success: false, message: 'Save cancelled' };
});

// Generate README.html content without saving (for metadataLoader)
ipcMain.handle('generate-readme-html-content', async (event, metadata, projectName, elabftwUrl = null, omeroUrl = null) => {
    try {
        console.log(`📄 IPC: Generating README.html content for: ${projectName}`);
        console.log('  elabFTW URL:', elabftwUrl || 'none');
        console.log('  OMERO URL:', omeroUrl || 'none');

        // Use existing generateReadmeHtmlWithMetadata function
        const readmeHtml = generateReadmeHtmlWithMetadata(metadata, projectName, elabftwUrl, omeroUrl);

        console.log(`✅ IPC: README.html content generated successfully (${readmeHtml.length} chars)`);

        return {
            success: true,
            html: readmeHtml,
            message: 'README content generated successfully'
        };

    } catch (error) {
        console.error('❌ IPC: Error generating README content:', error);
        return {
            success: false,
            message: error.message,
            error: error.toString()
        };
    }
});

// Save HTML file with save dialog
ipcMain.handle('save-html-file', async (event, htmlContent, suggestedFilename = 'file.html') => {
    try {
        console.log(`💾 IPC: Opening save dialog for HTML file...`);
        console.log('  Suggested filename:', suggestedFilename);

        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save README.html',
            filters: [
                { name: 'HTML Files', extensions: ['html', 'htm'] }
            ],
            defaultPath: suggestedFilename
        });

        if (!result.canceled && result.filePath) {
            // Write the HTML file
            await fs.writeFile(result.filePath, htmlContent, 'utf8');

            console.log(`✅ IPC: HTML file saved successfully: ${result.filePath}`);

            return {
                success: true,
                filePath: result.filePath,
                filename: path.basename(result.filePath),
                message: 'HTML file saved successfully'
            };
        }

        console.log('ℹ️ IPC: User cancelled save dialog');
        return {
            success: false,
            message: 'Save cancelled by user',
            cancelled: true
        };

    } catch (error) {
        console.error('❌ IPC: Error saving HTML file:', error);
        return {
            success: false,
            message: error.message,
            error: error.toString()
        };
    }
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

// File reading
ipcMain.handle('readFile', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        return content;
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error reading file:', error);
        }
        return null;
    }
});

// File writing for export
ipcMain.handle('writeFile', async (event, filePath, content) => {
    try {
        await fs.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Path joining utility
ipcMain.handle('joinPath', async (event, ...pathParts) => {
    return path.join(...pathParts);
});

// Copy file from source to destination
ipcMain.handle('copyFile', async (event, srcPath, destPath) => {
    try {
        await fs.copyFile(srcPath, destPath);
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Get top-level subfolders for given project paths
ipcMain.handle('get-subfolders', async (event, projectPaths) => {
    try {
        const results = {};
        for (const p of projectPaths) {
            if (require('fs').existsSync(p)) {
                const entries = await fs.readdir(p, { withFileTypes: true });
                results[p] = entries
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name);
            } else {
                results[p] = [];
            }
        }
        return { success: true, subfolders: results };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Harvest projects with selected subfolders
ipcMain.handle('harvest-projects', async (event, exportPath, projectsData) => {
    try {
        await fs.mkdir(exportPath, { recursive: true });
        for (const proj of projectsData) {
            const destDir = path.join(exportPath, proj.name);
            await fs.mkdir(destDir, { recursive: true });
            
            if (require('fs').existsSync(proj.path)) {
                const entries = await fs.readdir(proj.path, { withFileTypes: true });
                for (const entry of entries) {
                    const src = path.join(proj.path, entry.name);
                    const dest = path.join(destDir, entry.name);
                    
                    if (entry.isFile()) {
                        await fs.copyFile(src, dest);
                    } else if (entry.isDirectory()) {
                        if (proj.selectedFolders && proj.selectedFolders.includes(entry.name)) {
                            await fs.cp(src, dest, { recursive: true });
                        }
                    }
                }
            }
        }
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Ensure directory exists
ipcMain.handle('ensureDir', async (event, dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Get application path
ipcMain.handle('getAppPath', async (event) => {
    try {
        return { success: true, path: app.getAppPath() };
    } catch (error) {
        return { success: false, message: error.message };
    }
});

// Regenerate README.html with metadata and integration links
ipcMain.handle('regenerate-readme-html', async (event, projectPath, metadata, projectName, elabftwUrl = null, omeroUrl = null) => {
    try {
        console.log(`📄 IPC: Regenerating README.html for: ${projectName}`);
        console.log('  Project path:', projectPath);
        console.log('  elabFTW URL:', elabftwUrl || 'none');
        console.log('  OMERO URL:', omeroUrl || 'none');

        // Generate complete README.html with metadata and integration links
        const readmeHtml = generateReadmeHtmlWithMetadata(metadata, projectName, elabftwUrl, omeroUrl);

        // Construct the README filename
        const sanitizedProjectName = projectName
            ? projectName.replace(/[<>:"/\\|?*]/g, '_').trim()
            : 'Project';

        const readmeFilename = `${sanitizedProjectName}-README.html`;
        const readmePath = path.join(projectPath, readmeFilename);

        // Write the README file
        await fs.writeFile(readmePath, readmeHtml, 'utf8');

        console.log(`✅ IPC: README.html regenerated successfully: ${readmeFilename}`);

        return {
            success: true,
            message: 'README.html regenerated successfully',
            path: readmePath,
            filename: readmeFilename
        };

    } catch (error) {
        console.error('❌ IPC: Error regenerating README.html:', error);
        return {
            success: false,
            message: error.message,
            error: error.toString()
        };
    }
});

// Insert integration links into existing README.html
// Insert integration links into existing README.html
ipcMain.handle('insert-links-into-readme', async (event, projectPath, elabftwUrl, omeroUrl, projectName = null, rspaceUrl = null) => {
    try {
        console.log(`📄 IPC: Inserting integration links into README: ${projectPath}`);

        // Construct the correct README filename with project name
        const sanitizedProjectName = projectName
            ? projectName.replace(/[<>:"/\\|?*]/g, '_').trim()
            : path.basename(projectPath); // Fallback: use folder name

        const readmeFilename = `${sanitizedProjectName}-README.html`;
        const readmePath = path.join(projectPath, readmeFilename);

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

        if (rspaceUrl) {
            linksHtml += `
                    <a href="${rspaceUrl}" class="integration-link" target="_blank" rel="noopener noreferrer">
                        <span class="link-icon">📝</span>
                        <span class="link-text">Open in RSpace</span>
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

// Generate template filename (FIXED: Clean, short names)
function generateTemplateFilename(templateName, templateId = null) {
    const safeName = sanitizeFilename(templateName || 'template')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .substring(0, 80);  // Increased limit

    // FIXED: Just name + .json, no timestamp/ID suffix
    return `${safeName}.json`;
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

        // ===== DATEINAME-LOGIK (FIXED: Clean names) =====
        // 1. Prüfe ob Template bereits eine Datei hat (_fileInfo)
        if (template._fileInfo && template._fileInfo.filename) {
            // BESTEHENDE DATEI - Namen beibehalten
            filename = template._fileInfo.filename;
            filePath = path.join(templatesDir, filename);
            isUpdate = true;
            console.log(`📝 Updating existing file: ${filename}`);
        } else {
            // NEUE DATEI - Kurzen, sauberen Namen generieren  
            filename = generateStableTemplateFilename(template);  // Now returns just name.json
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
                console.log(`  ${i + 1}. "${template.name}" (${template.type}) from ${template._fileInfo.filename}`);
            });
        }

        if (errors.length > 0) {
            console.log(`❌ Failed to load:`);
            errors.forEach((error, i) => {
                console.log(`  ${i + 1}. ${error.file}: ${error.error}`);
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

// Get base MetaFold directory path
ipcMain.handle('get-metafold-directory', async (event) => {
    try {
        const homePath = app.getPath('home');
        const metafoldDir = path.join(homePath, 'MetaFold');
        await fs.mkdir(metafoldDir, { recursive: true });
        return {
            success: true,
            directory: metafoldDir
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
});

// Export templates to location - ERWEITERT um defaultPath Support
ipcMain.handle('export-templates-to-location', async (event, templates, exportType = 'single', defaultPath = null) => {
    try {
        // Generate template-based filename if no defaultPath provided
        let suggestedFileName = defaultPath;

        if (!suggestedFileName) {
            if (exportType === 'bulk') {
                suggestedFileName = 'metafold_templates_export.json';
            } else {
                // Single template export: use template name
                const template = Array.isArray(templates) ? templates[0] : templates;
                if (template && template.name) {
                    // Sanitize template name for filename
                    const safeName = template.name
                        .replace(/[<>:"/\\|?*]/g, '_')     // Remove invalid filename characters
                        .replace(/\s+/g, '_')              // Replace spaces with underscores
                        .toLowerCase()                     // Convert to lowercase
                        .substring(0, 100);                // Limit length

                    suggestedFileName = `${safeName}_template.json`;
                    console.log(`📝 Generated template-based filename: ${suggestedFileName}`);
                } else {
                    suggestedFileName = 'template_export.json';
                }
            }
        }

        const result = await dialog.showSaveDialog(mainWindow, {
            title: exportType === 'bulk' ? 'Export All Templates' : 'Export Template',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            defaultPath: suggestedFileName
        });

        if (!result.canceled && result.filePath) {
            const dataToExport = exportType === 'bulk' ? { templates, exportDate: new Date().toISOString() } : templates;
            await fs.writeFile(result.filePath, JSON.stringify(dataToExport, null, 2), 'utf8');

            console.log(`✅ Template exported successfully to: ${result.filePath}`);

            return {
                success: true,
                message: `Templates exported successfully to ${result.filePath}`,
                filePath: result.filePath,
                fileName: path.basename(result.filePath)
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
            error: error.message,
            message: `Export failed: ${error.message}`
        };
    }
});

// Import templates from file
// Import templates from file
ipcMain.handle('import-templates-from-file', async (event, importType = 'single') => {
    try {
        const properties = ['openFile'];
        if (importType === 'multi') {
            properties.push('multiSelections');
        }

        const result = await dialog.showOpenDialog(mainWindow, {
            title: importType === 'multi' ? 'Import Templates (Select Multiple)' : 'Import Template',
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            properties: properties
        });

        if (!result.canceled && result.filePaths.length > 0) {
            let allTemplates = [];
            const errors = [];
            const fixedFiles = [];

            // Process all selected files
            for (const filePath of result.filePaths) {
                try {
                    const content = await fs.readFile(filePath, 'utf8');
                    const data = JSON.parse(content);

                    let templatesInFile = [];

                    // Handle different formats
                    if (Array.isArray(data)) {
                        templatesInFile = data;
                    } else if (data.templates && Array.isArray(data.templates)) {
                        templatesInFile = data.templates;
                    } else if (data.name) {
                        // Single template
                        templatesInFile = [data];
                    }

                    if (templatesInFile.length > 0) {
                        allTemplates = allTemplates.concat(templatesInFile);
                    } else {
                        console.warn(`⚠️ No valid ISO templates found in ${path.basename(filePath)}`);
                    }

                } catch (fileError) {
                    console.error(`❌ Error reading file ${path.basename(filePath)}:`, fileError);
                    errors.push({ file: path.basename(filePath), error: fileError.message });
                }
            }

            return {
                success: true,
                templates: allTemplates,
                count: allTemplates.length,
                errors: errors.length > 0 ? errors : undefined
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

// =================== PROJECT SCANNER HELPER FUNCTIONS ===================
// These functions must be added BEFORE the "PROJECT SCANNER API" section

/**
 * Recursively collect .metafold-sidecar.json files under a project directory.
 * Extracts ONLY file-specific fields (file info + OME-XML metadata) —
 * inherited project_metadata is deliberately excluded to avoid duplication
 * (the project's own metadata already exists as a separate entry).
 *
 * @param {string} projectPath - Root path of the project to search
 * @returns {Array} Array of slim sidecar objects
 */
async function collectFileSidecars(projectPath) {
    const sidecars = [];

    async function walk(dir) {
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch (_) {
            return; // skip inaccessible folders
        }

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip common non-data directories
                const skipDirs = ['node_modules', '.git', '.vscode', 'dist', 'build', '__pycache__'];
                if (!skipDirs.includes(entry.name)) {
                    await walk(fullPath);
                }
            } else if (entry.isFile() && entry.name.endsWith('.metafold-sidecar.json')) {
                try {
                    const content = await fs.readFile(fullPath, 'utf8');
                    const sidecar = JSON.parse(content);

                    // Build a slim representation — only file-own data, NO project metadata
                    const slim = {
                        sidecar_id: sidecar.sidecar_id || null,
                        sidecarPath: fullPath,
                        generated_at: sidecar.generated_at || null,
                        // File information
                        file: sidecar.file || {
                            name: entry.name.replace('.metafold-sidecar.json', ''),
                            path: fullPath
                        },
                        // OME-XML metadata (the file-specific value-add)
                        ome_metadata: sidecar.ome_metadata || null,
                        // Reference back to project (by ID, not by copying metadata)
                        nearest_project_id: sidecar.nearest_project_id || null
                    };

                    sidecars.push(slim);
                } catch (parseErr) {
                    console.warn(`⚠️ Could not parse sidecar ${fullPath}: ${parseErr.message}`);
                }
            }
        }
    }

    await walk(projectPath);
    return sidecars;
}

/**
 * Recursively scan directory for MetaFold projects
 * A MetaFold project is identified by *-metadata.json files
 * @param {string} basePath - Root directory to start scanning
 * @param {Object} options - Scan options (inheritMetadata, maxDepth, includeFileSidecars)
 * @param {number} currentDepth - Current recursion level (internal)
 * @param {Object} parentMetadata - Metadata inherited from parent project (internal)
 * @returns {Array} Array of project objects
 */
async function scanForMetaFoldProjects(basePath, options = {}, currentDepth = 0, parentMetadata = {}) {
    const projects = [];
    const maxDepth = options.maxDepth || 5;
    const inheritMetadata = options.inheritMetadata || false;
    const includeFileSidecars = options.includeFileSidecars || false;

    // Stop if max depth reached
    if (currentDepth > maxDepth) {
        console.log(`⚠️ Max depth ${maxDepth} reached at ${basePath}`);
        return projects;
    }

    try {
        const entries = await fs.readdir(basePath, { withFileTypes: true });

        // Look for metadata files in current directory
        const metadataFiles = entries.filter(entry =>
            entry.isFile() && entry.name.endsWith('-metadata.json')
        );

        // Metadata to pass down to children (accumulated from this level)
        let currentLevelMetadata = { ...parentMetadata };

        // If metadata files found, this is a project directory
        for (const metadataFile of metadataFiles) {
            console.log(`📁 Found project in: ${basePath}`);

            const project = await parseMetaFoldProject(basePath, metadataFile.name);
            if (project) {
                // Always assign System.Level based on nesting depth
                project.metadata['System.Level'] = { value: currentDepth + 1, type: 'system' };

                if (inheritMetadata && Object.keys(parentMetadata).length > 0) {
                    // Merge: parent metadata as base, child metadata overrides
                    const mergedMetadata = { ...parentMetadata };
                    for (const [key, val] of Object.entries(project.metadata)) {
                        mergedMetadata[key] = val; // Child wins
                    }
                    project.metadata = mergedMetadata;
                    project.metadataFieldCount = Object.keys(project.metadata).length;
                    console.log(`🔗 Inherited ${Object.keys(parentMetadata).length} metadata fields from parent into: ${project.name}`);
                }

                // Collect file sidecars if option is enabled
                if (includeFileSidecars) {
                    const sidecars = await collectFileSidecars(basePath);
                    project.fileSidecars = sidecars;
                    if (sidecars.length > 0) {
                        console.log(`📄 Found ${sidecars.length} file sidecar(s) in: ${project.name}`);
                    }
                }

                projects.push(project);

                // Build metadata to pass to children (own clean metadata, excluding System fields)
                if (inheritMetadata) {
                    for (const [key, val] of Object.entries(project.metadata)) {
                        if (!key.startsWith('System.')) {
                            currentLevelMetadata[key] = val;
                        }
                    }
                }
            }
        }

        // Recursively scan subdirectories
        const directories = entries.filter(entry => entry.isDirectory());

        for (const dir of directories) {
            const subdirPath = path.join(basePath, dir.name);

            // Skip common directories that shouldn't be scanned
            const skipDirs = ['node_modules', '.git', '.vscode', 'dist', 'build', '__pycache__'];
            if (skipDirs.includes(dir.name)) {
                continue;
            }

            try {
                const subProjects = await scanForMetaFoldProjects(subdirPath, options, currentDepth + 1, currentLevelMetadata);
                projects.push(...subProjects);
            } catch (error) {
                // Skip directories that can't be accessed
                console.log(`⚠️ Skipping ${subdirPath}: ${error.message}`);
            }
        }

    } catch (error) {
        console.error(`❌ Error scanning ${basePath}:`, error);
    }

    return projects;
}

/**
 * Get detailed information about a specific project
 * @param {string} projectPath - Path to project directory
 * @returns {Object} Detailed project information
 */
async function getProjectDetails(projectPath) {
    try {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });

        // Find metadata file
        const metadataFile = entries.find(entry =>
            entry.isFile() && entry.name.endsWith('-metadata.json')
        );

        if (!metadataFile) {
            throw new Error('No metadata file found in project directory');
        }

        // Parse project
        const project = await parseMetaFoldProject(projectPath, metadataFile.name);

        if (!project) {
            throw new Error('Failed to parse project');
        }

        // Add additional details
        const files = entries.filter(entry => entry.isFile());
        const directories = entries.filter(entry => entry.isDirectory());

        return {
            ...project,
            fileCount: files.length,
            directoryCount: directories.length,
            files: files.map(f => f.name),
            directories: directories.map(d => d.name)
        };

    } catch (error) {
        throw new Error(`Error getting project details: ${error.message}`);
    }
}

/**
 * Analyze statistics for a collection of projects
 * @param {Array} projects - Array of project objects
 * @returns {Object} Statistical analysis
 */
function analyzeProjectStatistics(projects) {
    if (!projects || projects.length === 0) {
        return {
            totalProjects: 0,
            totalSize: 0,
            averageSize: 0,
            totalMetadataFields: 0,
            averageMetadataFields: 0,
            projectsWithReadme: 0,
            oldestProject: null,
            newestProject: null,
            fieldFrequency: {},
            typeDistribution: {}
        };
    }

    // Calculate basic statistics
    const totalProjects = projects.length;
    const totalSize = projects.reduce((sum, p) => sum + (p.size || 0), 0);
    const averageSize = totalSize / totalProjects;

    const totalMetadataFields = projects.reduce((sum, p) => sum + (p.metadataFieldCount || 0), 0);
    const averageMetadataFields = totalMetadataFields / totalProjects;

    const projectsWithReadme = projects.filter(p => p.hasReadme).length;

    // Find oldest and newest projects
    const sortedByDate = [...projects].sort((a, b) =>
        new Date(a.created) - new Date(b.created)
    );
    const oldestProject = sortedByDate[0];
    const newestProject = sortedByDate[sortedByDate.length - 1];

    // Analyze metadata field frequency
    const fieldFrequency = {};
    const typeDistribution = {};

    projects.forEach(project => {
        if (project.metadata && typeof project.metadata === 'object') {
            Object.keys(project.metadata).forEach(fieldName => {
                fieldFrequency[fieldName] = (fieldFrequency[fieldName] || 0) + 1;

                const field = project.metadata[fieldName];
                if (field && field.type) {
                    typeDistribution[field.type] = (typeDistribution[field.type] || 0) + 1;
                }
            });
        }
    });

    // Calculate completeness scores
    const completenessScores = projects.map(project => {
        let score = 0;
        let maxScore = 10;

        // Has metadata
        if (project.metadata && Object.keys(project.metadata).length > 0) {
            score += 4;
        }

        // Has README
        if (project.hasReadme) {
            score += 2;
        }

        // Has filled metadata fields
        if (project.metadata) {
            const filledFields = Object.values(project.metadata).filter(field =>
                field.value && field.value.toString().trim() !== ''
            ).length;
            const totalFields = Object.keys(project.metadata).length;

            if (totalFields > 0) {
                score += Math.round((filledFields / totalFields) * 4);
            }
        }

        return Math.round((score / maxScore) * 100);
    });

    const averageCompleteness = completenessScores.reduce((sum, s) => sum + s, 0) / completenessScores.length;

    return {
        totalProjects,
        totalSize,
        averageSize: Math.round(averageSize),
        totalMetadataFields,
        averageMetadataFields: Math.round(averageMetadataFields * 10) / 10,
        projectsWithReadme,
        readmePercentage: Math.round((projectsWithReadme / totalProjects) * 100),
        oldestProject: {
            name: oldestProject.name,
            created: oldestProject.created,
            path: oldestProject.path
        },
        newestProject: {
            name: newestProject.name,
            created: newestProject.created,
            path: newestProject.path
        },
        fieldFrequency,
        typeDistribution,
        averageCompleteness: Math.round(averageCompleteness),
        completenessDistribution: {
            low: completenessScores.filter(s => s < 40).length,
            medium: completenessScores.filter(s => s >= 40 && s < 70).length,
            high: completenessScores.filter(s => s >= 70).length
        }
    };
}

// =================== ID DICTIONARY / HARVESTER API ===================

function getUserIdRegistryPath(userInfo) {
    const fsSync = require('fs');
    let username = 'default';
    if (typeof userInfo === 'string') {
        username = userInfo;
        userInfo = { username: userInfo }; // fallback for compatibility
    } else if (userInfo && userInfo.username) {
        username = userInfo.username;
    }
    const safeUsername = username.replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase();
    
    // Determine the template directory which already includes the user's folder
    const registryDir = getTemplatesDirectory(userInfo);
    
    if (!fsSync.existsSync(registryDir)) {
        fsSync.mkdirSync(registryDir, { recursive: true });
    }
    return path.join(registryDir, `id_dictionary_${safeUsername}.json`);
}

function extractIdValues(obj, result = []) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const [key, val] of Object.entries(obj || {})) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === 'metafold_project_id') continue;
        const isIdField = (val && val.type === 'id_anchor') || lowerKey === 'id_anchor';
        const isProjectName = lowerKey === 'projectname';
        
        if (isIdField) {
            let idVal = '';
            if (val && typeof val === 'object' && val.value && typeof val.value === 'string') {
                idVal = val.value.trim();
            } else if (typeof val === 'string') {
                idVal = val.trim();
            }
            if (idVal && !uuidRegex.test(idVal) && !result.some(item => (item.id || item) === idVal)) {
                result.push({ id: idVal, type: 'id_anchor' });
            }
        }
        
        if (isProjectName) {
            let projVal = '';
            if (typeof val === 'string') {
                projVal = val.trim();
            }
            if (projVal && !result.some(item => (item.id || item) === projVal)) {
                result.push({ id: projVal, type: 'project' });
            }
        }
        
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            extractIdValues(val, result);
        }
    }
    return result;
}

ipcMain.handle('load-id-dictionary', async (event, userInfo) => {
    try {
        const fsSync = require('fs');
        const filePath = getUserIdRegistryPath(userInfo);
        if (fsSync.existsSync(filePath)) {
            const data = fsSync.readFileSync(filePath, 'utf8');
            return { success: true, ids: JSON.parse(data) };
        }
        return { success: true, ids: [] };
    } catch (err) {
        console.error('Error loading ID dictionary:', err);
        return { success: false, ids: [], error: err.message };
    }
});

ipcMain.handle('save-id-values', async (event, metadata, userInfo) => {
    try {
        const fsSync = require('fs');
        if (!metadata) return { success: false, newCount: 0 };
        
        const extractedIds = extractIdValues(metadata);
        if (extractedIds.length === 0) return { success: true, newCount: 0 };
        
        const filePath = getUserIdRegistryPath(userInfo);
        let currentIds = [];
        if (fsSync.existsSync(filePath)) {
            try {
                currentIds = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
                // Backward compatibility: map strings to objects
                currentIds = currentIds.map(item => typeof item === 'string' ? { id: item, type: 'id_anchor' } : item);
            } catch (e) {
                console.error('Error reading ID dictionary for merge:', e);
            }
        }
        
        const initialCount = currentIds.length;
        
        const idMap = new Map();
        currentIds.forEach(item => idMap.set(item.id, item));
        
        extractedIds.forEach(item => {
            if (item.type === 'id_anchor' || !idMap.has(item.id)) {
                idMap.set(item.id, item);
            }
        });
        
        const newArray = Array.from(idMap.values()).sort((a, b) => a.id.localeCompare(b.id));
        
        fsSync.writeFileSync(filePath, JSON.stringify(newArray, null, 2), 'utf8');
        return { success: true, newCount: newArray.length - initialCount, total: newArray.length };
    } catch (err) {
        console.error('Error saving ID values:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('harvest-ids-from-folder', async (event, dirPath, recursive, userInfo) => {
    try {
        const fsSync = require('fs');
        let totalExtracted = [];
        let debugInfo = {
            scannedFiles: [],
            errors: [],
            directoriesScanned: 0
        };
        
        function scanDir(currentPath) {
            try {
                debugInfo.directoriesScanned++;
                const entries = fsSync.readdirSync(currentPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentPath, entry.name);
                    
                    if (entry.isDirectory() && recursive) {
                        scanDir(fullPath);
                    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                        debugInfo.scannedFiles.push(fullPath);
                        console.log(`[harvestIdsFromFolder] Found JSON file: ${fullPath}`);
                        try {
                            const content = fsSync.readFileSync(fullPath, 'utf8');
                            const json = JSON.parse(content);
                            console.log(`[harvestIdsFromFolder] Successfully parsed JSON: ${fullPath}`);
                            extractIdValues(json, totalExtracted);
                        } catch (e) {
                            debugInfo.errors.push(`Parse error in ${fullPath}: ${e.message}`);
                            console.error(`[harvestIdsFromFolder] Error parsing JSON ${fullPath}:`, e);
                        }
                    }
                }
            } catch (e) {
                debugInfo.errors.push(`Dir error at ${currentPath}: ${e.message}`);
                console.error(`[harvestIdsFromFolder] Directory error at ${currentPath}:`, e);
            }
        }
        
        scanDir(dirPath);
        
        if (totalExtracted.length > 0) {
            const filePath = getUserIdRegistryPath(userInfo);
            let currentIds = [];
            if (fsSync.existsSync(filePath)) {
                try {
                    currentIds = JSON.parse(fsSync.readFileSync(filePath, 'utf8'));
                    currentIds = currentIds.map(item => typeof item === 'string' ? { id: item, type: 'id_anchor' } : item);
                } catch (e) {}
            }
            
            const initialCount = currentIds.length;
            
            const idMap = new Map();
            currentIds.forEach(item => idMap.set(item.id, item));
            
            totalExtracted.forEach(item => {
                if (item.type === 'id_anchor' || !idMap.has(item.id)) {
                    idMap.set(item.id, item);
                }
            });
            
            const newArray = Array.from(idMap.values()).sort((a, b) => a.id.localeCompare(b.id));
            
            fsSync.writeFileSync(filePath, JSON.stringify(newArray, null, 2), 'utf8');
            return { success: true, newCount: newArray.length - initialCount, total: newArray.length, foundCount: totalExtracted.length, debugInfo };
        }
        
        return { success: true, newCount: 0, total: 0, foundCount: 0, debugInfo };
    } catch (err) {
        console.error('Error harvesting IDs:', err);
        return { success: false, error: err.message };
    }
});

// =================== PROJECT SCANNER API ===================

// Scan directory recursively for MetaFold projects
ipcMain.handle('scan-metafold-projects', async (event, basePath, maxDepth = 5, options = {}) => {
    try {
        // Merge maxDepth into options for backward compatibility
        const scanOptions = { maxDepth, ...options };
        console.log(`🔍 Scanning for MetaFold projects in: ${basePath} (inherit: ${scanOptions.inheritMetadata || false})`);

        const projects = await scanForMetaFoldProjects(basePath, scanOptions);

        // --- PHASE 3: Two-Pass Scanner Logic (Lineage Linking) ---
        // Pass 1: Build ID Registry from all scanned projects
        const idRegistry = new Map();
        
        projects.forEach(project => {
            project.lineage = {
                provides_ids: [],
                derived_from_ids: [],
                lineage_links: []
            };
            
            // Auto-register the project's own name as a valid ID
            if (project.name) {
                project.lineage.provides_ids.push(project.name);
                idRegistry.set(project.name, project.path);
            }
            
            function extractLineage(obj) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                for (const [key, val] of Object.entries(obj || {})) {
                    const lowerKey = key.toLowerCase();
                    if (lowerKey === 'metafold_project_id') continue;
                    
                    const isIdField = (val && val.type === 'id_anchor') || lowerKey === 'id_anchor';
                    
                    if (isIdField) {
                        let idVal = '';
                        if (val && typeof val === 'object' && val.value && typeof val.value === 'string') {
                            idVal = val.value.trim();
                        } else if (typeof val === 'string') {
                            idVal = val.trim();
                        }
                        if (idVal && !uuidRegex.test(idVal)) {
                            project.lineage.provides_ids.push(idVal);
                            idRegistry.set(idVal, project.path);
                        }
                    }
                    
                    if (lowerKey === 'derived_from' || (val && val.type === 'derived_from')) {
                        if (val && typeof val === 'object' && Array.isArray(val.value)) {
                            project.lineage.derived_from_ids.push(
                                ...val.value.filter(v => typeof v === 'string').map(v => v.trim()).filter(v => v && !uuidRegex.test(v))
                            );
                        } else if (val && typeof val === 'object' && typeof val.value === 'string') {
                            project.lineage.derived_from_ids.push(
                                ...val.value.split(',').map(v => v.trim()).filter(v => v && !uuidRegex.test(v))
                            );
                        } else if (typeof val === 'string') {
                            project.lineage.derived_from_ids.push(
                                ...val.split(',').map(v => v.trim()).filter(v => v && !uuidRegex.test(v))
                            );
                        } else if (Array.isArray(val)) {
                            project.lineage.derived_from_ids.push(
                                ...val.map(v => typeof v === 'string' ? v.trim() : String(v)).filter(v => v && !uuidRegex.test(v))
                            );
                        }
                    } else if (val && typeof val === 'object' && !Array.isArray(val) && key !== 'provenance') {
                        extractLineage(val);
                    }
                }
            }
            
            if (project.metadata) {
                extractLineage(project.metadata);
            }
        });

        // Pass 2: Resolve Lineage Links
        projects.forEach(project => {
            project.lineage.derived_from_ids.forEach(derivedId => {
                const sourcePath = idRegistry.get(derivedId);
                console.log(`[Lineage] Resolving derivedId "${derivedId}" for project "${project.path}" -> sourcePath: ${sourcePath}`);
                if (sourcePath && sourcePath !== project.path) {
                    console.log(`[Lineage] ESTABLISHED LINK: ${sourcePath} -> ${project.path}`);
                    project.lineage.lineage_links.push({
                        id: derivedId,
                        source_path: sourcePath
                    });
                }
            });
        });
        // --------------------------------------------------------

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

// =================== BIOFORMATS FILE SCANNER API ===================

/**
 * Recursively list files with given extensions under a directory.
 * Returns an array of absolute file paths.
 */
ipcMain.handle('list-files-recursive', async (event, dirPath, extensions) => {
    try {
        const results = [];
        const exts = (extensions || []).map(e => e.toLowerCase());

        async function walk(dir) {
            let entries;
            try {
                entries = await fs.readdir(dir, { withFileTypes: true });
            } catch (err) {
                // skip inaccessible folders silently
                return;
            }
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    await walk(fullPath);
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name).toLowerCase();
                    // Handle compound extensions like .ome.tif
                    const nameLC = entry.name.toLowerCase();
                    const matchesCompound = exts.some(e => nameLC.endsWith(e));
                    if (matchesCompound) {
                        const stat = await fs.stat(fullPath);
                        results.push({
                            path: fullPath,
                            name: entry.name,
                            extension: ext,
                            size_bytes: stat.size,
                            modified: stat.mtime.toISOString()
                        });
                    }
                }
            }
        }

        await walk(dirPath);
        console.log(`🔬 File scan found ${results.length} microscopy files in ${dirPath}`);
        return { success: true, files: results };
    } catch (error) {
        console.error('❌ list-files-recursive error:', error);
        return { success: false, message: error.message, files: [] };
    }
});

/**
 * Auto-detect BioFormats CLI (showinf / showinf.bat).
 * Searches customPath, PATH, and common install locations.
 */
ipcMain.handle('bioformats-detect', async (event, customPath) => {
    const { spawn } = require('child_process');
    const isWin = process.platform === 'win32';
    const executable = isWin ? 'showinf.bat' : 'showinf';

    // Candidate locations to search
    const candidates = [];
    if (customPath) {
        const cleanCustom = customPath.trim().replace(/^"+|"+$/g, '');
        candidates.push(cleanCustom);
        if (!cleanCustom.endsWith(executable)) {
            candidates.push(path.join(cleanCustom, executable));
        }
    }

    // Common install dirs on Windows
    if (isWin) {
        const pf = process.env['ProgramFiles'] || 'C:\\Program Files';
        const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const userProfile = process.env.USERPROFILE || 'C:\\Users\\Default';
        const localAppData = process.env.LOCALAPPDATA || path.join(userProfile, 'AppData\\Local');

        // Daybook 3 embedded BioFormats
        candidates.push(path.join(pf, 'Daybook 3\\Daybook-Data-Manager\\resources\\app\\dist\\electron\\static\\bftools', executable));
        candidates.push(path.join(pf86, 'Daybook 3\\Daybook-Data-Manager\\resources\\app\\dist\\electron\\static\\bftools', executable));

        // Standard BioFormats / bftools dirs
        candidates.push(path.join(pf, 'BioFormats', executable));
        candidates.push(path.join(pf86, 'BioFormats', executable));
        candidates.push(path.join(pf, 'bftools', executable));
        candidates.push(path.join(pf86, 'bftools', executable));
        candidates.push(path.join(userProfile, 'Downloads\\bftools', executable));
        candidates.push(path.join(localAppData, 'bftools', executable));
        candidates.push(`C:\\bftools\\${executable}`);
    }
    // Common on Linux/macOS
    candidates.push(path.join(process.env.HOME || '~', 'bin', executable));
    candidates.push('/usr/local/bin/' + executable);
    candidates.push('/opt/bioformats/' + executable);
    candidates.push(executable); // try PATH

    for (const candidate of candidates) {
        try {
            const cleanCand = candidate.trim().replace(/^"+|"+$/g, '');
            // Skip non-existent files if absolute path
            if (path.isAbsolute(cleanCand) && !fs.existsSync(cleanCand)) {
                continue;
            }

            // Properly quote command if it contains spaces on Windows when shell: true
            const execCmd = isWin && cleanCand.includes(' ') && !cleanCand.startsWith('"') ? `"${cleanCand}"` : cleanCand;

            const version = await new Promise((resolve, reject) => {
                const proc = spawn(execCmd, ['-version'], {
                    timeout: 10000,
                    windowsHide: true,
                    shell: isWin
                });
                let out = '';
                let err = '';
                proc.stdout.on('data', d => { out += d.toString(); });
                proc.stderr.on('data', d => { err += d.toString(); });
                proc.on('close', (code) => {
                    // BioFormats often prints version to stderr
                    const combined = (out + err).trim();
                    if (combined.length > 0) resolve(combined.split('\n')[0]);
                    else if (code === 0) resolve('unknown version');
                    else reject(new Error(`exit ${code}`));
                });
                proc.on('error', reject);
            });

            console.log(`✅ BioFormats found at: ${cleanCand} (${version})`);
            return { success: true, found: true, path: cleanCand, version };
        } catch (_) {
            // try next candidate
        }
    }

    console.log('⚠️ BioFormats (showinf) not found');
    return {
        success: true,
        found: false,
        message: 'BioFormats CLI not found. Please install BioFormats Command Line Tools and Java 8+.'
    };
});

/**
 * Read OME-XML metadata from a microscopy file using BioFormats showinf.
 * Returns parsed JSON of the OME-XML structure.
 */
ipcMain.handle('bioformats-read-omexml', async (event, filePath, showiNFPath) => {
    const { spawn } = require('child_process');
    const fs = require('fs');

    const cleanFile = (filePath || '').trim().replace(/^"+|"+$/g, '');
    const rawPath = (showiNFPath || '').trim().replace(/^"+|"+$/g, '');
    const executable = rawPath || (process.platform === 'win32' ? 'showinf.bat' : 'showinf');

    console.log(`🔬 Reading OME-XML from: ${cleanFile}`);

    try {
        const isWin = process.platform === 'win32';
        let cp = '';
        let bfDir = '';

        if (rawPath) {
            try {
                const stat = fs.statSync(rawPath);
                if (stat.isDirectory()) {
                    bfDir = rawPath;
                } else {
                    bfDir = path.dirname(rawPath);
                }
            } catch (e) {
                // ignore
            }
        }

        if (bfDir) {
            const pkgJar = path.join(bfDir, 'bioformats_package.jar');
            const gplJar = path.join(bfDir, 'formats-gpl.jar');
            const toolsJar = path.join(bfDir, 'bio-formats-tools.jar');

            if (fs.existsSync(pkgJar)) {
                cp = isWin ? `${bfDir};${pkgJar}` : `${bfDir}:${pkgJar}`;
            } else if (fs.existsSync(gplJar) && fs.existsSync(toolsJar)) {
                cp = isWin ? `${bfDir};${gplJar};${toolsJar}` : `${bfDir}:${gplJar}:${toolsJar}`;
            }
        }

        // Try direct java execution first to avoid batch quoting bugs on paths with spaces
        if (cp) {
            try {
                console.log(`🚀 Spawning java directly for BioFormats (CP: ${cp})`);
                const xmlString = await new Promise((resolve, reject) => {
                    const proc = spawn('java', [
                        '-Xmx512m',
                        '-Dbioformats_can_do_upgrade_check=false',
                        '-cp', cp,
                        'loci.formats.tools.ImageInfo',
                        '-omexml',      // Output OME-XML
                        '-nopix',       // Don't read pixel data
                        '-no-upgrade',  // Don't check for upgrades (faster)
                        cleanFile
                    ], {
                        timeout: 60000, // 60s timeout per file
                        windowsHide: true,
                        shell: false    // No shell needed when spawning java.exe directly
                    });

                    let stdout = '';
                    let stderr = '';

                    proc.stdout.on('data', d => { stdout += d.toString(); });
                    proc.stderr.on('data', d => { stderr += d.toString(); });

                    proc.on('close', (code) => {
                        if (code === 0 && stdout.includes('<?xml')) {
                            const xmlStart = stdout.indexOf('<?xml');
                            resolve(stdout.substring(xmlStart));
                        } else if (stdout.includes('<?xml')) {
                            resolve(stdout.substring(stdout.indexOf('<?xml')));
                        } else {
                            reject(new Error(`java ImageInfo exited with code ${code}. stderr: ${stderr.substring(0, 500)}`));
                        }
                    });

                    proc.on('error', (err) => {
                        reject(err);
                    });
                });

                const omeJson = parseOmeXmlToJson(xmlString);
                return { success: true, omeJson, rawXml: xmlString };

            } catch (javaError) {
                console.warn(`⚠️ Direct Java execution failed, falling back to batch file: ${javaError.message}`);
            }
        }

        // Fallback: original batch file / shell execution (with Windows path & file argument quoting fix)
        const cleanExec = executable.trim().replace(/^"+|"+$/g, '');
        const execCmd = isWin && cleanExec.includes(' ') && !cleanExec.startsWith('"') ? `"${cleanExec}"` : cleanExec;
        const fileArg = isWin && cleanFile.includes(' ') && !cleanFile.startsWith('"') ? `"${cleanFile}"` : cleanFile;

        const xmlString = await new Promise((resolve, reject) => {
            const proc = spawn(execCmd, [
                '-omexml',      // Output OME-XML
                '-nopix',       // Don't read pixel data
                '-no-upgrade',  // Don't check for upgrades (faster)
                fileArg
            ], {
                timeout: 60000, // 60s timeout per file
                windowsHide: true,
                shell: isWin
            });

            let stdout = '';
            let stderr = '';

            proc.stdout.on('data', d => { stdout += d.toString(); });
            proc.stderr.on('data', d => { stderr += d.toString(); });

            proc.on('close', (code) => {
                if (code === 0 && stdout.includes('<?xml')) {
                    // Extract the XML portion from stdout
                    const xmlStart = stdout.indexOf('<?xml');
                    resolve(stdout.substring(xmlStart));
                } else if (stdout.includes('<?xml')) {
                    resolve(stdout.substring(stdout.indexOf('<?xml')));
                } else {
                    reject(new Error(`showinf exited with code ${code}. stderr: ${stderr.substring(0, 500)}`));
                }
            });

            proc.on('error', (err) => {
                reject(new Error(`Failed to start showinf: ${err.message}. Make sure Java and BioFormats CLI are installed.`));
            });
        });

        // Parse the OME-XML into a JSON object
        const omeJson = parseOmeXmlToJson(xmlString);

        return { success: true, omeJson, rawXml: xmlString };

    } catch (error) {
        console.error(`❌ BioFormats error for ${path.basename(filePath)}:`, error.message);
        return {
            success: false,
            message: error.message,
            omeJson: null
        };
    }
});

/**
 * Parse OME-XML string into a structured JSON object.
 * Extracts the most relevant fields: Image, Pixels, Channels, Instrument.
 */
function parseOmeXmlToJson(xmlString) {
    try {
        // Simple regex-based extraction (no XML library dependency)
        const extract = (tag, attr, xml) => {
            const patterns = [
                new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i'),
                new RegExp(`<${tag}[^>]*/?>([^<]*)`, 'i')
            ];
            for (const p of patterns) {
                const m = xml.match(p);
                if (m) return m[1].trim();
            }
            return null;
        };

        const extractAttr = (tag, attrs, xml) => {
            const tagMatch = xml.match(new RegExp(`<${tag}([^>]*)>?`, 'i'));
            if (!tagMatch) return {};
            const attrStr = tagMatch[1];
            const result = {};
            for (const attr of attrs) {
                const m = attrStr.match(new RegExp(`\\s${attr}="([^"]*)"`, 'i'));
                if (m) result[attr] = m[1];
            }
            return result;
        };

        const extractAll = (tag, attrs, xml) => {
            const regex = new RegExp(`<${tag}([^>]*)>?`, 'gi');
            const results = [];
            let m;
            while ((m = regex.exec(xml)) !== null) {
                const attrStr = m[1];
                const obj = {};
                for (const attr of attrs) {
                    const am = attrStr.match(new RegExp(`\\s${attr}="([^"]*)"`, 'i'));
                    if (am) obj[attr] = am[1];
                }
                if (Object.keys(obj).length > 0) results.push(obj);
            }
            return results;
        };

        const ome = {
            _source: 'BioFormats / showinf',
            Image: extractAttr('Image', ['Name', 'ID', 'AcquisitionDate'], xmlString),
            Pixels: extractAttr('Pixels', [
                'SizeX', 'SizeY', 'SizeZ', 'SizeT', 'SizeC',
                'PhysicalSizeX', 'PhysicalSizeXUnit',
                'PhysicalSizeY', 'PhysicalSizeYUnit',
                'PhysicalSizeZ', 'PhysicalSizeZUnit',
                'Type', 'DimensionOrder', 'ID'
            ], xmlString),
            Channels: extractAll('Channel', [
                'Name', 'ID', 'SamplesPerPixel', 'IlluminationType',
                'PinholeSize', 'AcquisitionMode', 'ContrastMethod',
                'ExcitationWavelength', 'EmissionWavelength', 'Fluor', 'Color'
            ], xmlString),
            Instrument: {
                Microscope: extractAttr('Microscope', [
                    'Manufacturer', 'Model', 'SerialNumber', 'Type'
                ], xmlString),
                Objective: extractAttr('Objective', [
                    'ID', 'Manufacturer', 'Model', 'SerialNumber',
                    'NominalMagnification', 'CalibratedMagnification', 'LensNA',
                    'Immersion', 'Correction', 'WorkingDistance'
                ], xmlString),
                Detector: extractAttr('Detector', [
                    'ID', 'Manufacturer', 'Model', 'Type', 'Gain', 'Offset'
                ], xmlString)
            },
            // Preserve acquisition timestamp if present
            AcquisitionDate: extract('AcquisitionDate', null, xmlString)
                            || extractAttr('Image', ['AcquisitionDate'], xmlString).AcquisitionDate
        };

        // Clean up empty objects
        if (!Object.values(ome.Instrument.Microscope).some(v => v)) delete ome.Instrument.Microscope;
        if (!Object.values(ome.Instrument.Objective).some(v => v)) delete ome.Instrument.Objective;
        if (!Object.values(ome.Instrument.Detector).some(v => v)) delete ome.Instrument.Detector;
        if (!Object.keys(ome.Instrument).length) delete ome.Instrument;

        return ome;
    } catch (err) {
        console.warn('⚠️ OME-XML parse error:', err.message);
        return { _source: 'BioFormats / showinf', _parseError: err.message };
    }
}

// =================== FILE SCANNER HELPER APIS ===================

// List files (non-recursive) in a directory – used for finding *-metadata.json
ipcMain.handle('list-dir-files', async (event, dirPath) => {
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const files = entries
            .filter(e => e.isFile())
            .map(e => e.name);
        return { success: true, files };
    } catch (err) {
        return { success: false, files: [], message: err.message };
    }
});

// Load and parse a JSON file from an absolute path (no dialog)
ipcMain.handle('load-json-path', async (event, filePath) => {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        return { success: true, data };
    } catch (err) {
        return { success: false, message: err.message };
    }
});

// =================== NEUE ORDNER-EXISTENZ-PRÜFUNG ===================

// Check if directory exists and get info
ipcMain.handle('check-directory-exists', async (event, directoryPath) => {
    try {
        console.log(`🔍 Checking directory existence: ${directoryPath}`);

        try {
            const stats = await fs.stat(directoryPath);

            if (stats.isDirectory()) {
                // Directory exists - get contents
                const contents = await fs.readdir(directoryPath);

                // Check for existing metadata
                const metafoldFiles = contents.filter(file => file.endsWith('-metadata.json'));
                const hasMetafoldData = metafoldFiles.length > 0;
                let existingProjectName = null;
                if (hasMetafoldData) {
                    existingProjectName = metafoldFiles[0].replace('-metadata.json', '');
                }

                console.log(`📁 Directory exists with ${contents.length} items. Has MetaFold data: ${hasMetafoldData}, Project: ${existingProjectName}`);

                return {
                    exists: true,
                    isEmpty: contents.length === 0,
                    itemCount: contents.length,
                    isDirectory: true,
                    hasMetafoldData: hasMetafoldData,
                    existingProjectName: existingProjectName,
                    created: stats.birthtime || stats.ctime,
                    modified: stats.mtime
                };
            } else {
                // Path exists but is not a directory
                console.log(`⚠️ Path exists but is not a directory: ${directoryPath}`);
                return {
                    exists: true,
                    isEmpty: false,
                    isDirectory: false,
                    error: 'Path exists but is not a directory'
                };
            }
        } catch (accessError) {
            if (accessError.code === 'ENOENT') {
                // Directory doesn't exist - all good
                console.log(`✅ Directory doesn't exist, safe to create: ${directoryPath}`);
                return {
                    exists: false,
                    isEmpty: true,
                    isDirectory: false
                };
            } else {
                // Other error (permissions, etc.)
                throw accessError;
            }
        }

    } catch (error) {
        console.error(`❌ Error checking directory: ${directoryPath}`, error);
        return {
            success: false,
            exists: false,
            error: error.message
        };
    }
});

// Generate alternative project names
ipcMain.handle('generate-alternative-names', async (event, basePath, originalName) => {
    try {
        console.log(`🔄 Generating alternative names for: ${originalName} in ${basePath}`);

        const alternatives = [];

        // Strategy 1: Add _02, _03, etc.
        for (let i = 2; i <= 10; i++) {
            const altName = `${originalName}_${i.toString().padStart(2, '0')}`;
            const altPath = path.join(basePath, altName);

            try {
                await fs.access(altPath);
                // Path exists, try next number
            } catch {
                // Path doesn't exist - this is a good alternative
                alternatives.push({
                    name: altName,
                    path: altPath,
                    type: 'numbered'
                });
                if (alternatives.length >= 3) break; // Limit to first 3 options
            }
        }

        // Strategy 2: Add date suffix
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const dateAltName = `${originalName}_${dateStr}`;
        const dateAltPath = path.join(basePath, dateAltName);

        try {
            await fs.access(dateAltPath);
            // Date version exists, try with time
            const timeStr = today.toTimeString().substring(0, 5).replace(':', ''); // HHMM
            const timeAltName = `${originalName}_${dateStr}_${timeStr}`;
            const timeAltPath = path.join(basePath, timeAltName);

            try {
                await fs.access(timeAltPath);
                // Both date and time versions exist
            } catch {
                alternatives.push({
                    name: timeAltName,
                    path: timeAltPath,
                    type: 'datetime'
                });
            }
        } catch {
            alternatives.push({
                name: dateAltName,
                path: dateAltPath,
                type: 'date'
            });
        }

        // Strategy 3: Add timestamp suffix (as last resort)
        if (alternatives.length === 0) {
            const timestamp = Date.now();
            const timestampAltName = `${originalName}_${timestamp}`;
            alternatives.push({
                name: timestampAltName,
                path: path.join(basePath, timestampAltName),
                type: 'timestamp'
            });
        }

        console.log(`✅ Generated ${alternatives.length} alternative names`);

        return {
            success: true,
            alternatives: alternatives,
            originalName: originalName,
            basePath: basePath
        };

    } catch (error) {
        console.error(`❌ Error generating alternative names:`, error);
        return {
            success: false,
            error: error.message,
            alternatives: []
        };
    }
});

// Show directory confirmation dialog  
ipcMain.handle('show-directory-confirmation-dialog', async (event, options) => {
    try {
        const { projectName, directoryPath, directoryInfo, alternatives } = options;

        let message = `The project directory already exists:\n\n"${projectName}"\n\n`;

        if (directoryInfo.isEmpty) {
            message += 'The directory is empty.';
        } else {
            message += `The directory contains ${directoryInfo.itemCount} item(s).`;
        }

        message += '\n\nWhat would you like to do?';

        const buttons = ['Cancel', 'Overwrite', 'Use Different Name'];
        let defaultId = 2; // "Use Different Name" as default

        if (directoryInfo.hasMetafoldData) {
            buttons.splice(2, 0, 'Extend Metadata');
            defaultId = 3;
            message += '\n\nNote: This directory contains existing MetaFold metadata. You can choose to extend it instead of overwriting.';
        }

        const result = await dialog.showMessageBox(mainWindow, {
            type: 'warning',
            title: 'Directory Already Exists',
            message: 'Project Directory Conflict',
            detail: message,
            buttons: buttons,
            defaultId: defaultId,
            cancelId: 0,  // "Cancel" 
            icon: path.join(__dirname, 'assets', 'icon.png')
        });

        console.log(`🤔 User choice for directory conflict: ${buttons[result.response]}`);

        return {
            success: true,
            choice: result.response,
            choiceName: buttons[result.response],
            alternatives: alternatives
        };

    } catch (error) {
        console.error(`❌ Error showing directory confirmation dialog:`, error);
        return {
            success: false,
            error: error.message,
            choice: 0 // Default to Cancel on error
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

ipcMain.handle('send-webhook', async (event, url, payload, headers, verifySsl) => {
    return new Promise((resolve) => {
        try {
            const https = require('https');
            const http = require('http');
            const { URL } = require('url');

            const urlObj = new URL(url);
            const requestModule = urlObj.protocol === 'https:' ? https : http;

            const bodyStr = payload
                ? (typeof payload === 'string' ? payload : JSON.stringify(payload))
                : '';

            // Merge provided headers with Content-Type and Content-Length
            const mergedHeaders = {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                ...(headers || {})
            };

            const options = {
                method: 'POST',
                headers: mergedHeaders,
                rejectUnauthorized: verifySsl !== false  // explicitly: false only when set to false
            };

            console.log(`🤖 [Webhook] POST ${url} | SSL verify: ${options.rejectUnauthorized}`);

            const req = requestModule.request(url, options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    console.log(`🤖 [Webhook] Response: ${res.statusCode}`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve({ success: true, status: res.statusCode, data: data });
                    } else {
                        resolve({ success: false, status: res.statusCode, error: data });
                    }
                });
            });

            req.on('error', (e) => {
                const isSslError = e.code && (
                    e.code.includes('CERT') ||
                    e.code.includes('SSL') ||
                    e.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
                    e.code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
                    e.code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
                );
                if (isSslError) {
                    console.error(`🔒 [Webhook] SSL certificate error (${e.code}): ${e.message}`);
                    console.error('💡 Tip: Disable SSL verification in MetaFold Settings → n8n → "Verify SSL Certificate"');
                } else {
                    console.error('❌ [Webhook] Request error:', e);
                }
                resolve({ success: false, error: e.message, code: e.code });
            });

            if (bodyStr) {
                req.write(bodyStr);
            }
            req.end();
        } catch (error) {
            console.error('❌ [Webhook] Request setup error:', error);
            resolve({ success: false, error: error.message });
        }
    });
});


// =================== OMERO PROXY APIS ===================

ipcMain.handle('start-omero-proxy', async (event, settings = {}) => {
    try {
        console.log('🚀 Starting OMERO proxy server...');
        console.log('📋 Settings:', settings);

        // Initialize proxy if not exists
        if (!omeroProxyServer) {
            if (!settings.serverUrl) {
                throw new Error('OMERO server URL not configured - cannot start proxy');
            }
            omeroProxyServer = new OMEROProxyServer(
                settings.proxyPort || 3000,
                settings.serverUrl
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
        if (!settings.serverUrl) {
            throw new Error('OMERO server URL not configured - cannot restart proxy');
        }
        omeroProxyServer = new OMEROProxyServer(
            settings.proxyPort || 3000,
            settings.serverUrl
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
        serverUrl: null, // Will be provided by settingsManager
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

// Generate HTML README with metadata info instead of Markdown
function generateReadmeHtmlWithMetadata(metadata, projectName, elabftwUrl = null, omeroUrl = null) {
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
                display: flex;
                flex-direction: column;
                margin-top: 20px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
            }

            .metadata-item {
                background: rgba(0, 0, 0, 0.2);
                padding: 15px;
                display: flex;
                flex-direction: row;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .metadata-item:last-child {
                border-bottom: none;
            }

            .metadata-label {
                font-weight: 600;
                color: #a855f7;
                font-size: 0.9rem;
                margin-bottom: 0;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                flex: 0 0 250px;
                padding-right: 15px;
            }
            
            .metadata-content {
                flex: 1;
                border-left: 1px solid rgba(255, 255, 255, 0.1);
                padding-left: 15px;
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
                
                .metadata-item {
                    flex-direction: column;
                }
                
                .metadata-label {
                    flex: none;
                    margin-bottom: 10px;
                    padding-right: 0;
                }
                
                .metadata-content {
                    border-left: none;
                    padding-left: 0;
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
        let hasMetadata = false;

        // Group fields by templateName
        const fieldsByTemplate = {};

        Object.entries(metadata).forEach(([key, fieldInfo]) => {
            // Skip special internal fields from being rendered as normal fields
            if (key === 'provenance' || key === 'projectName' || key === 'metafold_project_id' || key === 'metafold_integration' || key.startsWith('System.')) {
                return;
            }
            if (fieldInfo && typeof fieldInfo === 'object') {
                if (!fieldInfo.type) {
                    // It's a nested group
                    const groupKey = key;
                    // Try to guess a template name from its children
                    let tplName = 'Experiment Metadata';
                    const children = Object.values(fieldInfo);
                    if (children.length > 0 && children[0].templateName) {
                        tplName = children[0].templateName;
                    }
                    
                    if (!fieldsByTemplate[tplName]) {
                        fieldsByTemplate[tplName] = { normal: [] };
                    }
                    // Add the group itself
                    fieldsByTemplate[tplName].normal.push([groupKey, { type: 'group', label: groupKey }]);
                    
                    // Add all children
                    Object.entries(fieldInfo).forEach(([subKey, subFieldInfo]) => {
                        fieldsByTemplate[tplName].normal.push([subKey, subFieldInfo]);
                    });
                } else {
                    const tplName = fieldInfo.templateName || 'Experiment Metadata';
                    if (!fieldsByTemplate[tplName]) {
                        fieldsByTemplate[tplName] = { normal: [] };
                    }
                    fieldsByTemplate[tplName].normal.push([key, fieldInfo]);
                }
            }
        });

        const templateNames = Object.keys(fieldsByTemplate);

        if (templateNames.length === 0) {
            htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">📊</span>
                        Experiment Metadata
                    </h2>
                    <div class="no-metadata">No metadata fields have been filled out yet.</div>
                </section>`;
        } else {
            templateNames.forEach(tplName => {
                const fields = fieldsByTemplate[tplName];
                
                // Filter out empty normal fields
                const validNormalFields = fields.normal.filter(([key, fieldInfo]) => {
                    if (fieldInfo.type === 'group') return true;
                    let value = fieldInfo.value;
                    return !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0));
                });

                // Remove empty groups (groups that have no valid normal fields following them before the next group)
                const finalFields = [];
                for (let i = 0; i < validNormalFields.length; i++) {
                    const item = validNormalFields[i];
                    if (item[1].type === 'group') {
                        // Check if there are any normal fields before the next group
                        let hasData = false;
                        for (let j = i + 1; j < validNormalFields.length; j++) {
                            if (validNormalFields[j][1].type === 'group') break;
                            hasData = true;
                            break;
                        }
                        if (hasData) {
                            finalFields.push(item);
                        }
                    } else {
                        finalFields.push(item);
                    }
                }

                if (finalFields.length > 0) {
                    hasMetadata = true;
                    
                    let sectionUpdater = null;
                    let sectionUpdateDate = null;
                    
                    // Find latest updater for the entire template section
                    finalFields.forEach(([key, fieldInfo]) => {
                        if (fieldInfo.lastUpdatedBy) {
                            if (!sectionUpdateDate || new Date(fieldInfo.lastUpdatedAt) > new Date(sectionUpdateDate)) {
                                sectionUpdater = fieldInfo.lastUpdatedBy;
                                sectionUpdateDate = fieldInfo.lastUpdatedAt;
                            }
                        }
                    });

                    let headerExtra = '';
                    if (sectionUpdater) {
                        headerExtra = `
                        <div style="font-size: 0.8rem; font-weight: normal; color: #9ca3af; margin-top: 6px; display: flex; align-items: center; gap: 5px;">
                            <span style="background: rgba(168, 85, 247, 0.15); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(168, 85, 247, 0.3); color: #c084fc;">👤 Extended by ${sectionUpdater}</span>
                            <span>on ${new Date(sectionUpdateDate).toLocaleString()}</span>
                        </div>`;
                    }
                    
                    htmlContent += `
                <section class="section">
                    <h2 class="section-title" style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
                        <div><span class="section-icon">📊</span>${tplName}</div>
                        ${headerExtra}
                    </h2>
                    <div class="metadata-grid">`;

                    finalFields.forEach(([key, fieldInfo]) => {
                        if (fieldInfo.type === 'group') {
                            htmlContent += `
                        <div class="metadata-item" style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(168, 85, 247, 0.1)); flex-direction: column; align-items: flex-start; gap: 5px;">
                            <div class="metadata-label" style="font-size: 1rem; color: #c084fc; flex: none; width: 100%; border: none; padding: 0;">${fieldInfo.label}</div>`;
                            if (fieldInfo.description) {
                                htmlContent += `<div class="metadata-description" style="margin-top: 0;">${fieldInfo.description}</div>`;
                            }
                            htmlContent += `</div>`;
                            return;
                        }
                        
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
                        } else if (fieldInfo.type === 'textarea' && value && value.length > 50) {
                            formattedValue = `\n> ${value.replace(/\n/g, '\n> ')}`;
                        } else if (fieldInfo.type === 'rating') {
                            const val = parseInt(value) || 0;
                            let starsHtml = '';
                            for (let i = 1; i <= 5; i++) {
                                const isFilled = i <= val;
                                starsHtml += `<svg width="20" height="20" viewBox="0 0 24 24" fill="${isFilled ? '#a855f7' : 'none'}" stroke="${isFilled ? '#a855f7' : '#9ca3af'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px; vertical-align: middle;">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>`;
                            }
                            formattedValue = `<div style="display: flex; align-items: center;">${starsHtml} <span style="margin-left: 8px;">(${val}/5)</span></div>`;
                        } else if (fieldInfo.type === 'url' || (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')))) {
                            formattedValue = `<a href="${value}" target="_blank" style="color: #a855f7; text-decoration: underline;">${value}</a>`;
                        } else {
                            formattedValue = value || '<em>Not filled</em>';
                        }

                        htmlContent += `
                        <div class="metadata-item">
                            <div class="metadata-label">${label}</div>
                            <div class="metadata-content">
                                <div class="metadata-value">${formattedValue}</div>`;

                        if (fieldInfo.description) {
                            htmlContent += `<div class="metadata-description">${fieldInfo.description}</div>`;
                        }

                        htmlContent += `</div>`; // Close metadata-content

                        // Show modification info as a third column
                        if (fieldInfo.isModified && fieldInfo.lastUpdatedBy && fieldInfo.lastUpdatedAt) {
                            htmlContent += `
                            <div style="flex: 0 0 250px; border-left: 1px solid rgba(255, 255, 255, 0.1); padding-left: 15px; margin-left: 15px; display: flex; flex-direction: column; justify-content: center; font-size: 0.85rem; color: #9ca3af;">
                                <div style="color: #c084fc; margin-bottom: 2px;">🔄 Modified by ${fieldInfo.lastUpdatedBy}</div>
                                <div>on ${new Date(fieldInfo.lastUpdatedAt).toLocaleString()}</div>
                            </div>`;
                        }

                        htmlContent += `</div>`; // Close metadata-item
                    });

                    htmlContent += `</div></section>`;
                }
            });
            
            if (!hasMetadata) {
                htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">📊</span>
                        Experiment Metadata
                    </h2>
                    <div class="no-metadata">No metadata fields have been filled out yet.</div>
                </section>`;
            }
        }
    } else if (metadata && !metadata.provenance) {
        htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">📊</span>
                        Experiment Metadata
                    </h2>
                    <div class="no-metadata">No metadata template was used for this project.</div>
                </section>`;
    }

    // NEW: Provenance section (User and Group data)
    if (metadata && metadata.provenance) {
        const prov = metadata.provenance;
        const creator = prov.creator || {};
        const group = prov.group || {};
        
        let creatorDetails = [];
        if (creator.firstName || creator.lastName) creatorDetails.push(`${creator.firstName || ''} ${creator.lastName || ''}`.trim());
        if (creator.email) creatorDetails.push(`Email: ${creator.email}`);
        if (creator.orcid) creatorDetails.push(`ORCID: ${creator.orcid}`);
        
        let groupDetails = [];
        if (group.name) groupDetails.push(group.name);
        if (group.principalInvestigator) groupDetails.push(`PI: ${group.principalInvestigator}`);
        if (group.institution) groupDetails.push(group.institution);

        htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">👥</span>
                        Provenance & Authorship
                    </h2>
                    <div class="metadata-grid">
                        <div class="metadata-item">
                            <div class="metadata-label">Creator</div>
                            <div class="metadata-content">
                                <div class="metadata-value"><strong>${creator.username || 'Unknown'}</strong></div>
                                ${creatorDetails.length > 0 ? `<div class="metadata-description">${creatorDetails.join('<br>')}</div>` : ''}
                            </div>
                        </div>`;
                        
        if (Object.keys(group).length > 0 && group.name) {
            htmlContent += `
                        <div class="metadata-item">
                            <div class="metadata-label">Research Group</div>
                            <div class="metadata-content">
                                <div class="metadata-value"><strong>${groupDetails[0]}</strong></div>
                                ${groupDetails.length > 1 ? `<div class="metadata-description">${groupDetails.slice(1).join('<br>')}</div>` : ''}
                            </div>
                        </div>`;
        }
        
        if (prov.createdAt) {
            htmlContent += `
                        <div class="metadata-item">
                            <div class="metadata-label">Created At</div>
                            <div class="metadata-content">
                                <div class="metadata-value">${new Date(prov.createdAt).toLocaleString()}</div>
                            </div>
                        </div>`;
        }
        
        htmlContent += `
                    </div>
                </section>`;
    }

    // NEW: System Information Section
    if (metadata && (metadata['System.ProjectAbsolutePath'] || metadata['System.ProjectRelativePath'])) {
        htmlContent += `
                <section class="section">
                    <h2 class="section-title">
                        <span class="section-icon">⚙️</span>
                        System Information
                    </h2>
                    <div class="metadata-grid">`;
                    
        if (metadata['System.ProjectAbsolutePath']) {
            htmlContent += `
                        <div class="metadata-item">
                            <div class="metadata-label">${metadata['System.ProjectAbsolutePath'].label || 'Absolute Path'}</div>
                            <div class="metadata-content">
                                <div class="metadata-value" style="font-family: monospace; word-break: break-all;">${metadata['System.ProjectAbsolutePath'].value}</div>
                            </div>
                        </div>`;
        }
        
        if (metadata['System.ProjectRelativePath']) {
            htmlContent += `
                        <div class="metadata-item">
                            <div class="metadata-label">${metadata['System.ProjectRelativePath'].label || 'Relative Path'}</div>
                            <div class="metadata-content">
                                <div class="metadata-value" style="font-family: monospace; word-break: break-all;">${metadata['System.ProjectRelativePath'].value}</div>
                            </div>
                        </div>`;
        }

        htmlContent += `
                    </div>
                </section>`;
    }

    htmlContent += `
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

// Create metadata files - WITH PROJECT NAME IN FILENAMES
async function createMetadataFiles(projectPath, metadata, projectName = null) {
    // Sanitize project name for use in filename (remove invalid characters)
    const sanitizedProjectName = projectName
        ? projectName.replace(/[<>:"/\\|?*]/g, '_').trim()
        : 'Project';

    // 1. <Project Name>-metadata.json (elabFTW-compatible format)
    const metadataFilename = `${sanitizedProjectName}-metadata.json`;
    const metadataPath = path.join(projectPath, metadataFilename);
    const metadataContent = convertToElabFTWFormat(metadata);
    // Same provenance UUID as the primary create-project path, added as a
    // sibling of extra_fields (see parseMetaFoldProject's lookup for this format).
    metadataContent.metafold_project_id = require('crypto').randomUUID();

    await fs.writeFile(metadataPath, JSON.stringify(metadataContent, null, 2), 'utf8');
    console.log(`📄 Metadata file created: ${metadataPath}`);

    // 2. <Project Name>-README.html with metadata info
    const readmeFilename = `${sanitizedProjectName}-README.html`;
    const readmePath = path.join(projectPath, readmeFilename);
    const readmeContent = generateReadmeHtmlWithMetadata(metadata, projectName);

    await fs.writeFile(readmePath, readmeContent, 'utf8');
    console.log(`📄 Enhanced README created: ${readmePath}`);

    console.log(`✅ Project files created with name prefix: "${sanitizedProjectName}"`);
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


// Helper function to find README file in project directory
async function findReadmeFile(projectPath) {
    try {
        const entries = await fs.readdir(projectPath, { withFileTypes: true });

        // Look for *-README.html pattern
        const readmeFile = entries.find(entry =>
            entry.isFile() &&
            entry.name.endsWith('-README.html')
        );

        if (readmeFile) {
            console.log(`📖 Found README file: ${readmeFile.name} in ${projectPath}`);
            return readmeFile.name;
        }

        // Fallback: check for old README.html
        const legacyReadme = entries.find(entry =>
            entry.isFile() &&
            entry.name === 'README.html'
        );

        if (legacyReadme) {
            console.log(`📖 Found legacy README.html in ${projectPath}`);
            return 'README.html';
        }

        console.log(`⚠️ No README file found in ${projectPath}`);
        return null;
    } catch (error) {
        console.error(`❌ Error finding README file in ${projectPath}:`, error);
        return null;
    }
}

// Parse a single MetaFold project directory
async function parseMetaFoldProject(projectPath, metadataFilename) {
    try {
        const metadataPath = path.join(projectPath, metadataFilename);
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);

        // Find README file
        const readmeFilename = await findReadmeFile(projectPath);
        const hasReadme = readmeFilename !== null;

        // Get directory stats
        const stats = await fs.stat(projectPath);
        const created = stats.birthtime;
        const modified = stats.mtime;

        // Calculate directory size
        const totalSize = await calculateDirectorySize(projectPath);

        // Extract project name from directory path
        const projectName = path.basename(projectPath);

        // Extract metadata: support both old 'extra_fields' format and new flat format
        const projectMetadata = metadata.extra_fields ? metadata.extra_fields : metadata;
        
        // Create a clean copy without internal system fields
        const cleanMetadata = { ...projectMetadata };
        // Extract integrations safely before deletion
        const integrations = cleanMetadata.metafold_integration?.external_links || cleanMetadata.integrations || null;
        
        // Extract template category before deletion (for ISA / facet search)
        const templateCategory = cleanMetadata.templateInfo?.category || null;

        // Extract stable project UUID before deletion (provenance anchor for the
        // File Sidecar Scanner; may be null for projects created before this field
        // existed — no retroactive ID is assigned during a scan/read operation).
        // Checked in both the flat format (top-level == projectMetadata) and the
        // elabFTW-enveloped format ({ extra_fields, elabftw, metafold_project_id }),
        // where the ID sits as a sibling of extra_fields, not inside it.
        const projectId = cleanMetadata.metafold_project_id || metadata.metafold_project_id || null;
        
        delete cleanMetadata.projectName;
        delete cleanMetadata.templateInfo;
        delete cleanMetadata.metafold_integration;
        delete cleanMetadata.integrations;
        delete cleanMetadata.metafold_project_id;

        // Add template category as system field if available
        if (templateCategory) {
            cleanMetadata['System.TemplateCategory'] = { value: templateCategory, type: 'system' };
        }

        const metadataFieldCount = Object.keys(cleanMetadata).length;

        return {
            name: projectName,
            path: projectPath,
            projectId: projectId,  // NEW: stable UUID, null for legacy projects without one
            metadata: cleanMetadata,
            integrations: integrations,
            metadataFieldCount: metadataFieldCount,
            created: created.toISOString(),
            modified: modified.toISOString(),
            size: totalSize,
            hasReadme: hasReadme,
            readmeFilename: readmeFilename,  // NEW: Add README filename
            metadataFilename: metadataFilename
        };
    } catch (error) {
        console.error(`❌ Error parsing MetaFold project at ${projectPath}:`, error);
        return null;
    }
}

// Calculate directory size recursively
async function calculateDirectorySize(dirPath) {
    let totalSize = 0;

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
                totalSize += await calculateDirectorySize(fullPath);
            } else if (entry.isFile()) {
                try {
                    const stats = await fs.stat(fullPath);
                    totalSize += stats.size;
                } catch (err) {
                    // Skip files that can't be accessed
                }
            }
        }
    } catch (error) {
        // Return accumulated size even if there's an error
    }

    return totalSize;
}