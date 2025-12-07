/**
 * Enhanced Project Validation and Utilities
 * Handles project name validation, path copying, and input status updates.
 */

// Enhanced JavaScript for the project setup
function copyPathToClipboard() {
    const pathPreview = document.getElementById('fullPathPreview');
    const path = pathPreview.textContent;

    if (path && path !== 'Choose directory and project name') {
        navigator.clipboard.writeText(path).then(() => {
            // Show feedback
            const copyBtn = document.querySelector('.copy-path-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅';
            copyBtn.style.background = 'rgba(5, 150, 105, 0.2)';
            copyBtn.style.color = '#059669';

            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = path;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);

            // Show feedback
            const copyBtn = document.querySelector('.copy-path-btn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅';
            copyBtn.style.background = 'rgba(5, 150, 105, 0.2)';
            copyBtn.style.color = '#059669';

            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
                copyBtn.style.color = '';
            }, 2000);
        });
    }
}

// Enhanced validation for inputs
function setupEnhancedValidation() {
    const targetPath = document.getElementById('targetPath');
    const projectName = document.getElementById('projectName');
    const pathStatus = document.getElementById('pathStatus');
    const nameStatus = document.getElementById('nameStatus');

    if (targetPath) {
        targetPath.addEventListener('input', function () {
            const value = this.value.trim();
            if (value) {
                this.classList.add('valid');
                this.classList.remove('invalid');
                if (pathStatus) {
                    pathStatus.textContent = '✅';
                    pathStatus.className = 'input-status valid';
                }
            } else {
                this.classList.remove('valid', 'invalid');
                if (pathStatus) {
                    pathStatus.textContent = '';
                    pathStatus.className = 'input-status';
                }
            }
            // Update path preview when target path changes
            if (window.projectManager && window.projectManager.updatePathPreview) {
                window.projectManager.updatePathPreview();
            }
        });
    }

    if (projectName) {
        projectName.addEventListener('input', function () {
            const value = this.value.trim();

            // Check if validation function exists
            const isValid = window.electronAPI && window.electronAPI.isValidProjectName ?
                window.electronAPI.isValidProjectName(value) :
                validateProjectNameLocal(value);

            if (value && isValid) {
                this.classList.add('valid');
                this.classList.remove('invalid');
                if (nameStatus) {
                    nameStatus.textContent = '✅';
                    nameStatus.className = 'input-status valid';
                }
            } else if (value) {
                this.classList.add('invalid');
                this.classList.remove('valid');
                if (nameStatus) {
                    nameStatus.textContent = '❌';
                    nameStatus.className = 'input-status invalid';
                }
            } else {
                this.classList.remove('valid', 'invalid');
                if (nameStatus) {
                    nameStatus.textContent = '';
                    nameStatus.className = 'input-status';
                }
            }
            // Update path preview when project name changes
            if (window.projectManager && window.projectManager.updatePathPreview) {
                window.projectManager.updatePathPreview();
            }
        });
    }
}

// Local validation function for project names (fallback)
function validateProjectNameLocal(name) {
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
}

// Initialize enhanced validation when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    setupEnhancedValidation();
    console.log('🎯 Enhanced Project Setup initialized');
});

// Also initialize if DOM is already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEnhancedValidation);
} else {
    setupEnhancedValidation();
}

// Expose functions globally
window.copyPathToClipboard = copyPathToClipboard;
window.setupEnhancedValidation = setupEnhancedValidation;
window.validateProjectNameLocal = validateProjectNameLocal;
