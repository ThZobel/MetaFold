// Utility functions for the application

const appUtils = {
    escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    escapeJsAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

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

// Ensure window.utils with joinPath is available for legacy modules like projectScanner
window.utils = window.utils || {};
if (!window.utils.joinPath) {
    window.utils.joinPath = async function (...parts) {
        if (window.electronAPI && typeof window.electronAPI.joinPath === 'function') {
            return await window.electronAPI.joinPath(...parts);
        }
        const sep = (window.electronAPI && window.electronAPI.platform === 'win32') ? '\\' : '/';
        return parts.filter(Boolean).join(sep);
    };
}

/**
 * Universal Export Success Modal
 * Displays a clean, interactive dialog after ANY export operation
 * allowing users to immediately open the destination folder or generated files.
 *
 * @param {Object} options
 * @param {string} [options.title] - Modal title (e.g. 'RO-Crate Export Completed')
 * @param {string} [options.message] - Description text
 * @param {string} [options.folderPath] - Target folder containing exported files
 * @param {Array<string|Object>} [options.files] - List of generated file paths or { name, path, icon, label }
 * @param {Object} [options.stats] - Key-value map of export statistics (e.g. { 'Projects': 5 })
 */
window.showExportSuccessModal = function (options = {}) {
    try {
        const {
            title = 'Export Completed Successfully',
            message = 'Your export files were generated successfully.',
            folderPath = null,
            files = [],
            stats = null
        } = options;

        // Ensure keyframe animation style exists
        if (!document.getElementById('exportModalStyles')) {
            const style = document.createElement('style');
            style.id = 'exportModalStyles';
            style.textContent = `
                @keyframes exportFadeIn {
                    from { opacity: 0; transform: scale(0.96); }
                    to { opacity: 1; transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove any existing export modal instance
        const existing = document.getElementById('exportSuccessModalOverlay');
        if (existing) existing.remove();

        // Normalize files array: can be string paths or { name, path, icon, label }
        const normalizedFiles = (Array.isArray(files) ? files : []).map(f => {
            if (typeof f === 'string') {
                const name = f.split(/[\\/]/).pop() || f;
                const icon = name.endsWith('.html') ? '📄' : (name.endsWith('.json') ? '📊' : (name.endsWith('.csv') ? '📥' : '📦'));
                return { name, path: f, icon, label: name };
            }
            return {
                name: f.name || (f.path ? f.path.split(/[\\/]/).pop() : 'File'),
                path: f.path || '',
                icon: f.icon || '📄',
                label: f.label || f.name || 'File'
            };
        }).filter(f => Boolean(f.path));

        const targetFolder = folderPath || (normalizedFiles.length > 0 ? normalizedFiles[0].path.replace(/[\\/][^\\/]+$/, '') : '');

        // Create overlay element
        const overlay = document.createElement('div');
        overlay.id = 'exportSuccessModalOverlay';
        overlay.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.78);
            backdrop-filter: blur(6px);
            z-index: 100000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
            animation: exportFadeIn 0.18s ease-out;
        `;

        // Escape helpers for safe HTML and attribute injection
        const esc = (str) => appUtils.escapeJsAttr(str);
        const escHtml = (str) => appUtils.escapeHtml(str);

        let filesHtml = '';
        if (normalizedFiles.length > 0) {
            filesHtml = `
                <div style="margin-top: 14px;">
                    <div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #a7f3d0; margin-bottom: 8px;">
                        📄 Generated Files (${normalizedFiles.length}):
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto; padding-right: 4px;">
                        ${normalizedFiles.map(f => `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 8px 12px;">
                                <div style="display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;">
                                    <span style="font-size: 1.15rem; flex-shrink: 0;">${escHtml(f.icon)}</span>
                                    <div style="min-width: 0; flex: 1;">
                                        <div style="font-weight: 500; font-size: 0.88rem; color: #f3f4f6; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escHtml(f.name)}">
                                            ${escHtml(f.name)}
                                        </div>
                                        ${f.label && f.label !== f.name ? `<div style="font-size: 0.74rem; color: #9ca3af;">${escHtml(f.label)}</div>` : ''}
                                    </div>
                                </div>
                                <div style="display: flex; gap: 6px; flex-shrink: 0;">
                                    <button type="button" class="btn btn-secondary btn-sm"
                                        style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);"
                                        onclick="window.electronAPI && window.electronAPI.openFile && window.electronAPI.openFile('${esc(f.path)}')"
                                        title="Open file in default system application">
                                        Open
                                    </button>
                                    <button type="button" class="btn btn-secondary btn-sm"
                                        style="font-size: 0.75rem; padding: 4px 10px; display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);"
                                        onclick="window.electronAPI && window.electronAPI.showItemInFolder && window.electronAPI.showItemInFolder('${esc(f.path)}')"
                                        title="Show and highlight file in Explorer">
                                        🔍 Show
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        let statsHtml = '';
        if (stats && typeof stats === 'object') {
            const entries = Object.entries(stats).filter(([_, v]) => v !== undefined && v !== null && v !== '');
            if (entries.length > 0) {
                statsHtml = `
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px;">
                        ${entries.map(([k, v]) => `
                            <span style="display: inline-flex; align-items: center; gap: 5px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 3px 8px; font-size: 0.78rem; color: #6ee7b7;">
                                <span style="color: #9ca3af;">${escHtml(k)}:</span> <strong>${escHtml(v)}</strong>
                            </span>
                        `).join('')}
                    </div>
                `;
            }
        }

        let folderHtml = '';
        if (targetFolder) {
            folderHtml = `
                <div style="margin-top: 14px; background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <div style="min-width: 0; flex: 1;">
                        <div style="font-size: 0.75rem; color: #9ca3af; margin-bottom: 2px;">📁 Destination Folder:</div>
                        <code style="font-size: 0.8rem; color: #a7f3d0; word-break: break-all; display: block; font-family: monospace;">${escHtml(targetFolder)}</code>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm"
                        style="flex-shrink: 0; font-size: 0.8rem; padding: 6px 12px; background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.4); color: #ecfdf5; cursor: pointer;"
                        onclick="window.electronAPI && window.electronAPI.openFolder && window.electronAPI.openFolder('${esc(targetFolder)}')"
                        title="Open folder in File Explorer">
                        📂 Open Folder
                    </button>
                </div>
            `;
        }

        // Primary action button: open folder or primary file
        const primaryFile = normalizedFiles.find(f => f.name.endsWith('.html')) || normalizedFiles[0];

        overlay.innerHTML = `
            <div style="
                background: #181825;
                border: 1px solid rgba(16, 185, 129, 0.4);
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(16, 185, 129, 0.2);
                border-radius: 12px;
                width: 100%;
                max-width: 580px;
                color: #e0e0e0;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            " onclick="event.stopPropagation()">
                <!-- Header -->
                <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; background: rgba(16, 185, 129, 0.08);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5rem; line-height: 1;">🎉</span>
                        <div>
                            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 600; color: #f3f4f6;">${escHtml(title)}</h3>
                            <div style="font-size: 0.8rem; color: #9ca3af; margin-top: 2px;">Export operation finished successfully</div>
                        </div>
                    </div>
                    <button type="button" style="background: none; border: none; font-size: 1.3rem; color: #9ca3af; cursor: pointer; padding: 4px 8px; line-height: 1;" onclick="document.getElementById('exportSuccessModalOverlay')?.remove();">✕</button>
                </div>

                <!-- Body -->
                <div style="padding: 20px;">
                    <div style="font-size: 0.92rem; color: #d1d5db; line-height: 1.5;">${message}</div>
                    ${statsHtml}
                    ${folderHtml}
                    ${filesHtml}
                </div>

                <!-- Footer Actions -->
                <div style="padding: 14px 20px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2); display: flex; justify-content: flex-end; gap: 10px; align-items: center; flex-wrap: wrap;">
                    ${targetFolder ? `
                        <button type="button" class="btn btn-primary"
                            style="background: #10b981; border-color: #10b981; color: white; font-weight: 500; font-size: 0.88rem; padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;"
                            onclick="window.electronAPI && window.electronAPI.openFolder && window.electronAPI.openFolder('${esc(targetFolder)}')">
                            <span>📂</span> Open Folder
                        </button>
                    ` : ''}
                    ${primaryFile ? `
                        <button type="button" class="btn btn-secondary"
                            style="font-size: 0.88rem; padding: 8px 14px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);"
                            onclick="window.electronAPI && window.electronAPI.openFile && window.electronAPI.openFile('${esc(primaryFile.path)}')">
                            <span>${primaryFile.icon}</span> Open ${primaryFile.label || 'File'}
                        </button>
                    ` : ''}
                    <button type="button" class="btn btn-secondary"
                        style="font-size: 0.88rem; padding: 8px 14px; cursor: pointer; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);"
                        onclick="document.getElementById('exportSuccessModalOverlay')?.remove();">
                        Close
                    </button>
                </div>
            </div>
        `;

        // Close on clicking backdrop
        overlay.addEventListener('click', () => overlay.remove());

        // Close on Escape key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(overlay);

    } catch (err) {
        console.error('Error showing export success modal:', err);
    }
};

if (typeof window !== 'undefined') {
    if (!window.utils) window.utils = {};
    window.utils.showExportSuccessModal = window.showExportSuccessModal;

    /**
     * Harvest all known unique tags across the app:
     * - Loaded User Index projects & groups (metadata, flatMeta, p.tags)
     * - User Index customTags array
     * - experimentForm._tagDictionaryItems
     * - Project notes markdown (#tag mentions)
     */
    window.getAllKnownTags = function() {
        const allTags = new Set();
        const tagKeyRegex = /(?:^|[_\s.-])(tags?|keywords?)(?:$|[_\s.-])/i;

        // 1. From experimentForm._tagDictionaryItems (if loaded)
        if (window.experimentForm && Array.isArray(window.experimentForm._tagDictionaryItems)) {
            window.experimentForm._tagDictionaryItems.forEach(item => {
                const t = (typeof item === 'object' && item) ? item.id : item;
                if (t && typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim());
            });
        }

        // 2. From facetSearch.masterData (all loaded projects)
        if (window.facetSearch && Array.isArray(window.facetSearch.masterData)) {
            window.facetSearch.masterData.forEach(p => {
                if (!p) return;

                // Direct tags property
                if (p.tags) {
                    if (Array.isArray(p.tags)) {
                        p.tags.forEach(t => { if (typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim()); });
                    } else if (typeof p.tags === 'string') {
                        p.tags.split(/[,;]/).forEach(t => { if (t && t !== '[object Object]') allTags.add(t.trim()); });
                    }
                }

                // Recursive in p.metadata
                const scanObj = (o) => {
                    if (!o || typeof o !== 'object') return;
                    for (const [k, v] of Object.entries(o)) {
                        if (tagKeyRegex.test(k) || (v && v.type === 'tags')) {
                            if (Array.isArray(v)) {
                                v.forEach(t => { if (typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim()); });
                            } else if (v && typeof v === 'object' && v.value !== undefined) {
                                if (Array.isArray(v.value)) {
                                    v.value.forEach(t => { if (typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim()); });
                                } else if (typeof v.value === 'string') {
                                    v.value.split(/[,;]/).forEach(t => { if (t && t !== '[object Object]') allTags.add(t.trim()); });
                                }
                            } else if (typeof v === 'string') {
                                v.split(/[,;]/).forEach(t => { if (t && t !== '[object Object]') allTags.add(t.trim()); });
                            }
                        }
                        if (typeof v === 'object' && v !== null && !Array.isArray(v) && !v.value) {
                            scanObj(v);
                        }
                    }
                };
                scanObj(p.metadata);

                // In flatMeta
                if (p.flatMeta) {
                    for (const [k, v] of Object.entries(p.flatMeta)) {
                        if (tagKeyRegex.test(k) && v) {
                            if (Array.isArray(v)) {
                                v.forEach(t => { if (typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim()); });
                            } else if (typeof v === 'string') {
                                v.split(/[,;]/).forEach(t => { if (t && t !== '[object Object]') allTags.add(t.trim()); });
                            }
                        }
                    }
                }

                // In notes_markdown (#tag)
                if (p.notes_markdown && window.markdownLite && window.markdownLite.extractTags) {
                    try {
                        window.markdownLite.extractTags(p.notes_markdown).forEach(t => {
                            if (t && typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim());
                        });
                    } catch (_) {}
                }
            });
        }

        // 3. From facetSearch userIndexData or customTags
        if (window.facetSearch && window.facetSearch.userIndexData && Array.isArray(window.facetSearch.userIndexData.customTags)) {
            window.facetSearch.userIndexData.customTags.forEach(t => {
                if (t && typeof t === 'string' && t !== '[object Object]') allTags.add(t.trim());
            });
        }

        return Array.from(allTags).filter(t => t && t.length > 0 && t !== '[object Object]').sort((a, b) => a.localeCompare(b));
    };

    window.utils.getAllKnownTags = window.getAllKnownTags;
}


