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

    // Show error message
    showError(message) {
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.innerHTML = `<strong>❌ Error!</strong><br>${message}`;
        errorMessage.style.display = 'block';
        
        // Hide after 8 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 8000);
    },

    // Show success message
    showSuccess(message) {
        const successMessage = document.getElementById('successMessage');
        successMessage.innerHTML = message;
        successMessage.style.display = 'block';
        
        // Hide after 8 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 8000);
    },

    // Hide messages
    hideMessages() {
        document.getElementById('successMessage').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
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