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
        const enabled = await this._getSetting('plugins.filescanner_enabled', false);
        const tile = document.getElementById('fileScannerTile');
        if (tile) tile.style.display = enabled ? '' : 'none';

        // Also show/hide the sidecar checkbox in the Scan Projects tile
        const sidecarLabel = document.getElementById('includeFileSidecarsLabel');
        if (sidecarLabel) sidecarLabel.style.display = enabled ? 'flex' : 'none';
    },

    // ─── Settings helpers ─────────────────────────────────────────
    async _getSetting(key, fallback = null) {
        try {
            if (window.settingsManager && window.settingsManager.get) {
                const val = await window.settingsManager.get(key);
                return val !== undefined && val !== null ? val : fallback;
            }
        } catch (_) {}
        return fallback;
    },

    async _getExtensions() {
        try {
            const raw = await this._getSetting(
                'plugins.filescanner_extensions',
                JSON.stringify(['.lif','.czi','.lsm','.nd2','.tif','.tiff','.ome.tif','.oif','.oib','.vsi','.svs','.ims','.zvi','.lof'])
            );
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return ['.lif','.czi','.lsm','.nd2','.tif','.tiff'];
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
    },

    // ─── Wizard Rendering ──────────────────────────────────────────
    async _renderWizard(activeStep) {
        const container = this._getContainer();
        if (!container) return;

        const bfActive = await this._bioformatsEnabled();
        const bfBadge = bfActive
            ? `<span class="fsc-badge fsc-badge-green">🔬 BioFormats aktiv</span>`
            : `<span class="fsc-badge fsc-badge-grey">⬜ Nur Dateiinfos</span>`;
            
        const exts = await this._getExtensions();

        container.innerHTML = `
            <div class="fsc-wizard">
                <!-- Stepper -->
                <div class="fsc-stepper">
                    <div class="fsc-step ${activeStep >= 1 ? 'active' : ''} ${activeStep > 1 ? 'done' : ''}">
                        <div class="fsc-step-num">${activeStep > 1 ? '✓' : '1'}</div>
                        <span>Scan-Ordner</span>
                    </div>
                    <div class="fsc-step-sep"></div>
                    <div class="fsc-step ${activeStep >= 2 ? 'active' : ''} ${activeStep > 2 ? 'done' : ''}">
                        <div class="fsc-step-num">${activeStep > 2 ? '✓' : '2'}</div>
                        <span>Metadaten-Vererbung</span>
                    </div>
                    <div class="fsc-step-sep"></div>
                    <div class="fsc-step ${activeStep >= 3 ? 'active' : ''}">
                        <div class="fsc-step-num">3</div>
                        <span>Bestätigen &amp; Starten</span>
                    </div>
                </div>

                <!-- Step 1: Scan folder -->
                <div class="fsc-wizard-body">
                    <div class="fsc-step-panel ${activeStep === 1 ? 'active' : ''}" id="fscPanel1">
                        <p class="fsc-step-title">📁 Scan-Ordner wählen</p>
                        <p class="fsc-step-desc">Wähle den Ordner, der deine Mikroskopie-Dateien enthält. Alle Unterordner werden ebenfalls durchsucht.</p>
                        <div class="fsc-path-row">
                            <div class="fsc-path-input ${this.currentScanDir ? '' : 'placeholder'}" id="fscScanDirDisplay">
                                ${this.currentScanDir || 'Noch kein Ordner gewählt…'}
                            </div>
                            <button class="fsc-btn fsc-btn-primary" onclick="fileScanner._pickScanDir()">
                                📁 Ordner wählen
                            </button>
                        </div>
                        <p class="fsc-step-desc" style="margin-top:12px; font-size:0.8rem;">
                            Gesuchte Dateitypen: <code>${exts.join(', ')}</code><br>
                            <a href="#" onclick="fileScanner._openPluginSettings(); return false;" style="color:#10b981; font-size:0.78rem;">
                                Dateitypen konfigurieren (Settings → Plugins)
                            </a>
                        </p>
                    </div>

                    <!-- Step 2: Inheritance -->
                    <div class="fsc-step-panel ${activeStep === 2 ? 'active' : ''}" id="fscPanel2">
                        <p class="fsc-step-title">🧬 Metadaten-Vererbung</p>
                        <p class="fsc-step-desc">Aus welchem übergeordneten Ordner sollen Projektmetadaten vererbt werden? Alle Ordner <em>zwischen</em> diesem Root und dem Scan-Ordner werden auf MetaFold-Metadaten durchsucht und in die Sidecar übernommen.</p>
                        <div class="fsc-path-row">
                            <div class="fsc-path-input ${this.currentRootDir ? '' : 'placeholder'}" id="fscRootDirDisplay">
                                ${this.currentRootDir || 'Noch kein Root-Ordner gewählt…'}
                            </div>
                            <button class="fsc-btn fsc-btn-primary" onclick="fileScanner._pickRootDir()">
                                📁 Root-Ordner wählen
                            </button>
                        </div>
                        <div class="fsc-inherit-hint">
                            <strong>Beispiel:</strong> Scan-Ordner = <code>/data/Exp1/Condition_A</code><br>
                            Root-Ordner = <code>/data</code><br>
                            → MetaFold liest Metadaten aus <code>/data</code>, <code>/data/Exp1</code> und <code>/data/Exp1/Condition_A</code>
                            und schreibt sie kombiniert in die Sidecar.
                        </div>
                    </div>

                    <!-- Step 3: Confirm -->
                    <div class="fsc-step-panel ${activeStep === 3 ? 'active' : ''}" id="fscPanel3">
                        <p class="fsc-step-title">✅ Bestätigen &amp; Scan starten</p>
                        <div class="fsc-summary" id="fscConfirmSummary">
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">Scan-Ordner</span>
                                <span class="fsc-summary-value">${this.currentScanDir || '—'}</span>
                            </div>
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">Root / Vererbung</span>
                                <span class="fsc-summary-value">
                                    ${this.skipInheritance
                                        ? '<span class="fsc-badge fsc-badge-grey">Übersprungen</span>'
                                        : (this.currentRootDir || '—')}
                                </span>
                            </div>
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">BioFormats OME-XML</span>
                                <span class="fsc-summary-value">${bfBadge}</span>
                            </div>
                            <div class="fsc-summary-row">
                                <span class="fsc-summary-label">Sidecar-Speicherort</span>
                                <span class="fsc-summary-value">Neben jeder Datei (<code>&lt;dateiname&gt;.metafold-sidecar.json</code>)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Navigation -->
                <div class="fsc-wizard-nav">
                    <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.closeScanner()">
                        ✕ Abbrechen
                    </button>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${activeStep === 2 ? `
                            <button class="fsc-btn fsc-btn-skip" onclick="fileScanner._skipInheritance()">
                                ⏭ Überspringen (ohne Vererbung)
                            </button>
                        ` : ''}
                        ${activeStep > 1 ? `
                            <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner._renderWizard(${activeStep - 1})">
                                ← Zurück
                            </button>
                        ` : ''}
                        ${activeStep < 3 ? `
                            <button class="fsc-btn fsc-btn-primary" id="fscNextBtn"
                                ${(!this.currentScanDir && activeStep === 1) ? 'disabled' : ''}
                                onclick="fileScanner._wizardNext(${activeStep})">
                                Weiter →
                            </button>
                        ` : `
                            <button class="fsc-btn fsc-btn-primary" onclick="fileScanner._startScan()">
                                🚀 Scan starten
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
            // Root-Ordner muss gewählt sein (oder skip gedrückt)
            if (!this.currentRootDir && !this.skipInheritance) {
                alert('Bitte wähle einen Root-Ordner oder klicke "Überspringen".');
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
        this._renderProgress(0, 0, 'Suche Dateien…');

        const listResult = await window.electronAPI.listFilesRecursive(this.currentScanDir, exts);
        if (!listResult.success) {
            this._renderError(`Fehler beim Suchen: ${listResult.message}`);
            return;
        }

        const files = listResult.files;
        if (files.length === 0) {
            this._renderEmpty();
            return;
        }

        const total = files.length;
        const bfEnabled = await this._bioformatsEnabled();
        const bfPath = await this._bioformatsPath();

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

                // 2d: Write sidecar
                const sidecarPath = fileInfo.path + '.metafold-sidecar.json';
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
                        🔬 Dateien werden verarbeitet…
                    </div>
                    <div class="fsc-progress-bar-wrap">
                        <div class="fsc-progress-bar" style="width:${pct}%"></div>
                    </div>
                    <div class="fsc-progress-stats">
                        <span>${current} / ${total} Dateien</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="fsc-progress-current-file" title="${fileName}">
                        📄 ${fileName}
                    </div>
                    <div style="margin-top:16px;">
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner._aborted=true; fileScanner.closeScanner()">
                            ✕ Abbrechen
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
            const successMsg = `🔬 <strong>Datei-Scan abgeschlossen:</strong> ${ok} dateibasierte Sidecars erfolgreich erstellt.`;
            window.projectManager.showEnhancedSuccess(successMsg, this.currentScanDir);
        }

        const rows = this.scanResults.map(r => {
            const icon = r.status === 'ok' ? '✅' : '❌';
            const rowClass = r.status !== 'ok' ? 'fsc-row-error' : '';
            const sizeFmt = r.file ? this._formatSize(r.file.size_bytes) : '—';
            const omeInfo = r.omeError
                ? `<span style="color:#f87171">⚠ ${r.omeError.substring(0, 50)}</span>`
                : (r.omeFields > 0 ? `✅ ${r.omeFields} Felder` : '—');
            const parentInfo = r.parentCount !== undefined ? `${r.parentCount} Ebene(n)` : '—';

            return `
                <tr class="${rowClass}">
                    <td class="fsc-col-status">${icon}</td>
                    <td class="fsc-col-name" title="${r.file ? r.file.name : ''}">${r.file ? r.file.name : 'Fehler'}</td>
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
                        📋 Scan abgeschlossen
                    </div>
                    <div class="fsc-results-actions">
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner._exportResultsCsv()">
                            📥 CSV Export
                        </button>
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.startWizard()">
                            🔄 Neuer Scan
                        </button>
                        <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.closeScanner()">
                            ✕ Schließen
                        </button>
                    </div>
                </div>
                <div class="fsc-results-summary-strip">
                    <span>✅ ${ok} erfolgreich</span>
                    ${err > 0 ? `<span style="color:#f87171">❌ ${err} Fehler</span>` : ''}
                    ${withOme > 0 ? `<span>🔬 ${withOme} mit OME-XML</span>` : ''}
                    <span>📁 ${this.currentScanDir}</span>
                </div>
                <div class="fsc-results-table-wrap">
                    <table class="fsc-results-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Dateiname</th>
                                <th>Größe</th>
                                <th>Vererbte Ordner</th>
                                <th>OME-XML</th>
                                <th>Pfad</th>
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
                    <p style="color:#e5e7eb; font-weight:600; margin-bottom:8px;">Keine Dateien gefunden</p>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:20px;">
                        Im Ordner <code>${this.currentScanDir}</code> wurden keine Dateien
                        mit den konfigurierten Endungen gefunden.
                    </p>
                    <button class="fsc-btn fsc-btn-primary" onclick="fileScanner.startWizard()">
                        🔄 Anderen Ordner wählen
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
                    <p style="color:#f87171; font-weight:600; margin-bottom:8px;">Fehler beim Scan</p>
                    <p style="color:#9ca3af; font-size:0.875rem; margin-bottom:20px;">${msg}</p>
                    <button class="fsc-btn fsc-btn-secondary" onclick="fileScanner.startWizard()">
                        ← Zurück
                    </button>
                </div>
            </div>
        `;
    },

    // ─── CSV Export ────────────────────────────────────────────────
    _exportResultsCsv() {
        const header = ['Status','Dateiname','Pfad','Größe (Bytes)','Vererbte Ordner','OME-Felder','Fehler'];
        const rows = this.scanResults.map(r => [
            r.status === 'ok' ? 'OK' : 'FEHLER',
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
        a.download = `metafold-filescan-${new Date().toISOString().slice(0,10)}.csv`;
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
