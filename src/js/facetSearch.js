// MetaFold Faceted Search Logic

const facetSearch = {
    masterData: [],
    activeFilters: {},
    visibleColumns: [],
    allAvailableKeys: [],
    tabulatorInstance: null,   // Tabulator.js table instance
    _hasFileSidecars: false,   // true when any project has file sidecars
    _showSidecarFacets: false, // toggle state for File/OME sidecar facets in the left sidebar (collapsed by default)
    hiddenKeys: [],            // Keys hidden by the user via context menu
    metadataTypes: {},
    isTemplateHub: false,
    _templateCache: {},         // Stores types of metadata fields (e.g. text, select)
    textSearchQuery: '',        // Free-text filter query
    dataSource: 'user_index',   // 'user_index' | 'temp_scan' | 'external_json' | 'template_hub'
    sourceLabel: '📚 User Index',
    unsavedScan: null,          // { projects, basePath } when a temporary scan has not yet been saved to user_index.json
    selectedProjectPath: null,
    activeLayoutName: null,     // Name of currently applied saved layout (if any)
    _customColumnOrder: [],     // Optional ordered list of movable column keys ('path', 'created', ...metadataKeys)
    _customColumnWidths: {},    // Optional saved column widths per key/field
    _customColumnSorters: [],   // Optional saved column sorters
    _draggedColumnOrderKey: null,


    // Initialize the module
    init() {
        console.log('🏷️ Facet Search initialized');

        // Close modal with ESC key & navigate table rows with Up/Down arrow keys
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('facetSearchModal');
            if (!modal || modal.style.display === 'none') return;

            if (e.key === 'Escape') {
                const ctxMenu = document.getElementById('facetContextMenu');
                if (ctxMenu) {
                    this.closeContextMenu();
                    e.stopPropagation();
                    return;
                }
                const rightPanel = document.getElementById('facetRightPanel');
                if (rightPanel && rightPanel.style.display !== 'none') {
                    this.closeRightPanel();
                    e.stopPropagation();
                    return;
                }
                this.closeSearch();
                return;
            }

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                if (e.altKey || e.ctrlKey || e.metaKey) return;

                // Do not hijack keys if the Manage Filters modal, Column Selector, or Layout dropdown is active
                const manageModal = document.getElementById('facetManageCategoriesModal');
                if (manageModal && manageModal.style.display !== 'none') return;

                const colDropdown = document.getElementById('columnSelectorDropdown');
                const layoutDropdown = document.getElementById('layoutSelectorDropdown');
                const activeEl = document.activeElement;
                if (colDropdown && colDropdown.style.display !== 'none' && activeEl && colDropdown.contains(activeEl)) {
                    return;
                }
                if (layoutDropdown && layoutDropdown.style.display !== 'none' && activeEl && layoutDropdown.contains(activeEl)) {
                    return;
                }

                const tag = activeEl && activeEl.tagName ? activeEl.tagName.toLowerCase() : '';
                const isTextInput = tag === 'input' || tag === 'textarea' || tag === 'select' || (activeEl && activeEl.isContentEditable);

                // Allow ArrowUp/ArrowDown even if the main text search input is focused,
                // so users can type a filter query and immediately step through results with ↑/↓
                const isMainSearchInput = activeEl && activeEl.id === 'facetTextSearchInput';
                if (isTextInput && !isMainSearchInput) return;

                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                    if (isTextInput || !this._hasFileSidecars || !this.tabulatorInstance) return;
                    const rows = this._getNavigableRows();
                    const currentRow = this._findCurrentSelectedRow(rows);
                    if (!currentRow) return;
                    const children = typeof currentRow.getTreeChildren === 'function' ? currentRow.getTreeChildren() : [];
                    if (children && children.length > 0) {
                        e.preventDefault();
                        if (e.key === 'ArrowRight' && typeof currentRow.isTreeExpanded === 'function' && !currentRow.isTreeExpanded()) {
                            currentRow.treeExpand();
                        } else if (e.key === 'ArrowLeft' && typeof currentRow.isTreeExpanded === 'function' && currentRow.isTreeExpanded()) {
                            currentRow.treeCollapse();
                        }
                    }
                    return;
                }

                // ArrowUp / ArrowDown row navigation
                this.navigateTableByArrow(e.key === 'ArrowDown' ? 1 : -1, e);
            }
        });

        // Close column-selector, layout-selector, and scan-options dropdowns when clicking anywhere outside them
        document.addEventListener('click', (e) => {
            const dropdown = document.getElementById('columnSelectorDropdown');
            const btn = document.getElementById('columnSelectorBtn');
            if (dropdown && dropdown.style.display !== 'none') {
                if (!dropdown.contains(e.target) && e.target !== btn && (!btn || !btn.contains(e.target))) {
                    dropdown.style.display = 'none';
                }
            }
            const layoutDropdown = document.getElementById('layoutSelectorDropdown');
            const layoutBtn = document.getElementById('layoutSelectorBtn');
            if (layoutDropdown && layoutDropdown.style.display !== 'none') {
                if (!layoutDropdown.contains(e.target) && e.target !== layoutBtn && (!layoutBtn || !layoutBtn.contains(e.target))) {
                    layoutDropdown.style.display = 'none';
                }
            }
            const scanDropdown = document.getElementById('scanOptionsDropdown');
            const scanBtn = document.getElementById('scanOptionsDropdownBtn');
            if (scanDropdown && scanDropdown.style.display !== 'none') {
                if (!scanDropdown.contains(e.target) && e.target !== scanBtn && (!scanBtn || !scanBtn.contains(e.target))) {
                    scanDropdown.style.display = 'none';
                }
            }
            const exportDropdown = document.getElementById('exportSelectorDropdown');
            const exportBtn = document.getElementById('exportSelectorBtn');
            if (exportDropdown && exportDropdown.style.display !== 'none') {
                if (!exportDropdown.contains(e.target) && e.target !== exportBtn && (!exportBtn || !exportBtn.contains(e.target))) {
                    exportDropdown.style.display = 'none';
                }
            }
        }, true); // capture phase so it runs before stopPropagation in children

        // Check sidecar scanner menu item visibility
        this._updateSidecarScannerVisibility();
        window.addEventListener('setting-changed', (e) => {
            if (e.detail && e.detail.key === 'plugins.filescanner_enabled') {
                this._updateSidecarScannerVisibility();
            }
        });

        this._initColumnSplitters();
    },

    async _updateSidecarScannerVisibility() {
        const sidecarBtn = document.getElementById('facetSidecarScannerBtn');
        const section = document.getElementById('scanPluginsSection');
        if (!sidecarBtn) return;
        const enabled = (await window.settingsManager?.get('plugins.filescanner_enabled', true)) !== false;
        sidecarBtn.style.display = enabled ? 'flex' : 'none';
        if (section) section.style.display = enabled ? 'block' : 'none';
    },

    // Initialize flexible column splitters between sidebar, results table, and details panel
    _initColumnSplitters() {
        const leftSplitter = document.getElementById('facetLeftSplitter');
        const rightSplitter = document.getElementById('facetRightSplitter');
        const sidebar = document.getElementById('facetSidebar');
        const rightPanel = document.getElementById('facetRightPanel');

        if (!leftSplitter || !sidebar) return; // DOM not mounted yet

        // Restore saved widths from localStorage
        try {
            const savedLeft = localStorage.getItem('metafold_facet_left_width');
            if (savedLeft && sidebar) {
                const w = parseInt(savedLeft, 10);
                if (!isNaN(w) && w >= 180 && w <= 700) {
                    sidebar.style.width = `${w}px`;
                }
            }
            const savedRight = localStorage.getItem('metafold_facet_right_width');
            if (savedRight && rightPanel) {
                const w = parseInt(savedRight, 10);
                if (!isNaN(w) && w >= 280 && w <= 950) {
                    rightPanel.style.width = `${w}px`;
                }
            }
        } catch (e) {
            console.warn('⚠️ Could not restore facet panel widths:', e);
        }

        if (this._splittersInitialized) return;
        this._splittersInitialized = true;

        let activeSplitter = null;
        let isDragging = false;
        let startX = 0;
        let startWidth = 0;
        let targetPanel = null;
        let isLeft = false;

        const onMouseMove = (e) => {
            if (!isDragging || !targetPanel) return;
            const delta = e.clientX - startX;
            let newWidth;
            if (isLeft) {
                newWidth = startWidth + delta;
                const maxW = Math.min(650, window.innerWidth - 350);
                if (newWidth < 180) newWidth = 180;
                if (newWidth > maxW) newWidth = maxW;
            } else {
                newWidth = startWidth - delta;
                const maxW = Math.min(900, window.innerWidth - 300);
                if (newWidth < 280) newWidth = 280;
                if (newWidth > maxW) newWidth = maxW;
            }
            targetPanel.style.width = `${newWidth}px`;
            if (this.tabulatorInstance && typeof this.tabulatorInstance.redraw === 'function') {
                this.tabulatorInstance.redraw(true);
            }
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            if (activeSplitter) activeSplitter.classList.remove('resizing');
            document.body.classList.remove('facet-resizing');
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            try {
                if (isLeft && sidebar) {
                    const finalW = parseInt(sidebar.style.width, 10);
                    if (!isNaN(finalW)) localStorage.setItem('metafold_facet_left_width', String(finalW));
                } else if (!isLeft && rightPanel) {
                    const finalW = parseInt(rightPanel.style.width, 10);
                    if (!isNaN(finalW)) localStorage.setItem('metafold_facet_right_width', String(finalW));
                }
            } catch (err) { }

            activeSplitter = null;
            targetPanel = null;
            this._safeRedrawTable();
        };

        leftSplitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            isLeft = true;
            activeSplitter = leftSplitter;
            targetPanel = sidebar;
            startX = e.clientX;
            startWidth = sidebar.getBoundingClientRect().width;
            leftSplitter.classList.add('resizing');
            document.body.classList.add('facet-resizing');
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });

        if (rightSplitter && rightPanel) {
            rightSplitter.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isDragging = true;
                isLeft = false;
                activeSplitter = rightSplitter;
                targetPanel = rightPanel;
                startX = e.clientX;
                startWidth = rightPanel.getBoundingClientRect().width;
                rightSplitter.classList.add('resizing');
                document.body.classList.add('facet-resizing');
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }
    },

    // Internal flatten function to be used by both loaders
    // Uses the field's human-readable `label` when available so keys like `mode` (label: "Mode")
    // and `Mode` unify into a single consistent key across different template versions.
    flattenObject(obj, prefix = '') {
        let flattened = {};
        const ignoredKeys = ['schemaVersion', 'schemaType', 'template', 'metafold_project_id', 'projectName', 'provenance', 'templateInfo', 'metafold_integration', 'System.UpdateHistory', 'changelog', 'notes_log', 'previous_names', 'created_at', 'updated_at'];
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (ignoredKeys.includes(key) || (!prefix && window.metafoldSchema && window.metafoldSchema.isReservedProjectKey(key) && key !== 'notes_markdown' && key !== 'hypothesis_or_goal')) continue;
                const newKey = prefix ? `${prefix}.${key}` : key;
                const value = obj[key];

                // Handle metadata field structure (value/type/label/description objects)
                if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'value')) {
                    const canonicalKey = (!prefix && value.label && typeof value.label === 'string' && value.label.trim())
                        ? value.label.trim()
                        : key;
                    const formatted = window.formatDisplayValue
                        ? window.formatDisplayValue(value, { emptyPlaceholder: '' })
                        : value.value;
                    // Do not overwrite an existing non-empty value with an empty string when merging aliases
                    if (flattened[canonicalKey] === undefined || flattened[canonicalKey] === '' || flattened[canonicalKey] === null) {
                        flattened[canonicalKey] = formatted;
                    }
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    Object.assign(flattened, this.flattenObject(value, newKey));
                } else {
                    const formatted = (window.formatDisplayValue && typeof value === 'object')
                        ? window.formatDisplayValue(value, { emptyPlaceholder: '' })
                        : value;
                    flattened[newKey] = formatted;
                }
            }
        }
        return flattened;
    },

    // Flatten OME-XML metadata object (sc.ome_metadata) into OME.* keys for facets & table columns
    flattenOmeMetadata(omeData, prefix = 'OME') {
        const result = {};
        if (!omeData || typeof omeData !== 'object') return result;

        for (const [key, value] of Object.entries(omeData)) {
            if (key.startsWith('_')) continue; // skip internal markers like _parsed_at, _source_format
            if (key === 'ID' && typeof value === 'string' && /^(Image|Pixels|Instrument|Objective|Detector|Channel|Microscope):\d+/i.test(value)) {
                continue;
            }
            const fullKey = `${prefix}.${key}`;
            if (value === null || value === undefined || value === '') continue;

            if (Array.isArray(value)) {
                value.forEach((item, idx) => {
                    if (item && typeof item === 'object') {
                        Object.assign(result, this.flattenOmeMetadata(item, `${fullKey}[${idx}]`));
                    } else if (item !== null && item !== undefined && item !== '') {
                        result[`${fullKey}[${idx}]`] = item;
                    }
                });
            } else if (typeof value === 'object') {
                Object.assign(result, this.flattenOmeMetadata(value, fullKey));
            } else {
                result[fullKey] = value;
            }
        }
        return result;
    },

    // Format a metadata key into a concise, unambiguous human-readable label
    // (especially for OME.* and File.* keys where the leaf name alone like "Name" or "Model" would be ambiguous)
    _formatKeyLabel(key) {
        if (!key) return '';
        if (key.startsWith('OME.')) {
            const rest = key.slice(4); // remove 'OME.'
            const chMatch = rest.match(/^Channels?\[(\d+)\]\.(.+)$/);
            if (chMatch) {
                return `Ch${chMatch[1]} ${chMatch[2].replace(/_/g, ' ')}`;
            }
            const instMatch = rest.match(/^Instrument\.([^.]+)\.(.+)$/);
            if (instMatch) {
                return `${instMatch[1]} ${instMatch[2].replace(/_/g, ' ')}`;
            }
            const parts = rest.split('.');
            if (parts.length >= 2) {
                return `${parts[0].replace(/\[\d+\]/g, '')} ${parts.slice(1).join(' ').replace(/_/g, ' ')}`;
            }
            return rest.replace(/_/g, ' ');
        }
        if (key.startsWith('File.')) {
            return `File ${key.slice(5).replace(/_/g, ' ')}`;
        }
        if (key.startsWith('Sidecar.')) {
            return key.slice(8).replace(/\./g, ' ').replace(/_/g, ' ');
        }
        let label = key.split('.').pop().replace(/_/g, ' ');
        return label.charAt(0).toUpperCase() + label.slice(1);
    },

    // Extract metadata types for the Manage Filter Keys modal
    _extractTypes(obj) {
        const ignoredKeys = ['schemaVersion', 'schemaType', 'template', 'metafold_project_id', 'projectName', 'provenance', 'templateInfo', 'metafold_integration', 'created_at', 'updated_at'];
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (ignoredKeys.includes(key)) continue;
                const value = obj[key];
                if (value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'value')) {
                    const canonicalKey = (value.label && typeof value.label === 'string' && value.label.trim())
                        ? value.label.trim()
                        : key;
                    if (value.type) {
                        this.metadataTypes[canonicalKey] = value.type;
                        this.metadataTypes[key] = value.type;
                    }
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                    this._extractTypes(value);
                }
            }
        }
    },

    // Ask user if they want to persist a temporary scan into user_index.json before discarding it
    async promptUnsavedScanIfNeeded() {
        if (!this.unsavedScan || !Array.isArray(this.unsavedScan.projects) || this.unsavedScan.projects.length === 0) {
            this.unsavedScan = null;
            return;
        }
        const scanProjects = this.unsavedScan.projects.filter(p => p.hasMetadata !== false);
        const basePath = this.unsavedScan.basePath || '';
        this.unsavedScan = null; // clear immediately to prevent re-entrant prompts

        if (scanProjects.length === 0) return;

        const wantSave = confirm(
            `Add new scan to User Index?\n\n` +
            `You scanned ${scanProjects.length} project(s) in "${basePath}".\n` +
            `Would you like to permanently add them to your local User Index (user_index.json)?\n` +
            `(Click "Cancel" to keep this scan temporary and leave your User Index unchanged.)`
        );
        if (wantSave && window.electronAPI?.mergeProjectsIntoUserIndex) {
            const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
            await window.electronAPI.mergeProjectsIntoUserIndex(scanProjects, basePath, userInfo);
            if (window.projectScanner?.updateIndexBadge) {
                await window.projectScanner.updateIndexBadge();
            }
        }
    },

    async saveTemporaryScanToIndex() {
        if (!this.unsavedScan || !Array.isArray(this.unsavedScan.projects)) return;
        const scanProjects = this.unsavedScan.projects.filter(p => p.hasMetadata !== false);
        const basePath = this.unsavedScan.basePath || '';
        const userInfo = window.userManager?.getCurrentUserInfo?.() || null;

        if (window.electronAPI?.mergeProjectsIntoUserIndex) {
            const res = await window.electronAPI.mergeProjectsIntoUserIndex(scanProjects, basePath, userInfo);
            if (res && res.success) {
                this.unsavedScan = null;
                if (window.projectScanner?.updateIndexBadge) {
                    await window.projectScanner.updateIndexBadge();
                }
                await this.openFromUserIndex(true);
            }
        }
    },

    toggleScanOptionsDropdown(event) {
        if (event) event.stopPropagation();
        this._updateSidecarScannerVisibility();
        const dropdown = document.getElementById('scanOptionsDropdown');
        if (!dropdown) return;
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    },

    closeScanOptionsDropdown() {
        const dropdown = document.getElementById('scanOptionsDropdown');
        if (dropdown) dropdown.style.display = 'none';
    },

    toggleExportDropdown(event) {
        if (event) event.stopPropagation();
        const dropdown = document.getElementById('exportSelectorDropdown');
        if (!dropdown) return;
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    },

    closeExportDropdown() {
        const dropdown = document.getElementById('exportSelectorDropdown');
        if (dropdown) dropdown.style.display = 'none';
    },

    async clearUserIndexFromSearch() {
        const confirmed = confirm(
            'Are you sure you want to reset your local User Index (user_index.json)?\n\n' +
            'Note: Your actual project files and folders on disk will NOT be deleted — only the search index is cleared.'
        );
        if (!confirmed) return;
        const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
        if (window.electronAPI?.clearUserIndex) {
            await window.electronAPI.clearUserIndex(userInfo);
            if (window.projectScanner?.updateIndexBadge) {
                await window.projectScanner.updateIndexBadge();
            }
            this.unsavedScan = null;
            await this.openFromUserIndex(true);
        }
    },

    // Scan a folder directly inside the unified Search & Scan view (temporary by default)
    async scanFolderFromSearch(directoryPath = null) {
        try {
            await this.promptUnsavedScanIfNeeded();

            if (!directoryPath) {
                directoryPath = await window.electronAPI.selectFolder();
                if (!directoryPath) return false;
            }

            const inheritCheckbox = document.getElementById('inheritMetadataCheckbox');
            const inheritMetadata = inheritCheckbox ? inheritCheckbox.checked : false;

            const sidecarCheckbox = document.getElementById('includeFileSidecarsCheckbox');
            const includeFileSidecars = sidecarCheckbox ? sidecarCheckbox.checked : false;

            const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
            // IMPORTANT: updateUserIndex: false so scanning a colleague's folder stays temporary until confirmed!
            const scanOptions = { inheritMetadata, includeFileSidecars, updateUserIndex: false, userInfo };

            // Show loading state in table container if modal is open
            this.openModal();
            const container = document.getElementById('facetResultsContainer');
            if (container) {
                container.innerHTML = `<div style="padding:60px; text-align:center; color:#c4b5fd;"><h3>🔍 Scanning ${directoryPath}...</h3><p style="color:#9ca3af;">Looking for MetaFold projects...</p></div>`;
            }

            const result = await window.electronAPI.scanMetaFoldProjects(directoryPath, 5, scanOptions);
            if (result && result.success) {
                const realProjects = (result.projects || []).filter(p => p.hasMetadata !== false);
                const folderName = directoryPath.split(/[\\/]/).filter(Boolean).pop() || directoryPath;
                this.dataSource = 'temp_scan';
                this.sourceLabel = `🔍 Temp Scan: ${folderName}`;
                this.unsavedScan = {
                    projects: realProjects,
                    basePath: directoryPath
                };
                if (window.projectScanner) {
                    window.projectScanner.projects = realProjects;
                    window.projectScanner.isViewingUserIndex = false;
                }
                await this.loadFromProjects(realProjects, {
                    dataSource: 'temp_scan',
                    sourceLabel: `🔍 Temp Scan: ${folderName}`,
                    allowEmpty: true
                });
                return true;
            } else {
                alert(`Scan failed: ${result?.message || 'Unknown error'}`);
                return false;
            }
        } catch (err) {
            console.error('Error in scanFolderFromSearch:', err);
            alert(`Error scanning directory: ${err.message}`);
            return false;
        }
    },

    // 0. Open Facet Search directly from the Living User Index (user_index.json)
    async openFromUserIndex(silentReload = false) {
        try {
            if (!silentReload) {
                await this.promptUnsavedScanIfNeeded();
            }

            let projects = [];
            if (window.electronAPI && typeof window.electronAPI.loadUserIndex === 'function') {
                try {
                    const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
                    const res = await window.electronAPI.loadUserIndex(userInfo);
                    if (res && res.success && Array.isArray(res.projects)) {
                        projects = res.projects;
                    }
                } catch (loadErr) {
                    console.warn('⚠️ Could not load user index from backend, showing empty search table:', loadErr);
                }
            } else if (window.projectScanner && Array.isArray(window.projectScanner.projects)) {
                projects = window.projectScanner.projects;
            }

            if (window.projectScanner) {
                window.projectScanner.projects = projects;
                window.projectScanner.isViewingUserIndex = true;
                window.projectScanner.updateIndexBadge?.();
            }

            // Always open the search table directly (empty if no projects yet, never trigger loadJsonFile prompt)
            await this.loadFromProjects(projects, {
                dataSource: 'user_index',
                sourceLabel: '📚 User Index',
                allowEmpty: true
            });
            return true;
        } catch (err) {
            console.error('Error loading user index into Facet Search:', err);
            // Gracefully open empty table instead of forcing a file-open dialog
            await this.loadFromProjects([], {
                dataSource: 'user_index',
                sourceLabel: '📚 User Index',
                allowEmpty: true
            });
            return false;
        }
    },

    // 1. Load from scanned projects directly (RAM)
    async loadFromProjects(projects, options = {}) {
        try {
            console.log('Loading projects from RAM into facet search...');
            const safeProjects = Array.isArray(projects) ? projects : [];
            if (safeProjects.length === 0 && !options.allowEmpty) {
                console.warn("No projects provided to loadFromProjects");
                return;
            }

            this._hasFileSidecars = false;
            this.metadataTypes = {};
            this.isTemplateHub = false;
            this.dataSource = options.dataSource || 'user_index';
            this.sourceLabel = options.sourceLabel || (this.dataSource === 'user_index' ? '📚 User Index' : '📁 Scanned Projects');
            this.textSearchQuery = '';
            const searchInput = document.getElementById('facetTextSearchInput');
            if (searchInput) searchInput.value = '';
            this.closeRightPanel();

            if (window.projectScanner) {
                window.projectScanner.projects = safeProjects;
            }

            this.masterData = safeProjects.map(p => {
                // Always prefer flattening p.metadata with canonical label keys; merge any extra pre-flattened keys (e.g. ISA inherited)
                let flatMeta = {};
                if (p.metadata && Object.keys(p.metadata).length > 0) {
                    flatMeta = this.flattenObject(p.metadata);
                }
                if (p.flattenedMetadata && Object.keys(p.flattenedMetadata).length > 0) {
                    for (const [k, v] of Object.entries(p.flattenedMetadata)) {
                        if (flatMeta[k] === undefined) {
                            flatMeta[k] = v;
                        }
                    }
                }

                flatMeta['System.hasReadme'] = p.hasReadme ? 'Yes' : 'No';

                const entry = {
                    ...p,
                    id: p.path,
                    _type: 'project',
                    flatMeta: flatMeta
                };

                if (p.fileSidecars && p.fileSidecars.length > 0) {
                    this._hasFileSidecars = true;
                    entry._sidecarChildren = p.fileSidecars.map(sc => {
                        const flattenedFromOme = sc.ome_metadata ? this.flattenOmeMetadata(sc.ome_metadata) : {};
                        const scFlatMeta = {
                            ...flattenedFromOme,
                            ...(sc.flattenedOmeMetadata || {})
                        };
                        if (sc.file) {
                            if (sc.file.extension) scFlatMeta['File.Extension'] = sc.file.extension;
                            if (sc.file.size_bytes !== undefined && sc.file.size_bytes !== null) scFlatMeta['File.Size'] = sc.file.size_bytes;
                            if (sc.file.modified) scFlatMeta['File.Modified'] = sc.file.modified;
                            if (sc.file.relativePath) scFlatMeta['File.RelativePath'] = sc.file.relativePath;
                        }
                        return {
                            id: sc.sidecar_id || (sc.file && sc.file.path) || sc.sidecarPath || Math.random().toString(36),
                            sidecar_id: sc.sidecar_id || null,
                            name: (sc.file && sc.file.name) ? sc.file.name : 'Unknown File',
                            path: (sc.file && sc.file.path) ? sc.file.path : '',
                            sidecarPath: sc.sidecarPath || '',
                            generated_at: sc.generated_at || null,
                            generator: sc.generator || null,
                            metafold_version: sc.metafold_version || null,
                            created: (sc.file && sc.file.modified) || sc.generated_at || null,
                            file: sc.file || {},
                            ome_metadata: sc.ome_metadata || null,
                            project_metadata: sc.project_metadata || null,
                            inherited_from_summary: Array.isArray(sc.inherited_from_summary) ? sc.inherited_from_summary : [],
                            nearest_project_id: sc.nearest_project_id || null,
                            _type: 'file_sidecar',
                            _parentProjectName: p.name,
                            _parentProjectPath: p.path,
                            flatMeta: scFlatMeta
                        };
                    });
                }
                if (entry._type === 'project' && entry.metadata) {
                    this._extractTypes(entry.metadata);
                }

                return entry;
            });

            console.log('✅ Facet Search initialized with', this.masterData.length, 'projects');

            this.activeFilters = {};

            // Determine all available keys from BOTH projects and sidecars, ranking by non-empty value count
            let keyCounts = {};
            let nonEmptyCounts = {};
            let projectKeyNonEmptyCounts = {};
            const isNonEmpty = (val) => {
                if (val === undefined || val === null) return false;
                if (Array.isArray(val)) return val.length > 0;
                return String(val).trim() !== '';
            };

            this.masterData.forEach(p => {
                for (let key in p.flatMeta) {
                    if (key.startsWith('System.')) continue;
                    keyCounts[key] = (keyCounts[key] || 0) + 1;
                    if (isNonEmpty(p.flatMeta[key])) {
                        nonEmptyCounts[key] = (nonEmptyCounts[key] || 0) + 1;
                        projectKeyNonEmptyCounts[key] = (projectKeyNonEmptyCounts[key] || 0) + 1;
                    }
                }
                // Also count keys from sidecar children
                if (p._sidecarChildren) {
                    p._sidecarChildren.forEach(sc => {
                        for (let key in sc.flatMeta) {
                            keyCounts[key] = (keyCounts[key] || 0) + 1;
                            if (isNonEmpty(sc.flatMeta[key])) {
                                nonEmptyCounts[key] = (nonEmptyCounts[key] || 0) + 1;
                            }
                        }
                    });
                }
            });
            this._keyProjectCounts = nonEmptyCounts;
            this.allAvailableKeys = Object.keys(keyCounts).sort((a, b) => {
                const diff = (nonEmptyCounts[b] || 0) - (nonEmptyCounts[a] || 0);
                if (diff !== 0) return diff;
                return (keyCounts[b] || 0) - (keyCounts[a] || 0);
            });
            // Prioritize project-level metadata keys for the default 5 visible table columns
            // so projects with many sidecars don't push project columns out of view by default
            const populatedProjectKeys = this.allAvailableKeys
                .filter(k => (projectKeyNonEmptyCounts[k] || 0) > 0 && !k.startsWith('OME.') && !k.startsWith('File.'))
                .sort((a, b) => (projectKeyNonEmptyCounts[b] || 0) - (projectKeyNonEmptyCounts[a] || 0));
            const populatedSidecarKeys = this.allAvailableKeys
                .filter(k => (nonEmptyCounts[k] || 0) > 0 && !populatedProjectKeys.includes(k));
            const combinedPopulated = [...populatedProjectKeys, ...populatedSidecarKeys];
            const defaultTopColumns = (combinedPopulated.length > 0 ? combinedPopulated : this.allAvailableKeys).slice(0, 5);
            await this._restoreSessionTableState(defaultTopColumns);

            if (this._hasFileSidecars) {
                const totalSidecars = this.masterData.reduce((sum, p) => sum + (p._sidecarChildren ? p._sidecarChildren.length : 0), 0);
                console.log(`📄 Loaded ${totalSidecars} file sidecars across ${this.masterData.filter(p => p._sidecarChildren).length} projects (tree mode enabled)`);
            }

            this.renderColumnSelector();

            // Load hidden keys from settings
            const hiddenKeysStr = await window.settingsManager.get('facetSearch.hiddenKeys');
            if (hiddenKeysStr) {
                try {
                    this.hiddenKeys = JSON.parse(hiddenKeysStr);
                } catch (e) {
                    this.hiddenKeys = [];
                }
            } else {
                this.hiddenKeys = [];
            }

            // Open the dedicated modal window
            this.openModal();
            this.updateUI();
        } catch (error) {
            console.error('Error loading projects from RAM:', error);
        }
    },

    // 2. Visualize Selection
    async visualizeSelection() {
        if (!window.visualizationManager) {
            console.error('visualizationManager is not available');
            return;
        }

        const filteredData = this.getFilteredData();
        if (filteredData.length === 0) {
            alert("No projects to visualize. Please adjust your filters.");
            return;
        }

        // Map filtered flat data back to the full project objects (fallback to item itself if opened from User Index / Summary JSON)
        const scannerProjects = (window.projectScanner && Array.isArray(window.projectScanner.projects)) ? window.projectScanner.projects : [];
        const fullProjects = filteredData.map(item => {
            return scannerProjects.find(p => p.path === item.path) || item;
        }).filter(Boolean);

        if (window.projectScanner && (!window.projectScanner.projects || window.projectScanner.projects.length === 0)) {
            window.projectScanner.projects = fullProjects;
        }

        const activeFiltersCopy = this.activeFilters ? { ...this.activeFilters } : {};

        // Close modal without bouncing back to 'create' and switch tab to 'visualize'
        await this.closeSearch({ targetTab: 'visualize' });

        // Always start in Mermaid Lineage Graph when coming from Facet Search
        const fullPool = scannerProjects.length > 0 ? scannerProjects : (Array.isArray(this.masterData) ? this.masterData : fullProjects);
        const explicitRootPath = this.selectedProjectPath
            || (fullProjects.length === 1 ? fullProjects[0]?.path : null);

        window.visualizationManager.visualizeFilteredProjects(fullProjects, activeFiltersCopy, {
            preferredView: 'mermaidlineage',
            rootProjectPath: explicitRootPath || null,
            fullProjectPool: fullPool
        });

        if (window.switchMainTab) {
            window.switchMainTab('visualize');
        }
    },

    // 2b. Visualize Mermaid Lineage for a specific project from Project Details
    async visualizeProjectLineage(projectPath) {
        if (!window.visualizationManager) {
            console.error('visualizationManager is not available');
            return;
        }
        const scannerProjects = (window.projectScanner && Array.isArray(window.projectScanner.projects)) ? window.projectScanner.projects : [];
        const pool = scannerProjects.length > 0 ? scannerProjects : (Array.isArray(this.masterData) ? this.masterData : []);
        if (window.projectScanner && (!window.projectScanner.projects || window.projectScanner.projects.length === 0)) {
            window.projectScanner.projects = pool;
        }

        await this.closeSearch({ targetTab: 'visualize' });

        if (window.switchMainTab) {
            window.switchMainTab('visualize');
        }

        setTimeout(() => {
            window.visualizationManager.visualizeProjectLineage(projectPath, pool);
        }, 40);
    },

    // 3. Load the exported Summary JSON from file
    async loadSummaryFile() {
        try {
            await this.promptUnsavedScanIfNeeded();
            console.log('Loading summary file...');

            const result = await window.electronAPI.loadJsonFile();

            if (!result || !result.success || !result.content) {
                console.log('No file selected or error loading file.');
                return;
            }

            const exportData = result.content;

            if (!exportData || !exportData.projects) {
                throw new Error("Invalid summary file format. Missing 'projects' array.");
            }

            const fileName = result.filePath ? result.filePath.split(/[\\/]/).pop() : 'External JSON';
            await this.loadFromProjects(exportData.projects, {
                dataSource: 'external_json',
                sourceLabel: `📂 ${fileName}`,
                allowEmpty: true
            });

        } catch (error) {
            console.error('❌ Error loading summary file:', error);
            if (window.showError) {
                window.showError(`Error loading summary file: ${error.message}`);
            } else {
                alert(`Error loading summary file: ${error.message}`);
            }
        }
    },

    // Handle free-text filter input in the left sidebar
    handleTextSearch(query) {
        this.textSearchQuery = (query || '').trim().toLowerCase();
        this.updateUI();
    },

    // 2. Filter the data based on active filters + free-text search
    // When file sidecars exist, a project matches if either the project itself
    // OR any of its sidecar children match the filter. Matching sidecar children
    // are preserved in _sidecarChildren so only relevant files appear in the tree.
    getFilteredData() {
        const q = (this.textSearchQuery || '').trim().toLowerCase();

        const matchesText = (item) => {
            if (!q) return true;
            if ((item.name || '').toLowerCase().includes(q)) return true;
            if ((item.path || '').toLowerCase().includes(q)) return true;
            const itemUuid = item.metafold_project_id || item.projectId || item.metadata?.metafold_project_id || '';
            if (itemUuid && String(itemUuid).toLowerCase().includes(q)) return true;
            if (item.flatMeta) {
                for (let k in item.flatMeta) {
                    const v = item.flatMeta[k];
                    if (v !== undefined && v !== null && String(v).toLowerCase().includes(q)) {
                        return true;
                    }
                }
            }
            const notesMdVal = item.notes_markdown || item.metadata?.notes_markdown || '';
            if (typeof notesMdVal === 'string' && notesMdVal.toLowerCase().includes(q)) return true;
            const goalVal = item.hypothesis_or_goal || item.metadata?.hypothesis_or_goal || '';
            if (typeof goalVal === 'string' && goalVal.toLowerCase().includes(q)) return true;
            const notesLogVal = Array.isArray(item.notes_log) ? item.notes_log : (Array.isArray(item.metadata?.notes_log) ? item.metadata.notes_log : []);
            if (notesLogVal.some(n => n && typeof n.text === 'string' && n.text.toLowerCase().includes(q))) return true;
            if (item.tags) {
                const tagStr = Array.isArray(item.tags) ? item.tags.join(' ') : String(item.tags);
                if (tagStr.toLowerCase().includes(q)) return true;
            }
            if (item.lineage) {
                if (Array.isArray(item.lineage.provides_ids) && item.lineage.provides_ids.some(id => String(id).toLowerCase().includes(q))) {
                    return true;
                }
                if (Array.isArray(item.lineage.derived_from_ids) && item.lineage.derived_from_ids.some(id => String(id).toLowerCase().includes(q))) {
                    return true;
                }
                if (Array.isArray(item.lineage.lineage_links) && item.lineage.lineage_links.some(l =>
                    (l.id && String(l.id).toLowerCase().includes(q)) ||
                    (l.source_path && String(l.source_path).toLowerCase().includes(q))
                )) {
                    return true;
                }
                if (Array.isArray(item.lineage.related_to_ids) && item.lineage.related_to_ids.some(id => String(id).toLowerCase().includes(q))) {
                    return true;
                }
                if (Array.isArray(item.lineage.related_links) && item.lineage.related_links.some(l =>
                    (l.id && String(l.id).toLowerCase().includes(q)) ||
                    (l.target_path && String(l.target_path).toLowerCase().includes(q))
                )) {
                    return true;
                }
                if (Array.isArray(item.lineage.tags) && item.lineage.tags.some(t => String(t).toLowerCase().includes(q))) {
                    return true;
                }
            }
            return false;
        };

        const matchesFilters = (flatMeta) => {
            for (let key in this.activeFilters) {
                const itemValue = flatMeta[key];
                const selectedFilters = this.activeFilters[key];
                if (!selectedFilters || selectedFilters.length === 0) continue;

                let isMatch = false;
                if (Array.isArray(itemValue)) {
                    isMatch = selectedFilters.every(filterVal => itemValue.includes(filterVal));
                } else {
                    isMatch = selectedFilters.includes(itemValue);
                }
                if (!isMatch) return false;
            }
            return true;
        };

        return this.masterData.filter(item => {
            const projectMatches = matchesFilters(item.flatMeta) && matchesText(item);

            if (!item._sidecarChildren || item._sidecarChildren.length === 0) {
                return projectMatches;
            }

            // Filter sidecar children that match
            const matchingChildren = item._sidecarChildren.filter(sc => matchesFilters(sc.flatMeta) && matchesText(sc));

            // Project is included if it matches OR any child matches
            if (projectMatches || matchingChildren.length > 0) {
                // Temporarily store filtered children for rendering
                item._filteredSidecarChildren = projectMatches
                    ? item._sidecarChildren   // project matches → show all children
                    : matchingChildren;        // only children match → show matching ones
                return true;
            }

            return false;
        });
    },

    // 3. Calculate remaining available facets (cascading)
    // Includes metadata from both project-level AND sidecar-level entries
    getAvailableFacets(filteredData) {
        let facets = {};

        // Helper: add all keys/values from a flatMeta object to facets
        const addToFacets = (flatMeta) => {
            for (let key in flatMeta) {
                if (!facets[key]) facets[key] = new Set();
                const itemValue = flatMeta[key];
                if (Array.isArray(itemValue)) {
                    itemValue.forEach(val => {
                        if (val !== undefined && val !== null && val.toString().trim() !== '') {
                            facets[key].add(val);
                        }
                    });
                } else if (['string', 'number', 'boolean'].includes(typeof itemValue)) {
                    if (itemValue.toString().trim() !== '') {
                        facets[key].add(itemValue);
                    }
                }
            }
        };

        // Collect facets from projects AND their sidecar children
        filteredData.forEach(item => {
            addToFacets(item.flatMeta);
            const children = item._filteredSidecarChildren || item._sidecarChildren || [];
            children.forEach(sc => addToFacets(sc.flatMeta));
        });

        // Count occurrences (across projects + sidecars)
        const allEntries = [];
        filteredData.forEach(item => {
            allEntries.push(item);
            const children = item._filteredSidecarChildren || item._sidecarChildren || [];
            children.forEach(sc => allEntries.push(sc));
        });

        let facetCounts = {};
        for (let key in facets) {
            let valuesArray = [];
            facets[key].forEach(val => {
                let count = allEntries.filter(entry => {
                    const iVal = entry.flatMeta[key];
                    if (Array.isArray(iVal)) return iVal.includes(val);
                    return iVal === val;
                }).length;
                valuesArray.push({ value: val, count: count });
            });
            valuesArray.sort((a, b) => b.count - a.count);
            facetCounts[key] = valuesArray;
        }

        let sortedKeys = Object.keys(facetCounts).sort((a, b) => {
            let totalA = facetCounts[a].reduce((sum, v) => sum + v.count, 0);
            let totalB = facetCounts[b].reduce((sum, v) => sum + v.count, 0);
            return totalB - totalA;
        });

        let sortedFacets = {};
        sortedKeys.forEach(key => {
            sortedFacets[key] = facetCounts[key];
        });

        return sortedFacets;
    },

    // Synchronize header title, source badge, and context-sensitive buttons
    updateHeaderState() {
        const iconEl = document.getElementById('facetModalIcon');
        const headingEl = document.getElementById('facetModalHeading');
        const subtitleEl = document.getElementById('facetModalSubtitle');
        const sourceBadge = document.getElementById('facetSourceBadge');
        const sourceGroup = document.getElementById('facetSourceToolbarGroup');
        const exportGroup = document.getElementById('facetExportToolbarGroup');
        const saveScanBtn = document.getElementById('facetSaveScanBtn');
        const switchToIndexBtn = document.getElementById('facetSwitchToIndexBtn');

        if (this.isTemplateHub) {
            if (iconEl) iconEl.textContent = '🌐';
            if (headingEl) headingEl.textContent = 'Community Templates Hub';
            if (subtitleEl) subtitleEl.textContent = 'Click any template row or use ↑/↓ arrow keys to inspect fields, folder structure & install options on the right';
            if (sourceBadge) {
                sourceBadge.textContent = '🌐 GitHub Repository';
                sourceBadge.className = 'facet-source-badge source-hub';
            }
            if (sourceGroup) sourceGroup.style.display = 'none';
            if (exportGroup) exportGroup.style.display = 'none';
        } else {
            if (iconEl) iconEl.textContent = '🔍';
            if (headingEl) headingEl.textContent = 'Search & Scan Projects';
            if (subtitleEl) subtitleEl.textContent = 'Click any table row or use ↑/↓ arrow keys to inspect metadata & lineage on the right · Right-click filters on the left to hide or manage them';
            if (sourceBadge) {
                sourceBadge.textContent = this.sourceLabel || '📚 User Index';
                sourceBadge.className = `facet-source-badge ${this.dataSource === 'temp_scan' ? 'source-temp' : 'source-index'}`;
            }
            if (sourceGroup) sourceGroup.style.display = 'inline-flex';
            if (exportGroup) exportGroup.style.display = 'inline-flex';
            if (saveScanBtn) {
                saveScanBtn.style.display = (this.unsavedScan && this.unsavedScan.projects && this.unsavedScan.projects.length > 0) ? 'inline-flex' : 'none';
            }
            if (switchToIndexBtn) {
                switchToIndexBtn.style.display = (this.dataSource !== 'user_index') ? 'inline-flex' : 'none';
            }
        }

        // Update total active filter badge in sidebar
        const activeCountBadge = document.getElementById('facetActiveCount');
        if (activeCountBadge) {
            let totalFilters = Object.values(this.activeFilters).reduce((s, arr) => s + (arr ? arr.length : 0), 0);
            if (this.textSearchQuery) totalFilters += 1;
            if (totalFilters > 0) {
                activeCountBadge.textContent = `${totalFilters} active`;
                activeCountBadge.style.display = 'inline-block';
            } else {
                activeCountBadge.style.display = 'none';
            }
        }
    },

    // Update the entire UI
    updateUI() {
        this.updateHeaderState();
        const currentResults = this.getFilteredData();
        const nextAvailableTags = this.getAvailableFacets(currentResults);

        this.renderSidebar(nextAvailableTags);
        this.renderResults(currentResults);
    },

    _collapsedCategories: {},   // tracks collapsed state per category header

    // Map a metadata key (e.g. OME.Pixels.SizeX, File.Extension, Project.Condition, community taxonomy) to a category name
    _getCategoryForKey(key, isTemplateHub = this.isTemplateHub) {
        if (isTemplateHub) {
            const communityKeys = ['category', 'collection', 'tags', 'description', 'author', 'version', 'system', 'discipline', 'organism'];
            if (communityKeys.includes(key)) {
                return '🌐 Community Taxonomy';
            }
        }
        if (key.startsWith('OME.')) {
            const parts = key.split('.');
            if (parts.length >= 2) {
                const sub = parts[1].replace(/\[\d+\]/g, '');
                return `🔬 OME ${sub}`;
            }
            return '🔬 OME Metadata';
        }
        if (key.startsWith('File.')) {
            return '📄 File Properties';
        }
        if (key.startsWith('Sidecar.')) {
            return '📄 Sidecar Metadata';
        }
        if (key.startsWith('integrations.') || key.toLowerCase().includes('omero') || key.toLowerCase().includes('elabftw') || key.toLowerCase().includes('rspace')) {
            return '🔗 Integrations';
        }
        if (key.startsWith('System.')) {
            return '⚙️ System';
        }
        if (key.startsWith('Project.') || key.startsWith('Sample.') || key.startsWith('ISA.')) {
            return '📁 Project & ISA';
        }
        return '🏷️ Metadata Fields';
    },

    _isSidecarCategory(categoryName) {
        return categoryName === '📄 File Properties' ||
            categoryName === '📄 Sidecar Metadata' ||
            (typeof categoryName === 'string' && categoryName.startsWith('🔬 OME'));
    },

    _isCategoryCollapsed(categoryName) {
        if (this._collapsedCategories[categoryName] !== undefined) {
            return this._collapsedCategories[categoryName];
        }
        return false;
    },

    _toggleCategoryCollapse(categoryName) {
        this._collapsedCategories[categoryName] = !this._isCategoryCollapsed(categoryName);
        this.updateUI();
    },

    toggleSidecarFacets() {
        this._showSidecarFacets = !this._showSidecarFacets;
        this.updateUI();
    },

    // Render the sidebar with categorized, collapsible facet groups and chips
    renderSidebar(facets) {
        const container = document.getElementById('facetGroupsContainer');
        container.innerHTML = '';

        // Group active facet keys by category
        const categoryGroups = {};
        for (let key in facets) {
            if (facets[key].length === 0) continue;
            const cat = this._getCategoryForKey(key);
            if (!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push(key);
        }

        // Preferred display order for categories
        const categoryOrder = [
            '🌐 Community Taxonomy',
            '🏷️ Metadata Fields',
            '📁 Project & ISA',
            '🔗 Integrations',
            '⚙️ System',
            '📄 File Properties',
            '🔬 OME Pixels',
            '🔬 OME Channels',
            '🔬 OME Channel',
            '🔬 OME Instrument',
            '🔬 OME Image',
            '🔬 OME Metadata'
        ];

        const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
            let idxA = categoryOrder.indexOf(a);
            let idxB = categoryOrder.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        });

        const buildCategorySection = (catName) => {
            const keys = categoryGroups[catName];
            const visibleKeys = keys.filter(k => !this.hiddenKeys.includes(k));
            if (visibleKeys.length === 0) return null;

            // Calculate active filters in this category
            let activeFilterCount = 0;
            keys.forEach(k => {
                if (this.activeFilters[k] && this.activeFilters[k].length > 0) {
                    activeFilterCount += this.activeFilters[k].length;
                }
            });

            // Collapse category if toggled off (force expand if it has active filters)
            const isCollapsed = activeFilterCount === 0 && this._isCategoryCollapsed(catName);

            const catSection = document.createElement('div');
            catSection.className = `facet-category-section ${isCollapsed ? 'collapsed' : 'expanded'}`;

            const catHeader = document.createElement('div');
            catHeader.className = 'facet-category-header';
            catHeader.onclick = () => this._toggleCategoryCollapse(catName);

            const toggleIcon = document.createElement('span');
            toggleIcon.className = 'facet-category-toggle-icon';
            toggleIcon.textContent = isCollapsed ? '▶' : '▼';

            const catTitle = document.createElement('span');
            catTitle.className = 'facet-category-title';
            catTitle.textContent = catName;

            catHeader.appendChild(toggleIcon);
            catHeader.appendChild(catTitle);

            if (activeFilterCount > 0) {
                const activeBadge = document.createElement('span');
                activeBadge.className = 'facet-category-active-badge';
                activeBadge.textContent = `${activeFilterCount} active`;
                catHeader.appendChild(activeBadge);
            }

            const clearCatBtn = document.createElement('span');
            clearCatBtn.innerHTML = '✖';
            clearCatBtn.className = 'facet-category-clear';
            clearCatBtn.title = 'Clear all active filters in this category';
            clearCatBtn.onclick = (e) => {
                e.stopPropagation();
                keys.forEach(k => {
                    if (this.activeFilters[k]) {
                        delete this.activeFilters[k];
                    }
                });
                this.updateUI();
            };
            catHeader.appendChild(clearCatBtn);

            const catBody = document.createElement('div');
            catBody.className = 'facet-category-body';
            if (isCollapsed) {
                catBody.style.display = 'none';
            }

            visibleKeys.forEach(key => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'facet-group';
                groupDiv.dataset.facetKey = key;

                const titleDiv = document.createElement('div');
                titleDiv.className = 'facet-group-title';
                const displayTitle = this._formatKeyLabel(key);
                titleDiv.title = `Right-click to hide filter "${displayTitle}" (${key})`;

                titleDiv.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.showContextMenu(e.pageX, e.pageY, key);
                });

                titleDiv.textContent = displayTitle;

                if (this.activeFilters[key]) {
                    const clearBtn = document.createElement('span');
                    clearBtn.innerHTML = ' ✖';
                    clearBtn.style.cursor = 'pointer';
                    clearBtn.title = 'Clear filter for ' + displayTitle;
                    clearBtn.onclick = (e) => {
                        e.stopPropagation();
                        this.toggleFilter(key, null);
                    };
                    titleDiv.appendChild(clearBtn);
                }

                const chipsDiv = document.createElement('div');
                chipsDiv.className = 'facet-chips';

                facets[key].forEach(facetVal => {
                    const isActive = this.activeFilters[key] && this.activeFilters[key].includes(facetVal.value);

                    const chip = document.createElement('div');
                    chip.className = `facet-chip ${isActive ? 'active' : ''}`;
                    chip.onclick = () => this.toggleFilter(key, facetVal.value);

                    const valSpan = document.createElement('span');
                    let displayVal = facetVal.value.toString();
                    if (displayVal.length > 30) displayVal = displayVal.substring(0, 30) + '...';
                    valSpan.textContent = displayVal;

                    const countSpan = document.createElement('span');
                    countSpan.className = 'count';
                    countSpan.textContent = `(${facetVal.count})`;

                    chip.appendChild(valSpan);
                    if (!isActive) chip.appendChild(countSpan);

                    chipsDiv.appendChild(chip);
                });

                groupDiv.appendChild(titleDiv);
                groupDiv.appendChild(chipsDiv);
                catBody.appendChild(groupDiv);
            });

            catSection.appendChild(catHeader);
            catSection.appendChild(catBody);
            return catSection;
        };

        const projectCategories = sortedCategories.filter(c => !this._isSidecarCategory(c));
        const sidecarCategories = sortedCategories.filter(c => this._isSidecarCategory(c));

        projectCategories.forEach(catName => {
            const sec = buildCategorySection(catName);
            if (sec) container.appendChild(sec);
        });

        // Render collapsible / toggleable File Sidecar & OME Facets section so project facets stay clean
        if (sidecarCategories.length > 0) {
            let totalSidecarKeys = 0;
            let activeSidecarFilterCount = 0;
            sidecarCategories.forEach(catName => {
                const keys = categoryGroups[catName] || [];
                keys.forEach(k => {
                    if (!this.hiddenKeys.includes(k)) totalSidecarKeys++;
                    if (this.activeFilters[k] && this.activeFilters[k].length > 0) {
                        activeSidecarFilterCount += this.activeFilters[k].length;
                    }
                });
            });

            if (totalSidecarKeys > 0 || activeSidecarFilterCount > 0) {
                const isSidecarOpen = this._showSidecarFacets || activeSidecarFilterCount > 0;

                const toggleWrapper = document.createElement('div');
                toggleWrapper.style.cssText = 'margin: 12px 0 8px 0; padding-top: 10px; border-top: 1px dashed rgba(139, 92, 246, 0.35);';

                const toggleBtn = document.createElement('button');
                toggleBtn.type = 'button';
                toggleBtn.className = 'btn btn-secondary facet-sidecar-toggle-btn';
                toggleBtn.style.cssText = `
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 6px;
                    padding: 7px 10px;
                    font-size: 0.78rem;
                    font-weight: 600;
                    border-radius: 7px;
                    cursor: pointer;
                    background: ${isSidecarOpen ? 'rgba(139, 92, 246, 0.22)' : 'rgba(139, 92, 246, 0.1)'};
                    border: 1px solid ${isSidecarOpen ? 'rgba(167, 139, 250, 0.5)' : 'rgba(139, 92, 246, 0.3)'};
                    color: #ddd6fe;
                    transition: all 0.15s ease;
                `;
                toggleBtn.onclick = () => {
                    if (activeSidecarFilterCount > 0 && isSidecarOpen && !this._showSidecarFacets) {
                        // Force-opened because of active filters; toggle explicit state
                        this._showSidecarFacets = false;
                    } else {
                        this._showSidecarFacets = !isSidecarOpen;
                    }
                    this.updateUI();
                };

                const leftLabel = document.createElement('span');
                leftLabel.textContent = `📄 ${isSidecarOpen ? 'Hide' : 'Show'} File Sidecar Facets`;

                const rightBadge = document.createElement('span');
                rightBadge.style.cssText = 'font-size: 0.72rem; background: rgba(0,0,0,0.28); padding: 1px 6px; border-radius: 999px; color: #c4b5fd;';
                rightBadge.textContent = activeSidecarFilterCount > 0
                    ? `${activeSidecarFilterCount} active · ${totalSidecarKeys}`
                    : `${totalSidecarKeys} fields`;

                toggleBtn.appendChild(leftLabel);
                toggleBtn.appendChild(rightBadge);
                toggleWrapper.appendChild(toggleBtn);
                container.appendChild(toggleWrapper);

                if (isSidecarOpen) {
                    const sidecarGroupContainer = document.createElement('div');
                    sidecarGroupContainer.className = 'facet-sidecar-categories-container';
                    sidecarGroupContainer.style.cssText = 'padding-left: 4px; border-left: 2px solid rgba(139, 92, 246, 0.35); margin-bottom: 10px;';

                    sidecarCategories.forEach(catName => {
                        const sec = buildCategorySection(catName);
                        if (sec) sidecarGroupContainer.appendChild(sec);
                    });

                    container.appendChild(sidecarGroupContainer);
                }
            }
        }

        if (container.children.length === 0) {
            const emptyNotice = document.createElement('div');
            emptyNotice.style.cssText = 'color: #94a3b8; font-size: 0.82rem; padding: 1.75rem 1rem; text-align: center; line-height: 1.5;';
            emptyNotice.innerHTML = `
                <div style="font-size: 1.6rem; margin-bottom: 0.5rem; opacity: 0.7;">🏷️</div>
                <div style="color: #cbd5e1; font-weight: 500; margin-bottom: 0.25rem;">No filter tags yet</div>
                <div style="font-size: 0.75rem; color: #64748b;">Scan project folders to extract metadata facets.</div>
            `;
            container.appendChild(emptyNotice);
        }
    },

    // ─── Context Menu Helpers ─────────────────────────────────────────────

    handleSidebarContextMenu(e) {
        if (e.target && e.target.closest('input, textarea')) return;
        e.preventDefault();
        const groupEl = e.target ? e.target.closest('[data-facet-key]') : null;
        const targetKey = groupEl ? groupEl.dataset.facetKey : null;
        this.showContextMenu(e.pageX, e.pageY, targetKey);
    },

    showContextMenu(x, y, targetKey = null) {
        this.closeContextMenu();

        const menu = document.createElement('div');
        menu.className = 'facet-context-menu';
        menu.id = 'facetContextMenu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        if (targetKey) {
            const displayTitle = this._formatKeyLabel(targetKey);
            const hideBtn = document.createElement('div');
            hideBtn.className = 'facet-context-menu-item';
            hideBtn.textContent = `👁️‍🗨️ Hide Filter "${displayTitle}"`;
            hideBtn.onclick = async () => {
                if (!this.hiddenKeys.includes(targetKey)) {
                    this.hiddenKeys.push(targetKey);
                    await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));
                }
                this.closeContextMenu();
                this.updateUI();
            };
            menu.appendChild(hideBtn);
        }

        const showAllBtn = document.createElement('div');
        showAllBtn.className = 'facet-context-menu-item';
        const hiddenCount = Array.isArray(this.hiddenKeys) ? this.hiddenKeys.length : 0;
        showAllBtn.textContent = hiddenCount > 0
            ? `👁️ Show All Filters (${hiddenCount} hidden)`
            : '👁️ Show All Filters';
        showAllBtn.onclick = async () => {
            this.hiddenKeys = [];
            await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));
            this.closeContextMenu();
            this.updateUI();
        };

        const manageBtn = document.createElement('div');
        manageBtn.className = 'facet-context-menu-item';
        manageBtn.textContent = '🏷️ Manage Filters...';
        manageBtn.onclick = () => {
            this.closeContextMenu();
            this.showManageCategoriesModal();
        };

        menu.appendChild(showAllBtn);
        menu.appendChild(manageBtn);

        document.body.appendChild(menu);

        // Use capture phase (true) so clicks inside .facet-modal-window (which has onclick="event.stopPropagation()")
        // still immediately dismiss the context menu!
        setTimeout(() => {
            document.addEventListener('mousedown', this._contextMenuListener, true);
            document.addEventListener('click', this._contextMenuListener, true);
        }, 10);
    },

    closeContextMenu() {
        const menu = document.getElementById('facetContextMenu');
        if (menu) {
            menu.remove();
        }
        document.removeEventListener('mousedown', this._contextMenuListener, true);
        document.removeEventListener('click', this._contextMenuListener, true);
    },

    showColumnContextMenu(x, y, column) {
        this.closeContextMenu();
        if (!column) return;

        const field = typeof column.getField === 'function' ? column.getField() : column.field;
        const colDef = typeof column.getDefinition === 'function' ? column.getDefinition() : {};
        const title = colDef.title || field;

        const menu = document.createElement('div');
        menu.className = 'facet-context-menu';
        menu.id = 'facetContextMenu';
        menu.style.left = `${x}px`;
        menu.style.top = `${y}px`;

        if (field === 'name' || field === '_actions') {
            const lockedItem = document.createElement('div');
            lockedItem.className = 'facet-context-menu-item';
            lockedItem.style.opacity = '0.6';
            lockedItem.style.cursor = 'default';
            lockedItem.textContent = `🔒 Column "${title}" cannot be hidden`;
            menu.appendChild(lockedItem);
        } else {
            // Find key if metadata
            let metaKey = null;
            if (field && field.startsWith('meta__')) {
                metaKey = this.allAvailableKeys.find(k => this._keyToField(k) === field);
            }

            const hideItem = document.createElement('div');
            hideItem.className = 'facet-context-menu-item';
            hideItem.textContent = `👁️‍🗨️ Hide Column "${title}"`;
            hideItem.onclick = () => {
                this.closeContextMenu();
                if (metaKey) {
                    if (this.visibleColumns.includes(metaKey)) {
                        this.toggleColumn(metaKey);
                    }
                } else {
                    if (typeof column.hide === 'function') {
                        column.hide();
                    } else if (this.tabulatorInstance) {
                        this.tabulatorInstance.hideColumn(field);
                    }
                    if (Array.isArray(this._customColumnOrder)) {
                        const idx = this._customColumnOrder.indexOf(field);
                        if (idx > -1) this._customColumnOrder.splice(idx, 1);
                    }
                    this._saveSessionTableState();
                }
            };
            menu.appendChild(hideItem);
        }

        const manageItem = document.createElement('div');
        manageItem.className = 'facet-context-menu-item';
        manageItem.textContent = '⚙️ Manage Columns...';
        manageItem.onclick = () => {
            this.closeContextMenu();
            this.toggleColumnSelector();
        };
        menu.appendChild(manageItem);

        const resetItem = document.createElement('div');
        resetItem.className = 'facet-context-menu-item';
        resetItem.textContent = '🔄 Reset to Top 5 Columns';
        resetItem.onclick = () => {
            this.closeContextMenu();
            this.setTopColumns(5);
        };
        menu.appendChild(resetItem);

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('mousedown', this._contextMenuListener, true);
            document.addEventListener('click', this._contextMenuListener, true);
        }, 10);
    },

    // ─── Manage Filters Modal ─────────────────────────────────────────────

    _syncManageCategoryGroupCheckboxes() {
        const listContainer = document.getElementById('facetManageCategoriesList');
        if (!listContainer) return;
        listContainer.querySelectorAll('.manage-categories-group').forEach(group => {
            const headerCb = group.querySelector('.manage-category-group-checkbox');
            if (!headerCb) return;
            const visibleItems = Array.from(group.querySelectorAll('.manage-categories-item'))
                .filter(item => item.style.display !== 'none');
            const itemCbs = visibleItems
                .map(item => item.querySelector('input[type="checkbox"][data-key]'))
                .filter(Boolean);
            if (itemCbs.length === 0) {
                headerCb.checked = false;
                headerCb.indeterminate = false;
                return;
            }
            const checkedCount = itemCbs.filter(cb => cb.checked).length;
            headerCb.checked = checkedCount === itemCbs.length;
            headerCb.indeterminate = checkedCount > 0 && checkedCount < itemCbs.length;
        });
    },

    setAllManageCategories(checked) {
        const listContainer = document.getElementById('facetManageCategoriesList');
        if (!listContainer) return;
        listContainer.querySelectorAll('.manage-categories-item').forEach(item => {
            if (item.style.display === 'none') return; // only toggle currently visible items when search is active
            const cb = item.querySelector('input[type="checkbox"][data-key]');
            if (cb) cb.checked = checked;
        });
        this._syncManageCategoryGroupCheckboxes();
    },

    filterManageCategoriesList(query) {
        const listContainer = document.getElementById('facetManageCategoriesList');
        if (!listContainer) return;
        const q = (query || '').trim().toLowerCase();

        listContainer.querySelectorAll('.manage-categories-group').forEach(group => {
            let visibleInGroup = 0;
            group.querySelectorAll('.manage-categories-item').forEach(item => {
                const labelText = (item.dataset.searchText || '').toLowerCase();
                const matches = !q || labelText.includes(q);
                item.style.display = matches ? '' : 'none';
                if (matches) visibleInGroup++;
            });
            group.style.display = visibleInGroup > 0 ? '' : 'none';
        });
        this._syncManageCategoryGroupCheckboxes();
    },

    showManageCategoriesModal() {
        const modal = document.getElementById('facetManageCategoriesModal');
        const listContainer = document.getElementById('facetManageCategoriesList');
        const searchInput = document.getElementById('facetFilterKeysSearchInput');
        if (!modal || !listContainer) return;

        if (searchInput) searchInput.value = '';
        listContainer.innerHTML = '';

        // Gather all unique keys from masterData that actually have facet values (plus any currently hidden keys)
        const allFacets = this.getAvailableFacets(this.masterData);
        const keySet = new Set(
            Object.keys(allFacets).filter(k => Array.isArray(allFacets[k]) && allFacets[k].length > 0)
        );
        this.hiddenKeys.forEach(key => keySet.add(key));

        // Group keys by category and sort alphabetically (A–Z) within each category
        const categoryGroups = {};
        Array.from(keySet).forEach(key => {
            const cat = this._getCategoryForKey(key);
            if (!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push(key);
        });

        const categoryOrder = [
            '🌐 Community Taxonomy',
            '🏷️ Metadata Fields',
            '📁 Project & ISA',
            '🔗 Integrations',
            '⚙️ System',
            '📄 File Properties',
            '🔬 OME Pixels',
            '🔬 OME Channels',
            '🔬 OME Channel',
            '🔬 OME Instrument',
            '🔬 OME Image',
            '🔬 OME Metadata'
        ];

        const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
            let idxA = categoryOrder.indexOf(a);
            let idxB = categoryOrder.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        });

        sortedCategories.forEach(catName => {
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'manage-categories-group';

            const sortedKeys = categoryGroups[catName].sort((a, b) => {
                const titleA = this._formatKeyLabel(a);
                const titleB = this._formatKeyLabel(b);
                return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
            });

            const catHeader = document.createElement('div');
            catHeader.style.cssText = 'display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; color: #a78bfa; margin: 10px 0 4px 0; border-bottom: 1px solid rgba(139,92,246,0.25); padding-bottom: 4px; cursor: pointer; user-select: none;';
            catHeader.title = `Toggle all filters in "${catName}"`;

            const catCheckbox = document.createElement('input');
            catCheckbox.type = 'checkbox';
            catCheckbox.className = 'manage-category-group-checkbox';
            catCheckbox.style.cssText = 'width: 15px; height: 15px; accent-color: #8b5cf6; cursor: pointer; margin: 0;';

            const catTitleSpan = document.createElement('span');
            catTitleSpan.textContent = `${catName} (${sortedKeys.length})`;

            catHeader.appendChild(catCheckbox);
            catHeader.appendChild(catTitleSpan);

            const toggleCategoryGroup = (targetChecked) => {
                groupWrapper.querySelectorAll('.manage-categories-item').forEach(item => {
                    if (item.style.display === 'none') return;
                    const cb = item.querySelector('input[type="checkbox"][data-key]');
                    if (cb) cb.checked = targetChecked;
                });
                this._syncManageCategoryGroupCheckboxes();
            };

            catCheckbox.onclick = (e) => {
                e.stopPropagation();
                toggleCategoryGroup(catCheckbox.checked);
            };

            catHeader.onclick = (e) => {
                if (e.target !== catCheckbox) {
                    catCheckbox.checked = !catCheckbox.checked;
                    toggleCategoryGroup(catCheckbox.checked);
                }
            };

            groupWrapper.appendChild(catHeader);

            sortedKeys.forEach(key => {
                const isHidden = this.hiddenKeys.includes(key);
                const isMissing = !allFacets[key] || allFacets[key].length === 0;
                const displayTitle = this._formatKeyLabel(key);

                const itemDiv = document.createElement('div');
                itemDiv.className = 'manage-categories-item';
                itemDiv.dataset.searchText = `${displayTitle} ${key} ${catName}`;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = !isHidden;
                checkbox.dataset.key = key;
                checkbox.onchange = () => this._syncManageCategoryGroupCheckboxes();

                const label = document.createElement('label');
                label.textContent = displayTitle;
                label.style.flex = '1';
                label.style.cursor = 'pointer';

                const baseKey = key.split('.').pop();
                const type = this.metadataTypes[key] || this.metadataTypes[baseKey];
                const projCount = (this._keyProjectCounts && this._keyProjectCounts[key]) || 0;
                const valCount = allFacets[key] ? allFacets[key].length : 0;

                const metaBadges = [];
                if (type) metaBadges.push(type);
                if (projCount > 0) metaBadges.push(`${projCount} proj`);
                if (valCount > 0) metaBadges.push(`${valCount} val`);
                if (metaBadges.length > 0) {
                    label.innerHTML += ` <span style="color:#9ca3af; font-size:0.8em; font-style:italic; margin-left:6px;">(${metaBadges.join(' · ')})</span>`;
                }

                if (isMissing) {
                    label.innerHTML += ' <span style="color:#ef4444; font-size:0.8em; font-style:italic; margin-left:6px;">(Not in current view)</span>';
                }

                itemDiv.onclick = (e) => {
                    if (e.target !== checkbox) {
                        checkbox.checked = !checkbox.checked;
                        this._syncManageCategoryGroupCheckboxes();
                    }
                };

                itemDiv.appendChild(checkbox);
                itemDiv.appendChild(label);
                groupWrapper.appendChild(itemDiv);
            });

            listContainer.appendChild(groupWrapper);
        });

        this._syncManageCategoryGroupCheckboxes();
        modal.style.display = 'flex';
    },

    closeManageCategoriesModal() {
        const modal = document.getElementById('facetManageCategoriesModal');
        if (modal) modal.style.display = 'none';
    },

    handleManageCategoriesOverlayClick(e) {
        if (e.target.id === 'facetManageCategoriesModal') {
            this.closeManageCategoriesModal();
        }
    },

    async saveManageCategories() {
        const listContainer = document.getElementById('facetManageCategoriesList');
        if (!listContainer) return;

        const checkboxes = listContainer.querySelectorAll('input[type="checkbox"][data-key]');
        const newHiddenKeys = [];

        checkboxes.forEach(cb => {
            if (!cb.checked && cb.dataset.key) {
                newHiddenKeys.push(cb.dataset.key);
            }
        });

        this.hiddenKeys = newHiddenKeys;
        await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));

        this.closeManageCategoriesModal();
        this.updateUI();
    },

    // ─── Data Flow ────────────────────────────────────────────────────────

    _contextMenuListener: function (e) {
        if (!e.target.closest('.facet-context-menu')) {
            if (window.facetSearch) window.facetSearch.closeContextMenu();
        }
    },

    // ─── Tabulator helpers ────────────────────────────────────────────────

    // Convert a metadata key like "Sample.Laser_Line" → safe Tabulator field name
    _keyToField(key) {
        return 'meta__' + key.replace(/[^a-zA-Z0-9]/g, '_');
    },

    // Extract integration URLs from a project object (searches multiple locations)
    _extractUrls(project) {
        let omeroUrl = '';
        let elabUrl = '';

        // Primary source: integrations object
        if (project.integrations) {
            const o = project.integrations.omero || project.integrations.OMERO || {};
            omeroUrl = o.url || o.link || o.webUrl || '';

            const e = project.integrations.elabftw || project.integrations.elabFTW || {};
            elabUrl = e.url || e.link || '';
        }

        // Fallback: scan flatMeta for http links containing 'omero'
        if (!omeroUrl && project.flatMeta) {
            for (const k in project.flatMeta) {
                const v = project.flatMeta[k];
                if (typeof v === 'string' && v.startsWith('http') && k.toLowerCase().includes('omero')) {
                    omeroUrl = v;
                    break;
                }
            }
        }

        return { omeroUrl, elabUrl };
    },

    // Build row objects for Tabulator from a results array.
    // When file sidecars are present, project rows get a `_children` array
    // so Tabulator's dataTree can render them as expandable parent rows.
    _buildTableData(results) {
        const self = this;

        const buildRow = (item, type) => {
            const { omeroUrl, elabUrl } = type === 'project'
                ? self._extractUrls(item)
                : { omeroUrl: '', elabUrl: '' };

            const row = {
                _path: item.path || item.sidecarPath || '',
                _sidecarPath: item.sidecarPath || '',
                _parentProjectPath: item._parentProjectPath || '',
                _sidecarId: item.id || '',
                _type: type,
                name: item.name || (type === 'project' ? 'Unknown Project' : 'Unknown File'),
                path: item.path || item.sidecarPath || '',
                created: item.created || (item.file && item.file.modified) || item.generated_at || null,
                omero_url: omeroUrl,
                elab_url: elabUrl,
            };

            // All metadata keys → safe field names
            self.allAvailableKeys.forEach(key => {
                const val = item.flatMeta ? item.flatMeta[key] : undefined;
                if (val === undefined || val === null) {
                    row[self._keyToField(key)] = '';
                } else if (Array.isArray(val)) {
                    row[self._keyToField(key)] = val.join('; ');
                } else {
                    row[self._keyToField(key)] = String(val);
                }
            });

            return row;
        };

        return results.map(project => {
            const row = buildRow(project, 'project');

            // Build child rows from file sidecars
            const children = project._filteredSidecarChildren || project._sidecarChildren || [];
            if (children.length > 0) {
                row._children = children.map(sc => buildRow(sc, 'file_sidecar'));
            }

            return row;
        });
    },

    // Return the active ordered list of movable columns ('path', 'created', and visible metadata keys)
    _getEffectiveColumnOrder() {
        const validVisibleMeta = this.visibleColumns.filter(k => this.allAvailableKeys.includes(k));
        const baseItems = ['path', 'created', ...validVisibleMeta];
        const baseSet = new Set(baseItems);

        const ordered = [];
        const seen = new Set();

        if (Array.isArray(this._customColumnOrder)) {
            this._customColumnOrder.forEach(item => {
                if (baseSet.has(item) && !seen.has(item)) {
                    ordered.push(item);
                    seen.add(item);
                }
            });
        }

        baseItems.forEach(item => {
            if (!seen.has(item)) {
                ordered.push(item);
                seen.add(item);
            }
        });

        return ordered;
    },

    _getSessionStorageKey() {
        const user = window.userManager?.currentUser || 'default';
        return this.isTemplateHub
            ? `metafold_facet_hub_table_state_${user}`
            : `metafold_facet_table_state_${user}`;
    },

    _saveSessionTableState() {
        try {
            const state = {
                visibleColumns: [...this.visibleColumns],
                columnOrder: this._getEffectiveColumnOrder(),
                columnWidths: { ...(this._customColumnWidths || {}) },
                columnSorters: [...(this._customColumnSorters || [])],
                activeLayoutName: this.activeLayoutName || null,
                updatedAt: new Date().toISOString()
            };
            const jsonStr = JSON.stringify(state);
            localStorage.setItem(this._getSessionStorageKey(), jsonStr);
            if (!this.isTemplateHub && window.settingsManager && typeof window.settingsManager.set === 'function') {
                window.settingsManager.set('facetSearch.sessionTableState', jsonStr);
            }
        } catch (e) {
            console.warn('Could not save facet table session state:', e);
        }
    },

    async _restoreSessionTableState(defaultTopColumns = []) {
        try {
            let raw = localStorage.getItem(this._getSessionStorageKey());
            if (!raw && !this.isTemplateHub && window.settingsManager && typeof window.settingsManager.get === 'function') {
                raw = await window.settingsManager.get('facetSearch.sessionTableState');
            }
            if (!raw) {
                this.visibleColumns = [...defaultTopColumns];
                this._customColumnOrder = ['path', 'created', ...this.visibleColumns];
                return;
            }
            const state = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (!state || typeof state !== 'object') {
                this.visibleColumns = [...defaultTopColumns];
                this._customColumnOrder = ['path', 'created', ...this.visibleColumns];
                return;
            }

            if (state.columnWidths && typeof state.columnWidths === 'object') {
                this._customColumnWidths = { ...state.columnWidths };
            }
            if (Array.isArray(state.columnSorters)) {
                this._customColumnSorters = [...state.columnSorters];
            }
            if (state.activeLayoutName !== undefined) {
                this.activeLayoutName = state.activeLayoutName || null;
                const btnLabel = document.getElementById('layoutSelectorBtnLabel');
                if (btnLabel) {
                    btnLabel.textContent = this.activeLayoutName ? `Layout: ${this.activeLayoutName}` : 'Save / Load Layout';
                }
            }

            if (Array.isArray(state.visibleColumns)) {
                if (state.visibleColumns.length === 0) {
                    this.visibleColumns = [];
                } else {
                    const matched = state.visibleColumns.filter(k => this.allAvailableKeys.includes(k));
                    this.visibleColumns = matched.length > 0 ? matched : [...defaultTopColumns];
                }
            } else {
                this.visibleColumns = [...defaultTopColumns];
            }

            if (Array.isArray(state.columnOrder) && state.columnOrder.length > 0) {
                this._customColumnOrder = [...state.columnOrder];
            } else {
                this._customColumnOrder = ['path', 'created', ...this.visibleColumns];
            }
        } catch (e) {
            console.warn('Could not restore facet table session state:', e);
            this.visibleColumns = [...defaultTopColumns];
            this._customColumnOrder = ['path', 'created', ...this.visibleColumns];
        }
    },

    _syncColumnStateFromTabulator(saveSession = true, resizedColumn = null) {
        if (!this.tabulatorInstance) return;
        try {
            const fieldToKey = {};
            this.allAvailableKeys.forEach(k => { fieldToKey[this._keyToField(k)] = k; });

            if (resizedColumn && typeof resizedColumn.getField === 'function') {
                const resizedField = resizedColumn.getField();
                const resizedWidth = typeof resizedColumn.getWidth === 'function' ? resizedColumn.getWidth() : null;
                if (resizedField && resizedWidth && resizedWidth > 0) {
                    const metaKey = fieldToKey[resizedField];
                    if (metaKey) {
                        this._customColumnWidths[metaKey] = Math.round(resizedWidth);
                    } else if (['name', 'path', 'created'].includes(resizedField)) {
                        this._customColumnWidths[resizedField] = Math.round(resizedWidth);
                    }
                }
            }

            const cols = this.tabulatorInstance.getColumns();
            const newOrder = [];
            const newVisibleMeta = [];

            cols.forEach(col => {
                const field = typeof col.getField === 'function' ? col.getField() : null;
                if (!field || field === 'name' || field === '_actions' || field === 'omero_url' || field === 'elab_url') return;
                const isVis = typeof col.isVisible === 'function' ? col.isVisible() : true;
                if (!isVis) return;

                if (field === 'path' || field === 'created') {
                    newOrder.push(field);
                    return;
                }
                const metaKey = fieldToKey[field];
                if (metaKey) {
                    newOrder.push(metaKey);
                    newVisibleMeta.push(metaKey);
                }
            });

            if (newOrder.length > 0) {
                this._customColumnOrder = newOrder;
            }
            if (newVisibleMeta.length > 0 || this.visibleColumns.length === 0) {
                this.visibleColumns = newVisibleMeta;
            }

            if (typeof this.tabulatorInstance.getSorters === 'function') {
                const sorters = this.tabulatorInstance.getSorters() || [];
                this._customColumnSorters = sorters.map(s => ({ column: s.field || s.column, dir: s.dir })).filter(s => s.column);
            }

            if (saveSession) {
                this._saveSessionTableState();
            }
        } catch (e) {
            console.warn('Could not sync column state from Tabulator:', e);
        }
    },

    // Build Tabulator column definitions
    _buildColumns() {
        const self = this;
        const customWidths = this._customColumnWidths || {};

        const cols = [
            {
                title: 'Name',
                field: 'name',
                minWidth: 200,
                ...(customWidths.name ? { width: customWidths.name } : {}),
                sorter: 'string',
                frozen: true,
                formatter: (cell) => {
                    const row = cell.getRow().getData();
                    const type = row._type || 'project';
                    const icon = type === 'file_sidecar' ? '📄' : '📁';
                    const label = cell.getValue() || '';
                    if (type === 'file_sidecar') {
                        return `<span style="color:#9ca3af;">${icon} ${label}</span>`;
                    }
                    return `<strong>${icon} ${label}</strong>`;
                },
            }
        ];

        const movableDefs = {
            path: {
                title: 'Path',
                field: 'path',
                minWidth: 220,
                ...(customWidths.path ? { width: customWidths.path } : {}),
                sorter: 'string',
                formatter: (cell) => {
                    const v = cell.getValue() || '';
                    return `<span title="${v}" style="font-size:0.8rem;font-family:monospace;color:#9ca3af;">${v}</span>`;
                },
            },
            created: {
                title: 'Created',
                field: 'created',
                width: customWidths.created || 105,
                sorter: 'alphanum',
                formatter: (cell) => {
                    const v = cell.getValue();
                    return v ? new Date(v).toLocaleDateString() : '—';
                },
                // For CSV: export the formatted date string
                accessorDownload: (val) => val ? new Date(val).toLocaleDateString() : '',
            }
        };

        this.allAvailableKeys.forEach(key => {
            const title = this._formatKeyLabel(key);
            const baseKey = key.split('.').pop();
            const fieldType = this.metadataTypes[key] || this.metadataTypes[baseKey] || '';
            const lowerKey = key.toLowerCase();
            const normKey = lowerKey.replace(/[\s_-]+/g, '');
            const isDerivedCol = fieldType === 'derived_from' || lowerKey === 'derived_from' || lowerKey.includes('derived_from') || normKey === 'derivedfrom';
            const isRelatedCol = fieldType === 'related_to' || lowerKey === 'related_to' || lowerKey.includes('related_to') || normKey === 'relatedto' || lowerKey.includes('related_project');
            const isTagsCol = !isDerivedCol && !isRelatedCol && (fieldType === 'tags' || /(?:^|[_\s.-])(tags?|keywords?)(?:$|[_\s.-])/i.test(key));
            const isIdAnchorCol = fieldType === 'id_anchor' || lowerKey === 'id_anchor';

            movableDefs[key] = {
                title,
                field: this._keyToField(key),
                visible: this.visibleColumns.includes(key),
                minWidth: 120,
                ...(customWidths[key] ? { width: customWidths[key] } : {}),
                sorter: 'string',
                formatter: (cell) => {
                    const rawVal = cell.getValue();
                    const displayStr = window.formatDisplayValue
                        ? window.formatDisplayValue(rawVal, { emptyPlaceholder: '—' })
                        : (rawVal === undefined || rawVal === null || rawVal === '' ? '—' : (typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal)));
                    if (!displayStr || displayStr === '—') return '—';

                    const esc = (window.markdownLite && window.markdownLite.escapeHtml) || (s => String(s || ''));
                    const escAttr = (window.markdownLite && window.markdownLite.escapeAttr) || (s => String(s || '').replace(/"/g, '&quot;'));
                    const rowData = cell.getRow ? cell.getRow().getData() : null;
                    const currentRowPath = rowData ? (rowData._path || rowData.path || '') : '';

                    if (isDerivedCol || isRelatedCol) {
                        const tokens = displayStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                        if (tokens.length === 0) return '—';
                        return tokens.map(part => {
                            const refName = part.replace(/\s*\([^)]*\)\s*$/, '').trim();
                            const linkedProj = self._resolveProjectByRef(refName);
                            const chipClass = isDerivedCol ? 'is-derived' : 'is-related';
                            const icon = linkedProj ? '📁' : (isDerivedCol ? '⚓' : '🔀');
                            const labelText = (linkedProj && linkedProj.name) ? linkedProj.name : part;
                            const tip = linkedProj
                                ? `Open linked project: ${linkedProj.name} (${refName})`
                                : `Filter table by '${refName}'`;
                            return `<a href="#" class="facet-cell-link-chip ${chipClass}" data-mf-ref="${escAttr(refName)}" data-mf-path="${linkedProj ? escAttr(linkedProj.path) : ''}" title="${escAttr(tip)}">${icon} ${esc(labelText)}</a>`;
                        }).join(' ');
                    }

                    if (isTagsCol) {
                        const tags = displayStr.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                        if (tags.length === 0) return '—';
                        return tags.map(part => {
                            const tagClean = part.replace(/^#+/, '').trim();
                            if (!tagClean) return '';
                            return `<a href="#" class="facet-cell-tag-chip" data-mf-tag="${escAttr(tagClean)}" title="Filter table by tag '${escAttr(tagClean)}'">🏷️ ${esc(tagClean)}</a>`;
                        }).filter(Boolean).join(' ');
                    }

                    if (isIdAnchorCol) {
                        return `<a href="#" class="facet-cell-id-chip" data-mf-id="${escAttr(displayStr)}" title="Filter table by ID '${escAttr(displayStr)}'">⚓ ${esc(displayStr)}</a>`;
                    }

                    if (window.markdownLite && window.markdownLite.renderInline && /(\[\[|https?:\/\/|\\\\|[A-Za-z]:\\|(?:^|[\s(])#[A-Za-z0-9\u00C0-\u024F])/.test(displayStr)) {
                        return window.markdownLite.renderInline(displayStr);
                    }

                    const matchedProj = self._resolveProjectByRef(displayStr);
                    if (matchedProj && matchedProj.path && matchedProj.path !== currentRowPath) {
                        const displayLabel = matchedProj.name || displayStr;
                        return `<a href="#" class="facet-cell-link-chip is-related" data-mf-ref="${escAttr(displayStr)}" data-mf-path="${escAttr(matchedProj.path)}" title="Open project: ${escAttr(matchedProj.name)} (${escAttr(displayStr)})">📁 ${esc(displayLabel)} ↗</a>`;
                    }

                    return esc(displayStr);
                },
                cellClick: (e) => {
                    const target = e.target && e.target.closest ? e.target.closest('.facet-cell-link-chip, .facet-cell-tag-chip, .facet-cell-id-chip, .mf-md-mention, .mf-md-tag, .mf-md-link, .mf-md-path') : null;
                    if (!target) return;
                    e.preventDefault();
                    e.stopPropagation();

                    if (target.classList.contains('facet-cell-link-chip')) {
                        const targetPath = target.dataset.mfPath;
                        const refName = target.dataset.mfRef;
                        if (targetPath) {
                            self.selectAndInspectProjectByPath(targetPath);
                        } else if (refName) {
                            const found = self._resolveProjectByRef(refName);
                            if (found && found.path) self.selectAndInspectProjectByPath(found.path);
                            else self.filterByLineageId(refName);
                        }
                        return;
                    }
                    if (target.classList.contains('facet-cell-tag-chip') || target.classList.contains('mf-md-tag')) {
                        const tag = target.dataset.mfTag;
                        if (tag) self.filterByLineageId(tag);
                        return;
                    }
                    if (target.classList.contains('facet-cell-id-chip')) {
                        const idVal = target.dataset.mfId;
                        if (idVal) self.filterByLineageId(idVal);
                        return;
                    }
                    if (target.classList.contains('mf-md-mention')) {
                        const targetName = target.dataset.mfProject;
                        if (targetName) {
                            const found = self._resolveProjectByRef(targetName);
                            if (found && found.path) self.selectAndInspectProjectByPath(found.path);
                            else self.filterByLineageId(targetName);
                        }
                        return;
                    }
                    if (target.classList.contains('mf-md-path')) {
                        const p = target.dataset.mfPath;
                        if (p && window.electronAPI?.showItemInFolder) window.electronAPI.showItemInFolder(p);
                        else if (p && window.electronAPI?.openFolder) window.electronAPI.openFolder(p);
                        return;
                    }
                    if (target.classList.contains('mf-md-link')) {
                        const u = target.dataset.mfUrl;
                        if (u) {
                            if (window.electronAPI?.openExternal) window.electronAPI.openExternal(u);
                            else window.open(u, '_blank');
                        }
                    }
                },
                accessorDownload: (val) => {
                    if (window.formatDisplayValue) {
                        return window.formatDisplayValue(val, { emptyPlaceholder: '' });
                    }
                    return val !== undefined && val !== null ? String(val) : '';
                }
            };
        });

        // 1. Add visible movable columns in the user's exact saved order
        const effectiveOrder = this._getEffectiveColumnOrder();
        const addedKeys = new Set();
        effectiveOrder.forEach(colKey => {
            if (movableDefs[colKey] && !addedKeys.has(colKey)) {
                cols.push(movableDefs[colKey]);
                addedKeys.add(colKey);
            }
        });

        // 2. Append remaining hidden metadata columns so they can be toggled cleanly
        this.allAvailableKeys.forEach(key => {
            if (!addedKeys.has(key) && movableDefs[key]) {
                cols.push(movableDefs[key]);
                addedKeys.add(key);
            }
        });

        // Hidden URL columns – visible: false but download: true → appear only in CSV
        cols.push({
            title: 'OMERO Link',
            field: 'omero_url',
            visible: false,
            download: true,
        });
        cols.push({
            title: 'elabFTW Link',
            field: 'elab_url',
            visible: false,
            download: true,
        });

        // Actions column – shown in table, excluded from CSV (clicking any row opens details on the right)
        cols.push({
            title: 'Actions',
            field: '_actions',
            download: false,
            headerSort: false,
            width: 118,
            formatter: (cell) => {
                const row = cell.getRow().getData();
                const path = (row.path || '').replace(/"/g, '&quot;');
                const sidecarPath = (row._sidecarPath || '').replace(/"/g, '&quot;');
                let html = ``;
                if (window.facetSearch.isTemplateHub) {
                    html += `<button class="btn btn-small facet-act-install" data-path="${path}" style="background:#7c3aed; color:white; border:none; border-radius:4px; padding:4px 8px; font-size:0.75rem; cursor:pointer;" title="Install Template">📥 Install</button>`;
                } else if (row._type === 'file_sidecar') {
                    const targetFile = path || sidecarPath;
                    html += `<button class="btn btn-small facet-act-show-file" data-path="${targetFile}" title="Show file in Explorer">📁</button>`;
                    if (sidecarPath) {
                        html += ` <button class="btn btn-small facet-act-open-sidecar" data-sidecar-path="${sidecarPath}" title="Open Sidecar JSON (${sidecarPath})">📄</button>`;
                    }
                } else {
                    html += `<button class="btn btn-small facet-act-open" data-path="${path}" title="Open Project Folder">📁</button>`;
                    html += ` <button class="btn btn-small facet-act-add-note" data-path="${path}" title="Add Note / Observation">➕</button>`;
                }
                if (row.omero_url) {
                    const u = row.omero_url.replace(/"/g, '&quot;');
                    html += ` <a class="integration-icon-link facet-act-link" href="#" data-url="${u}" title="Open in OMERO">🔵</a>`;
                }
                if (row.elab_url) {
                    const u = row.elab_url.replace(/"/g, '&quot;');
                    html += ` <a class="integration-icon-link facet-act-link" href="#" data-url="${u}" title="Open in eLabFTW">🟢</a>`;
                }
                return html;
            },
            cellClick: (e, cell) => {
                const target = e.target.closest('.facet-act-open, .facet-act-add-note, .facet-act-show-file, .facet-act-open-sidecar, .facet-act-link, .facet-act-install');
                if (!target) return;
                e.preventDefault();
                e.stopPropagation();

                if (target.classList.contains('facet-act-add-note')) {
                    const p = target.dataset.path;
                    const proj = this.masterData.find(m => m.path === p);
                    if (proj && window.noteComposer) {
                        window.noteComposer.open(proj);
                    }
                    return;
                }

                if (target.classList.contains('facet-act-install')) {
                    const repoPath = target.dataset.path;
                    if (repoPath && window.app?.downloadAndInstallTemplate) {
                        window.app.downloadAndInstallTemplate(repoPath);
                    }
                    return;
                }

                if (target.classList.contains('facet-act-show-file')) {
                    const p = target.dataset.path;
                    if (p) {
                        if (window.electronAPI?.showItemInFolder) {
                            window.electronAPI.showItemInFolder(p);
                        } else if (window.electronAPI?.openFolder) {
                            window.electronAPI.openFolder(p);
                        }
                    }
                    return;
                }

                if (target.classList.contains('facet-act-open-sidecar')) {
                    const sp = target.dataset.sidecarPath;
                    if (sp) {
                        if (window.electronAPI?.openFile) {
                            window.electronAPI.openFile(sp);
                        } else if (window.electronAPI?.showItemInFolder) {
                            window.electronAPI.showItemInFolder(sp);
                        }
                    }
                    return;
                }

                if (target.classList.contains('facet-act-open')) {
                    const p = target.dataset.path;
                    if (p && window.electronAPI?.openFolder) window.electronAPI.openFolder(p);
                } else {
                    const url = target.dataset.url;
                    if (url) {
                        if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                        else window.open(url, '_blank');
                    }
                }
            },
        });

        return cols;
    },

    // ─── Render results via Tabulator ────────────────────────────────────

    renderResults(results) {
        // Count total items (projects + visible sidecar children)
        const sidecarCount = results.reduce((sum, p) => {
            const children = p._filteredSidecarChildren || p._sidecarChildren || [];
            return sum + children.length;
        }, 0);
        const countLabel = sidecarCount > 0
            ? `${results.length} Project${results.length !== 1 ? 's' : ''} · ${sidecarCount} File${sidecarCount !== 1 ? 's' : ''}`
            : `${results.length} Project${results.length !== 1 ? 's' : ''}`;
        document.getElementById('facetResultsCount').textContent = countLabel;

        const container = document.getElementById('facetResultsContainer');
        container.className = 'facet-results-table-container';

        const data = this._buildTableData(results);

        // Always sync column state before destroying and recreating the Tabulator instance.
        if (this.tabulatorInstance) {
            this._syncColumnStateFromTabulator(false, null);
            this.tabulatorInstance.destroy();
            this.tabulatorInstance = null;
        }

        container.innerHTML = '';

        // Build Tabulator options — enable dataTree when sidecars are present
        const isMasterEmpty = !this.masterData || this.masterData.length === 0;
        const emptyPlaceholder = this.isTemplateHub
            ? '<div style="color:#9ca3af;padding:40px;text-align:center;">No templates match the selected filters.</div>'
            : isMasterEmpty
                ? '<div style="color:#cbd5e1;padding:60px 24px;text-align:center;max-width:560px;margin:0 auto;">' +
                '<div style="font-size:3rem;margin-bottom:14px;filter:drop-shadow(0 4px 12px rgba(168,85,247,0.35));">🔍</div>' +
                '<div style="font-size:1.25rem;font-weight:600;color:#f1f5f9;margin-bottom:8px;">Scan project folders to start</div>' +
                '<div style="font-size:0.9rem;color:#94a3b8;line-height:1.5;margin-bottom:24px;">' +
                'No indexed projects found yet. Scan any directory on your computer or storage drive to discover, analyze, and index your MetaFold experiments.' +
                '</div>' +
                '<div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">' +
                '<button type="button" class="btn btn-primary" onclick="facetSearch.scanFolderFromSearch()" style="padding:0.6rem 1.4rem;font-size:0.9rem;font-weight:600;display:inline-flex;align-items:center;gap:8px;box-shadow:0 4px 14px rgba(168,85,247,0.4);cursor:pointer;">' +
                '📁 Scan Project Folder' +
                '</button>' +
                '<button type="button" class="btn btn-secondary" onclick="facetSearch.loadSummaryFile()" style="padding:0.6rem 1.2rem;font-size:0.9rem;display:inline-flex;align-items:center;gap:8px;cursor:pointer;">' +
                '📂 Open Summary JSON' +
                '</button>' +
                '</div>' +
                '</div>'
                : '<div style="color:#9ca3af;padding:50px 20px;text-align:center;">' +
                '<div style="font-size:2.2rem;margin-bottom:10px;">📁</div>' +
                '<div style="font-size:1.05rem;color:#e2d9f3;margin-bottom:6px;font-weight:600;">No projects match current filters</div>' +
                '<div style="font-size:0.85rem;margin-bottom:16px;color:#94a3b8;">Try clearing search filters or scan another folder to add more projects.</div>' +
                '<button type="button" class="btn btn-secondary btn-small" onclick="facetSearch.resetFilters()" style="cursor:pointer;">Clear Filters</button>' +
                '</div>';

        const tabulatorOptions = {
            data,
            columns: this._buildColumns(),
            layout: 'fitColumns',
            rowHeight: 38,
            placeholder: emptyPlaceholder,
            movableColumns: true,
            resizableColumns: 'header',
            columnHeaderSortMulti: true,
            ...(Array.isArray(this._customColumnSorters) && this._customColumnSorters.length > 0
                ? { initialSort: this._customColumnSorters }
                : {}),
            downloadConfig: {
                columnHeaders: true,
            },
            selectableRows: 1,
        };

        // Enable tree mode when file sidecars exist (start expanded so microscopy files are immediately visible)
        if (this._hasFileSidecars) {
            tabulatorOptions.dataTree = true;
            tabulatorOptions.dataTreeStartExpanded = true;
            tabulatorOptions.dataTreeChildField = '_children';
            tabulatorOptions.dataTreeElementColumn = 'name';
        }

        this.tabulatorInstance = new Tabulator(container, tabulatorOptions);

        // Tabulator 6.x requires registering event listeners via .on()
        this.tabulatorInstance.on('rowClick', (e, row) => {
            if (e.target && e.target.closest('.facet-act-open, .facet-act-add-note, .facet-act-show-file, .facet-act-open-sidecar, .facet-act-link, .facet-act-install, .tabulator-data-tree-control, .facet-cell-link-chip, .facet-cell-tag-chip, .facet-cell-id-chip, .mf-md-mention, .mf-md-tag, .mf-md-link, .mf-md-path')) {
                return;
            }
            this._activateRow(row, false);
        });

        this.tabulatorInstance.on('columnResized', (column) => {
            this._syncColumnStateFromTabulator(true, column);
        });

        this.tabulatorInstance.on('columnMoved', () => {
            this._syncColumnStateFromTabulator(true, null);
            const colDropdown = document.getElementById('columnSelectorDropdown');
            if (colDropdown && colDropdown.style.display !== 'none') {
                this.renderColumnSelector();
            }
        });

        this.tabulatorInstance.on('headerContext', (e, column) => {
            e.preventDefault();
            e.stopPropagation();
            this.showColumnContextMenu(e.pageX, e.pageY, column);
        });

        this.tabulatorInstance.on('dataSorted', (sorters) => {
            if (Array.isArray(sorters)) {
                this._customColumnSorters = sorters.map(s => ({ column: s.field || s.column, dir: s.dir })).filter(s => s.column);
                this._saveSessionTableState();
            }
        });

        // Re-select previously active row when table rebuilds (e.g. after toggling a filter)
        this.tabulatorInstance.on('tableBuilt', () => {
            if (!this.selectedProjectPath) return;
            const rows = this._getNavigableRows();
            const match = this._findCurrentSelectedRow(rows);
            if (match && typeof match.select === 'function') {
                match.select();
            }
        });
    },

    // Return all currently visible/navigable Tabulator rows in visual display order
    // (including expanded file-sidecar child rows in tree mode)
    _getNavigableRows() {
        if (!this.tabulatorInstance) return [];
        let topRows = [];
        try {
            topRows = this.tabulatorInstance.getRows('active');
            if (!Array.isArray(topRows) || topRows.length === 0) {
                topRows = this.tabulatorInstance.getRows() || [];
            }
        } catch (err) {
            topRows = [];
        }

        const flatRows = [];
        const collectRow = (row) => {
            if (!row) return;
            flatRows.push(row);
            if (this._hasFileSidecars && typeof row.isTreeExpanded === 'function' && row.isTreeExpanded()) {
                const children = typeof row.getTreeChildren === 'function' ? row.getTreeChildren() : [];
                if (Array.isArray(children)) {
                    children.forEach(collectRow);
                }
            }
        };
        topRows.forEach(collectRow);
        return flatRows;
    },

    // Find currently selected row component (by Tabulator selection state or stored selectedProjectPath)
    _findCurrentSelectedRow(rows = null) {
        const list = Array.isArray(rows) ? rows : this._getNavigableRows();
        if (list.length === 0) return null;

        const byTabulator = list.find(r => typeof r.isSelected === 'function' && r.isSelected());
        if (byTabulator) return byTabulator;

        if (this.selectedProjectPath) {
            return list.find(r => {
                const d = typeof r.getData === 'function' ? r.getData() : null;
                return d && (d._path === this.selectedProjectPath || d.path === this.selectedProjectPath);
            }) || null;
        }
        return null;
    },

    // Select a row, optionally scroll it into view, and display its metadata/details in the right panel
    _activateRow(row, shouldScroll = false) {
        if (!row) return;

        if (window.projectInlineEditor && typeof window.projectInlineEditor.confirmDiscardIfNeeded === 'function') {
            if (!window.projectInlineEditor.confirmDiscardIfNeeded()) {
                return;
            }
            window.projectInlineEditor.isEditing = false;
            window.projectInlineEditor.isDirty = false;
        }
        const table = typeof row.getTable === 'function' ? row.getTable() : this.tabulatorInstance;
        if (table && typeof table.deselectRow === 'function') {
            table.deselectRow();
        }
        if (typeof row.select === 'function') {
            row.select();
        }

        if (shouldScroll) {
            try {
                const el = typeof row.getElement === 'function' ? row.getElement() : null;
                if (el && el.offsetParent !== null && typeof el.scrollIntoView === 'function') {
                    el.scrollIntoView({ block: 'nearest' });
                } else if (typeof row.scrollTo === 'function') {
                    row.scrollTo();
                }
            } catch (e) { }
        }

        const rowData = typeof row.getData === 'function' ? row.getData() : null;
        if (!rowData) return;

        if (this.isTemplateHub) {
            this.showTemplatePreview(rowData);
        } else {
            this.showProjectDetails(rowData);
        }
    },

    // Step through visible table rows using Up (-1) or Down (+1) arrow keys
    navigateTableByArrow(delta, event = null) {
        const rows = this._getNavigableRows();
        if (rows.length === 0) return;

        if (event && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }

        const currentRow = this._findCurrentSelectedRow(rows);
        const currentIndex = currentRow ? rows.indexOf(currentRow) : -1;

        let nextIndex;
        if (currentIndex === -1) {
            nextIndex = delta > 0 ? 0 : rows.length - 1;
        } else {
            nextIndex = Math.max(0, Math.min(rows.length - 1, currentIndex + delta));
        }

        const targetRow = rows[nextIndex];
        if (targetRow) {
            this._activateRow(targetRow, true);
        }
    },

    // Column Selector functions
    toggleColumnSelector() {
        const dropdown = document.getElementById('columnSelectorDropdown');
        if (!dropdown) return;
        const isOpen = dropdown.style.display !== 'none';
        dropdown.style.display = isOpen ? 'none' : 'block';
    },

    // Export current filtered view as CSV via Tabulator's built-in downloader or native save dialog
    async exportCsv() {
        if (!this.tabulatorInstance) {
            alert('No data loaded. Please load a summary file first.');
            return;
        }
        const timestamp = new Date().toISOString().slice(0, 10);
        const defaultFilename = `metafold-export-${timestamp}.csv`;

        // If Electron save dialog is available, prompt user for save destination
        if (window.electronAPI && typeof window.electronAPI.showSaveDialog === 'function' && typeof window.electronAPI.writeFile === 'function') {
            try {
                const savePath = await window.electronAPI.showSaveDialog({
                    title: 'Export Filtered Projects as CSV',
                    defaultPath: defaultFilename,
                    filters: [
                        { name: 'CSV Files', extensions: ['csv'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (!savePath) {
                    console.log('CSV export cancelled by user.');
                    return;
                }

                // Intercept Tabulator download to write directly via Electron
                // Note: Tabulator 6 download signature is (type, filename, options, range, interceptCallback)
                this.tabulatorInstance.download('csv', defaultFilename, { bom: true }, 'active', async (fileContents) => {
                    try {
                        let textContent = fileContents;
                        if (typeof textContent !== 'string' && fileContents && typeof fileContents.text === 'function') {
                            textContent = await fileContents.text();
                        } else if (typeof textContent !== 'string' && fileContents instanceof ArrayBuffer) {
                            textContent = new TextDecoder().decode(fileContents);
                        }
                        if (typeof textContent === 'string' && !textContent.startsWith('\uFEFF')) {
                            textContent = '\uFEFF' + textContent;
                        }

                        const writeResult = await window.electronAPI.writeFile(savePath, textContent);
                        if (writeResult && writeResult.success) {
                            const targetFolder = savePath.replace(/[\\/][^\\/]+$/, '');
                            const fileName = savePath.split(/[\\/]/).pop();
                            const rowCount = (typeof this.tabulatorInstance.getDataCount === 'function') ?
                                this.tabulatorInstance.getDataCount('active') :
                                (this.filteredProjects || []).length;

                            if (typeof window.showExportSuccessModal === 'function') {
                                window.showExportSuccessModal({
                                    title: 'CSV Export Completed',
                                    message: 'Filtered project table exported to CSV successfully.',
                                    folderPath: targetFolder,
                                    files: [
                                        { name: fileName, path: savePath, icon: '📥', label: 'CSV Spreadsheet' }
                                    ],
                                    stats: {
                                        'Exported Rows': rowCount,
                                        'Visible Columns': (this.visibleColumns || []).length
                                    }
                                });
                            }
                        } else {
                            alert('Failed to save CSV file: ' + (writeResult?.message || 'Unknown error'));
                        }
                    } catch (writeErr) {
                        console.error('Error saving CSV:', writeErr);
                        alert('Error saving CSV: ' + writeErr.message);
                    }
                });
                return;
            } catch (err) {
                console.error('Error in native CSV export dialog:', err);
                // Fall back to default tabulator browser download below
            }
        }

        // Fallback for browser mode: bom: true → UTF-8 BOM so Excel opens umlauts correctly
        this.tabulatorInstance.download('csv', defaultFilename, { bom: true });
    },

    // Toggle a metadata column visibility in the Tabulator instance
    toggleColumn(key) {
        const index = this.visibleColumns.indexOf(key);
        if (index > -1) {
            this.visibleColumns.splice(index, 1);
            const orderIdx = (this._customColumnOrder || []).indexOf(key);
            if (orderIdx > -1) {
                this._customColumnOrder.splice(orderIdx, 1);
            }
            if (this.tabulatorInstance) {
                this.tabulatorInstance.hideColumn(this._keyToField(key));
            }
        } else {
            this.visibleColumns.push(key);
            if (!Array.isArray(this._customColumnOrder) || this._customColumnOrder.length === 0) {
                this._customColumnOrder = this._getEffectiveColumnOrder();
            }
            if (!this._customColumnOrder.includes(key)) {
                this._customColumnOrder.push(key);
            }
            if (this.tabulatorInstance) {
                this.tabulatorInstance.showColumn(this._keyToField(key));
            }
        }
        this._saveSessionTableState();
        this.renderColumnSelector();
    },

    setTopColumns(count = 5) {
        const nextCols = count > 0 ? this.allAvailableKeys.slice(0, count) : [];
        this.visibleColumns = [...nextCols];
        const baseFixed = this.isTemplateHub ? [] : ['path', 'created'];
        this._customColumnOrder = [...baseFixed, ...this.visibleColumns];
        this._saveSessionTableState();
        this.renderResults(this.getFilteredData());
        this.renderColumnSelector();
    },

    resetColumnsAndWidths() {
        this._customColumnWidths = {};
        this._customColumnSorters = [];
        this.activeLayoutName = null;
        const btnLabel = document.getElementById('layoutSelectorBtnLabel');
        if (btnLabel) btnLabel.textContent = 'Save / Load Layout';
        const defaultCount = this.isTemplateHub ? 6 : 5;
        this.visibleColumns = this.allAvailableKeys.slice(0, defaultCount);
        const baseFixed = this.isTemplateHub ? [] : ['path', 'created'];
        this._customColumnOrder = [...baseFixed, ...this.visibleColumns];
        this._saveSessionTableState();
        this.renderColumnSelector();
        this.renderResults(this.getFilteredData());
    },

    filterColumnSelectorList(query) {
        const container = document.getElementById('columnSelectorDropdown');
        if (!container) return;
        const q = (query || '').trim().toLowerCase();

        container.querySelectorAll('.column-selector-group').forEach(group => {
            let visibleInGroup = 0;
            group.querySelectorAll('.column-selector-item').forEach(item => {
                const text = (item.dataset.searchText || '').toLowerCase();
                const matches = !q || text.includes(q);
                item.style.display = matches ? 'flex' : 'none';
                if (matches) visibleInGroup++;
            });
            group.style.display = visibleInGroup > 0 ? '' : 'none';
        });
    },

    renderColumnSelector() {
        const container = document.getElementById('columnSelectorDropdown');
        if (!container) return;

        const existingSearchInput = document.getElementById('facetColumnSearchInput');
        const currentSearchQuery = existingSearchInput ? existingSearchInput.value : '';

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(139, 92, 246, 0.3); padding-bottom: 6px;">
                <span style="font-weight: bold; font-size: 0.85rem;">📊 Table Columns (A–Z)</span>
                <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn btn-secondary" style="font-size: 0.7rem; padding: 2px 6px;" onclick="facetSearch.setTopColumns(5)" title="Show top 5 columns">Top 5</button>
                    <button type="button" class="btn btn-secondary" style="font-size: 0.7rem; padding: 2px 6px;" onclick="facetSearch.setTopColumns(0)" title="Hide all metadata columns">None</button>
                    <button type="button" class="btn btn-secondary" style="font-size: 0.7rem; padding: 2px 6px;" onclick="facetSearch.resetColumnsAndWidths()" title="Reset column widths, order, and selection to defaults">↺ Reset</button>
                </div>
            </div>
            <div style="margin-bottom: 8px;">
                <input type="text" id="facetColumnSearchInput" class="facet-text-search-input" style="padding: 5px 8px; font-size: 0.8rem;" placeholder="🔍 Search columns..." oninput="facetSearch.filterColumnSelectorList(this.value)">
            </div>
        `;

        const categoryGroups = {};
        this.allAvailableKeys.forEach(key => {
            const cat = this._getCategoryForKey(key);
            if (!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push(key);
        });

        const categoryOrder = [
            '🌐 Community Taxonomy',
            '🏷️ Metadata Fields',
            '📁 Project & ISA',
            '🔗 Integrations',
            '⚙️ System',
            '📄 File Properties',
            '🔬 OME Pixels',
            '🔬 OME Channels',
            '🔬 OME Channel',
            '🔬 OME Instrument',
            '🔬 OME Image',
            '🔬 OME Metadata'
        ];

        const sortedCategories = Object.keys(categoryGroups).sort((a, b) => {
            let idxA = categoryOrder.indexOf(a);
            let idxB = categoryOrder.indexOf(b);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        });

        const syncColumnGroupCheckboxes = () => {
            container.querySelectorAll('.column-selector-group').forEach(grp => {
                const headerCb = grp.querySelector('.column-category-group-checkbox');
                if (!headerCb) return;
                const visibleItems = Array.from(grp.querySelectorAll('.column-selector-item'))
                    .filter(item => item.style.display !== 'none');
                const itemCbs = visibleItems
                    .map(item => item.querySelector('input[type="checkbox"][data-col-key]'))
                    .filter(Boolean);
                if (itemCbs.length === 0) {
                    headerCb.checked = false;
                    headerCb.indeterminate = false;
                    return;
                }
                const checkedCount = itemCbs.filter(cb => cb.checked).length;
                headerCb.checked = checkedCount === itemCbs.length;
                headerCb.indeterminate = checkedCount > 0 && checkedCount < itemCbs.length;
            });
        };

        sortedCategories.forEach(catName => {
            const groupWrapper = document.createElement('div');
            groupWrapper.className = 'column-selector-group';

            const sortedKeys = [...categoryGroups[catName]].sort((a, b) => {
                const titleA = this._formatKeyLabel(a);
                const titleB = this._formatKeyLabel(b);
                return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
            });

            const catHeader = document.createElement('div');
            catHeader.style.cssText = 'display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; color: #a78bfa; margin: 10px 0 4px 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 3px; opacity: 0.95; cursor: pointer; user-select: none;';
            catHeader.title = `Toggle all columns in "${catName}"`;

            const catCb = document.createElement('input');
            catCb.type = 'checkbox';
            catCb.className = 'column-category-group-checkbox';
            catCb.style.cssText = 'width: 14px; height: 14px; accent-color: #8b5cf6; cursor: pointer; margin: 0;';

            const catTitleSpan = document.createElement('span');
            catTitleSpan.textContent = `${catName} (${sortedKeys.length})`;

            catHeader.appendChild(catCb);
            catHeader.appendChild(catTitleSpan);

            const toggleColGroup = (targetChecked) => {
                groupWrapper.querySelectorAll('.column-selector-item').forEach(item => {
                    if (item.style.display === 'none') return;
                    const cb = item.querySelector('input[type="checkbox"][data-col-key]');
                    if (cb && cb.checked !== targetChecked) {
                        cb.checked = targetChecked;
                        this.toggleColumn(cb.dataset.colKey);
                    }
                });
                syncColumnGroupCheckboxes();
            };

            catCb.onclick = (e) => {
                e.stopPropagation();
                toggleColGroup(catCb.checked);
            };

            catHeader.onclick = (e) => {
                if (e.target !== catCb) {
                    catCb.checked = !catCb.checked;
                    toggleColGroup(catCb.checked);
                }
            };

            groupWrapper.appendChild(catHeader);

            sortedKeys.forEach(key => {
                const isChecked = this.visibleColumns.includes(key);
                const displayTitle = this._formatKeyLabel(key);
                const projCount = (this._keyProjectCounts && this._keyProjectCounts[key]) || 0;

                const label = document.createElement('label');
                label.className = 'column-selector-item';
                label.dataset.searchText = `${displayTitle} ${key} ${catName}`;
                label.style.cssText = 'display: flex; align-items: center; justify-content: space-between; font-size: 0.84rem; margin-bottom: 4px; cursor: pointer; color: inherit; gap: 6px;';

                const leftSpan = document.createElement('span');
                leftSpan.style.cssText = 'display: flex; align-items: center;';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = isChecked;
                checkbox.dataset.colKey = key;
                checkbox.style.marginRight = '8px';
                checkbox.style.accentColor = '#8b5cf6';
                checkbox.onchange = () => {
                    this.toggleColumn(key);
                    syncColumnGroupCheckboxes();
                };

                leftSpan.appendChild(checkbox);
                leftSpan.appendChild(document.createTextNode(displayTitle));
                label.appendChild(leftSpan);

                if (projCount > 0) {
                    const countBadge = document.createElement('span');
                    countBadge.style.cssText = 'font-size: 0.72rem; color: #9ca3af;';
                    countBadge.textContent = `(${projCount})`;
                    label.appendChild(countBadge);
                }

                groupWrapper.appendChild(label);
            });

            container.appendChild(groupWrapper);
        });

        syncColumnGroupCheckboxes();

        if (currentSearchQuery) {
            const newSearchInput = document.getElementById('facetColumnSearchInput');
            if (newSearchInput) {
                newSearchInput.value = currentSearchQuery;
                this.filterColumnSelectorList(currentSearchQuery);
            }
        }
    },

    // ─── Save & Load Table/Filter Layouts (in User Folder) ────────────────

    async _getLayoutsDirectory() {
        const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
        let baseDir = '';
        if (window.electronAPI?.getTemplatesDirectory) {
            const res = await window.electronAPI.getTemplatesDirectory(userInfo);
            if (res && res.success && res.directory) {
                baseDir = res.directory;
            }
        }
        if (!baseDir && window.electronAPI?.getMetaFoldDirectory) {
            const res = await window.electronAPI.getMetaFoldDirectory();
            if (res && res.success && res.directory) {
                baseDir = res.directory;
            }
        }
        if (!baseDir) return null;
        const sep = baseDir.includes('\\') ? '\\' : '/';
        const layoutsDir = `${baseDir.replace(/[\\/]+$/, '')}${sep}layouts`;
        if (window.electronAPI?.ensureDir) {
            await window.electronAPI.ensureDir(layoutsDir);
        }
        return layoutsDir;
    },

    async listSavedLayouts() {
        try {
            const layoutsDir = await this._getLayoutsDirectory();
            if (!layoutsDir || !window.electronAPI?.listDirectory) return [];
            const entries = await window.electronAPI.listDirectory(layoutsDir);
            if (!Array.isArray(entries)) return [];

            const sep = layoutsDir.includes('\\') ? '\\' : '/';
            const layouts = [];
            for (const entry of entries) {
                if (!entry.isFile || !entry.name.endsWith('.json')) continue;
                const filePath = `${layoutsDir}${sep}${entry.name}`;
                try {
                    const raw = await window.electronAPI.readFile(filePath);
                    if (!raw) continue;
                    const parsed = JSON.parse(raw);
                    layouts.push({
                        name: parsed.name || entry.name.replace(/\.json$/i, ''),
                        filePath,
                        fileName: entry.name,
                        savedAt: parsed.savedAt || null,
                        visibleColumnsCount: Array.isArray(parsed.visibleColumns) ? parsed.visibleColumns.length : 0,
                        hiddenKeysCount: Array.isArray(parsed.hiddenKeys) ? parsed.hiddenKeys.length : 0,
                        data: parsed
                    });
                } catch (e) { }
            }
            layouts.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
            return layouts;
        } catch (err) {
            console.warn('Could not list saved layouts:', err);
            return [];
        }
    },

    async toggleLayoutDropdown() {
        const dropdown = document.getElementById('layoutSelectorDropdown');
        if (!dropdown) return;
        const isOpen = dropdown.style.display !== 'none';
        if (isOpen) {
            dropdown.style.display = 'none';
        } else {
            dropdown.style.display = 'block';
            await this.renderLayoutDropdown();
            const input = document.getElementById('facetLayoutNameInput');
            if (input) input.focus();
        }
    },

    async renderLayoutDropdown() {
        const dropdown = document.getElementById('layoutSelectorDropdown');
        if (!dropdown) return;

        const layoutsDir = await this._getLayoutsDirectory();
        const savedLayouts = await this.listSavedLayouts();
        const currentName = this.activeLayoutName || '';
        const safeCurrentName = currentName.replace(/"/g, '&quot;');

        let listHtml = '';
        if (savedLayouts.length === 0) {
            listHtml = `<div style="color:#9ca3af; font-size:0.78rem; font-style:italic; padding:8px 2px;">No saved layouts yet. Enter a name above and click Save.</div>`;
        } else {
            savedLayouts.forEach(layout => {
                const isActive = this.activeLayoutName && this.activeLayoutName.toLowerCase() === layout.name.toLowerCase();
                const safePath = layout.filePath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const safeName = layout.name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                const dateStr = layout.savedAt ? new Date(layout.savedAt).toLocaleDateString() : '';

                listHtml += `
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; padding:6px 8px; border-radius:6px; background:${isActive ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)'}; border:1px solid ${isActive ? 'rgba(167,139,250,0.55)' : 'rgba(255,255,255,0.08)'}; margin-bottom:5px; cursor:pointer;"
                         onclick="facetSearch.applySavedLayout('${safePath}')"
                         title="Click to load layout '${layout.name}'">
                        <div style="overflow:hidden; flex:1;">
                            <div style="font-size:0.82rem; font-weight:600; color:${isActive ? '#ddd6fe' : '#e5e7eb'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                ${isActive ? '✓ ' : '📐 '}${layout.name}
                            </div>
                            <div style="font-size:0.7rem; color:#9ca3af;">
                                ${layout.visibleColumnsCount} cols${dateStr ? ` · ${dateStr}` : ''}
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px; flex-shrink:0;">
                            <button type="button" class="btn btn-secondary" style="padding:2px 6px; font-size:0.72rem;"
                                onclick="event.stopPropagation(); window.electronAPI.showItemInFolder('${safePath}')"
                                title="Show layout JSON file in Explorer">📁</button>
                            <button type="button" class="btn btn-secondary" style="padding:2px 6px; font-size:0.72rem; color:#f87171;"
                                onclick="event.stopPropagation(); facetSearch.deleteSavedLayout('${safePath}', '${safeName}')"
                                title="Delete layout '${layout.name}'">🗑️</button>
                        </div>
                    </div>
                `;
            });
        }

        const escapedDir = (layoutsDir || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        dropdown.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(139,92,246,0.3); padding-bottom:6px;">
                <span style="font-weight:bold; font-size:0.85rem;">💾 Save / Load Table Layout</span>
                ${layoutsDir ? `<button type="button" class="btn btn-secondary" style="font-size:0.7rem; padding:2px 6px;" onclick="window.electronAPI.openFolder('${escapedDir}')" title="Open User Layouts folder (${layoutsDir})">📂 Folder</button>` : ''}
            </div>
            <div style="display:flex; gap:6px; margin-bottom:6px;">
                <input type="text" id="facetLayoutNameInput" class="facet-text-search-input"
                    style="flex:1; padding:6px 8px; font-size:0.8rem;"
                    placeholder="Layout name (e.g. Microscopy)..."
                    value="${safeCurrentName}"
                    onkeydown="if(event.key==='Enter'){event.preventDefault(); facetSearch.saveCurrentLayout();}">
                <button type="button" class="btn btn-primary" style="padding:6px 10px; font-size:0.78rem; white-space:nowrap;"
                    onclick="facetSearch.saveCurrentLayout()">💾 Save</button>
            </div>
            <div style="font-size:0.7rem; color:#9ca3af; margin-bottom:10px;">
                Saves visible columns, column order &amp; widths, and sidebar filter settings into your User Folder.
            </div>
            <div style="font-size:0.74rem; font-weight:600; text-transform:uppercase; color:#a78bfa; margin-bottom:6px;">
                Saved Layouts (${savedLayouts.length})
            </div>
            <div style="max-height:220px; overflow-y:auto;">
                ${listHtml}
            </div>
        `;
    },

    async saveCurrentLayout(customName = null) {
        const input = document.getElementById('facetLayoutNameInput');
        const rawName = (customName !== null ? customName : (input ? input.value : '')).trim();
        if (!rawName) {
            if (input) {
                input.focus();
                input.style.borderColor = '#ef4444';
                setTimeout(() => { input.style.borderColor = ''; }, 1500);
            }
            return;
        }

        const layoutsDir = await this._getLayoutsDirectory();
        if (!layoutsDir) {
            alert('Could not resolve User Folder for saving layout.');
            return;
        }

        // Capture current Tabulator column order, widths, and sorters
        this._syncColumnStateFromTabulator(false, null);
        const orderedVisibleColumns = [...this.visibleColumns];
        const columnOrder = this._getEffectiveColumnOrder();
        const columnWidths = { ...(this._customColumnWidths || {}) };
        const columnSorters = Array.isArray(this._customColumnSorters) ? [...this._customColumnSorters] : [];

        const layoutData = {
            name: rawName,
            type: 'metafold_facet_layout',
            version: '1.1',
            savedAt: new Date().toISOString(),
            visibleColumns: orderedVisibleColumns,
            columnOrder,
            columnWidths,
            columnSorters,
            hiddenKeys: [...(this.hiddenKeys || [])],
            showSidecarFacets: Boolean(this._showSidecarFacets),
            collapsedCategories: { ...(this._collapsedCategories || {}) }
        };

        const safeFile = rawName.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').toLowerCase().substring(0, 80) || 'layout';
        const sep = layoutsDir.includes('\\') ? '\\' : '/';
        const filePath = `${layoutsDir}${sep}${safeFile}.json`;

        const writeRes = await window.electronAPI.writeFile(filePath, JSON.stringify(layoutData, null, 2));
        if (writeRes && writeRes.success) {
            this.activeLayoutName = rawName;
            this.visibleColumns = orderedVisibleColumns;
            this._customColumnOrder = columnOrder;
            this._customColumnWidths = columnWidths;
            this._customColumnSorters = columnSorters;
            this._saveSessionTableState();
            const btnLabel = document.getElementById('layoutSelectorBtnLabel');
            if (btnLabel) btnLabel.textContent = `Layout: ${rawName}`;
            await this.renderLayoutDropdown();
            if (window.showSuccess) {
                window.showSuccess(`Layout "${rawName}" saved in User Folder`);
            }
        } else {
            alert(`Could not save layout: ${writeRes?.message || 'Unknown error'}`);
        }
    },

    async applySavedLayout(filePath) {
        try {
            const raw = await window.electronAPI.readFile(filePath);
            if (!raw) return;
            const layoutData = JSON.parse(raw);

            if (Array.isArray(layoutData.visibleColumns)) {
                this.visibleColumns = [...layoutData.visibleColumns];
            }
            if (Array.isArray(layoutData.columnOrder) && layoutData.columnOrder.length > 0) {
                this._customColumnOrder = [...layoutData.columnOrder];
            } else {
                const baseFixed = this.isTemplateHub ? [] : ['path', 'created'];
                this._customColumnOrder = [...baseFixed, ...this.visibleColumns];
            }
            this._customColumnWidths = (layoutData.columnWidths && typeof layoutData.columnWidths === 'object')
                ? { ...layoutData.columnWidths }
                : {};
            this._customColumnSorters = Array.isArray(layoutData.columnSorters)
                ? [...layoutData.columnSorters]
                : [];
            if (Array.isArray(layoutData.hiddenKeys)) {
                this.hiddenKeys = [...layoutData.hiddenKeys];
                await window.settingsManager.set('facetSearch.hiddenKeys', JSON.stringify(this.hiddenKeys));
            }
            if (typeof layoutData.showSidecarFacets === 'boolean') {
                this._showSidecarFacets = layoutData.showSidecarFacets;
            }
            if (layoutData.collapsedCategories && typeof layoutData.collapsedCategories === 'object') {
                this._collapsedCategories = { ...layoutData.collapsedCategories };
            }

            this.activeLayoutName = layoutData.name || 'Saved Layout';
            const btnLabel = document.getElementById('layoutSelectorBtnLabel');
            if (btnLabel) btnLabel.textContent = `Layout: ${this.activeLayoutName}`;

            this._saveSessionTableState();
            this.renderColumnSelector();
            this.updateUI();
            await this.renderLayoutDropdown();
        } catch (err) {
            console.error('Error applying saved layout:', err);
            alert(`Could not load layout: ${err.message}`);
        }
    },

    async deleteSavedLayout(filePath, layoutName) {
        if (!confirm(`Delete saved layout "${layoutName}"?`)) return;
        try {
            if (window.electronAPI?.deleteTemplateFile) {
                await window.electronAPI.deleteTemplateFile(filePath);
            }
            if (this.activeLayoutName && this.activeLayoutName.toLowerCase() === (layoutName || '').toLowerCase()) {
                this.activeLayoutName = null;
                const btnLabel = document.getElementById('layoutSelectorBtnLabel');
                if (btnLabel) btnLabel.textContent = 'Save / Load Layout';
                this._saveSessionTableState();
            }
            await this.renderLayoutDropdown();
        } catch (err) {
            console.error('Error deleting layout:', err);
        }
    },

    // Toggle a filter on or off
    toggleFilter(key, value) {
        if (value === null) {
            // Remove filter completely
            delete this.activeFilters[key];
        } else {
            if (!this.activeFilters[key]) {
                this.activeFilters[key] = [];
            }

            const index = this.activeFilters[key].indexOf(value);
            if (index > -1) {
                // If already selected, toggle it off
                this.activeFilters[key].splice(index, 1);
                // If array is empty, remove the key entirely
                if (this.activeFilters[key].length === 0) {
                    delete this.activeFilters[key];
                }
            } else {
                // Set the new filter value
                this.activeFilters[key].push(value);
            }
        }

        this.updateUI();
    },

    // Reset all filters and free-text search
    resetFilters() {
        this.activeFilters = {};
        this.textSearchQuery = '';
        const searchInput = document.getElementById('facetTextSearchInput');
        if (searchInput) searchInput.value = '';
        this.updateUI();
    },

    _safeRedrawTable() {
        requestAnimationFrame(() => {
            try {
                const modal = document.getElementById('facetSearchModal');
                if (!modal || modal.style.display === 'none') return;
                if (this.tabulatorInstance && this.tabulatorInstance.element && this.tabulatorInstance.element.offsetParent !== null) {
                    this.tabulatorInstance.redraw(true);
                }
            } catch (err) {
                // Ignore Tabulator redraw timing errors when container is hidden or rebuilding
            }
        });
    },

    openRightPanel(headingText) {
        const panel = document.getElementById('facetRightPanel');
        const splitter = document.getElementById('facetRightSplitter');
        const heading = document.getElementById('facetRightPanelHeading');
        const content = document.getElementById('facetRightPanelContent');
        if (heading && headingText) heading.textContent = headingText;
        if (splitter) splitter.style.display = 'block';
        if (panel && panel.style.display === 'none') {
            panel.style.display = 'flex';
            this._safeRedrawTable();
        }
        return content;
    },

    closeRightPanel() {
        if (window.projectInlineEditor && typeof window.projectInlineEditor.confirmDiscardIfNeeded === 'function') {
            if (!window.projectInlineEditor.confirmDiscardIfNeeded()) {
                return;
            }
            window.projectInlineEditor.isEditing = false;
            window.projectInlineEditor.isDirty = false;
        }

        const panel = document.getElementById('facetRightPanel');
        const splitter = document.getElementById('facetRightSplitter');
        if (splitter) splitter.style.display = 'none';
        this.selectedProjectPath = null;
        if (this.tabulatorInstance && typeof this.tabulatorInstance.deselectRow === 'function') {
            try { this.tabulatorInstance.deselectRow(); } catch (e) { }
        }
        if (panel && panel.style.display !== 'none') {
            panel.style.display = 'none';
            this._safeRedrawTable();
        }
    },

    // Header button: Export RO-Crate (uses selected project's lineage wizard if a row is selected, or collection wizard otherwise)
    exportRoCrateFromHeader() {
        if (!window.roCrateManager) {
            alert('RO-Crate Manager is not loaded.');
            return;
        }
        if (window.projectScanner) {
            window.projectScanner.projects = this.masterData;
            window.projectScanner.selectedProjectPath = this.selectedProjectPath || null;
        }
        if (this.selectedProjectPath) {
            window.roCrateManager.exportLineageRoCrate(this.selectedProjectPath);
        } else {
            const filtered = this.getFilteredData();
            if (filtered.length === 0) {
                alert('No projects available to export.');
                return;
            }
            if (filtered.length === 1) {
                window.roCrateManager.exportLineageRoCrate(filtered[0].path);
                return;
            }
            if (window.projectScanner) {
                window.projectScanner.projects = filtered;
            }
            window.roCrateManager.openScanExportWizard(null);
        }
    },

    // Header button: Export Lineage HTML/JSON (asks for Direct Lineage vs. Full Graph & Metadata vs. Harvest)
    exportLineageFromHeader() {
        if (typeof window.exportLineage !== 'function') {
            alert('Lineage Export function is not loaded.');
            return;
        }
        if (window.projectScanner) {
            window.projectScanner.projects = this.masterData;
        }
        if (this.selectedProjectPath) {
            window.exportLineage(this.selectedProjectPath);
        } else {
            const filtered = this.getFilteredData();
            if (filtered.length === 1) {
                window.exportLineage(filtered[0].path);
                return;
            }
            alert('Please click a project row in the table first to export its lineage (Direct vs. Full Graph).');
        }
    },

    // Header button: Export Scan Summary (HTML Navigator + JSON summary)
    async exportScanSummary() {
        if (!window.projectScanner || typeof window.projectScanner.exportScanResults !== 'function') {
            alert('Project Scanner export function is not available.');
            return;
        }

        if (!this.masterData || this.masterData.length === 0) {
            alert('No projects loaded to export. Please scan a folder or load projects first.');
            return;
        }

        const safeAll = this.masterData.filter(p => p && p.path && p._type !== 'file_sidecar');
        const filtered = typeof this.getFilteredData === 'function' ? this.getFilteredData() : safeAll;
        const safeFiltered = filtered.filter(p => p && p.path && p._type !== 'file_sidecar');

        if (safeFiltered.length === 0) {
            alert('No projects match your current filters.');
            return;
        }

        let projectsToExport = safeFiltered;

        // If a subset of projects is currently filtered, give the user the choice between filtered vs all projects
        if (safeFiltered.length < safeAll.length) {
            if (window.electronAPI && typeof window.electronAPI.showMessageBox === 'function') {
                const res = await window.electronAPI.showMessageBox({
                    type: 'question',
                    buttons: [
                        `Filtered Projects (${safeFiltered.length})`,
                        `All Projects (${safeAll.length})`,
                        'Cancel'
                    ],
                    defaultId: 0,
                    cancelId: 2,
                    title: 'Export Scan Summary',
                    message: `You have active filters (${safeFiltered.length} of ${safeAll.length} projects shown).\n\nWhich projects would you like to include in the HTML Navigator & JSON summary export?`
                });

                if (res && res.response === 2) return; // Cancelled
                projectsToExport = (res && res.response === 0) ? safeFiltered : safeAll;
            } else {
                const useFiltered = confirm(
                    `You have active filters (${safeFiltered.length} of ${safeAll.length} projects shown).\n\n` +
                    `Click OK to export only the ${safeFiltered.length} filtered projects.\n` +
                    `Click Cancel to export ALL ${safeAll.length} projects.`
                );
                projectsToExport = useFiltered ? safeFiltered : safeAll;
            }
        }

        const scannedPath = this.unsavedScan?.basePath ||
            window.projectScanner.currentScannedPath ||
            (typeof window.projectScanner._inferCommonRoot === 'function' ? window.projectScanner._inferCommonRoot(projectsToExport) : '');

        await window.projectScanner.exportScanResults(projectsToExport, scannedPath);
    },

    // Jump to a linked project when clicked inside the right panel's Lineage Accordion
    selectAndInspectProjectByPath(targetPath) {
        if (!targetPath) return;
        const found = this.masterData.find(p => p.path === targetPath);
        if (found) {
            if (this.tabulatorInstance) {
                try {
                    const rows = this.tabulatorInstance.getRows();
                    const matchingRow = rows.find(r => {
                        const d = r.getData();
                        return d && (d.path === targetPath || d._path === targetPath);
                    });
                    if (matchingRow) {
                        this.tabulatorInstance.deselectRow();
                        matchingRow.select();
                        matchingRow.scrollTo();
                    }
                } catch (e) { }
            }
            this.showProjectDetails(found);
        } else if (window.electronAPI?.openFolder) {
            window.electronAPI.openFolder(targetPath);
        }
    },

    // Filter the table for all projects referencing or providing a given Lineage ID / Project Name
    filterByLineageId(rawId) {
        if (!rawId) return;
        const searchInput = document.getElementById('facetTextSearchInput');
        if (searchInput) {
            searchInput.value = rawId;
        }
        this.handleTextSearch(rawId);
    },

    // Backwards-compatible alias for external ID click
    handleExternalIdClick(rawId) {
        this.filterByLineageId(rawId);
    },

    // Select and inspect a specific file sidecar child row inside a project
    inspectSidecarById(projectPath, sidecarId) {
        const proj = this.masterData.find(p => p.path === projectPath);
        if (!proj || !Array.isArray(proj._sidecarChildren)) return;
        const sc = proj._sidecarChildren.find(c => c.id === sidecarId || c.path === sidecarId || c.sidecarPath === sidecarId);
        if (!sc) return;

        if (this.tabulatorInstance) {
            try {
                const rows = this._getNavigableRows();
                const matchingRow = rows.find(r => {
                    const d = typeof r.getData === 'function' ? r.getData() : null;
                    return d && d._type === 'file_sidecar' && (d._sidecarId === sc.id || d.path === sc.path || d._sidecarPath === sc.sidecarPath);
                });
                if (matchingRow) {
                    this.tabulatorInstance.deselectRow();
                    matchingRow.select();
                    matchingRow.scrollTo();
                }
            } catch (e) { }
        }
        this.showProjectDetails(sc);
    },

    // Resolve a project name, path, previous_name, or id_anchor to a project in masterData
    _resolveProjectByRef(rawRef) {
        if (!rawRef) return null;
        const clean = String(rawRef).replace(/^\[\[|\]\]$/g, '').trim();
        if (!clean || !Array.isArray(this.masterData)) return null;
        const lower = clean.toLowerCase();

        // 1. Exact path, UUID, or exact project name / provides_id match
        const exact = this.masterData.find(p =>
            p.path === clean ||
            p.name === clean ||
            p.metafold_project_id === clean ||
            p.projectId === clean ||
            p.metadata?.metafold_project_id === clean ||
            p.metadata?.projectName === clean ||
            (Array.isArray(p.previous_names) && p.previous_names.includes(clean)) ||
            (Array.isArray(p.metadata?.previous_names) && p.metadata.previous_names.includes(clean)) ||
            (p.lineage && Array.isArray(p.lineage.provides_ids) && p.lineage.provides_ids.includes(clean))
        );
        if (exact) return exact;

        // 2. Case-insensitive fallback
        return this.masterData.find(p =>
            (p.name && p.name.toLowerCase() === lower) ||
            (p.metafold_project_id && String(p.metafold_project_id).toLowerCase() === lower) ||
            (p.projectId && String(p.projectId).toLowerCase() === lower) ||
            (p.metadata?.metafold_project_id && String(p.metadata.metafold_project_id).toLowerCase() === lower) ||
            (p.metadata?.projectName && String(p.metadata.projectName).toLowerCase() === lower) ||
            (Array.isArray(p.previous_names) && p.previous_names.some(n => String(n).toLowerCase() === lower)) ||
            (Array.isArray(p.metadata?.previous_names) && p.metadata.previous_names.some(n => String(n).toLowerCase() === lower)) ||
            (p.lineage && Array.isArray(p.lineage.provides_ids) && p.lineage.provides_ids.some(id => String(id).toLowerCase() === lower))
        ) || null;
    },

    // Collects all text across a project's notes and string metadata fields
    _collectProjectTextBlocks(project) {
        if (!project) return '';
        const parts = [];
        const notesMd = project.notes_markdown || project.metadata?.notes_markdown || '';
        const hypothesis = project.hypothesis_or_goal || project.metadata?.hypothesis_or_goal || '';
        const notesLog = Array.isArray(project.notes_log)
            ? project.notes_log
            : (Array.isArray(project.metadata?.notes_log) ? project.metadata.notes_log : []);

        if (notesMd) parts.push(String(notesMd));
        if (hypothesis) parts.push(String(hypothesis));
        notesLog.forEach(n => {
            if (n && typeof n.text === 'string' && n.text.trim()) parts.push(n.text);
        });

        const skipKeys = new Set([
            'schemaVersion', 'schemaType', 'metafold_project_id', 'projectName',
            'provenance', 'metafold_integration', 'integrations', 'created_at',
            'updated_at', 'previous_names', 'changelog', 'notes_log',
            'notes_markdown', 'hypothesis_or_goal', 'template', 'templateInfo'
        ]);
        const walk = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
            for (const [k, v] of Object.entries(obj)) {
                if (skipKeys.has(k) || k.startsWith('System.')) continue;
                if (!v) continue;
                if (typeof v === 'string') {
                    if (v.trim()) parts.push(v);
                } else if (typeof v === 'object' && !Array.isArray(v)) {
                    if (Object.prototype.hasOwnProperty.call(v, 'value')) {
                        if (typeof v.value === 'string' && v.value.trim()) parts.push(v.value);
                    } else {
                        walk(v);
                    }
                }
            }
        };
        if (project.metadata) walk(project.metadata);
        return parts.join('\n');
    },

    // Collect all structured links (derived_from, downstream, related_to, [[mentions]]), tags, and note links
    _collectProjectLinksAndTags(project) {
        const selfPath = project.path || '';
        const selfNameLower = (project.name || project.metadata?.projectName || '').trim().toLowerCase();
        const tagKeyRegex = /(?:^|[_\s.-])(tags?|keywords?)(?:$|[_\s.-])/i;
        const skipWalkKeys = new Set([
            'schemaVersion', 'schemaType', 'metafold_project_id', 'projectName',
            'provenance', 'metafold_integration', 'integrations', 'created_at',
            'updated_at', 'previous_names', 'changelog', 'notes_log',
            'notes_markdown', 'hypothesis_or_goal', 'template', 'templateInfo'
        ]);

        const parseRawList = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val;
            if (typeof val === 'object' && val.value !== undefined) return parseRawList(val.value);
            if (typeof val === 'string') return val.split(/[,;]/).map(s => s.trim()).filter(Boolean);
            return [];
        };

        const extractFieldsByRole = (metaObj) => {
            const derived = [];
            const related = [];
            const tags = [];
            const walk = (obj) => {
                if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return;
                for (const [k, v] of Object.entries(obj)) {
                    if (skipWalkKeys.has(k) || k.startsWith('System.')) continue;
                    if (!v) continue;
                    const lk = k.toLowerCase();
                    const normK = lk.replace(/[\s_-]+/g, '');
                    const labelStr = (typeof v === 'object' && v.label) ? String(v.label).toLowerCase() : '';
                    const fType = (typeof v === 'object' && v.type) ? v.type : '';

                    if (fType === 'derived_from' || lk === 'derived_from' || lk.includes('derived_from') || normK === 'derivedfrom' || labelStr.includes('derived from')) {
                        derived.push(...parseRawList(v));
                    } else if (fType === 'related_to' || lk === 'related_to' || lk.includes('related_to') || normK === 'relatedto' || labelStr.includes('related to') || labelStr.includes('related project') || lk.includes('related_project')) {
                        related.push(...parseRawList(v));
                    } else if (fType === 'tags' || tagKeyRegex.test(k)) {
                        tags.push(...parseRawList(v));
                    } else if (typeof v === 'object' && !Array.isArray(v) && v.value === undefined && v.type === undefined) {
                        walk(v);
                    }
                }
            };
            walk(metaObj);
            return { derived, related, tags };
        };

        const ownFields = extractFieldsByRole(project.metadata || {});
        if (project.flatMeta) {
            for (const [k, v] of Object.entries(project.flatMeta)) {
                const lk = k.toLowerCase();
                const normK = lk.replace(/[\s_-]+/g, '');
                if (lk.includes('derived_from') || normK === 'derivedfrom') ownFields.derived.push(...parseRawList(v));
                else if (lk.includes('related_to') || normK === 'relatedto' || lk.includes('related_project')) ownFields.related.push(...parseRawList(v));
                else if (tagKeyRegex.test(k)) ownFields.tags.push(...parseRawList(v));
            }
        }
        if (project.tags) ownFields.tags.push(...parseRawList(project.tags));

        // 1. Upstream (Derived From)
        const upstreamMap = new Map();
        const upstreamKeysSet = new Set();
        const addUpstream = (rawId, sourcePathHint = '', note = '') => {
            const cleanId = String(rawId || '').trim();
            if (!cleanId) return;
            const linkedProj = (sourcePathHint && this.masterData.find(p => p.path === sourcePathHint)) || this._resolveProjectByRef(cleanId);
            const resolvedPath = linkedProj?.path || sourcePathHint || '';
            if (resolvedPath && resolvedPath === selfPath) return;
            const dedupKey = resolvedPath ? `path::${resolvedPath.toLowerCase()}` : `id::${cleanId.toLowerCase()}`;
            if (!upstreamMap.has(dedupKey)) {
                upstreamMap.set(dedupKey, {
                    id: cleanId,
                    name: linkedProj ? linkedProj.name : (resolvedPath ? resolvedPath.split(/[\\/]/).pop() : cleanId),
                    sourcePath: resolvedPath,
                    linkedProj,
                    note
                });
            }
            upstreamKeysSet.add(cleanId.toLowerCase());
            if (linkedProj?.name) upstreamKeysSet.add(linkedProj.name.toLowerCase());
            if (resolvedPath) upstreamKeysSet.add(resolvedPath.toLowerCase());
        };

        (project.lineage?.lineage_links || []).forEach(l => addUpstream(l.id, l.source_path));
        (project.lineage?.derived_from_ids || []).forEach(id => addUpstream(id));
        ownFields.derived.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                addUpstream(item.id || item.name, '', item.relation_note || item.anchor || '');
            } else {
                addUpstream(item);
            }
        });
        const upstreamItems = Array.from(upstreamMap.values());

        // 2. Downstream (Derived Projects)
        const downstreamMap = new Map();
        const downstreamPathsSet = new Set();
        const downstreamNamesSet = new Set();
        this.masterData.forEach(other => {
            if (!other || other.path === selfPath) return;
            const matchedLinks = (other.lineage?.lineage_links || []).filter(l => l.source_path === selfPath);
            let viaIds = matchedLinks.map(l => l.id).filter(Boolean);

            if (viaIds.length === 0) {
                const otherDerived = [
                    ...(other.lineage?.derived_from_ids || []),
                    ...extractFieldsByRole(other.metadata || {}).derived.map(it => typeof it === 'object' && it ? (it.id || it.name) : String(it || ''))
                ];
                viaIds = otherDerived.filter(id => {
                    const resolved = this._resolveProjectByRef(id);
                    return resolved && resolved.path === selfPath;
                });
            }

            if (viaIds.length > 0) {
                const dedupKey = other.path.toLowerCase();
                if (!downstreamMap.has(dedupKey)) {
                    downstreamMap.set(dedupKey, {
                        project: other,
                        viaId: Array.from(new Set(viaIds)).join(', ')
                    });
                    downstreamPathsSet.add(dedupKey);
                    if (other.name) downstreamNamesSet.add(other.name.toLowerCase());
                }
            }
        });
        const downstreamProjects = Array.from(downstreamMap.values());

        // 3. Related Projects (related_to + [[Project]] mentions + incoming references)
        const relatedMap = new Map();
        const addRelated = (rawId, originLabel = '🔀 related_to', targetPathHint = '', direction = 'out') => {
            const cleanId = String(rawId || '').trim();
            if (!cleanId) return;
            const lowerId = cleanId.toLowerCase();
            if (lowerId === selfNameLower) return;

            const linkedProj = (targetPathHint && this.masterData.find(p => p.path === targetPathHint)) || this._resolveProjectByRef(cleanId);
            const resolvedPath = linkedProj?.path || targetPathHint || '';
            if (resolvedPath && resolvedPath === selfPath) return;

            // Skip items already shown in Derived From / Derived Projects
            if (upstreamKeysSet.has(lowerId) || (resolvedPath && upstreamKeysSet.has(resolvedPath.toLowerCase()))) return;
            if ((resolvedPath && downstreamPathsSet.has(resolvedPath.toLowerCase())) || downstreamNamesSet.has(lowerId)) return;

            const dedupKey = resolvedPath ? `path::${resolvedPath.toLowerCase()}` : `id::${lowerId}`;
            const existing = relatedMap.get(dedupKey);
            if (!existing) {
                relatedMap.set(dedupKey, {
                    id: cleanId,
                    name: linkedProj ? linkedProj.name : (resolvedPath ? resolvedPath.split(/[\\/]/).pop() : cleanId),
                    sourcePath: resolvedPath,
                    linkedProj,
                    originLabel,
                    direction
                });
            } else if (existing.originLabel === '↩ linked by' && direction === 'out') {
                existing.originLabel = originLabel;
                existing.direction = 'both';
            }
        };

        (project.lineage?.related_links || []).forEach(l => addRelated(l.id, '🔀 related_to', l.target_path, 'out'));
        (project.lineage?.related_to_ids || []).forEach(id => addRelated(id, '🔀 related_to', '', 'out'));
        ownFields.related.forEach(item => {
            if (typeof item === 'object' && item !== null) {
                const origin = item.origin === 'note' ? '📝 [[Note]]' : '🔀 related_to';
                addRelated(item.id || item.name, origin, '', 'out');
            } else {
                addRelated(item, '🔀 related_to', '', 'out');
            }
        });

        const ownText = this._collectProjectTextBlocks(project);
        if (ownText && window.markdownLite?.extractMentions) {
            window.markdownLite.extractMentions(ownText).forEach(m => {
                addRelated(m, '📝 [[Note]]', '', 'out');
            });
        }

        // Incoming associative links from other projects
        this.masterData.forEach(other => {
            if (!other || other.path === selfPath) return;
            const otherPathLower = (other.path || '').toLowerCase();
            if (upstreamKeysSet.has(otherPathLower) || downstreamPathsSet.has(otherPathLower)) return;

            let pointsToSelf = false;
            if (other.lineage?.related_links?.some(l => l.target_path === selfPath)) {
                pointsToSelf = true;
            }
            if (!pointsToSelf && Array.isArray(other.lineage?.related_to_ids)) {
                pointsToSelf = other.lineage.related_to_ids.some(id => this._resolveProjectByRef(id)?.path === selfPath);
            }
            if (!pointsToSelf) {
                const otherRelated = extractFieldsByRole(other.metadata || {}).related;
                pointsToSelf = otherRelated.some(item => {
                    const id = typeof item === 'object' && item ? (item.id || item.name) : String(item || '');
                    const resolved = this._resolveProjectByRef(id);
                    return resolved && resolved.path === selfPath;
                });
            }
            if (!pointsToSelf && window.markdownLite?.extractMentions) {
                const otherText = this._collectProjectTextBlocks(other);
                if (otherText) {
                    pointsToSelf = window.markdownLite.extractMentions(otherText).some(m => {
                        const resolved = this._resolveProjectByRef(m);
                        return resolved && resolved.path === selfPath;
                    });
                }
            }
            if (pointsToSelf) {
                addRelated(other.name, '↩ linked by', other.path, 'in');
            }
        });
        const relatedItems = Array.from(relatedMap.values());

        // 4. Tags (from tags/keywords fields AND #tags in notes & metadata strings)
        const tagsMap = new Map();
        const addTag = (rawTag) => {
            const clean = String(rawTag || '').replace(/^#+/, '').trim();
            if (!clean) return;
            const lower = clean.toLowerCase();
            if (!tagsMap.has(lower)) {
                tagsMap.set(lower, { tag: clean, count: 0 });
            }
        };
        ownFields.tags.forEach(item => {
            if (typeof item === 'object' && item !== null) addTag(item.name || item.id);
            else addTag(item);
        });
        (project.lineage?.tags || []).forEach(addTag);
        if (ownText && window.markdownLite?.extractTags) {
            window.markdownLite.extractTags(ownText).forEach(addTag);
        }
        const tags = Array.from(tagsMap.values()).sort((a, b) => a.tag.localeCompare(b.tag));

        // 5. External Web & File Links in Notes
        const notesMd = project.notes_markdown || project.metadata?.notes_markdown || '';
        const hypothesis = project.hypothesis_or_goal || project.metadata?.hypothesis_or_goal || '';
        const notesLog = Array.isArray(project.notes_log)
            ? project.notes_log
            : (Array.isArray(project.metadata?.notes_log) ? project.metadata.notes_log : []);
        const allNotesOnly = [notesMd, hypothesis, ...notesLog.map(n => n?.text || '')].filter(Boolean).join('\n');
        const extractedNoteLinks = (window.markdownLite && window.markdownLite.extractLinks)
            ? window.markdownLite.extractLinks(allNotesOnly).filter(l => l.type === 'url' || l.type === 'path')
            : [];

        return {
            upstreamItems,
            downstreamProjects,
            relatedItems,
            tags,
            extractedNoteLinks
        };
    },

    // Bind all interactive links, tags, note buttons & copy buttons inside #facetRightPanelContent
    _bindRightPanelInteractiveElements(contentArea, project, notesLog = []) {
        if (!contentArea) return;

        const editMetaBtn = document.getElementById('facetBtnEditMetadata');
        if (editMetaBtn) {
            editMetaBtn.onclick = () => {
                if (window.projectInlineEditor) {
                    window.projectInlineEditor.startEdit(project);
                }
            };
        }

        const addNoteBtn = document.getElementById('facetBtnAddNote');
        const addNoteInlineBtn = document.getElementById('facetBtnAddNoteInline');
        const openAddNote = () => {
            if (window.noteComposer) {
                window.noteComposer.open(project);
            }
        };
        if (addNoteBtn) addNoteBtn.onclick = openAddNote;
        if (addNoteInlineBtn) addNoteInlineBtn.onclick = openAddNote;

        contentArea.querySelectorAll('.mf-btn-edit-note').forEach(btn => {
            btn.onclick = () => {
                const noteId = btn.dataset.noteId;
                const note = notesLog.find(n => n.id === noteId);
                if (note && window.noteComposer) {
                    window.noteComposer.editNote(project, note);
                }
            };
        });
        contentArea.querySelectorAll('.mf-btn-delete-note').forEach(btn => {
            btn.onclick = () => {
                const noteId = btn.dataset.noteId;
                if (noteId && window.noteComposer) {
                    window.noteComposer.deleteNote(project, noteId);
                }
            };
        });

        contentArea.querySelectorAll('.mf-extracted-mention-link, .mf-md-mention').forEach(a => {
            const rawRef = a.dataset.projectName || a.dataset.mfProject;
            if (rawRef && a.classList.contains('mf-md-mention')) {
                const resolved = this._resolveProjectByRef(rawRef);
                if (resolved && resolved.name && resolved.name !== rawRef) {
                    a.textContent = `🔗 ${resolved.name}`;
                    a.title = `Related project (related_to): ${resolved.name} (${rawRef}) — click to open`;
                }
            }
            a.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const targetName = a.dataset.projectName || a.dataset.mfProject;
                if (!targetName) return;
                const found = this._resolveProjectByRef(targetName);
                if (found && found.path) {
                    this.selectAndInspectProjectByPath(found.path);
                } else {
                    this.filterByLineageId(targetName);
                }
            };
        });

        contentArea.querySelectorAll('.mf-md-tag').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tag = a.dataset.mfTag;
                if (tag) {
                    this.filterByLineageId(tag);
                }
            };
        });

        contentArea.querySelectorAll('.mf-extracted-path-link, .mf-md-path').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const p = a.dataset.projectPath || a.dataset.mfPath;
                if (p && window.electronAPI?.showItemInFolder) {
                    window.electronAPI.showItemInFolder(p);
                } else if (p && window.electronAPI?.openFolder) {
                    window.electronAPI.openFolder(p);
                }
            };
        });

        contentArea.querySelectorAll('.mf-extracted-url-link, .mf-md-link').forEach(a => {
            a.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const u = a.dataset.url || a.dataset.mfUrl;
                if (u) {
                    if (window.electronAPI?.openExternal) window.electronAPI.openExternal(u);
                    else window.open(u, '_blank');
                }
            };
        });

        contentArea.querySelectorAll('.mf-copy-btn').forEach(btn => {
            btn.onclick = async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const text = btn.dataset.copyText;
                if (!text) return;
                try {
                    if (window.electronAPI?.writeToClipboard) {
                        await window.electronAPI.writeToClipboard(text);
                    } else if (navigator.clipboard) {
                        await navigator.clipboard.writeText(text);
                    }
                    const origHtml = btn.innerHTML;
                    btn.textContent = '✓';
                    btn.style.color = '#34d399';
                    setTimeout(() => {
                        btn.innerHTML = origHtml;
                        btn.style.color = '';
                    }, 1200);
                } catch (err) {
                    console.error('Copy to clipboard failed:', err);
                }
            };
        });
    },

    // Show full Project Metadata, Quick Actions & Collapsible Lineage Accordion inside the docked right panel on row click
        // When `options.targetContentEl` is provided (e.g. from Mermaid Lineage view), renders into that container instead.
        showProjectDetails(rowData, options = {}) {
            if (!rowData) return;
            const targetPath = rowData._path || rowData.path;
            const customContainer = options && options.targetContentEl ? options.targetContentEl : null;
            if (!customContainer) {
                this.selectedProjectPath = targetPath;
            }

            const isSidecar = rowData._type === 'file_sidecar';

            // Find full project in masterData (or sidecar parent if a file_sidecar row was clicked)
            let project = null;
            let sidecarEntry = null;

            if (isSidecar) {
                project = this.masterData.find(p =>
                    (rowData._parentProjectPath && p.path === rowData._parentProjectPath) ||
                    (p._sidecarChildren && p._sidecarChildren.some(sc =>
                        (rowData._sidecarId && sc.id === rowData._sidecarId) ||
                        (rowData._sidecarPath && sc.sidecarPath === rowData._sidecarPath) ||
                        (targetPath && sc.path === targetPath)
                    ))
                );
                if (project && Array.isArray(project._sidecarChildren)) {
                    sidecarEntry = project._sidecarChildren.find(sc =>
                        (rowData._sidecarId && sc.id === rowData._sidecarId) ||
                        (rowData._sidecarPath && sc.sidecarPath === rowData._sidecarPath) ||
                        (targetPath && sc.path === targetPath) ||
                        (rowData.name && sc.name === rowData.name)
                    );
                }
                if (!sidecarEntry) sidecarEntry = rowData;
                if (!project) project = { name: sidecarEntry._parentProjectName || 'Project', path: sidecarEntry._parentProjectPath || '', metadata: sidecarEntry.project_metadata || {} };
            } else {
                project = this.masterData.find(p => p.path === targetPath) || rowData;
            }

            const contentArea = customContainer || this.openRightPanel(isSidecar ? '📄 File Sidecar Details' : '📋 Project Details');
            if (!contentArea) return;

            // Keep projectScanner.projects synced so RO-Crate & Lineage exports have full graph context
                if (window.projectScanner && Array.isArray(this.masterData) && this.masterData.length > 0) {
                    window.projectScanner.projects = this.masterData;
                    if (!customContainer) {
                        window.projectScanner.selectedProjectPath = project.path;
                    }
                }

                // Pre-extract notes for display and deduplication
                let promotedNotesKey = null;
                let notesMd = project.notes_markdown || (project.metadata && project.metadata.notes_markdown) || '';
                if (!notesMd && project.metadata) {
                    const findNotesVal = (obj) => {
                        for (const [k, v] of Object.entries(obj)) {
                            if (v && typeof v === 'object') {
                                if ((v.type === 'notes' || v.type === 'markdown' || v.displayInNotes === true) && v.value) {
                                    promotedNotesKey = k;
                                    return String(v.value);
                                }
                                if (typeof v === 'object' && v.value === undefined && v.type === undefined) {
                                    const res = findNotesVal(v);
                                    if (res) return res;
                                }
                            }
                        }
                        return '';
                    };
                    notesMd = findNotesVal(project.metadata);
                }
                const notesLog = Array.isArray(project.notes_log) ? project.notes_log : (Array.isArray(project.metadata && project.metadata.notes_log) ? project.metadata.notes_log : []);
                const hypothesis = project.hypothesis_or_goal || (project.metadata && project.metadata.hypothesis_or_goal) || '';

                const formatBytes = (bytes) => {
                    if (bytes === undefined || bytes === null || isNaN(Number(bytes))) return '—';
                    const n = Number(bytes);
                    if (n < 1024) return `${n} B`;
                    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB (${n.toLocaleString()} B)`;
                    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB (${n.toLocaleString()} B)`;
                    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB (${n.toLocaleString()} B)`;
                };

                const renderCompactField = (label, val) => {
                    if (val === undefined || val === null || val === '') return '';
                    return `
                <div style="background: rgba(255,255,255,0.04); padding: 5px 9px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px;">
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 1px; text-transform: uppercase;">${label}</div>
                    <div style="font-size: 0.84rem; color: #e5e7eb; word-break: break-word;">${val}</div>
                </div>
            `;
                };

                const escHtml = (window.markdownLite && window.markdownLite.escapeHtml) || (s => String(s || ''));
                const escAttr = (window.markdownLite && window.markdownLite.escapeAttr) || (s => String(s || '').replace(/"/g, '&quot;'));

                const renderMetadataField = (key, field) => {
                    if (['metafold_project_id', 'projectName', 'provenance', 'System.UpdateHistory', 'System.Level', 'System.hasReadme', 'changelog', 'notes_log', 'notes_markdown', 'hypothesis_or_goal', 'previous_names'].includes(key)) return '';

                    // Skip only the single notes field that was already promoted into Notes & Observations
                    if (field && typeof field === 'object') {
                        if (promotedNotesKey && key === promotedNotesKey) return '';
                        if (field.type === 'textarea' && notesMd && String(field.value || '').trim() === String(notesMd).trim()) {
                            return '';
                        }
                    }

                    if (typeof field === 'object' && field !== null && !Array.isArray(field) && field.value === undefined && field.type === undefined) {
                        let catHtml = `<div style="margin-bottom: 6px; padding: 8px; background: rgba(0,0,0,0.15); border-radius: 6px; border-left: 3px solid #8b5cf6;">`;
                        catHtml += `<div style="font-size: 0.76rem; color: #c4b5fd; margin-bottom: 6px; font-weight: bold; text-transform: uppercase;">📁 ${escHtml(key.replace(/_/g, ' '))}</div>`;
                        catHtml += `<div style="display: flex; flex-direction: column; gap: 4px;">`;
                        for (const [subKey, subField] of Object.entries(field)) {
                            catHtml += renderMetadataField(subKey, subField);
                        }
                        catHtml += `</div></div>`;
                        return catHtml;
                    }

                    const value = (field && field.value !== undefined) ? field.value : field;
                    const type = (field && field.type) ? field.type : 'text';
                    let label = (field && field.label) ? field.label : key.replace(/_/g, ' ');
                    label = label.charAt(0).toUpperCase() + label.slice(1);

                    let displayValue = value;
                    const lowerKey = key.toLowerCase();
                    const lowerLabel = label.toLowerCase();
                    const normKey = lowerKey.replace(/[\s_-]+/g, '');
                    const isDerivedFrom = lowerKey.includes('derived_from') || normKey === 'derivedfrom' || lowerLabel.includes('derived from') || type === 'derived_from';
                    const isRelatedTo = !isDerivedFrom && (
                        lowerKey.includes('related_to') || normKey === 'relatedto' ||
                        lowerLabel.includes('related to') || lowerLabel.includes('related project') ||
                        lowerKey.includes('related_project') || type === 'related_to'
                    );
                    const isIdAnchor = !isDerivedFrom && !isRelatedTo && (type === 'id_anchor' || lowerKey === 'id_anchor');
                    const isTags = !isDerivedFrom && !isRelatedTo && !isIdAnchor && (
                        /(?:^|[_\s.-])(tags?|keywords?)(?:$|[_\s.-])/i.test(key) || type === 'tags'
                    );

                    if (displayValue === null || displayValue === undefined || displayValue === '') {
                        displayValue = '<em style="color: #6c7086;">Empty</em>';
                    } else if (isDerivedFrom || isRelatedTo) {
                        let items = [];
                        if (Array.isArray(displayValue)) {
                            items = displayValue;
                        } else if (typeof displayValue === 'string') {
                            items = displayValue.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                        }
                        if (items.length === 0) {
                            displayValue = '<em style="color: #6c7086;">Empty</em>';
                        } else {
                            displayValue = items.map(item => {
                                const rawId = typeof item === 'object' && item !== null ? (item.id || item.name || '') : String(item || '').trim();
                                const title = typeof item === 'object' && item !== null ? (item.name || item.id || '') : rawId;
                                const note = (typeof item === 'object' && item !== null) ? (item.relation_note || item.anchor || '') : '';
                                const linkedProj = this._resolveProjectByRef(rawId);
                                const bgStyle = isDerivedFrom
                                    ? 'background:rgba(99,102,241,0.22); border:1px solid rgba(139,92,246,0.45); color:#c4b5fd;'
                                    : 'background:rgba(56,189,248,0.18); border:1px solid rgba(56,189,248,0.42); color:#7dd3fc;';
                                const roleHint = isDerivedFrom ? 'Derived From (Parent)' : 'Related To (Associative)';
                                if (linkedProj && linkedProj.path) {
                                    const safePath = linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                    return `<span class="facet-lineage-chip" onclick="facetSearch.selectAndInspectProjectByPath('${safePath}')" title="${roleHint}: ${escAttr(linkedProj.name)} — click to open" style="display:inline-flex; align-items:center; gap:4px; ${bgStyle} padding:2px 8px; border-radius:12px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer; font-weight:500;">${isRelatedTo ? '🔀 ' : ''}📁 ${escHtml(linkedProj.name || title)} ↗</span>`;
                                }
                                const safeRawId = rawId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                return `<span class="facet-lineage-chip" onclick="facetSearch.filterByLineageId('${safeRawId}')" title="${roleHint}: Filter table for '${escAttr(rawId)}'" style="display:inline-flex; align-items:center; gap:4px; ${bgStyle} padding:2px 8px; border-radius:12px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer;">${isDerivedFrom ? '⚓' : '🔀'} ${escHtml(title)}${note ? ` <em style="opacity:0.8;">(${escHtml(note)})</em>` : ''} 🔍</span>`;
                            }).join(' ');
                        }
                    } else if (isIdAnchor) {
                        const rawAnchor = String(displayValue).trim();
                        const safeAnchor = rawAnchor.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        displayValue = `<span class="facet-lineage-chip" onclick="facetSearch.filterByLineageId('${safeAnchor}')" title="Own / Internal ID: Filter table for '${escAttr(rawAnchor)}'" style="display:inline-flex; align-items:center; gap:4px; background:rgba(245,158,11,0.18); border:1px solid rgba(245,158,11,0.42); color:#fbbf24; padding:2px 8px; border-radius:12px; font-size:0.78rem; cursor:pointer; font-weight:500;">⚓ ${escHtml(rawAnchor)} 🔍</span>`;
                    } else if (isTags) {
                        let items = [];
                        if (Array.isArray(displayValue)) {
                            items = displayValue;
                        } else if (typeof displayValue === 'string') {
                            items = displayValue.split(/[,;]/).map(s => s.trim()).filter(Boolean);
                        }
                        if (items.length === 0) {
                            displayValue = '<em style="color: #6c7086;">Empty</em>';
                        } else {
                            displayValue = items.map(tag => {
                                const rawTag = typeof tag === 'object' && tag !== null ? (tag.name || tag.id || '') : String(tag || '').trim();
                                const tagStr = rawTag.replace(/^#+/, '').trim();
                                if (!tagStr) return '';
                                const safeTag = tagStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                return `<span class="facet-tag-chip" onclick="facetSearch.filterByLineageId('${safeTag}')" title="Filter table by tag: '${escAttr(tagStr)}'" style="display:inline-flex; align-items:center; gap:4px; background:rgba(13,148,136,0.18); border:1px solid rgba(13,148,136,0.4); color:#2dd4bf; padding:2px 8px; border-radius:12px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer;">🏷️ ${escHtml(tagStr)}</span>`;
                            }).filter(Boolean).join(' ');
                        }
                    } else if (type === 'url' || (typeof displayValue === 'string' && (displayValue.startsWith('http://') || displayValue.startsWith('https://')))) {
                        const safeUrl = String(displayValue).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        displayValue = `<a href="#" onclick="event.preventDefault(); window.electronAPI.openExternal('${safeUrl}')" style="color: #34d399; text-decoration: underline; word-break: break-all; display: inline-flex; align-items: center; gap: 4px;"><span>${escHtml(displayValue)}</span> <span style="font-size:0.8rem;">↗</span></a>`;
                    } else if (Array.isArray(displayValue)) {
                        if (displayValue.length === 0) {
                            displayValue = '<em style="color: #6c7086;">Empty</em>';
                        } else {
                            displayValue = displayValue.map(item => {
                                if (item && typeof item === 'object') {
                                    const title = item.name || item.id || 'Link';
                                    const note = item.relation_note || item.anchor || '';
                                    const linkedProj = this._resolveProjectByRef(item.id || item.name);
                                    if (linkedProj && linkedProj.path) {
                                        const safePath = linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                        return `<span class="facet-lineage-chip" onclick="facetSearch.selectAndInspectProjectByPath('${safePath}')" title="Open project: ${escAttr(linkedProj.name)} (${escAttr(title)})" style="display:inline-flex; align-items:center; gap:4px; background:rgba(139,92,246,0.18); border:1px solid rgba(139,92,246,0.35); color:#c4b5fd; padding:1px 7px; border-radius:10px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer;">📁 ${escHtml(linkedProj.name || title)}${note ? ` <em>(${escHtml(note)})</em>` : ''} ↗</span>`;
                                    }
                                    const safeTitle = String(title).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                    return `<span onclick="facetSearch.filterByLineageId('${safeTitle}')" title="Filter table by '${escAttr(title)}'" style="display:inline-block; background:rgba(139,92,246,0.18); border:1px solid rgba(139,92,246,0.35); padding:1px 6px; border-radius:10px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer;">${escHtml(title)}${note ? ` <em style="color:#c4b5fd;">(${escHtml(note)})</em>` : ''} 🔍</span>`;
                                }
                                const itemStr = String(item || '').trim();
                                const linkedProj = this._resolveProjectByRef(itemStr);
                                if (linkedProj && linkedProj.path && linkedProj.path !== project.path) {
                                    const safePath = linkedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                    return `<span onclick="facetSearch.selectAndInspectProjectByPath('${safePath}')" title="Open project: ${escAttr(linkedProj.name)} (${escAttr(itemStr)})" style="display:inline-block; background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.35); color:#7dd3fc; padding:1px 7px; border-radius:10px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer;">📁 ${escHtml(linkedProj.name || itemStr)} ↗</span>`;
                                }
                                const safeItem = itemStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                return `<span onclick="facetSearch.filterByLineageId('${safeItem}')" title="Filter table by '${escAttr(itemStr)}'" style="display:inline-block; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.12); padding:1px 7px; border-radius:10px; margin:2px 3px 2px 0; font-size:0.78rem; cursor:pointer;">${escHtml(itemStr)}</span>`;
                            }).join(' ');
                        }
                    } else if (typeof displayValue === 'object') {
                        if (window.formatDisplayValue) {
                            displayValue = escHtml(window.formatDisplayValue(field));
                        } else {
                            displayValue = '<pre style="margin: 0; font-size: 0.76rem; white-space: pre-wrap;">' + escHtml(JSON.stringify(displayValue, null, 2)) + '</pre>';
                        }
                    } else {
                        const rawStr = String(displayValue);
                        const unitStr = (field && field.unit) ? ` ${field.unit}` : '';
                        if (typeof displayValue === 'string' && window.markdownLite) {
                            if (type === 'notes' || type === 'markdown' || (type === 'textarea' && rawStr.includes('\n'))) {
                                displayValue = window.markdownLite.render(rawStr);
                            } else {
                                const renderedInline = window.markdownLite.renderInline(rawStr);
                                const matchedProj = (!rawStr.includes('[[')) ? this._resolveProjectByRef(rawStr) : null;
                                if (matchedProj && matchedProj.path && matchedProj.path !== project.path) {
                                    const safePath = matchedProj.path.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                                    const shownText = matchedProj.name && matchedProj.name !== rawStr.trim()
                                        ? `${escHtml(matchedProj.name)}${escHtml(unitStr)}`
                                        : `${renderedInline}${escHtml(unitStr)}`;
                                    displayValue = `${shownText} <span class="facet-lineage-chip" onclick="facetSearch.selectAndInspectProjectByPath('${safePath}')" title="Open matching project: ${escAttr(matchedProj.name)} (${escAttr(rawStr)})" style="display:inline-flex; align-items:center; gap:3px; background:rgba(56,189,248,0.18); border:1px solid rgba(56,189,248,0.4); color:#7dd3fc; padding:1px 6px; border-radius:10px; margin-left:4px; font-size:0.74rem; cursor:pointer;">↗ Open</span>`;
                                } else {
                                    displayValue = `${renderedInline}${escHtml(unitStr)}`;
                                }
                            }
                        } else {
                            displayValue = `${escHtml(rawStr)}${escHtml(unitStr)}`;
                        }
                    }

                    return `
                <div style="background: rgba(255,255,255,0.04); padding: 5px 9px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px;">
                    <div style="font-size: 0.7rem; color: #9ca3af; margin-bottom: 1px; text-transform: uppercase;">${escHtml(label)}</div>
                    <div style="font-size: 0.84rem; word-break: break-word;">${displayValue}</div>
                </div>
            `;
                };

                // ═══════════════════════════════════════════════════════════════════════
                // VIEW A: FILE SIDECAR ROW
                // Order: 1. Project Metadata (collapsible), 2. Sidecar Metadata (flat), 3. Project & Sidecar Info (collapsible)
                // ═══════════════════════════════════════════════════════════════════════
                if (isSidecar) {
                    const fileObj = sidecarEntry.file || {};
                    const filePath = sidecarEntry.path || fileObj.path || '';
                    const sidecarPath = sidecarEntry.sidecarPath || rowData._sidecarPath || '';
                    const escapedFilePath = (filePath || sidecarPath).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const escapedSidecarPath = sidecarPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const escapedProjPath = (project.path || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    const fileModStr = fileObj.modified ? new Date(fileObj.modified).toLocaleString() : (sidecarEntry.created ? new Date(sidecarEntry.created).toLocaleString() : '—');
                    const flatMeta = sidecarEntry.flatMeta || {};

                    // 1. Top: Collapsible Project Metadata
                    let projMetaHtml = '';
                    const projMetaSource = (project && project.metadata && Object.keys(project.metadata).length > 0)
                        ? project.metadata
                        : ((sidecarEntry.project_metadata && Object.keys(sidecarEntry.project_metadata).length > 0)
                            ? sidecarEntry.project_metadata
                            : (project && project.flatMeta ? project.flatMeta : {}));

                    if (!projMetaSource || Object.keys(projMetaSource).length === 0) {
                        projMetaHtml = `<div style="font-size: 0.8rem; color: #9ca3af; font-style: italic;">No project metadata fields found.</div>`;
                    } else {
                        for (const [key, field] of Object.entries(projMetaSource)) {
                            projMetaHtml += renderMetadataField(key, field);
                        }
                    }

                    // 2. Middle: Sidecar Metadata (flat, compact list like Project Metadata Fields)
                    let sidecarFieldsHtml = '';
                    const sidecarEntries = Object.entries(flatMeta).filter(([k, v]) =>
                        !k.startsWith('File.') &&
                        !k.startsWith('System.') &&
                        v !== undefined && v !== null && String(v).trim() !== ''
                    );

                    if (sidecarEntries.length > 0) {
                        // Combine *Unit fields onto their corresponding value (e.g. PhysicalSizeX + PhysicalSizeXUnit -> "0.108 µm")
                        const unitMap = new Map();
                        sidecarEntries.forEach(([k, v]) => {
                            if (k.endsWith('Unit')) {
                                unitMap.set(k.slice(0, -4), String(v));
                            }
                        });

                        sidecarEntries.forEach(([k, v]) => {
                            if (k.endsWith('Unit') && flatMeta[k.slice(0, -4)] !== undefined) {
                                return; // already appended to the base key
                            }
                            const label = this._formatKeyLabel(k);
                            let valStr = Array.isArray(v) ? v.join(', ') : String(v);
                            if (unitMap.has(k)) {
                                valStr = `${valStr} ${unitMap.get(k)}`;
                            }
                            sidecarFieldsHtml += renderCompactField(label, valStr);
                        });
                    } else {
                        sidecarFieldsHtml = `<div style="color: #9ca3af; font-style: italic; padding: 8px 0;">No extracted sidecar metadata fields found.</div>`;
                    }

                    // 3. Bottom: Collapsible Project & Sidecar Info
                    let sidecarInfoHtml = '';
                    sidecarInfoHtml += renderCompactField('File Name', fileObj.name || sidecarEntry.name || '—');
                    sidecarInfoHtml += renderCompactField('Extension', fileObj.extension || flatMeta['File.Extension'] || '—');
                    sidecarInfoHtml += renderCompactField('File Size', formatBytes(fileObj.size_bytes ?? flatMeta['File.Size']));
                    sidecarInfoHtml += renderCompactField('Modified', fileModStr);
                    if (fileObj.relativePath || flatMeta['File.RelativePath']) {
                        sidecarInfoHtml += renderCompactField('Relative Path', `<span style="font-family:monospace;">${fileObj.relativePath || flatMeta['File.RelativePath']}</span>`);
                    }
                    if (filePath) {
                        sidecarInfoHtml += renderCompactField('File Path', `<span style="font-family:monospace; font-size:0.78rem;">${filePath}</span>`);
                    }
                    if (sidecarPath) {
                        sidecarInfoHtml += renderCompactField('Sidecar JSON Path', `<span style="font-family:monospace; font-size:0.78rem;">${escHtml(sidecarPath)}</span>`);
                    }
                    if (project && project.path) {
                        sidecarInfoHtml += renderCompactField('Project Path', `<span style="font-family:monospace; font-size:0.78rem;">${escHtml(project.path)}</span>`);
                    }
                    const parentProjId = project.projectId || project.metafold_project_id || (project.metadata && project.metadata.metafold_project_id) || '';
                    if (parentProjId) {
                        sidecarInfoHtml += renderCompactField('Project ID', `<span style="font-family:monospace; font-size:0.75rem;">${escHtml(parentProjId)}</span> <button type="button" class="btn btn-secondary btn-sm mf-copy-btn" data-copy-text="${escAttr(parentProjId)}" style="padding: 0 4px; font-size: 0.65rem;" title="Copy Project ID">📋</button>`);
                    }
                    if (sidecarEntry.sidecar_id) {
                        sidecarInfoHtml += renderCompactField('Sidecar ID', `<span style="font-family:monospace; font-size:0.78rem;">${escHtml(sidecarEntry.sidecar_id)}</span>`);
                    }
                    if (sidecarEntry.generated_at) {
                        sidecarInfoHtml += renderCompactField('Generated At', escHtml(new Date(sidecarEntry.generated_at).toLocaleString()));
                    }
                    if (sidecarEntry.generator) {
                        sidecarInfoHtml += renderCompactField('Generator', `${escHtml(sidecarEntry.generator)}${sidecarEntry.metafold_version ? ` (v${escHtml(sidecarEntry.metafold_version)})` : ''}`);
                    }
                    if (Array.isArray(sidecarEntry.inherited_from_summary) && sidecarEntry.inherited_from_summary.length > 0) {
                        const levelsStr = sidecarEntry.inherited_from_summary.map(lvl => `${escHtml(lvl.folder || `Level ${lvl.level}`)}`).join(' → ');
                        sidecarInfoHtml += renderCompactField('Inherited Levels (ISA)', levelsStr);
                    }

                    const html = `
                <div style="margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(139, 92, 246, 0.25);">
                    <h3 style="margin: 0 0 5px 0; color: #38bdf8; font-size: 1.05rem; word-break: break-word;">📄 ${escHtml(sidecarEntry.name || 'File Sidecar')}</h3>
                    ${parentProjId ? `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 5px; font-size: 0.74rem;">
                        <span style="color: #9ca3af;">Project ID:</span>
                        <code style="font-family: monospace; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: #c4b5fd; padding: 1px 6px; border-radius: 4px; font-size: 0.72rem;">${escHtml(parentProjId)}</code>
                        <button type="button" class="btn btn-secondary btn-sm mf-copy-btn" data-copy-text="${escAttr(parentProjId)}" style="padding: 1px 4px; font-size: 0.65rem;" title="Copy Project ID">📋</button>
                    </div>` : ''}
                    <div style="font-size: 0.76rem; font-family: monospace; color: #9ca3af; word-break: break-all; margin-bottom: 5px;">${escHtml(filePath || sidecarPath || '')}</div>
                    <div style="font-size: 0.78rem; color: #c4b5fd;">📁 Project: <strong>${escHtml(project.name || 'Project')}</strong> · 📅 ${escHtml(fileModStr)}</div>
                </div>

                <!-- Quick File & Sidecar Actions -->
                <div class="facet-quick-actions" style="margin-bottom: 12px;">
                    ${(filePath || sidecarPath) ? `
                    <button class="facet-detail-action-btn facet-action-folder" onclick="window.electronAPI.showItemInFolder('${escapedFilePath}')" title="Show and highlight file in Explorer">
                        <span class="btn-icon">📂</span> Show in Explorer
                    </button>` : ''}
                    ${sidecarPath ? `
                    <button class="facet-detail-action-btn facet-action-edit" onclick="window.electronAPI.openFile('${escapedSidecarPath}')" title="Open Sidecar JSON (${escapedSidecarPath})">
                        <span class="btn-icon">📄</span> Open Sidecar JSON
                    </button>` : ''}
                    ${project && project.path ? `
                    <button class="facet-detail-action-btn facet-action-folder" onclick="facetSearch.selectAndInspectProjectByPath('${escapedProjPath}')" title="Switch to parent project details">
                        <span class="btn-icon">📁</span> Project Details
                    </button>` : ''}
                </div>

                <!-- 1. Collapsible Project Metadata -->
                <details class="facet-lineage-accordion" style="margin-bottom: 10px;">
                    <summary title="Click to expand or collapse project metadata">
                        <span><span class="accordion-arrow">▶</span>📋 Project Metadata (${escHtml(project.name || 'Project')})</span>
                    </summary>
                    <div class="facet-lineage-accordion-body" style="gap: 0; padding: 8px;">
                        ${projMetaHtml}
                    </div>
                </details>

                <!-- 2. Collapsible Sidecar Metadata -->
                <details class="facet-lineage-accordion" open style="margin-bottom: 10px;">
                    <summary title="Click to expand or collapse extracted sidecar metadata">
                        <span><span class="accordion-arrow">▶</span>📄 Sidecar Metadata</span>
                    </summary>
                    <div class="facet-lineage-accordion-body" style="gap: 0; padding: 8px;">
                        ${sidecarFieldsHtml}
                    </div>
                </details>

                <!-- 3. Collapsible Project & Sidecar Info -->
                <details class="facet-lineage-accordion" style="margin-bottom: 10px;">
                    <summary title="Click to expand or collapse general project and sidecar file info">
                        <span><span class="accordion-arrow">▶</span>ℹ️ Project &amp; Sidecar Info</span>
                    </summary>
                    <div class="facet-lineage-accordion-body" style="gap: 0; padding: 8px;">
                        ${sidecarInfoHtml}
                    </div>
                </details>
            `;

                    contentArea.innerHTML = html;
                    this._bindRightPanelInteractiveElements(contentArea, project, notesLog);
                    return;
                }

                // ═══════════════════════════════════════════════════════════════════════
                // VIEW B: PROJECT ROW
                // ═══════════════════════════════════════════════════════════════════════
                const escJs = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const escapedPath = escJs(project.path || '');
                const escapedName = escJs(project.name || 'Project');
                const createdStr = project.created ? new Date(project.created).toLocaleString() : '—';

                // Collect all links (derived_from, downstream, related_to, [[note mentions]]), tags, and note URLs/paths
                const {
                    upstreamItems,
                    downstreamProjects,
                    relatedItems,
                    tags,
                    extractedNoteLinks
                } = this._collectProjectLinksAndTags(project);
                const totalUpstreamCount = upstreamItems.length;
                const totalDownstreamCount = downstreamProjects.length;
                const totalRelatedCount = relatedItems.length;
                const totalTagsCount = tags.length;
                const hasAnyLinksOrTags = totalUpstreamCount > 0 || totalDownstreamCount > 0 || totalRelatedCount > 0 || totalTagsCount > 0 || extractedNoteLinks.length > 0;

                // Extract integration links
                const { omeroUrl, elabUrl } = this._extractUrls(project);
                let rspaceUrl = '';
                if (project.integrations && (project.integrations.rspace || project.integrations.RSpace)) {
                    const r = project.integrations.rspace || project.integrations.RSpace;
                    rspaceUrl = r.url || r.link || '';
                }

                // Build Unified "Linked Projects & Tags" Accordion body HTML
                let lineageBodyHtml = '';
                if (!hasAnyLinksOrTags) {
                    lineageBodyHtml = `<div style="font-size: 0.8rem; color: #9ca3af; font-style: italic;">No linked projects, [[note links]], or tags found yet.</div>`;
                } else {
                    if (totalUpstreamCount > 0) {
                        lineageBodyHtml += `<div style="font-size: 0.74rem; font-weight: 600; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.03em;">⬆️ Derived From (Parent Lineage) (${totalUpstreamCount})</div>`;
                        upstreamItems.forEach(item => {
                            const targetPath = item.sourcePath || '';
                            const canOpen = Boolean(targetPath);
                            const filterQuery = item.id || item.name || '';
                            const safeSrcPath = targetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            const safeFilterQuery = String(filterQuery).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            const rowClickAction = canOpen
                                ? `facetSearch.selectAndInspectProjectByPath('${safeSrcPath}')`
                                : `facetSearch.filterByLineageId('${safeFilterQuery}')`;

                            lineageBodyHtml += `
                        <div class="facet-lineage-link-item" onclick="${rowClickAction}" title="${canOpen ? `Parent project (${targetPath})` : `Filter by '${escAttr(filterQuery)}'`}">
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                <strong>${canOpen ? '📁' : '⚓'} ${escHtml(item.name)}</strong>
                                ${item.id && item.id !== item.name ? `<span style="color:#9ca3af; font-size:0.74rem; margin-left:6px;">(ID: ${escHtml(item.id)})</span>` : ''}
                                ${!canOpen ? `<span style="color:#9ca3af; font-size:0.72rem; margin-left:4px;">(External ID)</span>` : ''}
                            </div>
                            <span class="facet-lineage-actions">
                                <span class="facet-lineage-action-btn filter-btn" onclick="event.stopPropagation(); facetSearch.filterByLineageId('${safeFilterQuery}')" title="Filter table for '${escAttr(filterQuery)}'">🔍 Filter</span>
                                ${canOpen ? `<span class="facet-lineage-action-btn open-btn" onclick="event.stopPropagation(); facetSearch.selectAndInspectProjectByPath('${safeSrcPath}')" title="Open / inspect project '${escAttr(item.name)}'">↗ Open</span>` : ''}
                            </span>
                        </div>
                    `;
                        });
                    }

                    if (totalDownstreamCount > 0) {
                        lineageBodyHtml += `<div style="font-size: 0.74rem; font-weight: 600; color: #6ee7b7; text-transform: uppercase; letter-spacing: 0.03em; margin-top: ${totalUpstreamCount > 0 ? '6px' : '0'};">⬇️ Derived Projects (Child Lineage) (${totalDownstreamCount})</div>`;
                        downstreamProjects.forEach(({ project: childProj, viaId }) => {
                            const targetPath = childProj.path || '';
                            const canOpen = Boolean(targetPath);
                            const safeChildPath = targetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            const filterQuery = childProj.name || viaId || '';
                            const safeFilterQuery = String(filterQuery).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

                            lineageBodyHtml += `
                        <div class="facet-lineage-link-item" onclick="${canOpen ? `facetSearch.selectAndInspectProjectByPath('${safeChildPath}')` : `facetSearch.filterByLineageId('${safeFilterQuery}')`}" title="Derived child project (${targetPath})">
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                <strong>📁 ${escHtml(childProj.name)}</strong>
                                ${viaId && viaId !== project.name ? `<span style="color:#9ca3af; font-size:0.74rem; margin-left:6px;">(via ${escHtml(viaId)})</span>` : ''}
                            </div>
                            <span class="facet-lineage-actions">
                                <span class="facet-lineage-action-btn filter-btn" onclick="event.stopPropagation(); facetSearch.filterByLineageId('${safeFilterQuery}')" title="Filter table by '${escAttr(filterQuery)}'">🔍 Filter</span>
                                ${canOpen ? `<span class="facet-lineage-action-btn open-btn" onclick="event.stopPropagation(); facetSearch.selectAndInspectProjectByPath('${safeChildPath}')" title="Open / inspect derived project '${escAttr(childProj.name)}'">↘ Open</span>` : ''}
                            </span>
                        </div>
                    `;
                        });
                    }

                    if (totalRelatedCount > 0) {
                        lineageBodyHtml += `<div style="font-size: 0.74rem; font-weight: 600; color: #7dd3fc; text-transform: uppercase; letter-spacing: 0.03em; margin-top: ${(totalUpstreamCount + totalDownstreamCount) > 0 ? '6px' : '0'};">🔀 Related Projects (Associative &amp; [[Links]]) (${totalRelatedCount})</div>`;
                        relatedItems.forEach(item => {
                            const targetPath = item.sourcePath || '';
                            const canOpen = Boolean(targetPath);
                            const safeTargetPath = targetPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            const filterQuery = item.id || item.name || '';
                            const safeFilterQuery = String(filterQuery).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            const rowClickAction = canOpen
                                ? `facetSearch.selectAndInspectProjectByPath('${safeTargetPath}')`
                                : `facetSearch.filterByLineageId('${safeFilterQuery}')`;

                            lineageBodyHtml += `
                        <div class="facet-lineage-link-item" onclick="${rowClickAction}" title="${canOpen ? `Related project (${targetPath})` : `Filter table by '${escAttr(filterQuery)}'`}">
                            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px;">
                                <strong>${canOpen ? '📁' : '🔀'} ${escHtml(item.name)}</strong>
                                <span style="font-size: 0.68rem; color: #7dd3fc; background: rgba(56,189,248,0.12); border: 1px solid rgba(56,189,248,0.3); padding: 0 5px; border-radius: 8px; flex-shrink: 0;">${escHtml(item.originLabel)}</span>
                            </div>
                            <span class="facet-lineage-actions">
                                <span class="facet-lineage-action-btn filter-btn" onclick="event.stopPropagation(); facetSearch.filterByLineageId('${safeFilterQuery}')" title="Filter table for '${escAttr(filterQuery)}'">🔍 Filter</span>
                                ${canOpen ? `<span class="facet-lineage-action-btn open-btn" onclick="event.stopPropagation(); facetSearch.selectAndInspectProjectByPath('${safeTargetPath}')" title="Open / inspect project '${escAttr(item.name)}'">↗ Open</span>` : ''}
                            </span>
                        </div>
                    `;
                        });
                    }

                    if (totalTagsCount > 0) {
                        lineageBodyHtml += `<div style="font-size: 0.74rem; font-weight: 600; color: #2dd4bf; text-transform: uppercase; letter-spacing: 0.03em; margin-top: ${(totalUpstreamCount + totalDownstreamCount + totalRelatedCount) > 0 ? '6px' : '0'};">🏷️ Tags (${totalTagsCount})</div>`;
                        lineageBodyHtml += `<div style="display: flex; flex-wrap: wrap; gap: 5px;">`;
                        tags.forEach(({ tag }) => {
                            const safeTag = tag.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                            lineageBodyHtml += `
                        <span class="facet-tag-chip" onclick="facetSearch.filterByLineageId('${safeTag}')" title="Filter table by tag #${escAttr(tag)}" style="display:inline-flex; align-items:center; gap:4px; background:rgba(13,148,136,0.18); border:1px solid rgba(13,148,136,0.42); color:#2dd4bf; padding:2px 9px; border-radius:12px; font-size:0.78rem; cursor:pointer;">🏷️ #${escHtml(tag)}</span>
                    `;
                        });
                        lineageBodyHtml += `</div>`;
                    }

                    if (extractedNoteLinks.length > 0) {
                        lineageBodyHtml += `<div style="font-size: 0.74rem; font-weight: 600; color: #c4b5fd; text-transform: uppercase; letter-spacing: 0.03em; margin-top: 6px;">🔗 Web &amp; File Links in Notes (${extractedNoteLinks.length})</div>`;
                        lineageBodyHtml += `<div style="display: flex; flex-direction: column; gap: 4px;">`;
                        extractedNoteLinks.forEach(link => {
                            if (link.type === 'path') {
                                lineageBodyHtml += `
                            <div style="font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                                <span>📁</span>
                                <a href="#" class="mf-extracted-path-link" data-project-path="${escAttr(link.value)}" style="color: #34d399; text-decoration: underline; word-break: break-all;">${escHtml(link.label)}</a>
                            </div>
                        `;
                            } else {
                                lineageBodyHtml += `
                            <div style="font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                                <span>↗️</span>
                                <a href="#" class="mf-extracted-url-link" data-url="${escAttr(link.value)}" style="color: #c4b5fd; text-decoration: underline; word-break: break-all;">${escHtml(link.label)}</a>
                            </div>
                        `;
                            }
                        });
                        lineageBodyHtml += `</div>`;
                    }
                }

                // Subtle, compact export & visualize bar inside the right-hand Lineage section
                lineageBodyHtml += `
            <div style="display: flex; gap: 6px; margin-top: 4px; padding-top: 8px; border-top: 1px solid rgba(139, 92, 246, 0.18); flex-wrap: wrap;">
                <button class="btn btn-primary" style="flex: 1; font-size: 0.74rem; padding: 4px 8px; background: rgba(139, 92, 246, 0.28); border: 1px solid rgba(139, 92, 246, 0.55); color: #ede9fe;" onclick="facetSearch.visualizeProjectLineage('${escapedPath}')" title="Open interactive clickable Mermaid Lineage Graph focused on this project">
                    🕸️ View Lineage
                </button>
                <button class="btn btn-secondary" style="flex: 1; font-size: 0.74rem; padding: 4px 8px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.32); color: #6ee7b7;" onclick="window.roCrateManager.exportLineageRoCrate('${escapedPath}')" title="Export this project &amp; its lineage as a FAIR RO-Crate (Direct vs. Full Graph &amp; Metadata vs. Harvest)">
                    📦 RO-Crate...
                </button>
                <button class="btn btn-secondary" style="flex: 1; font-size: 0.74rem; padding: 4px 8px; background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.32); color: #c4b5fd;" onclick="window.exportLineage('${escapedPath}')" title="Export Lineage (HTML/JSON) for this project (Direct vs. Full Graph &amp; Metadata vs. Harvest)">
                    🌐 Export...
                </button>
            </div>
        `;

                // Build optional collapsible Sidecar Files list at the bottom of Project Details
                let projectSidecarsHtml = '';
                const sidecarList = project._sidecarChildren || [];
                if (sidecarList.length > 0) {
                    let itemsHtml = '';
                    sidecarList.forEach(sc => {
                        const scIdSafe = String(sc.id || sc.path || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        const scFileSafe = String(sc.path || sc.sidecarPath || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                        const scJsonSafe = String(sc.sidecarPath || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

                        itemsHtml += `
                    <div class="facet-lineage-link-item" onclick="facetSearch.inspectSidecarById('${escapedPath}', '${scIdSafe}')" title="Click to inspect sidecar metadata for '${sc.name}'">
                        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            <strong>📄 ${sc.name}</strong>
                        </div>
                        <span class="facet-lineage-actions">
                            ${scFileSafe ? `<span class="facet-lineage-action-btn open-btn" onclick="event.stopPropagation(); window.electronAPI.showItemInFolder('${scFileSafe}')" title="Show file in Explorer">📁</span>` : ''}
                            ${scJsonSafe ? `<span class="facet-lineage-action-btn filter-btn" onclick="event.stopPropagation(); window.electronAPI.openFile('${scJsonSafe}')" title="Open Sidecar JSON">📄</span>` : ''}
                        </span>
                    </div>
                `;
                    });

                    projectSidecarsHtml = `
                <details class="facet-lineage-accordion" style="margin-top: 12px;">
                    <summary title="Sidecar files in this project">
                        <span><span class="accordion-arrow">▶</span>📄 Sidecar Files (${sidecarList.length})</span>
                    </summary>
                    <div class="facet-lineage-accordion-body" style="max-height: 220px; overflow-y: auto;">
                        ${itemsHtml}
                    </div>
                </details>
            `;
                }

                const projectId = project.projectId || project.metafold_project_id || (project.metadata && project.metadata.metafold_project_id) || '';

                let html = `
            <div style="margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid rgba(139, 92, 246, 0.25);">
                <h3 style="margin: 0 0 6px 0; color: #a78bfa; font-size: 1.1rem; word-break: break-word;">📁 ${project.name || 'Project'}</h3>
                ${projectId ? `
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; font-size: 0.76rem;">
                    <span style="color: #9ca3af;">Project ID:</span>
                    <code style="font-family: monospace; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.3); color: #c4b5fd; padding: 1px 6px; border-radius: 4px; font-size: 0.74rem;">${projectId}</code>
                    <button type="button" class="btn btn-secondary btn-sm mf-copy-btn" data-copy-text="${projectId}" style="padding: 1px 5px; font-size: 0.7rem; line-height: 1; color: #c4b5fd;" title="Copy Project ID">📋</button>
                </div>` : ''}
                <div style="font-size: 0.78rem; font-family: monospace; color: #9ca3af; word-break: break-all; margin-bottom: 6px;">${project.path || ''}</div>
                <div style="font-size: 0.78rem; color: #9ca3af;">📅 Created: ${createdStr}</div>
            </div>

            <!-- Quick Project Actions -->
            <div class="facet-quick-actions" style="margin-bottom: 14px;">
                <button class="facet-detail-action-btn facet-action-folder" onclick="window.electronAPI.openFolder('${escapedPath}')" title="Open project folder in file explorer">
                    <span class="btn-icon">📂</span> Open Folder
                </button>
                <button class="facet-detail-action-btn facet-action-edit" id="facetBtnEditMetadata" title="Edit project metadata in-place">
                    <span class="btn-icon">✏️</span> Edit Metadata
                </button>
                <button class="facet-detail-action-btn facet-action-note" id="facetBtnAddNote" title="Add a structured observation or note">
                    <span class="btn-icon">➕</span> Add Note
                </button>
                ${project.hasReadme ? `
                <button class="facet-detail-action-btn facet-action-readme" onclick="window.projectScanner.openReadme('${escapedPath}', '${escapedName}')" title="Open formatted README.html">
                    <span class="btn-icon">📖</span> README.html
                </button>` : ''}
                ${omeroUrl ? `
                <button class="facet-detail-action-btn facet-action-omero" onclick="window.electronAPI.openExternal('${escJs(omeroUrl)}')" title="Open linked dataset in OMERO">
                    <span class="btn-icon">🔵</span> OMERO
                </button>` : ''}
                ${elabUrl ? `
                <button class="facet-detail-action-btn facet-action-elab" onclick="window.electronAPI.openExternal('${escJs(elabUrl)}')" title="Open linked experiment in eLabFTW">
                    <span class="btn-icon">🟢</span> eLabFTW
                </button>` : ''}
                ${rspaceUrl ? `
                <button class="facet-detail-action-btn facet-action-rspace" onclick="window.electronAPI.openExternal('${escJs(rspaceUrl)}')" title="Open linked document in RSpace">
                    <span class="btn-icon">🟠</span> RSpace
                </button>` : ''}
            </div>

            <!-- Unified Collapsible Linked Projects & Tags Accordion -->
            <details class="facet-lineage-accordion" ${hasAnyLinksOrTags ? 'open' : ''}>
                <summary title="Click to expand or collapse derived parents (↑), derived children (↓), related projects (🔀), and tags (🏷️)">
                    <span><span class="accordion-arrow">▶</span>🕸️ Linked Projects &amp; Tags</span>
                    <span style="font-size: 0.74rem; color: ${hasAnyLinksOrTags ? '#ddd6fe' : '#9ca3af'}; font-weight: 600; background: rgba(139, 92, 246, 0.2); padding: 2px 8px; border-radius: 999px;">
                        ${totalUpstreamCount} ↑ · ${totalDownstreamCount} ↓ · ${totalRelatedCount} 🔀 · ${totalTagsCount} 🏷️
                    </span>
                </summary>
                <div class="facet-lineage-accordion-body">
                    ${lineageBodyHtml}
                </div>
            </details>
        `;

                // Render Notes & Observations
                if (notesMd || notesLog.length > 0 || hypothesis) {
                    html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 14px 0 6px 0;">
                    <div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #a78bfa;">📝 Notes &amp; Observations</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="facetBtnAddNoteInline" style="padding: 1px 7px; font-size: 0.72rem; color: #34d399;">➕ Add Note</button>
                </div>
                <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; margin-bottom: 12px;">
            `;
                    if (hypothesis) {
                        const renderedGoal = window.markdownLite
                            ? window.markdownLite.renderInline(hypothesis)
                            : escHtml(hypothesis);
                        html += `
                    <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                        <strong style="color: #c4b5fd; font-size: 0.76rem; text-transform: uppercase;">🎯 Goal:</strong>
                        <div style="font-size: 0.84rem; color: #e5e7eb; margin-top: 2px;">${renderedGoal}</div>
                    </div>
                `;
                    }
                    if (notesMd) {
                        const renderedMd = window.markdownLite
                            ? window.markdownLite.render(notesMd, { interactiveTasks: true, taskScope: 'notes_markdown' })
                            : escHtml(notesMd);
                        html += `
                    <div style="font-size: 0.84rem; color: #e5e7eb; margin-bottom: 8px;">${renderedMd}</div>
                `;
                    }
                    if (notesLog.length > 0) {
                        html += `<div style="display: flex; flex-direction: column; gap: 6px;">`;
                        notesLog.forEach(note => {
                            const catIcons = { general: '📝', observation: '🔍', deviation: '⚠️', retrospective: '🔁' };
                            const icon = catIcons[note.category] || '📝';
                            const catLabel = note.category ? `${icon} ${note.category}` : '';
                            const catBadge = catLabel ? `<span style="font-size: 0.68rem; background: rgba(139, 92, 246, 0.2); color: #c4b5fd; padding: 1px 6px; border-radius: 10px; margin-right: 6px; text-transform: uppercase;">${catLabel}</span>` : '';
                            const ts = note.timestamp ? new Date(note.timestamp).toLocaleDateString() : '';
                            const user = note.user ? ` · ${note.user}` : '';
                            const renderedNote = window.markdownLite
                                ? window.markdownLite.render(note.text || '', { interactiveTasks: true, taskScope: `note:${note.id}` })
                                : escHtml(note.text || '');
                            html += `
                        <div class="mf-note-item" style="font-size: 0.82rem; background: rgba(0,0,0,0.22); border-left: 3px solid #8b5cf6; padding: 6px 8px; border-radius: 4px; position: relative;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <div style="font-size: 0.7rem; color: #9ca3af;">${catBadge}${ts}${user}</div>
                                <div style="display: flex; gap: 4px;">
                                    <button type="button" class="btn btn-secondary btn-sm mf-btn-edit-note" data-note-id="${note.id}" style="padding: 0 4px; font-size: 0.65rem;" title="Edit Note">✏️</button>
                                    <button type="button" class="btn btn-secondary btn-sm mf-btn-delete-note" data-note-id="${note.id}" style="padding: 0 4px; font-size: 0.65rem; color: #f87171;" title="Delete Note">🗑️</button>
                                </div>
                            </div>
                            <div>${renderedNote}</div>
                        </div>
                    `;
                        });
                        html += `</div>`;
                    }
                    html += `</div>`;
                } else {
                    html += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin: 14px 0 6px 0;">
                    <div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #a78bfa;">📝 Notes &amp; Observations</div>
                    <button type="button" class="btn btn-secondary btn-sm" id="facetBtnAddNoteInline" style="padding: 1px 7px; font-size: 0.72rem; color: #34d399;">➕ Add Note</button>
                </div>
                <div style="background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 6px; padding: 8px 10px; margin-bottom: 12px; font-size: 0.78rem; color: #9ca3af; font-style: italic;">
                    No notes or observations documented yet.
                </div>
            `;
                }

                // Render Metadata Fields
                html += `<div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #a78bfa; margin-bottom: 8px;">📋 Metadata Fields</div>`;

                const metaSource = project.metadata || project.flatMeta || {};
                if (!metaSource || Object.keys(metaSource).length === 0) {
                    html += `<div style="color: #9ca3af; font-style: italic; padding: 12px;">No metadata fields found.</div>`;
                } else {
                    for (const [key, field] of Object.entries(metaSource)) {
                        html += renderMetadataField(key, field);
                    }
                }

                html += projectSidecarsHtml;

                // Render System Information Accordion (Project ID, Paths, Level, etc.)
                const absPath = project.path || (project.metadata && project.metadata['System.ProjectAbsolutePath']?.value) || '';
                const relPath = (project.metadata && project.metadata['System.ProjectRelativePath']?.value) || project.relativePath || '';
                const sysLevel = (project.metadata && project.metadata['System.Level']?.value) || project.level || '';
                const prevNames = Array.isArray(project.previous_names) && project.previous_names.length > 0 ? project.previous_names.join(', ') : '';
                const modifiedStr = project.modified || project.updated_at ? new Date(project.modified || project.updated_at).toLocaleString() : '';

                html += `
            <details class="facet-lineage-accordion" style="margin-top: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 8px;">
                <summary style="font-size: 0.8rem; font-weight: 600; color: #9ca3af; cursor: pointer; user-select: none;">
                    <span><span class="accordion-arrow">▶</span>⚙️ System Information</span>
                </summary>
                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
                    ${projectId ? renderCompactField('Project ID', `<span style="font-family:monospace; font-size:0.75rem;">${projectId}</span> <button type="button" class="btn btn-secondary btn-sm mf-copy-btn" data-copy-text="${projectId}" style="padding: 0 4px; font-size: 0.65rem;" title="Copy Project ID">📋</button>`) : ''}
                    ${absPath ? renderCompactField('Absolute Path', `<span style="font-family:monospace; font-size:0.75rem;">${absPath}</span>`) : ''}
                    ${relPath ? renderCompactField('Relative Path', `<span style="font-family:monospace; font-size:0.75rem;">${relPath}</span>`) : ''}
                    ${sysLevel ? renderCompactField('ISA Level', sysLevel) : ''}
                    ${prevNames ? renderCompactField('Previous Names', prevNames) : ''}
                    ${modifiedStr ? renderCompactField('Last Updated', modifiedStr) : ''}
                </div>
            </details>
        `;

                // Render Changelog Accordion at the very bottom
                const changelog = Array.isArray(project.changelog) ? project.changelog : (Array.isArray(project.metadata && project.metadata.changelog) ? project.metadata.changelog : []);
                if (changelog.length > 0) {
                    html += `
                <details class="facet-lineage-accordion" style="margin-top: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 8px;">
                    <summary style="font-size: 0.8rem; font-weight: 600; color: #9ca3af; cursor: pointer; user-select: none;">
                        <span><span class="accordion-arrow">▶</span>🕒 Changelog (${changelog.length})</span>
                    </summary>
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
            `;
                    changelog.forEach(entry => {
                        const esc = (window.markdownLite && window.markdownLite.escapeHtml) || escHtml;
                        const ts = entry.timestamp ? esc(new Date(entry.timestamp).toLocaleString()) : '';
                        const user = entry.user ? ` · ${esc(entry.user)}` : '';
                        let details = '';
                        if (Array.isArray(entry.changes)) {
                            details = entry.changes.map(c => {
                                if (c.field === 'notes_log') {
                                    const cat = c.category ? `<span style="font-size:0.68rem; background:rgba(139,92,246,0.25); color:#c4b5fd; padding:1px 6px; border-radius:10px; margin-right:4px; text-transform:uppercase;">${esc(c.category)}</span>` : '';
                                    const textVal = esc(c.text || c.to || '');
                                    if (c.op === 'added' || c.action?.startsWith('Note Added')) {
                                        return `➕ <strong>Note added:</strong> ${cat}"${textVal}"`;
                                    } else if (c.op === 'removed' || c.action === 'Note Removed') {
                                        return `🗑️ <strong>Note removed</strong>${textVal ? `: "${textVal}"` : ''}`;
                                    } else if (c.op === 'modified' || c.action === 'Note Edited') {
                                        const fromVal = esc(c.from || '');
                                        return `✏️ <strong>Note edited:</strong> <s>"${fromVal}"</s> → <strong>"${textVal}"</strong>`;
                                    }
                                    return `📝 <strong>Note:</strong> ${esc(c.action || 'Updated')}`;
                                }
                                if (c.op === 'removed' || c.op === 'deleted') {
                                    return `🗑️ <code>${esc(c.field)}</code> removed`;
                                }
                                if (c.op === 'added') {
                                    return `➕ <code>${esc(c.field)}</code> added: <strong>${esc(c.to !== undefined ? c.to : '')}</strong>`;
                                }
                                if (c.from !== undefined || c.to !== undefined) {
                                    return `<code>${esc(c.field)}</code>: <s>${esc(c.from !== null && c.from !== undefined ? c.from : 'empty')}</s> → <strong>${esc(c.to !== null && c.to !== undefined ? c.to : 'empty')}</strong>`;
                                }
                                if (c.action) {
                                    return `<code>${esc(c.field || 'Field')}</code>: ${esc(c.action)}`;
                                }
                                return `<code>${esc(c.field || 'Field')}</code> updated`;
                            }).join(', ');
                        } else if (entry.action) {
                            details = esc(entry.action);
                        }
                        html += `
                    <div style="font-size: 0.78rem; padding: 4px 6px; border-radius: 4px; background: rgba(0,0,0,0.2);">
                        <div style="font-size: 0.68rem; color: #9ca3af;">${ts}${user}</div>
                        <div>${details}</div>
                    </div>
                `;
                    });
                    html += `</div></details>`;
                }

                contentArea.innerHTML = html;
                this._bindRightPanelInteractiveElements(contentArea, project, notesLog);
            },

    // Show Community Template details inside the exact same docked right panel on row click
    async showTemplatePreview(data) {
                if (!this.isTemplateHub || !data) return;
                this.selectedProjectPath = data.path || data._path || null;

                const contentArea = this.openRightPanel('📦 Template Details');
                if (!contentArea) return;
                contentArea.innerHTML = '<div style="text-align: center; margin-top: 40px; color: #9ca3af;">Loading Template Details...</div>';

                try {
                    const repoPath = data.path || data._path;
                    let templateData = this._templateCache[repoPath];

                    if (!templateData) {
                        const baseUrl = (window.settingsManager && window.settingsManager.settings && window.settingsManager.settings['templates.repository_url']) || 'https://raw.githubusercontent.com/ThZobel/MetaFold-Templates/main/templates-index.json';
                        const url = baseUrl.replace('/templates-index.json', '') + '/' + repoPath;
                        const response = await fetch(url);
                        if (!response.ok) throw new Error('Fetch failed');
                        templateData = await response.json();
                        this._templateCache[repoPath] = templateData;
                    }

                    let html = `<h3 style="margin: 0 0 8px 0; color: #a855f7;">${templateData.name}</h3>`;
                    if (templateData.description) {
                        html += `<p style="color: #9ca3af; font-size: 0.86rem; line-height: 1.4; margin-bottom: 14px;">${templateData.description}</p>`;
                    }

                    html += `<button onclick="window.app.downloadAndInstallTemplate('${repoPath}')" style="width:100%; padding:10px; background:#7c3aed; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; margin-bottom: 18px;">📥 Install Template</button>`;

                    html += `<div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #a78bfa; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-bottom: 12px;">Fields &amp; Options</div>`;

                    const metadata = templateData.metadata || {};
                    const fieldsObj = metadata.fields || {};
                    const fieldOrder = metadata.fieldOrder || Object.keys(fieldsObj);

                    if (fieldOrder.length > 0) {
                        fieldOrder.forEach(fieldId => {
                            const field = fieldsObj[fieldId];
                            if (!field) return;

                            if (field.type === 'group') {
                                html += `<div style="margin-top: 14px; margin-bottom: 8px; font-weight:bold; color:#a855f7; border-bottom:1px solid rgba(168,85,247,0.3); padding-bottom:4px; font-size:0.84rem;">📁 ${field.label || fieldId}</div>`;
                                return;
                            }

                            html += `<div style="margin-bottom: 10px; background: rgba(0,0,0,0.18); padding: 9px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">`;
                            html += `<div style="font-weight:600; font-size:0.85rem;">${field.label || fieldId} <span style="font-size:0.72rem; color:#9ca3af; font-weight:normal; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px; margin-left:5px;">${field.type}</span></div>`;

                            if (field.description) {
                                html += `<div style="font-size:0.8rem; color:#9ca3af; margin-top:4px;">${field.description}</div>`;
                            }

                            if (field.options && Array.isArray(field.options)) {
                                html += `<div style="margin-top:6px; display:flex; flex-wrap:wrap; gap:4px;">`;
                                field.options.forEach(opt => {
                                    html += `<span style="font-size:0.75rem; background:rgba(124,58,237,0.2); color:#d8b4fe; border:1px solid rgba(124,58,237,0.4); padding:2px 8px; border-radius:12px;">${opt}</span>`;
                                });
                                html += `</div>`;
                            }

                            html += `</div>`;
                        });
                    } else {
                        html += `<div style="color:#9ca3af; font-style:italic;">No fields defined.</div>`;
                    }

                    if (templateData.structure) {
                        html += `<div style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; color: #a78bfa; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px; margin-top: 20px; margin-bottom: 12px;">Folder Structure</div>`;
                        if (window.templateManager && window.templateManager.parseAndRenderFolderTree) {
                            html += `<div style="background: rgba(0,0,0,0.18); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); overflow-x: auto;">`;
                            html += window.templateManager.parseAndRenderFolderTree(templateData.structure);
                            html += `</div>`;
                        } else {
                            html += `<pre style="background: rgba(0,0,0,0.18); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); font-family: monospace; font-size: 0.8rem; white-space: pre-wrap; word-break: break-all;">${templateData.structure}</pre>`;
                        }
                    }

                    contentArea.innerHTML = html;
                } catch (error) {
                    contentArea.innerHTML = `<div style="color:#ef4444; padding:20px;">Error loading template details: ${error.message}</div>`;
                }
            },

            // Open the facet search modal
            openModal() {
                const modal = document.getElementById('facetSearchModal');
                if (modal) {
                    modal.style.display = 'flex';
                    document.body.style.overflow = 'hidden';
                    this._initColumnSplitters();
                }
            },

            // Launch File Sidecar Scanner Wizard directly from Facet Search
            openFileScanner() {
                this.closeScanOptionsDropdown();
                this.closeRightPanel();
                this.closeExportDropdown();

                // Flag to prevent switchMainTab('discover') from re-opening facet search table
                window._isLaunchingFileScanner = true;

                const modal = document.getElementById('facetSearchModal');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
                if (this.tabulatorInstance) {
                    this._syncColumnStateFromTabulator(true, null);
                    this.tabulatorInstance.destroy();
                    this.tabulatorInstance = null;
                }
                this.masterData = [];
                this.activeFilters = {};
                this.textSearchQuery = '';
                this._hasFileSidecars = false;
                this.isTemplateHub = false;

                // Switch main tab to discover and launch wizard
                if (typeof window.switchMainTab === 'function') {
                    window.switchMainTab('discover');
                }

                if (window.fileScanner && typeof window.fileScanner.startWizard === 'function') {
                    window.fileScanner.startWizard();
                }

                setTimeout(() => {
                    window._isLaunchingFileScanner = false;
                }, 600);
            },

    // Close the facet search modal and clean up Tabulator (prompting to save temporary scan if needed)
    async closeSearch(options = {}) {
                await this.promptUnsavedScanIfNeeded();
                this.closeRightPanel();
                this.closeScanOptionsDropdown();
                this.closeExportDropdown();

                const modal = document.getElementById('facetSearchModal');
                if (modal) {
                    modal.style.display = 'none';
                    document.body.style.overflow = '';
                }
                // Persist current column order, widths, and sorters before destroying Tabulator
                if (this.tabulatorInstance) {
                    this._syncColumnStateFromTabulator(true, null);
                    this.tabulatorInstance.destroy();
                    this.tabulatorInstance = null;
                }
                this.masterData = [];
                this.activeFilters = {};
                this.textSearchQuery = '';
                this._hasFileSidecars = false;
                this.isTemplateHub = false;

                // Return to Create Project tab (unless an explicit action like launching fileScanner or switching to another tab is active)
                if (!window._isLaunchingFileScanner && !options.skipTabSwitch && typeof window.switchMainTab === 'function') {
                    const targetTab = options.targetTab || 'create';
                    window.switchMainTab(targetTab);
                }
            },

            // Close on overlay click (outside modal window)
            handleOverlayClick(event) {
                if (event.target === document.getElementById('facetSearchModal')) {
                    this.closeSearch();
                }
            }
        };

        // Export to window
        window.facetSearch = facetSearch;
