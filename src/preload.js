const { contextBridge, ipcRenderer } = require('electron');

// Secure API for renderer process
contextBridge.exposeInMainWorld('electronAPI', {
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
    
    // Save JSON file
    saveJsonFile: (data) => ipcRenderer.invoke('save-json-file', data),
    
    // Platform info
    platform: process.platform,
    
    // Open external URL in default browser
    openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

// Extended utilities
contextBridge.exposeInMainWorld('utils', {
    // Path utilities
    joinPath: (...paths) => {
        return paths.join(process.platform === 'win32' ? '\\' : '/');
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
    }
});