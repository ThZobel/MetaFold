/**
 * MetaFold Code Scanner Modal
 * Scans QR codes, DataMatrix, and 1D lab barcodes (Code128, Code39, EAN, UPC, etc.)
 * via webcam using native BarcodeDetector (when available) + cropped-canvas @zxing/library.
 *
 * Note: USB/Bluetooth handheld scanners work in HID keyboard mode directly inside
 * any focused input field without needing this modal.
 */
(function () {
    'use strict';

    const CAMERA_STORAGE_KEY = 'metafold_scanner_camera_id';

    const codeScannerModal = {
        _reader: null,
        _detector: null,
        _activeStream: null,
        _scanTimer: null,
        _canvas: null,
        _isOpen: false,
        _hasDetected: false,
        _escHandler: null,

        /**
         * Opens the camera scanner modal and invokes `onDetected(decodedText)` on first match.
         * @param {Object} options
         * @param {string} [options.fieldLabel] - Display label of the target metadata field
         * @param {Function} options.onDetected - Callback receiving decoded string
         */
        async open(options = {}) {
            if (this._isOpen) {
                this.close();
            }

            const { fieldLabel = '', onDetected } = options;
            if (typeof onDetected !== 'function') return;

            if (!window.ZXing || !window.ZXing.MultiFormatReader) {
                alert('Code-Scanner-Bibliothek (ZXing) konnte nicht geladen werden.');
                return;
            }

            if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
                alert('Kamera-Zugriff wird in dieser Umgebung nicht unterstützt.');
                return;
            }

            this._isOpen = true;
            this._hasDetected = false;
            this._renderModal(fieldLabel);

            const videoEl = document.getElementById('mfScannerVideo');
            const selectEl = document.getElementById('mfScannerCameraSelect');
            const statusEl = document.getElementById('mfScannerStatus');
            const frameEl = document.getElementById('mfScannerFrame');

            const setStatus = (msg, isError = false) => {
                if (!statusEl) return;
                statusEl.textContent = msg;
                statusEl.style.color = isError ? '#f87171' : '#94a3b8';
            };

            // Prepare fast ZXing MultiFormatReader (used on a 480x480 cropped viewfinder canvas)
            const hints = new Map();
            const F = window.ZXing.BarcodeFormat;
            const H = window.ZXing.DecodeHintType;
            if (F && H) {
                hints.set(H.POSSIBLE_FORMATS, [
                    F.QR_CODE,
                    F.DATA_MATRIX,
                    F.CODE_128,
                    F.CODE_39,
                    F.CODE_93,
                    F.EAN_13,
                    F.EAN_8,
                    F.UPC_A,
                    F.UPC_E,
                    F.ITF,
                    F.CODABAR,
                    F.AZTEC,
                    F.PDF_417
                ]);
                if (H.ALSO_INVERTED !== undefined) {
                    hints.set(H.ALSO_INVERTED, true);
                }
            }
            this._reader = new window.ZXing.MultiFormatReader();
            this._reader.setHints(hints);

            if (!this._canvas) {
                this._canvas = document.createElement('canvas');
            }

            // Initialize optional hardware-accelerated BarcodeDetector if supported
            this._detector = null;
            if (typeof window.BarcodeDetector === 'function') {
                try {
                    const supported = typeof window.BarcodeDetector.getSupportedFormats === 'function'
                        ? await window.BarcodeDetector.getSupportedFormats()
                        : [];
                    if (Array.isArray(supported) && supported.length > 0) {
                        const wanted = ['qr_code', 'data_matrix', 'code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf', 'codabar', 'aztec', 'pdf417']
                            .filter(fmt => supported.includes(fmt));
                        if (wanted.length > 0) {
                            this._detector = new window.BarcodeDetector({ formats: wanted });
                        }
                    }
                } catch (_) {
                    this._detector = null;
                }
            }

            const handleDecoded = (rawText) => {
                if (!this._isOpen || this._hasDetected) return;
                const cleanText = String(rawText ?? '').trim();
                if (!cleanText) return;

                this._hasDetected = true;
                if (this._scanTimer) {
                    clearTimeout(this._scanTimer);
                    this._scanTimer = null;
                }
                if (frameEl) {
                    frameEl.style.borderColor = '#34d399';
                    frameEl.style.boxShadow = '0 0 20px rgba(52, 211, 153, 0.55)';
                }
                setStatus(`Erkannt: ${cleanText}`);

                setTimeout(() => {
                    this.close();
                    try {
                        onDetected(cleanText);
                    } catch (cbErr) {
                        console.error('Code scanner callback error:', cbErr);
                    }
                }, 90);
            };

            const scheduleNextTick = (delayMs = 110) => {
                if (!this._isOpen || this._hasDetected) return;
                this._scanTimer = setTimeout(scanTick, delayMs);
            };

            let tickCount = 0;
            const scanTick = async () => {
                if (!this._isOpen || this._hasDetected || !videoEl) return;

                if (videoEl.readyState < 2 || !videoEl.videoWidth || !videoEl.videoHeight) {
                    scheduleNextTick(80);
                    return;
                }

                tickCount++;

                // 1. Try native async BarcodeDetector first when available (zero main-thread blocking)
                if (this._detector) {
                    try {
                        const barcodes = await this._detector.detect(videoEl);
                        if (!this._isOpen || this._hasDetected) return;
                        if (Array.isArray(barcodes) && barcodes.length > 0 && barcodes[0].rawValue) {
                            handleDecoded(barcodes[0].rawValue);
                            return;
                        }
                    } catch (_) {
                        // Fall through to ZXing canvas decode
                    }
                }

                // 2. Decode cropped center viewfinder (max 480x480) with ZXing
                //    Alternates between center crop (fast & sharp for small codes) and full downscaled frame
                try {
                    const vw = videoEl.videoWidth;
                    const vh = videoEl.videoHeight;
                    const useFullFrame = (tickCount % 4 === 0);
                    const canvas = this._canvas;

                    let sx = 0, sy = 0, sw = vw, sh = vh;
                    if (!useFullFrame) {
                        const cropRatio = 0.72;
                        const side = Math.round(Math.min(vw, vh) * cropRatio);
                        sx = Math.round((vw - side) / 2);
                        sy = Math.round((vh - side) / 2);
                        sw = side;
                        sh = side;
                    }

                    const maxDim = 480;
                    const scale = Math.min(1, maxDim / Math.max(sw, sh));
                    const dw = Math.max(120, Math.round(sw * scale));
                    const dh = Math.max(120, Math.round(sh * scale));

                    if (canvas.width !== dw) canvas.width = dw;
                    if (canvas.height !== dh) canvas.height = dh;

                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    ctx.drawImage(videoEl, sx, sy, sw, sh, 0, 0, dw, dh);

                    const luminanceSource = new window.ZXing.HTMLCanvasElementLuminanceSource(canvas);
                    const binarizer = (tickCount % 2 === 0 && window.ZXing.GlobalHistogramBinarizer)
                        ? new window.ZXing.GlobalHistogramBinarizer(luminanceSource)
                        : new window.ZXing.HybridBinarizer(luminanceSource);
                    const bitmap = new window.ZXing.BinaryBitmap(binarizer);

                    const result = this._reader.decode(bitmap);
                    if (result && typeof result.getText === 'function') {
                        handleDecoded(result.getText());
                        return;
                    }
                } catch (_) {
                    // NotFoundException on normal frames without a code — expected
                } finally {
                    try { this._reader.reset(); } catch (_) {}
                }

                scheduleNextTick(110);
            };

            const startStream = async (deviceId) => {
                if (!this._isOpen || !videoEl) return;
                this._stopStreamOnly();
                setStatus('Starte Kamera...');

                const videoConstraints = {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                };
                if (deviceId) {
                    videoConstraints.deviceId = { exact: deviceId };
                } else {
                    videoConstraints.facingMode = 'environment';
                }

                try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                        video: videoConstraints,
                        audio: false
                    });
                    if (!this._isOpen) {
                        stream.getTracks().forEach(t => t.stop());
                        return;
                    }
                    this._activeStream = stream;
                    videoEl.srcObject = stream;
                    await videoEl.play();
                    setStatus('Kamera aktiv — QR-Code, DataMatrix oder Barcode vor die Linse halten.');
                    scheduleNextTick(80);
                } catch (camErr) {
                    console.error('Failed to start camera scanner:', camErr);
                    const msg = camErr?.name === 'NotAllowedError'
                        ? 'Kamerazugriff wurde verweigert. Bitte Kamera-Berechtigung erlauben.'
                        : (camErr?.name === 'NotFoundError'
                            ? 'Keine Kamera gefunden.'
                            : `Kamera konnte nicht gestartet werden (${camErr?.message || camErr}).`);
                    setStatus(msg, true);
                }
            };

            try {
                const savedCamId = localStorage.getItem(CAMERA_STORAGE_KEY) || '';
                await startStream(savedCamId || null);

                // Populate camera switcher after stream permission is active so labels are visible
                if (this._isOpen && navigator.mediaDevices.enumerateDevices && selectEl) {
                    const allDevs = await navigator.mediaDevices.enumerateDevices();
                    const devices = allDevs.filter(d => d.kind === 'videoinput');
                    const activeTrack = this._activeStream?.getVideoTracks?.()[0];
                    const currentDeviceId = activeTrack?.getSettings?.().deviceId || savedCamId;

                    if (devices.length > 1) {
                        selectEl.innerHTML = devices.map((d, idx) => {
                            const label = d.label ? d.label : `Kamera ${idx + 1}`;
                            const selected = d.deviceId === currentDeviceId ? 'selected' : '';
                            return `<option value="${this._escAttr(d.deviceId)}" ${selected}>${this._escHtml(label)}</option>`;
                        }).join('');
                        selectEl.style.display = 'block';
                        selectEl.onchange = () => {
                            const nextId = selectEl.value;
                            try { localStorage.setItem(CAMERA_STORAGE_KEY, nextId); } catch (_) {}
                            startStream(nextId);
                        };
                    }
                }
            } catch (err) {
                console.error('Camera setup error:', err);
            }
        },

        close() {
            this._isOpen = false;
            this._hasDetected = false;
            this._stopStreamOnly();
            if (this._escHandler) {
                document.removeEventListener('keydown', this._escHandler);
                this._escHandler = null;
            }
            const modal = document.getElementById('mfCodeScannerModal');
            if (modal) modal.remove();
        },

        _stopStreamOnly() {
            if (this._scanTimer) {
                clearTimeout(this._scanTimer);
                this._scanTimer = null;
            }
            if (this._reader) {
                try { this._reader.reset(); } catch (_) {}
            }
            const videoEl = document.getElementById('mfScannerVideo');
            const streams = [this._activeStream, videoEl?.srcObject].filter(Boolean);
            streams.forEach(stream => {
                try {
                    if (typeof stream.getTracks === 'function') {
                        stream.getTracks().forEach(track => {
                            try { track.stop(); } catch (_) {}
                        });
                    }
                } catch (_) {}
            });
            if (videoEl) {
                try { videoEl.srcObject = null; } catch (_) {}
            }
            this._activeStream = null;
        },

        _renderModal(fieldLabel) {
            const existing = document.getElementById('mfCodeScannerModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'mfCodeScannerModal';
            modal.style.cssText = [
                'position: fixed',
                'inset: 0',
                'background: rgba(0, 0, 0, 0.78)',
                'backdrop-filter: blur(4px)',
                'z-index: 30000',
                'display: flex',
                'align-items: center',
                'justify-content: center',
                'padding: 16px'
            ].join(';');

            const labelBadge = fieldLabel
                ? `<span style="font-size: 0.72rem; color: #c4b5fd; background: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 10px; padding: 2px 8px; font-weight: 500;">${this._escHtml(fieldLabel)}</span>`
                : '';

            modal.innerHTML = `
                <div style="background: #1e1e2f; border: 1px solid rgba(139, 92, 246, 0.45); border-radius: 12px; width: 460px; max-width: 95vw; padding: 16px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7); display: flex; flex-direction: column; gap: 12px; color: #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                            <span style="font-size: 1rem; font-weight: 700; color: #f3f4f6;">📷 Code scannen</span>
                            ${labelBadge}
                        </div>
                        <button type="button" id="mfScannerCloseBtn" title="Schließen (Esc)" style="background: none; border: none; color: #9ca3af; font-size: 1.3rem; line-height: 1; cursor: pointer; padding: 2px 6px;">&times;</button>
                    </div>

                    <div style="font-size: 0.72rem; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <span>Formate: QR · DataMatrix · Code128 · Code39 · EAN</span>
                    </div>

                    <select id="mfScannerCameraSelect" style="display: none; width: 100%; padding: 6px 8px; background: #262638; border: 1px solid rgba(255,255,255,0.18); border-radius: 6px; color: #f3f4f6; font-size: 0.82rem; outline: none;"></select>

                    <div style="position: relative; width: 100%; aspect-ratio: 4 / 3; background: #0b0f19; border-radius: 8px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12); display: flex; align-items: center; justify-content: center;">
                        <video id="mfScannerVideo" autoplay muted playsinline style="width: 100%; height: 100%; object-fit: cover;"></video>
                        <div id="mfScannerFrame" style="position: absolute; width: 68%; height: 68%; border: 2px solid rgba(139, 92, 246, 0.85); border-radius: 10px; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.28); pointer-events: none; transition: border-color 0.15s, box-shadow 0.15s;"></div>
                    </div>

                    <div id="mfScannerStatus" style="font-size: 0.78rem; color: #94a3b8; min-height: 18px; text-align: center;">Initialisiere Kamera...</div>

                    <div style="font-size: 0.7rem; color: #64748b; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 6px 9px;">
                        💡 <strong>Tipp:</strong> Ein USB- oder Bluetooth-Handscanner funktioniert auch direkt im Textfeld ohne dieses Fenster.
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 8px;">
                        <button type="button" id="mfScannerCancelBtn" class="btn btn-secondary btn-sm" style="padding: 6px 14px; font-size: 0.82rem;">Abbrechen</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.close();
            });
            document.getElementById('mfScannerCloseBtn')?.addEventListener('click', () => this.close());
            document.getElementById('mfScannerCancelBtn')?.addEventListener('click', () => this.close());

            this._escHandler = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    this.close();
                }
            };
            document.addEventListener('keydown', this._escHandler);
        },

        _escHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        _escAttr(str) {
            return this._escHtml(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        }
    };

    window.codeScannerModal = codeScannerModal;
})();
