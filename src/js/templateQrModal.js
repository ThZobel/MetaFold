/**
 * MetaFold Offline Template QR & DataMatrix Label Modal
 *
 * Uses the already-vendored ZXing library (`src/js/vendor/zxing.min.js`) to render compact
 * `metafold:tpl:<uuid>` QR Codes and DataMatrix labels offline (SVG preview + SVG/PNG export).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.templateQrModal = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const ZPL_STORAGE_PRESET_KEY = 'metafold_zpl_label_preset';
    const ZPL_STORAGE_DPI_KEY = 'metafold_zpl_dpi';
    const ZPL_PRESETS = Object.freeze({
        '60x30': { label: '60 × 30 mm', widthMm: 60, heightMm: 30 },
        '60x25': { label: '60 × 25 mm', widthMm: 60, heightMm: 25 },
        '60x40': { label: '60 × 40 mm', widthMm: 60, heightMm: 40 },
        '25x13': { label: '25 × 13 mm (Mini)', widthMm: 25, heightMm: 13 }
    });

    const templateQrModal = {
        _isOpen: false,
        _entityType: 'template', // 'template' | 'project'
        _entityName: '',
        _currentTemplate: null,
        _currentUuid: null,
        _currentUri: '',
        _format: 'qr', // 'qr' | 'datamatrix'
        _includeLabel: true,
        _zplPreset: '60x30',
        _zplDpi: 203,
        _escHandler: null,

        _getZXing() {
            if (typeof window !== 'undefined' && window.ZXing) return window.ZXing;
            if (typeof require === 'function') {
                try {
                    return require('./vendor/zxing.min.js');
                } catch (_) {}
            }
            return null;
        },

        _getUuidHelper() {
            if (typeof window !== 'undefined' && window.metafoldTemplateUuid) {
                return window.metafoldTemplateUuid;
            }
            if (typeof require === 'function') {
                try {
                    return require('./shared/templateUuid.js');
                } catch (_) {}
            }
            return null;
        },

        _escHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        /**
         * Encode payload string into a ZXing BitMatrix using QRCodeWriter or DataMatrixWriter.
         * @param {string} payload
         * @param {'qr'|'datamatrix'} [format='qr']
         * @returns {Object} ZXing BitMatrix
         */
        encodeMatrix(payload, format = 'qr') {
            const Z = this._getZXing();
            if (!Z) {
                throw new Error('ZXing library is not loaded');
            }

            if (format === 'datamatrix') {
                if (!Z.DataMatrixWriter) throw new Error('DataMatrixWriter unavailable');
                const writer = new Z.DataMatrixWriter();
                return writer.encode(payload, Z.BarcodeFormat.DATA_MATRIX, 0, 0, new Map());
            }

            if (!Z.QRCodeWriter) throw new Error('QRCodeWriter unavailable');
            const writer = new Z.QRCodeWriter();
            const hints = new Map();
            if (Z.EncodeHintType && Z.EncodeHintType.MARGIN !== undefined) {
                hints.set(Z.EncodeHintType.MARGIN, 0);
            }
            return writer.encode(payload, Z.BarcodeFormat.QR_CODE, 0, 0, hints);
        },

        /**
         * Render a ZXing BitMatrix as a crisp SVG string with quiet-zone padding.
         * @param {Object} bitMatrix
         * @param {Object} [options={}]
         * @returns {string} SVG markup
         */
        renderMatrixSvg(bitMatrix, options = {}) {
            const w = bitMatrix.getWidth();
            const h = bitMatrix.getHeight();
            const quiet = Number.isFinite(options.quietZone) ? options.quietZone : 3;
            const totalW = w + quiet * 2;
            const totalH = h + quiet * 2;
            const sizePx = Number(options.sizePx) > 0 ? Number(options.sizePx) : 240;
            const fg = options.darkColor || '#111827';
            const bg = options.lightColor || '#ffffff';
            const ariaLabel = this._escHtml(options.ariaLabel || 'MetaFold Label Code');

            const parts = [];
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (bitMatrix.get(x, y)) {
                        parts.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
                    }
                }
            }

            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${sizePx}" height="${sizePx}" shape-rendering="crispEdges" role="img" aria-label="${ariaLabel}">` +
                `<rect width="${totalW}" height="${totalH}" fill="${bg}"/>` +
                `<path d="${parts.join('')}" fill="${fg}"/>` +
                `</svg>`;
        },

        _getDisplayName() {
            const fallback = this._entityType === 'project' ? 'MetaFold Project' : 'MetaFold Template';
            return this._entityName || this._currentTemplate?.name || fallback;
        },

        _getFilenameSlug() {
            const fallback = this._entityType === 'project' ? 'project' : 'template';
            const cleaned = this._getDisplayName().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
            return cleaned || fallback;
        },

        /**
         * Open the QR / DataMatrix modal for a template (auto-assigns UUID if own template lacks one).
         * @param {Object|null} [template=null]
         */
        async open(template = null) {
            const target = template || (typeof window !== 'undefined' ? window.templateManager?.currentTemplate : null);
            if (!target) {
                if (typeof window !== 'undefined' && window.app?.showError) {
                    window.app.showError('Please select a template first.');
                } else if (typeof alert === 'function') {
                    alert('Please select a template first.');
                }
                return;
            }

            const helper = this._getUuidHelper();
            if (!helper) {
                throw new Error('Template UUID helper missing');
            }

            let uuid = helper.normalizeUuid(target.uuid);
            if (!uuid) {
                if (target.isOwn === false) {
                    const msg = 'This shared template does not have a UUID yet. Please copy it to your own templates or ask the owner to save it once.';
                    if (typeof window !== 'undefined' && window.app?.showError) {
                        window.app.showError(msg);
                    } else if (typeof alert === 'function') {
                        alert(msg);
                    }
                    return;
                }

                uuid = helper.generateTemplateUuid();
                target.uuid = uuid;

                // Persist assigned UUID to the user's own template immediately
                if (typeof window !== 'undefined' && window.templateManager) {
                    const idx = window.templateManager.templates.findIndex(t =>
                        (t.id && t.id === target.id) ||
                        (t.name === target.name && t.createdBy === target.createdBy)
                    );
                    if (idx >= 0 && typeof window.templateManager.update === 'function') {
                        try {
                            await window.templateManager.update(idx, { ...window.templateManager.templates[idx], uuid });
                        } catch (err) {
                            console.warn('⚠️ Could not persist newly assigned template UUID:', err.message);
                        }
                    }
                }
            }

            this._entityType = 'template';
            this._entityName = target.name || 'MetaFold Template';
            this._currentTemplate = target;
            this._currentUuid = uuid;
            this._currentUri = helper.formatTemplateUri(uuid);
            this._restoreZplPreferences();
            this._isOpen = true;
            this._renderModal();
            this._refreshPreview();
        },

        /**
         * Open the QR / DataMatrix / Zebra ZPL label modal for a MetaFold project (`metafold:proj:<uuid>`).
         * @param {Object} project
         */
        openForProject(project) {
            const helper = this._getUuidHelper();
            if (!helper) {
                throw new Error('Template UUID helper missing');
            }

            const rawId = project?.projectId || project?.metafold_project_id || project?.metadata?.metafold_project_id || '';
            const uuid = helper.normalizeUuid(typeof rawId === 'string' ? rawId : String(rawId || ''));
            if (!uuid) {
                const msg = 'This project does not have a valid MetaFold Project UUID.';
                if (typeof window !== 'undefined' && window.app?.showError) {
                    window.app.showError(msg);
                } else if (typeof alert === 'function') {
                    alert(msg);
                }
                return;
            }

            this._entityType = 'project';
            this._currentTemplate = null;
            this._entityName = project?.name || project?.metadata?.projectName || 'MetaFold Project';
            this._currentUuid = uuid;
            this._currentUri = helper.formatProjectUri(uuid);
            this._restoreZplPreferences();
            this._isOpen = true;
            if (typeof document !== 'undefined') {
                this._renderModal();
                this._refreshPreview();
            }
        },

        _restoreZplPreferences() {
            try {
                if (typeof localStorage !== 'undefined') {
                    const savedPreset = localStorage.getItem(ZPL_STORAGE_PRESET_KEY);
                    if (savedPreset && ZPL_PRESETS[savedPreset]) {
                        this._zplPreset = savedPreset;
                    }
                    const savedDpi = Number(localStorage.getItem(ZPL_STORAGE_DPI_KEY));
                    if (savedDpi === 203 || savedDpi === 300) {
                        this._zplDpi = savedDpi;
                    }
                }
            } catch (_) {}
        },

        setZplPreset(presetKey) {
            if (!ZPL_PRESETS[presetKey]) return;
            this._zplPreset = presetKey;
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(ZPL_STORAGE_PRESET_KEY, presetKey);
                }
            } catch (_) {}
        },

        setZplDpi(dpi) {
            const normalizedDpi = Number(dpi) === 300 ? 300 : 203;
            this._zplDpi = normalizedDpi;
            try {
                if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(ZPL_STORAGE_DPI_KEY, String(normalizedDpi));
                }
            } catch (_) {}
        },

        /**
         * Escape special ZPL field characters for safe use with `^FH\`.
         * Preserves UTF-8 characters (umlauts, accents) for `^CI28`.
         * @param {*} str
         * @returns {string}
         */
        escapeZplFieldData(str) {
            return String(str ?? '')
                .replace(/[\r\n\t\x00-\x1F\x7F]+/g, ' ')
                .trim()
                .replace(/\\/g, '\\5C')
                .replace(/\^/g, '\\5E')
                .replace(/~/g, '\\7E');
        },

        /**
         * Build ready-to-print ZPL II script for Zebra thermal printers (e.g., ZD421t-HC).
         * @param {Object} [options={}]
         * @returns {string} ZPL II payload
         */
        generateZpl(options = {}) {
            const uri = String(options.uri || this._currentUri || '').trim();
            const uuid = String(options.uuid || this._currentUuid || '').trim();
            const fallbackName = this._entityType === 'project' ? 'MetaFold Project' : 'MetaFold Template';
            const rawName = options.name !== undefined
                ? options.name
                : (this._entityName || this._currentTemplate?.name || fallbackName);
            const format = (options.format || this._format) === 'datamatrix' ? 'datamatrix' : 'qr';
            const includeLabel = options.includeLabel !== undefined
                ? Boolean(options.includeLabel)
                : Boolean(this._includeLabel);
            const presetKey = (options.preset && ZPL_PRESETS[options.preset]) ? options.preset : (this._zplPreset || '60x30');
            const preset = ZPL_PRESETS[presetKey] || ZPL_PRESETS['60x30'];
            const dpi = Number(options.dpi !== undefined ? options.dpi : this._zplDpi) === 300 ? 300 : 203;

            const dotsPerMm = dpi === 300 ? 12 : 8;
            const widthDots = Math.round(preset.widthMm * dotsPerMm);
            const heightDots = Math.round(preset.heightMm * dotsPerMm);
            const margin = Math.min(Math.max(10, Math.round(2.5 * dotsPerMm)), Math.floor(heightDots * 0.12));
            const availH = Math.max(40, heightDots - margin * 2);

            let codeBoxDots = 0;
            let codeCmdBuilder = null;

            if (format === 'datamatrix') {
                const dmModule = Math.max(2, Math.min(10, Math.floor(availH / 26)));
                codeBoxDots = dmModule * 24;
                codeCmdBuilder = (x, y) => `^FO${x},${y}^BXN,${dmModule},200^FD${uri}^FS`;
            } else {
                const qrMag = Math.max(2, Math.min(8, Math.floor(availH / 36)));
                codeBoxDots = qrMag * 33;
                codeCmdBuilder = (x, y) => `^FO${x},${y}^BQN,2,${qrMag}^FDMA,${uri}^FS`;
            }

            const lines = [
                '^XA',
                '^CI28',
                `^PW${widthDots}`,
                `^LL${heightDots}`,
                '^LH0,0'
            ];

            const minTextWidthDots = Math.round(12 * dotsPerMm);
            const sideRemainingW = widthDots - (margin * 2) - codeBoxDots;
            const renderTextBeside = includeLabel && sideRemainingW >= minTextWidthDots;

            if (renderTextBeside) {
                const baseCodeY = Math.max(8, Math.round((heightDots - codeBoxDots) / 2));
                const codeY = format === 'qr'
                    ? Math.max(6, baseCodeY - Math.min(baseCodeY - 6, Math.round(dotsPerMm * 0.8)))
                    : baseCodeY;
                lines.push(codeCmdBuilder(margin, codeY));

                const textX = margin + codeBoxDots + Math.round(2.5 * dotsPerMm);
                const textW = Math.max(40, widthDots - textX - margin);
                const nameFontH = Math.max(18, Math.min(44, Math.round(heightDots * 0.13)));
                const textY = Math.max(margin, Math.round(heightDots * 0.16));
                const safeName = this.escapeZplFieldData(rawName || fallbackName) || fallbackName;

                lines.push(`^FO${textX},${textY}^A0N,${nameFontH},${nameFontH}^FB${textW},3,4,L^FH\\^FD${safeName}^FS`);

                if (uuid && preset.heightMm >= 20) {
                    const smallFontH = Math.max(15, Math.min(28, Math.round(heightDots * 0.085)));
                    const footerY = Math.max(textY + nameFontH * 2 + 10, heightDots - margin - smallFontH);
                    const shortUuid = this.escapeZplFieldData(uuid.slice(0, 8));
                    lines.push(`^FO${textX},${footerY}^A0N,${smallFontH},${smallFontH}^FH\\^FDMetaFold · ${shortUuid}^FS`);
                }
            } else {
                const centerX = Math.max(margin, Math.round((widthDots - codeBoxDots) / 2));
                const centerY = Math.max(6, Math.round((heightDots - codeBoxDots) / 2));
                lines.push(codeCmdBuilder(centerX, centerY));
            }

            lines.push('^XZ');
            return lines.join('\n');
        },

        async copyZpl(btnEl) {
            const zpl = this.generateZpl();
            await this.copyText(zpl, btnEl);
        },

        downloadZpl() {
            const zpl = this.generateZpl() + '\n';
            const slug = this._getFilenameSlug();
            this._downloadTextFile(`${slug}_${this._format}_${this._zplPreset}.zpl`, zpl, 'text/plain;charset=utf-8');
        },

        _downloadTextFile(filename, content, mimeType) {
            try {
                const blob = new Blob([content], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            } catch (err) {
                console.error('File download failed:', err);
            }
        },

        close() {
            this._isOpen = false;
            if (this._escHandler) {
                document.removeEventListener('keydown', this._escHandler);
                this._escHandler = null;
            }
            const existing = document.getElementById('mfTemplateQrModal');
            if (existing) existing.remove();
        },

        setFormat(format) {
            this._format = format === 'datamatrix' ? 'datamatrix' : 'qr';
            this._syncToggleButtons();
            this._refreshPreview();
        },

        setIncludeLabel(checked) {
            this._includeLabel = Boolean(checked);
            const captionEl = document.getElementById('mfTemplateQrCardLabel');
            if (captionEl) {
                captionEl.style.display = this._includeLabel ? 'block' : 'none';
            }
        },

        async copyText(text, btnEl) {
            if (!text) return;
            try {
                if (window.electronAPI?.copyToClipboard) {
                    await window.electronAPI.copyToClipboard(text);
                } else if (navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(text);
                }
                if (btnEl) {
                    const prev = btnEl.textContent;
                    btnEl.textContent = '✅ Copied';
                    setTimeout(() => { btnEl.textContent = prev; }, 1500);
                }
            } catch (err) {
                console.warn('Clipboard copy failed:', err);
            }
        },

        downloadSvg() {
            try {
                const matrix = this.encodeMatrix(this._currentUri, this._format);
                const svg = this.renderMatrixSvg(matrix, { quietZone: 3, sizePx: 400 });
                const slug = this._getFilenameSlug();
                this._downloadTextFile(`${slug}_${this._format}.svg`, svg, 'image/svg+xml;charset=utf-8');
            } catch (err) {
                console.error('SVG download failed:', err);
            }
        },

        downloadPng() {
            try {
                const matrix = this.encodeMatrix(this._currentUri, this._format);
                const w = matrix.getWidth();
                const h = matrix.getHeight();
                const quiet = 4;
                const totalCols = w + quiet * 2;
                const totalRows = h + quiet * 2;
                const scale = Math.max(8, Math.floor(480 / Math.max(totalCols, totalRows)));
                const codeW = totalCols * scale;
                const codeH = totalRows * scale;
                const labelBand = this._includeLabel ? 68 : 0;

                const canvas = document.createElement('canvas');
                canvas.width = codeW;
                canvas.height = codeH + labelBand;
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#111827';
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (matrix.get(x, y)) {
                            ctx.fillRect((x + quiet) * scale, (y + quiet) * scale, scale, scale);
                        }
                    }
                }

                if (this._includeLabel) {
                    const name = this._getDisplayName();
                    ctx.fillStyle = '#111827';
                    ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(name.slice(0, 36), canvas.width / 2, codeH + 20);

                    ctx.fillStyle = '#4b5563';
                    ctx.font = '13px monospace';
                    ctx.fillText(this._currentUuid || '', canvas.width / 2, codeH + 46);
                }

                const dataUrl = canvas.toDataURL('image/png');
                const slug = this._getFilenameSlug();
                const a = document.createElement('a');
                a.href = dataUrl;
                a.download = `${slug}_${this._format}.png`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } catch (err) {
                console.error('PNG download failed:', err);
            }
        },

        _syncToggleButtons() {
            const qrBtn = document.getElementById('mfQrModeBtn');
            const dmBtn = document.getElementById('mfDmModeBtn');
            if (qrBtn) qrBtn.classList.toggle('active', this._format === 'qr');
            if (dmBtn) dmBtn.classList.toggle('active', this._format === 'datamatrix');
        },

        _refreshPreview() {
            const previewEl = document.getElementById('mfTemplateQrSvgContainer');
            if (!previewEl) return;
            try {
                const matrix = this.encodeMatrix(this._currentUri, this._format);
                previewEl.innerHTML = this.renderMatrixSvg(matrix, { quietZone: 3, sizePx: 220 });
            } catch (err) {
                previewEl.innerHTML = `<div style="color:#dc2626; padding: 16px; font-size:0.85rem;">Error generating code: ${this._escHtml(err.message)}</div>`;
            }
        },

        _renderModal() {
            const existing = document.getElementById('mfTemplateQrModal');
            if (existing) existing.remove();

            const isProject = this._entityType === 'project';
            const name = this._getDisplayName();
            const modalTitle = isProject ? '📱 Project / Sample Label Code' : '📱 Template Label Code';
            const dialogAriaLabel = isProject ? 'Project Label Code' : 'Template QR Code';
            const includeLabelText = isProject ? 'Include project name on label' : 'Include template name on label';

            const modal = document.createElement('div');
            modal.id = 'mfTemplateQrModal';
            modal.className = 'mf-qr-modal-overlay';

            modal.innerHTML = `
                <div class="mf-qr-modal-card" role="dialog" aria-modal="true" aria-label="${dialogAriaLabel}">
                    <div class="mf-qr-modal-header">
                        <div>
                            <h3 style="margin: 0; font-size: 1.08rem;">${modalTitle}</h3>
                            <div class="mf-qr-modal-subtitle">${this._escHtml(name)}</div>
                        </div>
                        <button type="button" id="mfQrCloseBtn" class="mf-qr-close-btn" title="Close (Esc)">&times;</button>
                    </div>

                    <div class="mf-qr-mode-tabs">
                        <button type="button" id="mfQrModeBtn" class="mf-qr-mode-btn ${this._format === 'qr' ? 'active' : ''}">QR Code</button>
                        <button type="button" id="mfDmModeBtn" class="mf-qr-mode-btn ${this._format === 'datamatrix' ? 'active' : ''}">DataMatrix (Mini-Label)</button>
                    </div>

                    <div class="mf-qr-preview-box">
                        <div id="mfTemplateQrSvgContainer" style="display:flex; justify-content:center;"></div>
                        <div id="mfTemplateQrCardLabel" style="display:${this._includeLabel ? 'block' : 'none'}; margin-top: 8px; text-align:center;">
                            <div style="font-weight:700; color:#111827; font-size:0.9rem;">${this._escHtml(name)}</div>
                            <div style="font-family:monospace; color:#4b5563; font-size:0.72rem; margin-top:2px;">${this._escHtml(this._currentUuid)}</div>
                        </div>
                    </div>

                    <label class="mf-qr-label-toggle">
                        <input type="checkbox" id="mfQrIncludeLabelCb" ${this._includeLabel ? 'checked' : ''}>
                        <span>${includeLabelText}</span>
                    </label>

                    <div class="mf-qr-copy-fields">
                        <div class="mf-qr-copy-row">
                            <span class="mf-qr-copy-key" title="Compact MetaFold URI encoded inside the QR / DataMatrix code">Code</span>
                            <code class="mf-qr-copy-val">${this._escHtml(this._currentUri)}</code>
                            <button type="button" id="mfQrCopyUriBtn" class="btn btn-secondary btn-small">📋 Copy</button>
                        </div>
                        <div class="mf-qr-copy-row">
                            <span class="mf-qr-copy-key">UUID</span>
                            <code class="mf-qr-copy-val">${this._escHtml(this._currentUuid)}</code>
                            <button type="button" id="mfQrCopyUuidBtn" class="btn btn-secondary btn-small">📋 Copy</button>
                        </div>
                    </div>

                    <div class="mf-qr-zpl-box">
                        <div class="mf-qr-zpl-header">
                            <span>🦓 Zebra ZPL (ZD421)</span>
                            <span class="mf-qr-zpl-hint">Druckt Code + Name nativ am Drucker</span>
                        </div>
                        <div class="mf-qr-zpl-controls">
                            <select id="mfQrZplPreset" class="mf-qr-zpl-select" aria-label="Label size">
                                ${Object.entries(ZPL_PRESETS).map(([k, p]) =>
                                    `<option value="${k}" ${this._zplPreset === k ? 'selected' : ''}>${p.label}</option>`
                                ).join('')}
                            </select>
                            <select id="mfQrZplDpi" class="mf-qr-zpl-select mf-qr-zpl-dpi" aria-label="Printer DPI">
                                <option value="203" ${this._zplDpi === 203 ? 'selected' : ''}>203 dpi</option>
                                <option value="300" ${this._zplDpi === 300 ? 'selected' : ''}>300 dpi</option>
                            </select>
                            <button type="button" id="mfQrCopyZplBtn" class="btn btn-secondary btn-small">🖨️ Copy ZPL</button>
                            <button type="button" id="mfQrDownloadZplBtn" class="btn btn-secondary btn-small" title="Download as .zpl file">⬇️ .zpl</button>
                        </div>
                    </div>

                    <div class="mf-qr-modal-footer">
                        <button type="button" id="mfQrDownloadPngBtn" class="btn btn-secondary btn-small">🖼️ Download PNG</button>
                        <button type="button" id="mfQrDownloadSvgBtn" class="btn btn-secondary btn-small">⬇️ Download SVG</button>
                        <button type="button" id="mfQrDoneBtn" class="btn btn-small" style="margin-left:auto;">Close</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.getElementById('mfQrCloseBtn')?.addEventListener('click', () => this.close());
            document.getElementById('mfQrDoneBtn')?.addEventListener('click', () => this.close());
            document.getElementById('mfQrModeBtn')?.addEventListener('click', () => this.setFormat('qr'));
            document.getElementById('mfDmModeBtn')?.addEventListener('click', () => this.setFormat('datamatrix'));
            document.getElementById('mfQrIncludeLabelCb')?.addEventListener('change', (e) => this.setIncludeLabel(e.target.checked));
            document.getElementById('mfQrCopyUriBtn')?.addEventListener('click', (e) => this.copyText(this._currentUri, e.currentTarget));
            document.getElementById('mfQrCopyUuidBtn')?.addEventListener('click', (e) => this.copyText(this._currentUuid, e.currentTarget));
            document.getElementById('mfQrZplPreset')?.addEventListener('change', (e) => this.setZplPreset(e.target.value));
            document.getElementById('mfQrZplDpi')?.addEventListener('change', (e) => this.setZplDpi(e.target.value));
            document.getElementById('mfQrCopyZplBtn')?.addEventListener('click', (e) => this.copyZpl(e.currentTarget));
            document.getElementById('mfQrDownloadZplBtn')?.addEventListener('click', () => this.downloadZpl());
            document.getElementById('mfQrDownloadPngBtn')?.addEventListener('click', () => this.downloadPng());
            document.getElementById('mfQrDownloadSvgBtn')?.addEventListener('click', () => this.downloadSvg());

            this._escHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                }
            };
            document.addEventListener('keydown', this._escHandler);
        }
    };

    return templateQrModal;
}));
