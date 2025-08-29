const { contextBridge, ipcRenderer } = require('electron');

// Secure API for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // =================== EXISTING APIS - PRESERVED EXACTLY ===================
    
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
    
    // Open external URL in default browser
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    
    // Platform info
    platform: process.platform,
    
    // =================== SECURE STORAGE APIS ===================
    
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
    
    // Store secure credential with metadata
    storeSecureCredential: (key, value, metadata = {}) => 
        ipcRenderer.invoke('store-secure-credential', key, value, metadata),
    
    // Retrieve secure credential with metadata
    retrieveSecureCredential: (encryptedData, method = 'safeStorage') => 
        ipcRenderer.invoke('retrieve-secure-credential', encryptedData, method),
    
    // Template file deletion 
    deleteTemplateFile: (filePath) => 
        ipcRenderer.invoke('delete-template-file', filePath),

    // NEW: Storage location information
    getStorageLocationInfo: () => 
        ipcRenderer.invoke('get-storage-location-info'),

    
    // =================== NEUE OMERO PROXY APIS ===================
    // Fügen Sie diese APIs in die bestehende electronAPI-Objektdefinition ein:

        // =================== OMERO PROXY CONTROL APIS ===================
        
        /**
         * Start OMERO Proxy Server
         * Startet den integrierten Node.js Proxy für OMERO-Verbindungen
         * @param {Object} settings - OMERO settings (serverUrl, proxyPort, etc.)
         * @returns {Promise<Object>} Start result with success status
         */
        startOMEROProxy: (settings = {}) => 
            ipcRenderer.invoke('start-omero-proxy', settings),
        
        /**
         * Stop OMERO Proxy Server
         * Stoppt den laufenden OMERO Proxy Server
         * @returns {Promise<Object>} Stop result with success status
         */
        stopOMEROProxy: () => 
            ipcRenderer.invoke('stop-omero-proxy'),
        
        /**
         * Get OMERO Proxy Status
         * Ruft den aktuellen Status des OMERO Proxy Servers ab
         * @returns {Promise<Object>} Current proxy status
         */
        getOMEROProxyStatus: () => 
            ipcRenderer.invoke('get-omero-proxy-status'),
        
        /**
         * Restart OMERO Proxy Server
         * Startet den OMERO Proxy mit neuen Settings neu
         * @param {Object} settings - Updated OMERO settings
         * @returns {Promise<Object>} Restart result with success status
         */
        restartOMEROProxy: (settings = {}) => 
            ipcRenderer.invoke('restart-omero-proxy', settings),
        
        /**
         * Check OMERO Proxy Port Availability
         * Prüft, ob ein Port für den OMERO Proxy verfügbar ist
         * @param {number} port - Port number to check (default: 3000)
         * @returns {Promise<Object>} Port availability status
         */
        checkOMEROProxyPort: (port = 3000) => 
            ipcRenderer.invoke('check-omero-proxy-port', port),

        // =================== CONVENIENCE APIS FOR OMERO INTEGRATION ===================
        
        /**
         * Smart OMERO Proxy Startup
         * Intelligenter Proxy-Start: Prüft Status und startet bei Bedarf
         * @param {Object} settings - OMERO settings
         * @returns {Promise<Object>} Startup result with proxy URL
         */
        ensureOMEROProxyRunning: async (settings = {}) => {
            try {
                // Check current status
                const status = await ipcRenderer.invoke('get-omero-proxy-status');
                
                if (status.running) {
                    return {
                        success: true,
                        message: 'OMERO proxy already running',
                        proxyUrl: status.proxyUrl,
                        port: status.port,
                        wasAlreadyRunning: true
                    };
                }
                
                // Start proxy if not running
                const startResult = await ipcRenderer.invoke('start-omero-proxy', settings);
                
                if (startResult.success) {
                    return {
                        ...startResult,
                        proxyUrl: `http://localhost:${startResult.port}/omero-api`,
                        wasAlreadyRunning: false
                    };
                }
                
                return startResult;
                
            } catch (error) {
                return {
                    success: false,
                    message: `Failed to ensure OMERO proxy is running: ${error.message}`,
                    error: error.message
                };
            }
        },
        
        /**
         * Get OMERO Proxy URL
         * Ruft die aktuelle Proxy-URL ab (falls der Proxy läuft)
         * @returns {Promise<string|null>} Proxy URL or null if not running
         */
        getOMEROProxyURL: async () => {
            try {
                const status = await ipcRenderer.invoke('get-omero-proxy-status');
                return status.running ? status.proxyUrl : null;
            } catch (error) {
                console.error('Failed to get OMERO proxy URL:', error);
                return null;
            }
        },
        
        /**
         * Test OMERO Proxy Connection
         * Testet die Verbindung zum OMERO Proxy (nicht zum OMERO Server selbst)
         * @returns {Promise<Object>} Connection test result
         */
        testOMEROProxyConnection: async () => {
            try {
                const status = await ipcRenderer.invoke('get-omero-proxy-status');
                
                if (!status.running) {
                    return {
                        success: false,
                        message: 'OMERO proxy is not running',
                        status: status.status
                    };
                }
                
                // Try to fetch proxy status endpoint
                try {
                    const response = await fetch(`http://localhost:${status.port}/proxy-status`, {
                        method: 'GET',
                        mode: 'cors'
                    });
                    
                    if (response.ok) {
                        const proxyStatus = await response.json();
                        return {
                            success: true,
                            message: 'OMERO proxy connection successful',
                            proxyStatus: proxyStatus,
                            port: status.port
                        };
                    } else {
                        return {
                            success: false,
                            message: `OMERO proxy responded with status ${response.status}`,
                            httpStatus: response.status
                        };
                    }
                } catch (fetchError) {
                    return {
                        success: false,
                        message: `Cannot connect to OMERO proxy: ${fetchError.message}`,
                        error: fetchError.message
                    };
                }
                
            } catch (error) {
                return {
                    success: false,
                    message: `OMERO proxy connection test failed: ${error.message}`,
                    error: error.message
                };
            }
        },

        // Template utilities (merged)
        // This templateFileUtils object provides enhanced template file utilities for the Template APIs,
        // including validation, cleaning, and export filename generation, and is distinct from the earlier
        // templateFileUtils object which is used for legacy or general template file operations.
        templateFileUtils: {
        // Generate stable template filename
        generateStableFilename: (template) => {
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
            
            return `${safeName}_${safeUser}_${templateType}.json`;
        },
        
        // Check if filename is stable (no timestamps)
        isStableFilename: (filename) => {
            const timestampPattern = /_20\d{2}[01]\d[0-3]\d/; // YYYYMMDD pattern
            const longNumberPattern = /\d{10,}/; // 10+ consecutive digits
            
            return !timestampPattern.test(filename) && !longNumberPattern.test(filename);
        },
        
        // Validate template structure (merged logic: accepts both minimal and extended)
        validateTemplate: (template) => {
            if (!template || typeof template !== 'object') return false;
            // Accept both minimal and extended validation
            const required = ['id', 'name', 'type'];
            const hasRequired = required.every(field => template.hasOwnProperty(field) && template[field]);
            if (hasRequired) return true;
            // Fallback to legacy validation
            const legacyRequired = ['name', 'type'];
            const hasLegacyRequired = legacyRequired.every(field => 
                template.hasOwnProperty(field) && 
                template[field] && 
                template[field].toString().trim().length > 0
            );
            const hasValidName = template.name !== 'undefined';
            return hasLegacyRequired && hasValidName;
        },

        // Clean template for export (remove UI-specific data)
        cleanTemplateForExport: (template) => {
            const clean = { ...template };
            // Remove UI-specific properties
            delete clean._uiState;
            delete clean._dirty;
            delete clean._selected;
            delete clean._lastModified;
            return clean;
        },
        
        // Generate export filename
        generateExportFilename: (templateName, isMultiple = false) => {
            const timestamp = new Date().toISOString().slice(0, 10);
            if (isMultiple) {
                return `metafold_templates_${timestamp}.json`;
            } else {
                const safeName = templateName.replace(/[^a-zA-Z0-9]/g, '_');
                return `${safeName}_template.json`;
            }
        }
    },


    // =================== PROJECT SCANNER APIS ===================
    
    // Project Scanner APIs
    scanMetaFoldProjects: (basePath, maxDepth = 5) => 
        ipcRenderer.invoke('scan-metafold-projects', basePath, maxDepth),
    
    getProjectDetails: (projectPath) => 
        ipcRenderer.invoke('get-project-details', projectPath),
    
    getProjectsStatistics: (projects) => 
        ipcRenderer.invoke('get-projects-statistics', projects),
    
    // Project utilities
    formatProjectPath: (fullPath, basePath = '') => {
        if (basePath && fullPath.startsWith(basePath)) {
            return fullPath.substring(basePath.length + 1);
        }
        return fullPath;
    },
    
    looksLikeMetaFoldProject: (dirName) => {
        const patterns = [
            /^\d{4}-\d{2}-/, // Date prefix: 2025-06-
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
    
    // Generic invoke for future extensions
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),

    // =================== TEMPLATE APIS - ENHANCED WITH USER/GROUP SUPPORT ===================
    
    // Template Import/Export APIs
    importTemplatesFromFile: () => 
        ipcRenderer.invoke('import-templates-from-file'),

    exportTemplatesToLocation: (templates, exportType = 'multiple') => 
        ipcRenderer.invoke('export-templates-to-location', templates, exportType),

    // ENHANCED: Template directory and file operations with user context
    getTemplatesDirectory: (userInfo) => 
        ipcRenderer.invoke('get-templates-directory', userInfo),

    loadAllTemplates: (userInfo) => 
        ipcRenderer.invoke('load-all-templates', userInfo),

    saveTemplateToFile: (template, userInfo) => 
        ipcRenderer.invoke('save-template-to-file', template, userInfo),

    // NEW: Group template functions for sharing
    loadGroupTemplates: (groupName, userInfo) => 
        ipcRenderer.invoke('load-group-templates', groupName, userInfo),

    watchTemplatesDirectory: (userInfo) => 
        ipcRenderer.invoke('watch-templates-directory', userInfo),

    insertLinksIntoReadme: async (projectPath, elabftwUrl, omeroUrl) => {
            return await ipcRenderer.invoke('insert-links-into-readme', projectPath, elabftwUrl, omeroUrl);
        },

    // Template file utilities
    // (Merged into the single templateFileUtils object above)
});

// Extended utilities
contextBridge.exposeInMainWorld('utils', {
    // =================== EXISTING UTILITIES ===================
    
    // Path utilities
    joinPath: (...paths) => {
        return paths.join(process.platform === 'win32' ? '\\' : '/');
    },
      // Get home directory templates path
    getHomeTemplatesPath: () => {
        const os = require('os');
        const path = require('path');
        return path.join(os.homedir(), 'MetaFold', 'Templates');
    },
    
    // Check if running in home directory mode
    isHomeDirectoryMode: () => {
        return true; // Always true nach der Umstellung
    },
    
    // Get user-friendly template path
    getUserFriendlyTemplatePath: (userInfo = null) => {
        let basePath = '~/MetaFold/Templates/';
        
        if (userInfo) {
            const { username, groupname } = userInfo;
            
            if (groupname && groupname !== 'Unknown' && groupname !== 'Default') {
                basePath += `${groupname}/`;
                
                if (username && username !== 'Unknown' && username !== 'User') {
                    basePath += `${username}/`;
                }
            } else if (username && username !== 'Unknown' && username !== 'User') {
                basePath += `${username}/`;
            }
        }
        
        return basePath;
    },

    // Normalize path
    normalizePath: (inputPath) => {
        return inputPath.replace(/[/\\]+/g, process.platform === 'win32' ? '\\' : '/');
    },
    
    // Path separator for current platform
    getPathSeparator: () => {
        return process.platform === 'win32' ? '\\' : '/';
    },
    
    // Base path for platform
    getDefaultBasePath: () => {
        switch (process.platform) {
            case 'win32':
                return 'C:\\Projects';
            case 'darwin':
                return process.env.HOME + '/Projects';
            default:
                return process.env.HOME + '/projects';
        }
    },
    
    // Construct full path
    buildFullPath: (basePath, projectName) => {
        const separator = process.platform === 'win32' ? '\\' : '/';
        return basePath + separator + projectName;
    },
    
    // Check if path is absolute
    isAbsolutePath: (inputPath) => {
        if (process.platform === 'win32') {
            // Windows: C:\ or \\server\share
            return /^[a-zA-Z]:\\/.test(inputPath) || /^\\\\/.test(inputPath);
        } else {
            // Unix-like: /path
            return inputPath.startsWith('/');
        }
    },
    
    // Current date in various formats
    getCurrentDate: (format = 'iso') => {
        const now = new Date();
        switch (format) {
            case 'iso':
                return now.toISOString().split('T')[0]; // YYYY-MM-DD
            case 'us':
                return now.toLocaleDateString('en-US'); // MM/DD/YYYY
            case 'timestamp':
                return now.toISOString();
            default:
                return now.toISOString().split('T')[0];
        }
    },
    
    // String utilities for template names
    sanitizeProjectName: (name) => {
        // Remove/replace invalid characters for folder names
        return name
            .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars with _
            .replace(/\s+/g, '_') // Replace spaces with _
            .replace(/_+/g, '_') // Reduce multiple _ 
            .replace(/^_+|_+$/g, ''); // Remove _ at start/end
    },
    
    // Validate if a project name is valid
    isValidProjectName: (name) => {
        if (!name || name.trim().length === 0) return false;
        
        // Check reserved names (Windows)
        const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        if (reserved.includes(name.toUpperCase())) return false;
        
        // Check invalid characters
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(name)) return false;
        
        // Avoid overly long names
        if (name.length > 100) return false;
        
        return true;
    },

    // Extended project utilities
    generateProjectId: () => {
        return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Check file extension
    getFileExtension: (filename) => {
        return filename.split('.').pop().toLowerCase();
    },

    // Check if path is a folder (based on ending)
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
        
    // Clean template for storage (remove UI-specific data but keep essential info)
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
        
        // Keep essential metadata for storage
        return {
            ...clean,
            // Ensure required fields exist
            id: clean.id || `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: clean.name || 'Unnamed Template',
            type: clean.type || 'experiment',
            createdBy: clean.createdBy || 'Unknown',
            createdByGroup: clean.createdByGroup || 'Unknown',
            createdAt: clean.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    },

    // Alternative version that also handles arrays
    cleanTemplatesForStorage: (templates) => {
        if (!templates) return [];
        if (!Array.isArray(templates)) return [window.utils.cleanTemplateForStorage(templates)];
        return templates.map(template => window.utils.cleanTemplateForStorage(template));
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
    
    // Generate random ID for encryption operations
    generateSecureId: () => {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 15);
        return `sec_${timestamp}_${random}`;
    },
    
    // Validate password strength
    validatePasswordStrength: (password) => {
        if (!password) return { strength: 'none', score: 0, feedback: [] };
        
        const feedback = [];
        let score = 0;
        
        // Length check
        if (password.length >= 8) score += 1;
        else feedback.push('Use at least 8 characters');
        
        if (password.length >= 12) score += 1;
        
        // Character variety
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Include lowercase letters');
        
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Include uppercase letters');
        
        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('Include numbers');
        
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else feedback.push('Include special characters');
        
        // Determine strength
        let strength;
        if (score <= 2) strength = 'weak';
        else if (score <= 4) strength = 'medium';
        else strength = 'strong';
        
        return { strength, score, feedback };
    },
    
    // Check if running in secure context (HTTPS or localhost)
    isSecureContext: () => {
        if (typeof window !== 'undefined') {
            return window.isSecureContext || 
                   window.location.protocol === 'https:' || 
                   window.location.hostname === 'localhost' ||
                   window.location.hostname === '127.0.0.1';
        }
        return true; // Assume secure in Electron
    },
    
    // Secure comparison for passwords/keys (timing attack resistant)
    secureCompare: (a, b) => {
        if (typeof a !== 'string' || typeof b !== 'string') {
            return false;
        }
        
        if (a.length !== b.length) {
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        
        return result === 0;
    },
    
    // =================== PROJECT SCANNER UTILITIES ===================
    
    // Project analysis utilities
    groupProjects: (projects, groupBy = 'type') => {
        const groups = {};
        projects.forEach(project => {
            let key;
            switch (groupBy) {
                case 'date':
                    const date = new Date(project.created);
                    key = date.toISOString().split('T')[0];
                    break;
                case 'month':
                    const month = new Date(project.created);
                    key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
                    break;
                case 'size':
                    const size = project.size || 0;
                    if (size < 1024 * 1024) key = 'Small (<1MB)';
                    else if (size < 1024 * 1024 * 100) key = 'Medium (1-100MB)';
                    else key = 'Large (>100MB)';
                    break;
                default:
                    key = project.type || 'Unknown';
            }
            if (!groups[key]) groups[key] = [];
            groups[key].push(project);
        });
        return groups;
    },
    
    filterProjects: (projects, filters = {}) => {
        return projects.filter(project => {
            // Search filter
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                const projectText = `${project.name} ${project.path}`.toLowerCase();
                if (!projectText.includes(searchTerm)) return false;
            }
            
            // Date range filter
            if (filters.dateFrom && project.created < filters.dateFrom) return false;
            if (filters.dateTo && project.created > filters.dateTo) return false;
            
            // Size filter
            if (filters.minSize && (project.size || 0) < filters.minSize) return false;
            if (filters.maxSize && (project.size || 0) > filters.maxSize) return false;
            
            // Field count filter
            if (filters.minFields && (project.metadataFieldCount || 0) < filters.minFields) return false;
            if (filters.maxFields && (project.metadataFieldCount || 0) > filters.maxFields) return false;
            
            return true;
        });
    },
    
    searchProjects: (projects, query, options = {}) => {
        if (!query || query.trim() === '') return projects;
        const searchTerm = query.toLowerCase().trim();
        return projects.filter(project => {
            const searchableText = [
                project.name,
                project.path,
                project.readmePreview
            ].join(' ').toLowerCase();
            return searchableText.includes(searchTerm);
        });
    },
    
    sortProjects: (projects, field, ascending = true) => {
        return [...projects].sort((a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (field === 'created' || field === 'modified') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            if (aVal < bVal) return ascending ? -1 : 1;
            if (aVal > bVal) return ascending ? 1 : -1;
            return 0;
        });
    },
    
    formatBytes: (bytes, decimals = 1) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    },
    
    formatProjectForDisplay: (project) => {
        const displayName = project.name
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        let icon = '📁';
        if (project.name.toLowerCase().includes('experiment')) icon = '🧪';
        else if (project.name.toLowerCase().includes('analysis')) icon = '📊';
        else if (project.name.toLowerCase().includes('study')) icon = '📋';
        else if (project.name.toLowerCase().includes('lab')) icon = '🔬';
        
        return {
            name: project.name,
            displayName: displayName,
            icon: icon
        };
    }
});