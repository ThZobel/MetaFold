// ============================================================
//  MetaFold – File Sidecar Scanner (fileScanner.js)
//  Finds microscopy files, inherits project metadata from parent
//  folders, optionally reads OME-XML via BioFormats CLI,
//  and writes a JSON sidecar next to each file.
// ============================================================

const fileScanner = {

    // ─── State ────────────────────────────────────────────────────
    initialized: false,
    currentScanDir: null,      // folder to scan for microscopy files
    currentRootDir: null,      // investigation root (metadata inheritance)
    skipInheritance: false,    // true → no parent metadata
    scanResults: [],           // array of { file, sidecar, status, error }
    _aborted: false,

    // ─── Init ──────────────────────────────────────────────────────
    init() {
        if (this.initialized) return;
        this.initialized = true;

        // Listen for settings loaded event (to update visibility after settings manager finishes initialization)
        window.addEventListener('settingsLoaded', () => {
            console.log('🔬 FileScanner: Settings loaded event received');
            this._applyVisibility();
        });

        // Listen for settings changed event
        window.addEventListener('settingsChanged', (e) => {
            if (e.detail && e.detail.key === 'plugins.filescanner_enabled') {
                this._applyVisibility();
            }
        });

        this._applyVisibility();
        console.log('🔬 FileScanner initialized');
    },

    // Show or hide the discover-tab tile based on settings
    async _applyVisibility() {
        const enabled = await this._getSetting('plugins.filescanner_enabled', true);
        const tile = document.getElementById('fileScannerTile');
        if (tile) tile.style.display = enabled ? '' : 'none';

        // Always keep the sidecar checkbox in Scan Options visible so existing sidecars are discovered
        const sidecarLabel = document.getElementById('includeFileSidecarsLabel');
        if (sidecarLabel) sidecarLabel.style.display = 'flex';
    },

    // ─── Settings helpers ─────────────────────────────────────────
    async _getSetting(key, fallback = null) {
        try {
            if (window.settingsManager && window.settingsManager.get) {
                const val = await window.settingsManager.get(key);
                return val !== undefined && val !== null ? val : fallback;
            }
        } catch (_) { }
        return fallback;
    },

    async _getExtensions() {
        try {
            const raw = await this._getSetting(
                'plugins.filescanner_extensions',
                JSON.stringify(['.lif', '.czi', '.lsm', '.nd2', '.tif', '.tiff', '.ome.tif', '.oif', '.oib', '.vsi', '.svs', '.ims', '.zvi', '.lof'])
            );
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return ['.lif', '.czi', '.lsm', '.nd2', '.tif', '.tiff'];
        }
    },

    async _bioformatsEnabled() {
        return await this._getSetting('plugins.bioformats_enabled', false);
    },

    async _bioformatsPath() {
        const raw = await this._getSetting('plugins.bioformats_path', '') || '';
        return typeof raw === 'string' ? raw.trim().replace(/^"+|"+$/g, '') : '';
    },

    // ─── Container management ──────────────────────────────────────
    _getContainer() {
        return document.getElementById('fileScannerContainer');
    },

    _showContainer() {
        const tiles = document.getElementById('discoveryTiles');
        const container = this._getContainer();
        if (tiles) tiles.style.display = 'none';
        if (container) {
            container.style.display = 'flex';
            container.classList.add('active');
        }
    },

    _hideContainer() {
        const tiles = document.getElementById('discoveryTiles');
        const container = this._getContainer();
        if (tiles) tiles.style.display = '';
        if (container) {
            container.style.display = 'none';
            container.classList.remove('active');
        }
    },

    // ─── Public entry point ────────────────────────────────────────
    async startWizard() {
        this._aborted = false;
        this.currentScanDir = null;
        this.currentRootDir = null;
        this.skipInheritance = false;
        this.scanResults = [];
        this._showContainer();
        await this._renderWizard(1);
    },

    closeScanner() {
        this._aborted = true;
        this._hideContainer();
        if (window.facetSearch && window.facetSearch.openFromUserIndex) {
            window.facetSearch.openFromUserIndex();
        }
    },

    // ─── Wizard Rendering ──────────────────────────────────────────
    async _renderWizard(activeStep) {
        const container = this._getContainer();
        if (!container) return;

        const bfActive = await this._bioformatsEnabled();
        let bfBadge = `<span class="fsc-badge fsc-badge-grey">⬜ File info only</span>`;
        if (bfActive) {
            const bfPath = await this._bioformatsPath();
            try {
                const detect = await window.electronAPI?.detectBioFormats?.(bfPath || undefined);
                if (detect && detect.found) {
                    bfBadge = `<span class="fsc-badge fsc-badge-green" title="${detect.path}">🔬 BioFormats active</span>`;
                } else {
                    bfBadge = `<span class="fsc-badge fsc-badge-yellow" title="BioFormats CLI (showinf) not found on system">⚠️ CLI not found (<a href="#" onclick="fileScanner._openPluginSettings(); return false;" style="color:#f59e0b; text-decoration:underline;">Settings</a>)</span>`;
                }
            } catch (_) {
                bfBadge = `<span class="fsc-badge fsc-badge-green">🔬 BioFormats active</span>`;
            }
        }

        const exts = await this._getExtensions();

        container.innerHTML = `
            <div class="fsc-wizard">
                <!-- Stepper -->
                <div class="fsc-stepper">
                    <div class="fsc-step ${activeStep >= 1 ? 'active' : ''} ${activeStep > 1 ? 'done' : ''}">
                        <div class="fsc-step-num">${activeStep > 1 ? '✓' : '1'}</div>
                        <span>Scan Folder</span>
                    </div>
                    <div class="fsc-step-sep"></div>
                    <div class="fsc-step ${activeStep >= 2 ? 'active' : ''} ${activeStep > 2 ? 'done' : ''}">
                        <div class="fsc-step-num">${activeStep > 2 ? '✓' : '2'}</div>
                        <span>Metadata Inheritance (Optional)</span>
                    </div>
                    <div class="fsc-step-sep"></div>
                    <div class="fsc-step ${activeStep >= 3 ? 'active' : ''}">
                        <div class="fsc-step-num">3</div>
                        <span>Confirm &amp; Start</span>
                    </div>
                </div>

                <!-- Step 1: Scan folder -->
                <div class="fsc-wizard-body">
                    <div class="fsc-step-panel ${activeStep === 1 ? 'active' : ''}" id="fscPanel1">
                        <p class="fsc-step-title">📁 Select Scan Folder</p>
                        <p class="fsc-step-desc">Select the folder containing your microscopy files. All subfolders will be scanned recursively.</p>
                        <div class="fsc-path-row">
                            <div class="fsc-path-input ${this.currentScanDir ? '' : 'placeholder'}" id="fscScanDirDisplay">
                                ${this.currentScanDir || 'No folder selected yet…'}
                            </div>
                            <button class="fsc-btn fsc-btn-primary" onclick="fileScanner._pickScanDir()">
                                📁 Choose Folder
                            </button>
                        </div>
                        <p class="fsc-step-desc" style="margin-top:12px; font-size:0.8rem;">
                            Target file types: <code>${exts.join(', ')}</code><br>
                            <a href="#" onclick="fileScanner._openPluginSettings(); return false;" style="color:#10b981; font-size:0.78rem;">
                                Configure file types (Settings → Plugins)
                            </a>
                        </p>
                    </div>

                    <!-- Step 2: Inheritance -->
                    <div class="fsc-step-panel ${activeStep === 2 ? 'active' : ''}" id="fscPanel2">
                        <p class="fsc-step-title">🧬 Metadata Inheritance (Optional)</p>
                        <p class="fsc-step-desc">From which parent folder should project metadata be inherited? All folders <em>between</em> this root and the scan folder will be checked for MetaFold metadata and merged into the sidecar.</p>
                        <div class="fsc-path-row">
                            <div class="fsc-path-input ${this.currentRootDir ? '' : 'placeholder'}" id="fscRootDirDisplay">
                                ${this.currentRootDir || 'No root folder selected yet…'}
                            </div>
                            <button class="fsc-btn fsc-btn-primary" onclick="fileScanner._pickRootDir()">
                                📁 Choose Root Folder
                            </button>
                        </div>
                        <div class="fsc-inherit-hint">
                            <strong>Example:</strong> Scan folder = <code>/data/Exp1/Condition_A</code><br>
                            Root folder = <code>/data</code><br>
                            → MetaFold reads metadata from <code>/data</code>, <code>/data/Exp1</code>, and <code>/data/Exp1/Condition_A</code>
                            and writes the combined metadata into the sidecar.
                        </div>
                    </div>

                    <!-- Step 3: Confirm -->
                    <div class="fsc-step-panel ${activeStep === 3 ? 'active' : ''}" id="fscPanel3">
                        <p class="fsc-step-title">✅ Confirm &amp; Start Scan</p>
                        <div class="fsc-summary" id="fscConfirmSummary">
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">Scan Folder</span>
                                <span class="fsc-summary-value">${this.currentScanDir || '—'}</span>
                            </div>
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">Root / Inheritance</span>
                                <span class="fsc-summary-value">
                                    ${this.skipInheritance
                ? '<span class="fsc-badge fsc-badge-grey">Skipped</span>'
                : (this.currentRootDir || '—')}
                                </span>
                            </div>
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">BioFormats OME-XML</span>
                                <span class="fsc-summary-value">${bfBadge}</span>
                            </div>
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">Sidecar Location</span>
                                <span class="fsc-summary-value">Visible subfolder (<code>.metafold/sidecars/&lt;filename&gt;.metafold-sidecar.json</code>)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="fsc-wizard-nav">
                    <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.closeScanner()">
                        ✕ Cancel
                    </button>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${activeStep === 2 ? `
                            <button class="fsc-btn fsc-btn-secondary fsc-btn-skip" onclick="fileScanner._skipInheritance()">
                                ⏭ Skip (no inheritance)
                            </button>
                        ` : ''}
                        ${activeStep > 1 ? `
                            <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner._renderWizard(${activeStep - 1})">
                                ← Back
                            </button>
                        ` : ''}
                        ${activeStep < 3 ? `
                            <button class="fsc-btn fsc-btn-primary" id="fscNextBtn"
                                ${(!this.currentScanDir && activeStep === 1) ? 'disabled' : ''}
                                onclick="fileScanner._wizardNext(${activeStep})">
                                Next →
                            </button>
                        ` : `
                            <button class="fsc-btn fsc-btn-primary" onclick="fileScanner._startScan()">
                                🚀 Start Scan
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    // ─── Wizard navigation ─────────────────────────────────────────
    async _pickScanDir() {
        const dir = await window.electronAPI.selectFolder();
        if (!dir) return;
        this.currentScanDir = dir;
        await this._renderWizard(1);
    },

    async _pickRootDir() {
        const dir = await window.electronAPI.selectFolder();
        if (!dir) return;
        this.currentRootDir = dir;
        await this._renderWizard(2);
    },

    async _skipInheritance() {
        this.skipInheritance = true;
        this.currentRootDir = null;
        await this._renderWizard(3);
    },

    async _wizardNext(current) {
        if (current === 1) {
            if (!this.currentScanDir) return;
            this.skipInheritance = false;
            await this._renderWizard(2);
        } else if (current === 2) {
            // Root folder must be selected (or skip clicked)
            if (!this.currentRootDir && !this.skipInheritance) {
                alert('Please select a root folder or click "Skip".');
                return;
            }
            await this._renderWizard(3);
        }
    },

    _openPluginSettings() {
        if (typeof switchSettingsTab === 'function') {
            if (typeof openSettingsModal === 'function') openSettingsModal();
            switchSettingsTab('plugins');
        }
    },

    // ─── Main Scan ─────────────────────────────────────────────────
    async _startScan() {
        if (!this.currentScanDir) return;
        this._aborted = false;
        this.scanResults = [];

        const container = this._getContainer();
        if (!container) return;

        // Step 1: Find files
        const exts = await this._getExtensions();
        this._renderProgress(0, 0, 'Searching for files…');

        const listResult = await window.electronAPI.listFilesRecursive(this.currentScanDir, exts);
        if (!listResult.success) {
            this._renderError(`Error searching files: ${listResult.message}`);
            return;
        }

        const files = listResult.files;
        if (files.length === 0) {
            this._renderEmpty();
            return;
        }

        const total = files.length;
        let bfEnabled = await this._bioformatsEnabled();
        let bfPath = await this._bioformatsPath();

        // Check if BioFormats CLI actually exists before attempting to read each file
        if (bfEnabled) {
            try {
                const detect = await window.electronAPI?.detectBioFormats?.(bfPath || undefined);
                if (detect && detect.found) {
                    bfPath = detect.path;
                } else {
                    console.warn('⚠️ BioFormats enabled but showinf executable not found on system.');
                    if (window.projectManager && typeof window.projectManager.showWarning === 'function') {
                        window.projectManager.showWarning('⚠️ BioFormats CLI (showinf.bat) not found on system. Scanning in "File info only" mode. To extract OME-XML, please configure BioFormats in Settings → Plugins.');
                    }
                    bfEnabled = false;
                }
            } catch (err) {
                console.warn('⚠️ BioFormats detect check error:', err);
            }
        }

        const sep = window.electronAPI.platform === 'win32' ? '\\' : '/';
        const usedSidecarPaths = new Set();
        const ensuredSidecarDirs = new Set();
        const affectedProjectDirs = new Set();

        // Step 2: Process each file
        for (let i = 0; i < files.length; i++) {
            if (this._aborted) break;

            const fileInfo = files[i];
            this._renderProgress(i + 1, total, fileInfo.name);

            try {
                // 2a: Inherit project metadata from parent folders
                const projectMetadata = this.skipInheritance
                    ? { inherited_from: [], merged: {} }
                    : await this._inheritMetadata(fileInfo.path, this.currentRootDir || this.currentScanDir);

                // 2b: Read OME-XML if BioFormats enabled
                let omeJson = null;
                let omeError = null;
                if (bfEnabled) {
                    const omeResult = await window.electronAPI.readOmeXml(fileInfo.path, bfPath || undefined);
                    if (omeResult.success) {
                        omeJson = omeResult.omeJson;
                    } else {
                        omeError = omeResult.message;
                    }
                }

                // 2c: Build sidecar
                const sidecar = this._buildSidecar(fileInfo, projectMetadata, omeJson);

                // 2d: Write sidecar into a visible (non-hidden) .metafold/sidecars subfolder
                //     inside the nearest enclosing MetaFold project (or currentScanDir if none).
                const nearestProj = (projectMetadata.inherited_from && projectMetadata.inherited_from.length > 0)
                    ? projectMetadata.inherited_from[projectMetadata.inherited_from.length - 1]
                    : null;
                const sidecarBaseDir = (nearestProj && nearestProj.path) ? nearestProj.path : this.currentScanDir;
                if (nearestProj && nearestProj.path) {
                    affectedProjectDirs.add(nearestProj.path);
                }

                const cleanBase = sidecarBaseDir.replace(/[\\/]$/, '');
                const sidecarDir = `${cleanBase}${sep}.metafold${sep}sidecars`;
                if (!ensuredSidecarDirs.has(sidecarDir.toLowerCase())) {
                    await window.electronAPI.ensureDir(sidecarDir);
                    ensuredSidecarDirs.add(sidecarDir.toLowerCase());
                }

                let sidecarFileName = `${fileInfo.name}.metafold-sidecar.json`;
                let sidecarPath = `${sidecarDir}${sep}${sidecarFileName}`;

                // Disambiguate if two files with the same name exist in different subfolders of the same project
                if (usedSidecarPaths.has(sidecarPath.toLowerCase())) {
                    const relFile = this._toRelativePath(fileInfo.path, sidecarBaseDir) || fileInfo.name;
                    const safeRel = relFile.replace(/[\\/]+/g, '__');
                    sidecarFileName = `${safeRel}.metafold-sidecar.json`;
                    sidecarPath = `${sidecarDir}${sep}${sidecarFileName}`;
                }
                usedSidecarPaths.add(sidecarPath.toLowerCase());

                const writeResult = await window.electronAPI.writeFile(
                    sidecarPath,
                    JSON.stringify(sidecar, null, 2)
                );

                this.scanResults.push({
                    file: fileInfo,
                    sidecarPath,
                    status: writeResult && writeResult.success !== false ? 'ok' : 'write_error',
                    omeError,
                    parentCount: projectMetadata.inherited_from.length,
                    omeFields: omeJson ? Object.keys(omeJson).filter(k => !k.startsWith('_')).length : 0
                });

            } catch (err) {
                console.error(`❌ FileScanner error for ${fileInfo.name}:`, err);
                this.scanResults.push({
                    file: fileInfo,
                    status: 'error',
                    error: err.message
                });
            }
        }

        // Automatically refresh affected projects in user_index.json so sidecars immediately appear in Search & Scan
        if (window.electronAPI?.upsertUserIndexProject) {
            const userInfo = window.userManager?.getCurrentUserInfo?.() || null;
            if (affectedProjectDirs.size === 0 && this.currentScanDir) {
                affectedProjectDirs.add(this.currentScanDir);
            }
            for (const projDir of affectedProjectDirs) {
                try {
                    await window.electronAPI.upsertUserIndexProject(projDir, this.currentRootDir || null, userInfo);
                } catch (_) { }
            }
            if (window.projectScanner?.updateIndexBadge) {
                await window.projectScanner.updateIndexBadge();
            }
        }

        this._renderResults();
    },

    // ─── Metadata Inheritance ──────────────────────────────────────
    async _inheritMetadata(filePath, rootDir) {
        // Build list of parent directories from filePath up to rootDir (inclusive)
        const sep = window.electronAPI.platform === 'win32' ? '\\' : '/';
        const fileDir = filePath.includes(sep)
            ? filePath.substring(0, filePath.lastIndexOf(sep))
            : filePath.substring(0, filePath.lastIndexOf('/'));

        const pathsToCheck = [];
        let current = fileDir;

        // Walk up from fileDir to rootDir
        const normalizeP = p => p.replace(/\\/g, '/').toLowerCase().replace(/\/$/, '');
        const rootNorm = normalizeP(rootDir);

        while (true) {
            pathsToCheck.unshift(current); // prepend so order is root → child
            const norm = normalizeP(current);
            if (norm === rootNorm) break;

            // Move up one level
            const parentSep = current.lastIndexOf('\\') > current.lastIndexOf('/')
                ? '\\'
                : '/';
            const parentPos = Math.max(current.lastIndexOf('\\'), current.lastIndexOf('/'));
            if (parentPos <= 0) break;
            const parent = current.substring(0, parentPos);
            if (normalizeP(parent) === norm) break; // no progress → stop
            current = parent;
        }

        const inherited_from = [];
        const merged = {};

        for (const dir of pathsToCheck) {
            // Try to read *-metadata.json from this directory
            try {
                // List files in dir and find *-metadata.json
                const listRes = await window.electronAPI.listDirFiles(dir);
                let metaFileName = null;
                if (listRes && listRes.files) {
                    metaFileName = listRes.files.find(f => f.endsWith('-metadata.json'));
                }

                if (metaFileName) {
                    const sep2 = dir.includes('\\') ? '\\' : '/';
                    const fullMetaPath = dir + (dir.endsWith('\\') || dir.endsWith('/') ? '' : sep2) + metaFileName;
                    const loadRes = await window.electronAPI.loadJsonPath(fullMetaPath);
                    if (loadRes && loadRes.success && loadRes.data) {
                        const folderName = dir.split(/[/\\]/).pop();
                        const level = pathsToCheck.indexOf(dir) + 1;
                        // Provenance: which project (by stable UUID) this level's metadata
                        // came from, and its path relative to rootDir (portable across
                        // machines/mounted drives). projectId is null for projects created
                        // before metafold_project_id existed — falls back to path-based
                        // matching further downstream in that case.
                        inherited_from.push({
                            level,
                            folder: folderName,
                            path: dir,
                            relativePath: this._toRelativePath(dir, rootDir),
                            projectId: loadRes.data.metafold_project_id || null,
                            metadata: loadRes.data
                        });
                        // Merge: later (closer to file) overrides earlier
                        Object.assign(merged, loadRes.data);
                    }
                }
            } catch (_) {
                // directory not readable or no metadata file – continue
            }
        }

        return { inherited_from, merged };
    },

    // ─── Sidecar builder ──────────────────────────────────────────
    _buildSidecar(fileInfo, projectMetadata, omeJson) {
        // Reference point for relative paths: the inheritance root chosen in
        // wizard step 2, or the scan dir if inheritance was skipped. Relative
        // paths keep sidecars portable across machines / mounted drives.
        const baseDir = this.currentRootDir || this.currentScanDir;

        // Convenience pointer to the closest enclosing MetaFold project (last
        // entry in inherited_from = nearest to the file). Lets the Project
        // Scanner match this sidecar to a project by stable UUID instead of
        // directory containment alone — sidecars can live far outside any
        // project folder's own subtree.
        const nearest = (projectMetadata.inherited_from && projectMetadata.inherited_from.length > 0)
            ? projectMetadata.inherited_from[projectMetadata.inherited_from.length - 1]
            : null;

        return {
            metafold_version: '0.0.3',
            sidecar_id: this._generateUuid(),
            sidecar_type: 'file',
            generated_at: new Date().toISOString(),
            generator: 'MetaFold File Scanner',
            file: {
                name: fileInfo.name,
                path: fileInfo.path,
                relativePath: this._toRelativePath(fileInfo.path, baseDir),
                extension: fileInfo.extension,
                size_bytes: fileInfo.size_bytes,
                modified: fileInfo.modified
            },
            nearest_project_id: nearest ? nearest.projectId : null,
            project_metadata: projectMetadata,
            ...(omeJson ? { ome_metadata: omeJson } : {})
        };
    },

    // Generate a v4 UUID. Electron's bundled Chromium supports
    // window.crypto.randomUUID() natively; fallback only matters if that's
    // ever unavailable.
    _generateUuid() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return window.crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    // Convert an absolute path to a path relative to basePath (forward-slash
    // normalized — stable across Windows/macOS/Linux). Falls back to the
    // absolute path if fullPath isn't actually inside basePath.
    _toRelativePath(fullPath, basePath) {
        if (!fullPath || !basePath) return null;
        const norm = p => p.replace(/\\/g, '/').replace(/\/$/, '');
        const f = norm(fullPath);
        const b = norm(basePath);
        if (f.toLowerCase() === b.toLowerCase()) return '.';
        if (f.toLowerCase().startsWith(b.toLowerCase() + '/')) {
            return f.substring(b.length + 1);
        }
        return fullPath; // not a descendant of basePath — keep absolute as fallback
    },

    // ─── UI: Progress ──────────────────────────────────────────────
    _renderProgress(current, total, fileName) {
        const container = this._getContainer();
        if (!container) return;

        const pct = total > 0 ? Math.round((current / total) * 100) : 0;

        container.innerHTML = `
            <div class="fsc-wizard">
                <div class="fsc-progress-wrapper">
                    <div class="fsc-progress-title">
                        <div class="fsc-spinner"></div>
                        🔬 Processing files…
                    </div>
                    <div class="fsc-progress-bar-wrap">
                        <div class="fsc-progress-bar" style="width:${pct}%"></div>
                    </div>
                    <div class="fsc-progress-stats">
                        <span>${current} / ${total} files</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="fsc-progress-current-file" title="${fileName}">
                        📄 ${fileName}
                    </div>
                    <div style="margin-top:16px;">
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner._aborted=true; fileScanner.closeScanner()">
                            ✕ Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // ─── UI: Results ───────────────────────────────────────────────
    _renderResults() {
        const container = this._getContainer();
        if (!container) return;

        const ok = this.scanResults.filter(r => r.status === 'ok').length;
        const err = this.scanResults.filter(r => r.status !== 'ok').length;
        const withOme = this.scanResults.filter(r => r.omeFields > 0).length;

        // Trigger bottom success bar (action bar) with "Open Folder" button
        if (window.projectManager && typeof window.projectManager.showEnhancedSuccess === 'function') {
            const successMsg = `🔬 <strong>File Scan completed:</strong> ${ok} file-based sidecars successfully created.`;
            window.projectManager.showEnhancedSuccess(successMsg, this.currentScanDir);
        }

        // Ensure footer action buttons remain hidden in Discover tab
        if (typeof window.updateFooterVisibility === 'function') {
            window.updateFooterVisibility();
        }

        const rows = this.scanResults.map(r => {
            const icon = r.status === 'ok' ? '✅' : '❌';
            const rowClass = r.status !== 'ok' ? 'fsc-row-error' : '';
            const sizeFmt = r.file ? this._formatSize(r.file.size_bytes) : '—';
            const omeInfo = r.omeError
                ? `<span style="color:#f87171">⚠ ${r.omeError.substring(0, 50)}</span>`
                : (r.omeFields > 0 ? `✅ ${r.omeFields} fields` : '—');
            const parentInfo = r.parentCount !== undefined ? `${r.parentCount} level(s)` : '—';

            return `
                <tr class="${rowClass}">
                    <td class="fsc-col-status">${icon}</td>
                    <td class="fsc-col-name" title="${r.file ? r.file.name : ''}">${r.file ? r.file.name : 'Error'}</td>
                    <td class="fsc-col-size">${sizeFmt}</td>
                    <td>${parentInfo}</td>
                    <td class="fsc-col-ome">${omeInfo}</td>
                    <td class="fsc-col-path" title="${r.file ? r.file.path : ''}">${r.file ? r.file.path : (r.error || '')}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="fsc-wizard fsc-results">
                <div class="fsc-results-header">
                    <div class="fsc-results-title">
                        📋 Scan Completed
                    </div>
                    <div class="fsc-results-actions">
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner._exportResultsCsv()">
                            📥 CSV Export
                        </button>
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.startWizard()">
                            🔄 New Scan
                        </button>
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.closeScanner()">
                            ✕ Close
                        </button>
                    </div>
                </div>
                <div class="fsc-results-summary-strip">
                    <span>✅ ${ok} succeeded</span>
                    ${err > 0 ? `<span style="color:#f87171">❌ ${err} error(s)</span>` : ''}
                    ${withOme > 0 ? `<span>🔬 ${withOme} with OME-XML</span>` : ''}
                    <span>📁 ${this.currentScanDir}</span>
                </div>
                <div class="fsc-results-table-wrap">
                    <table class="fsc-results-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Filename</th>
                                <th>Size</th>
                                <th>Inherited Folders</th>
                                <th>OME-XML</th>
                                <th>Path</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    _renderEmpty() {
        const container = this._getContainer();
        if (!container) return;
        container.innerHTML = `
            <div class="fsc-wizard">
                <div class="fsc-progress-wrapper" style="text-align:center; padding:40px;">
                    <div style="font-size:2.5rem; margin-bottom:12px;">🔍</div>
                    <p style="color:#e5e7eb; font-weight:600; margin-bottom:8px;">No files found</p>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:20px;">
                        No files matching the configured extensions were found in folder <code>${this.currentScanDir}</code>.
                    </p>
                    <button class="fsc-btn fsc-btn-primary" onclick="fileScanner.startWizard()">
                        🔄 Choose another folder
                    </button>
                </div>
            </div>
        `;
    },

    _renderError(msg) {
        const container = this._getContainer();
        if (!container) return;
        container.innerHTML = `
            <div class="fsc-wizard">
                <div class="fsc-progress-wrapper" style="text-align:center; padding:40px;">
                    <div style="font-size:2.5rem; margin-bottom:12px;">❌</div>
                    <p style="color:#f87171; font-weight:600; margin-bottom:8px;">Scan Error</p>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:20px;">${msg}</p>
                    <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.startWizard()">
                        ← Back
                    </button>
                </div>
            </div>
        `;
    },

    // ─── CSV Export ────────────────────────────────────────────────
    _exportResultsCsv() {
        const header = ['Status', 'Filename', 'Path', 'Size (Bytes)', 'Inherited Folders', 'OME Fields', 'Error'];
        const rows = this.scanResults.map(r => [
            r.status === 'ok' ? 'OK' : 'ERROR',
            r.file ? r.file.name : '',
            r.file ? r.file.path : '',
            r.file ? r.file.size_bytes : '',
            r.parentCount ?? '',
            r.omeFields ?? '',
            r.error || r.omeError || ''
        ]);

        const csvContent = '\uFEFF' + [header, ...rows]
            .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\r\n');

        // Use electronAPI to save
        if (window.electronAPI && window.electronAPI.saveJsonFile) {
            // Fallback: create blob link
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `metafold-filescan-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // ─── Utilities ────────────────────────────────────────────────
    _formatSize(bytes) {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

};

// Auto-init after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => fileScanner.init());
} else {
    fileScanner.init();
}

window.fileScanner = fileScanner;
