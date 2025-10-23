// Utility functions for the application

const appUtils = {
    // Safe ID generation for HTML elements
    createSafeId(fieldName) {
        return fieldName.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Default path based on platform
    getDefaultPath() {
        if (window.utils) {
            return window.utils.getDefaultBasePath();
        }
        return 'C:\\Projects\\';
    },

    // Default values for different field types
    getDefaultValueForType(type) {
        switch (type) {
            case 'number': return 0;
            case 'checkbox': return false;
            case 'date': return '';
            default: return '';
        }
    },

    // Default values for schema types
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

    // Update path preview
    updatePathPreview() {
        const basePath = document.getElementById('targetPath').value.trim();
        const projectName = document.getElementById('projectName').value.trim();
        const preview = document.getElementById('fullPathPreview');
        
        if (basePath && projectName) {
            const separator = window.electronAPI && window.electronAPI.platform === 'win32' ? '\\' : '/';
            preview.textContent = basePath + separator + projectName;
            preview.style.color = '#10b981';
        } else {
            preview.textContent = 'Choose directory and project name';
            preview.style.color = '#9ca3af';
        }
    },

    // ✨ VERBESSERT: Show error message - NUR wenn Nachricht tatsächlich Inhalt hat
    showError(message) {
        // Prüfe, ob die Nachricht tatsächlich Inhalt hat
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.warn('⚠️ showError called with empty message, ignoring');
            return;
        }
        
        const errorMessage = document.getElementById('errorMessage');
        if (!errorMessage) {
            console.warn('⚠️ errorMessage element not found');
            return;
        }
        
        errorMessage.innerHTML = `<strong>❌ Error!</strong><br>${message}`;
        errorMessage.style.display = 'block';
        
        // Hide after 8 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
            errorMessage.innerHTML = ''; // ✨ NEU: Inhalt auch löschen
        }, 8000);
    },

    // ✨ VERBESSERT: Show success message - NUR wenn Nachricht tatsächlich Inhalt hat
    showSuccess(message) {
        // Prüfe, ob die Nachricht tatsächlich Inhalt hat
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.warn('⚠️ showSuccess called with empty message, ignoring');
            return;
        }
        
        const successMessage = document.getElementById('successMessage');
        if (!successMessage) {
            console.warn('⚠️ successMessage element not found');
            return;
        }
        
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        
        // Hide after 8 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
            successMessage.innerHTML = ''; // ✨ NEU: Inhalt auch löschen
        }, 8000);
    },

    // ✨ NEU: Show info message - für allgemeine Informationen
    showInfo(message) {
        // Prüfe, ob die Nachricht tatsächlich Inhalt hat
        if (!message || typeof message !== 'string' || message.trim() === '') {
            console.warn('⚠️ showInfo called with empty message, ignoring');
            return;
        }
        
        const infoMessage = document.getElementById('infoMessage');
        if (!infoMessage) {
            console.warn('⚠️ infoMessage element not found');
            return;
        }
        
        infoMessage.innerHTML = `<strong>ℹ️ Info:</strong><br>${message}`;
        infoMessage.style.display = 'block';
        
        // Hide after 6 seconds
        setTimeout(() => {
            infoMessage.style.display = 'none';
            infoMessage.innerHTML = ''; // ✨ NEU: Inhalt auch löschen
        }, 6000);
    },

    // ✨ VERBESSERT: Hide messages - leert auch den Inhalt
    hideMessages() {
        const successMessage = document.getElementById('successMessage');
        const errorMessage = document.getElementById('errorMessage');
        const infoMessage = document.getElementById('infoMessage');
        
        if (successMessage) {
            successMessage.style.display = 'none';
            successMessage.innerHTML = '';
        }
        
        if (errorMessage) {
            errorMessage.style.display = 'none';
            errorMessage.innerHTML = '';
        }
        
        if (infoMessage) {
            infoMessage.style.display = 'none';
            infoMessage.innerHTML = '';
        }
    },

    // Platform-specific adjustments
    applyPlatformStyles() {
        if (window.electronAPI && window.electronAPI.platform === 'darwin') {
            document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
        }
    },

    // Open folder (if possible)
    async openCreatedFolder(folderPath) {
        if (window.electronAPI) {
            try {
                await window.electronAPI.openFolder(folderPath);
            } catch (error) {
                console.error('Error opening folder:', error);
            }
        }
    }
};

// Make globally available as appUtils (to avoid conflicts)
window.appUtils = appUtils;