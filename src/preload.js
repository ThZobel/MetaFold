const { contextBridge, ipcRenderer } = require('electron');

// MetaFold v0.0.1 - Secure API for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // =================== VERSION INFO ===================
    version: '0.0.1',
    appName: 'MetaFold',
    author: 'Dr. Thomas Zobel',
    license: 'MIT',
    
    // =================== CORE PROJECT APIS ===================
    
    // Open folder dialog
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    
    // Create project (Main API)
    createProject: (basePath, projectName, structure, metadata = null) => 
        ipcRenderer.invoke('create-project', basePath, projectName, structure, metadata),
    
    // Create folder structure (Legacy for compatibility)
    createFolders: (targetPath, structure) => 
        ipcRenderer.invoke('create-folders', targetPath, structure),
    
    // Open folder in explorer
    openFolder: (folderPath) => 
        ipcRenderer.invoke('open-folder', folderPath),
    
    // Platform info
    platform: process.platform,
    
    // =================== FILE OPERATIONS ===================
    
    // Load JSON file
    loadJsonFile: () => ipcRenderer.invoke('load-json-file'),
    
    // Save JSON file - DUAL SUPPORT: Original + New Direct API
    saveJsonFile: (data, filePath = null) => {
        if (filePath) {
            // NEW: Direct save to specified path
            return ipcRenderer.invoke('save-json-file-direct', filePath, data);
        } else {
            // ORIGINAL: Show save dialog
            return ipcRenderer.invoke('save-json-file', data);
        }
    },
    
    // File writing for export
    writeFile: (filePath, content) => ipcRenderer.invoke('writeFile', filePath, content),
    
    // Copy file from source to destination
    copyFile: (srcPath, destPath) => ipcRenderer.invoke('copyFile', srcPath, destPath),
    
    // Ensure directory exists
    ensureDir: (dirPath) => ipcRenderer.invoke('ensureDir', dirPath),
    
    // Get application path
    getAppPath: () => ipcRenderer.invoke('getAppPath'),
    
    // Open external URL in default browser
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // =================== TEMPLATE APIS ===================
    
    // Template Import/Export APIs
    importTemplatesFromFile: () => 
        ipcRenderer.invoke('import-templates-from-file'),

    exportTemplatesToLocation: (templates, exportType = 'multiple', defaultPath = null) => 
        ipcRenderer.invoke('export-templates-to-location', templates, exportType, defaultPath),

    // Template directory and file operations
    getTemplatesDirectory: (userInfo) => 
        ipcRenderer.invoke('get-templates-directory', userInfo),

    loadAllTemplates: (userInfo) => 
        ipcRenderer.invoke('load-all-templates', userInfo),

    saveTemplateToFile: (template, userInfo) => 
        ipcRenderer.invoke('save-template-to-file', template, userInfo),

    // Group template functions for sharing
    loadGroupTemplates: (groupName, userInfo) => 
        ipcRenderer.invoke('load-group-templates', groupName, userInfo),

    watchTemplatesDirectory: (userInfo) => 
        ipcRenderer.invoke('watch-templates-directory', userInfo),

    // Template file management operations
    deleteTemplateFile: (filePath) => 
        ipcRenderer.invoke('delete-template-file', filePath),

    updateTemplateFile: (templateData) => 
        ipcRenderer.invoke('update-template-file', templateData),

    loadTemplateFromFile: (filePath) => 
        ipcRenderer.invoke('load-template-from-file', filePath),

    // =================== PROJECT ENHANCEMENT ===================
    
    // Insert links into README files
    insertLinksIntoReadme: async (projectPath, elabftwUrl, omeroUrl, projectName = null) => {
        return await ipcRenderer.invoke('insert-links-into-readme', projectPath, elabftwUrl, omeroUrl, projectName);
    },

    // Regenerate README.html with metadata and integration links
    regenerateReadmeHtml: async (projectPath, metadata, projectName, elabftwUrl = null, omeroUrl = null) => {
        return await ipcRenderer.invoke('regenerate-readme-html', projectPath, metadata, projectName, elabftwUrl, omeroUrl);
    },

    // Generate README HTML content without saving (for metadataLoader)
    generateReadmeHtmlContent: (metadata, projectName, elabftwUrl, omeroUrl) => 
        ipcRenderer.invoke('generate-readme-html-content', metadata, projectName, elabftwUrl, omeroUrl),

    // Save HTML file with save dialog
    saveHtmlFile: (htmlContent, suggestedFilename) => 
        ipcRenderer.invoke('save-html-file', htmlContent, suggestedFilename),

    // =================== SECURITY & STORAGE APIS ===================
    
    // Check if secure storage is available
    isSecureStorageAvailable: () => ipcRenderer.invoke('secure-storage-available'),
    
    // Encrypt data using Electron safeStorage
    encryptData: (plaintext) => ipcRenderer.invoke('encrypt-data', plaintext),
    
    // Decrypt data using Electron safeStorage
    decryptData: (encryptedData, method = 'safeStorage') => 
        ipcRenderer.invoke('decrypt-data', encryptedData, method),
    
    // Migrate plaintext credentials to encrypted format
    migrateCredentials: (credentials) => ipcRenderer.invoke('migrate-credentials', credentials),
    
    // Generate secure random salt
    generateSalt: () => ipcRenderer.invoke('generate-salt'),
    
    // =================== PROJECT SCANNER APIS ===================
    
    // Project Scanner APIs
    scanMetaFoldProjects: (basePath, maxDepth = 5) => 
        ipcRenderer.invoke('scan-metafold-projects', basePath, maxDepth),
    
    getProjectDetails: (projectPath) => 
        ipcRenderer.invoke('get-project-details', projectPath),
    
    getProjectsStatistics: (projects) => 
        ipcRenderer.invoke('get-projects-statistics', projects),
    
    // =================== OMERO PROXY APIS ===================
    
    // OMERO Python Proxy Server Management
    startOMEROProxy: (pythonPath = null) => 
        ipcRenderer.invoke('start-omero-proxy', pythonPath),
    
    stopOMEROProxy: () => 
        ipcRenderer.invoke('stop-omero-proxy'),
    
    getOMEROProxyStatus: () => 
        ipcRenderer.invoke('get-omero-proxy-status'),
    
    ensureOMEROProxyRunning: (settings = {}) => 
        ipcRenderer.invoke('start-omero-proxy', settings),

    testOMEROConnection: (serverUrl, username, password) => 
        ipcRenderer.invoke('test-omero-connection', serverUrl, username, password),
    
    // =================== DIRECTORY CONFLICT RESOLUTION APIS ===================
    
    // Directory conflict resolution
    checkDirectoryExists: (directoryPath) => 
        ipcRenderer.invoke('check-directory-exists', directoryPath),
    
    generateAlternativeNames: (basePath, originalName) => 
        ipcRenderer.invoke('generate-alternative-names', basePath, originalName),
        
    showDirectoryConfirmationDialog: (options) => 
        ipcRenderer.invoke('show-directory-confirmation-dialog', options),
    
    // =================== GENERIC APIS ===================
    
    // Generic invoke for future extensions
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});

// Extended utilities for MetaFold v0.0.1
contextBridge.exposeInMainWorld('utils', {
    // =================== VERSION UTILITIES ===================
    
    // Get version info
    getVersionInfo: () => ({
        version: '0.0.1',
        name: 'MetaFold',
        description: 'Laboratory Data Management & Experiment Organization',
        author: 'Dr. Thomas Zobel',
        license: 'MIT',
        github: 'https://github.com/ThZobel/MetaFold',
        docs: 'https://metafold-docs.readthedocs.io/en/latest/',
        buildDate: new Date().toISOString(),
        platform: process.platform
    }),
    
    // =================== PATH UTILITIES ===================
    
    // Path utilities
    joinPath: (...paths) => ipcRenderer.invoke('joinPath', ...paths),
    
    // Get path separator for current platform
    getPathSeparator: () => {
        return process.platform === 'win32' ? '\\' : '/';
    },
    
    // Normalize path for current platform
    normalizePath: (path) => {
        if (process.platform === 'win32') {
            return path.replace(/\//g, '\\');
        } else {
            return path.replace(/\\/g, '/');
        }
    },
    
    // =================== PROJECT UTILITIES ===================
    
    // Project utilities
    formatProjectPath: (fullPath, basePath = '') => {
        if (basePath && fullPath.startsWith(basePath)) {
            return fullPath.substring(basePath.length + 1);
        }
        return fullPath;
    },
    
    looksLikeMetaFoldProject: (dirName) => {
        const patterns = [
            /^\d{4}-\d{2}-/, // Date prefix: 2024-06-
            /experiment/i,
            /study/i,
            /analysis/i,
            /project/i,
            /lab-/i,
            /-lab$/i
        ];
        return patterns.some(pattern => pattern.test(dirName));
    },
    
    parseProjectName: (projectPath) => {
        const dirName = projectPath.split(process.platform === 'win32' ? '\\' : '/').pop();
        return dirName
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, l => l.toUpperCase());
    },
    
    generateProjectId: () => {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },
    
    // =================== TEMPLATE UTILITIES ===================
    
    // Template validation
    validateTemplateName: (name) => {
        if (!name || typeof name !== 'string') return false;
        if (name.trim().length === 0) return false;
        if (name.length > 100) return false;
        
        // Check for invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) return false;
        
        return true;
    },

    // Clean template for storage
    cleanTemplateForStorage: (template) => {
        if (!template) return template;
        
        const clean = { ...template };
        
        // Remove UI-specific properties that shouldn't be stored
        delete clean._uiState;
        delete clean._dirty;
        delete clean._selected;
        delete clean._lastModified;
        delete clean._searchIndex;
        delete clean._cachedHtml;
        delete clean._renderCache;
        
        // Remove enhanced display properties (will be regenerated)
        delete clean.userDisplayName;
        delete clean.groupDisplayName;
        delete clean.userColor;
        delete clean.userInitials;
        delete clean.isOwn;
        delete clean.isShared;
        delete clean.originalIndex;
        
        // Ensure required fields exist
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
    },

    // Generate template filename
    generateTemplateFilename: (template) => {
        if (!template || !template.name) {
            const timestamp = new Date().toISOString().slice(0, 10);
            return `untitled_template_${timestamp}.json`;
        }
        
        // Safe filename from template name
        const safeName = template.name
            .replace(/[^a-zA-Z0-9\s-_]/g, '')
            .replace(/\s+/g, '_')
            .toLowerCase();
        
        return `${safeName}_template.json`;
    },
    
    // =================== FILE UTILITIES ===================
    
    // File extension utilities
    getFileExtension: (filename) => {
        return filename.split('.').pop().toLowerCase();
    },

    isFolder: (pathName) => {
        return pathName.endsWith('/') || pathName.endsWith('\\') || !pathName.includes('.');
    },

    // Template statistics
    getTemplateStats: (templates) => {
        return {
            total: templates.length,
            folders: templates.filter(t => t.type !== 'experiment').length,
            experiments: templates.filter(t => t.type === 'experiment').length
        };
    },
    
    // =================== SECURITY UTILITIES ===================
    
    // Check if data appears to be encrypted
    looksEncrypted: (data) => {
        if (typeof data === 'object' && data.encrypted && data.method) {
            return true;
        }
        
        // Check if string looks like base64 encrypted data
        if (typeof data === 'string' && data.length > 20) {
            const base64Regex = /^[A-Za-z0-9+/]+=*$/;
            return base64Regex.test(data);
        }
        
        return false;
    },
    
    // Mask sensitive data for logging
    maskSensitive: (text, maskChar = '*', visibleChars = 4) => {
        if (!text || typeof text !== 'string') return '';
        
        if (text.length <= visibleChars * 2) {
            return maskChar.repeat(text.length);
        }
        
        const start = text.substring(0, visibleChars);
        const end = text.substring(text.length - visibleChars);
        const middle = maskChar.repeat(Math.max(3, text.length - (visibleChars * 2)));
        
        return start + middle + end;
    },
    
    // Generate secure random ID
    generateSecureId: () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15);
        return `sec_${timestamp}_${random}`;
    },
    
    // =================== VALIDATION UTILITIES ===================
    
    // Validate password strength (simplified for v0.0.1)
    validatePasswordStrength: (password) => {
        if (!password) return { strength: 'none', score: 0, feedback: [] };
        
        const feedback = [];
        let score = 0;
        
        // Basic length check
        if (password.length >= 8) score += 2;
        else feedback.push('Use at least 8 characters');
        
        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        
        // Determine strength
        let strength;
        if (score <= 1) strength = 'weak';
        else if (score <= 3) strength = 'medium';
        else strength = 'strong';
        
        return { strength, score, feedback };
    },
    
    // =================== LOGGING UTILITIES ===================
    
    // Simple logging for v0.0.1
    log: (level, message, data = null) => {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        if (level === 'error') {
            console.error(logEntry, data);
        } else if (level === 'warn') {
            console.warn(logEntry, data);
        } else {
            console.log(logEntry, data);
        }
    }
});

// MetaFold v0.0.1 - First public release
console.log('🚀 MetaFold v0.0.1 preload.js loaded successfully');
console.log('📚 Documentation: https://metafold-docs.readthedocs.io/en/latest/');
console.log('🐙 GitHub: https://github.com/ThZobel/MetaFold');