/**
 * QR Scanner Module - Corrientes Débiles
 * Maximiza la calidad y resolución permitida del sensor de la cámara del dispositivo
 * (hasta 4K UHD / 1080p con enfoque continuo).
 * Utiliza BarcodeDetector nativo por hardware cuando está disponible y jsQR a resolución
 * nativa 1:1 en la región de interés (ROI) sin pérdida de nitidez por reescalado.
 */

class QRScannerManager {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.scanning = false;
        this.detector = null;
        this.animFrameId = null;
        this.onDetect = null;
        this.canvas = null;
        this.ctx = null;
        this.lastScanTime = 0;
        this.scanCycle = 0;
        this.torchActive = false;
        this.actualResolution = { width: 0, height: 0 };

        this.initDetector();
    }

    async initDetector() {
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                if (formats.includes('qr_code')) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                    console.log('[QRScanner] BarcodeDetector nativo por hardware disponible.');
                }
            } catch (err) {
                this.detector = null;
            }
        }
    }

    async startCamera(videoElement, onDetect) {
        this.videoElement = videoElement;
        this.onDetect = onDetect;
        this.scanning = true;
        this.torchActive = false;

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        try {
            // Configurar video para reproducción fluida en móviles
            this.videoElement.setAttribute('autoplay', '');
            this.videoElement.setAttribute('muted', '');
            this.videoElement.setAttribute('playsinline', '');

            // Restricciones de cámara en orden descendente: busca la MÁXIMA calidad que soporte el sensor
            const qualityConstraints = [
                // 1. Ultra Alta Definición 4K / UHD (ideal para sensores de 12MP/48MP/1080p+)
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 3840 },
                        height: { ideal: 2160 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                },
                // 2. Full HD 1080p con cámara trasera
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                },
                // 3. HD 720p con cámara trasera
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                },
                // 4. Cámara trasera genérica
                {
                    video: {
                        facingMode: { ideal: 'environment' }
                    },
                    audio: false
                },
                // 5. Fallback a cualquier cámara disponible
                {
                    video: true,
                    audio: false
                }
            ];

            let activeStream = null;
            let lastError = null;

            for (const constraint of qualityConstraints) {
                try {
                    activeStream = await navigator.mediaDevices.getUserMedia(constraint);
                    if (activeStream) break;
                } catch (e) {
                    lastError = e;
                }
            }

            if (!activeStream) {
                throw (lastError || new Error('No se pudo acceder al dispositivo de cámara.'));
            }

            this.stream = activeStream;
            this.videoElement.srcObject = this.stream;

            // Esperar que los metadatos de video carguen para conocer las dimensiones reales
            await new Promise((resolve) => {
                if (this.videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    resolve();
                } else {
                    this.videoElement.onloadedmetadata = () => resolve();
                }
            });

            await this.videoElement.play().catch(e => console.warn('[QRScanner] play() warning:', e));

            // Optimización de hardware: Enfoque continuo automático y exposición
            const track = this.stream.getVideoTracks()[0];
            let hasTorch = false;

            if (track) {
                const settings = track.getSettings ? track.getSettings() : {};
                this.actualResolution = {
                    width: settings.width || this.videoElement.videoWidth,
                    height: settings.height || this.videoElement.videoHeight
                };

                try {
                    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                    hasTorch = Boolean(capabilities.torch);
                    const advancedConstraints = {};

                    // Enfoque continuo para máxima nitidez de códigos QR pequeños o distantes
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                        advancedConstraints.focusMode = 'continuous';
                    }
                    if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
                        advancedConstraints.exposureMode = 'continuous';
                    }
                    if (capabilities.whiteBalanceMode && capabilities.whiteBalanceMode.includes('continuous')) {
                        advancedConstraints.whiteBalanceMode = 'continuous';
                    }

                    if (Object.keys(advancedConstraints).length > 0) {
                        await track.applyConstraints({ advanced: [advancedConstraints] }).catch(() => {});
                    }
                } catch (err) {
                    console.debug('[QRScanner] No se pudieron aplicar constraints avanzadas de foco:', err);
                }
            }

            // Iniciar ciclo de escaneo continuo de alta velocidad
            this.scanCycle = 0;
            this.scanFrame();

            return {
                success: true,
                width: this.actualResolution.width,
                height: this.actualResolution.height,
                hasTorch: hasTorch
            };
        } catch (err) {
            console.warn('[QRScanner] Error al iniciar cámara:', err);
            this.scanning = false;
            return {
                success: false,
                error: 'No se pudo activar la cámara. Verifique los permisos de cámara en los ajustes del dispositivo.'
            };
        }
    }

    hasTorch() {
        if (!this.stream) return false;
        const track = this.stream.getVideoTracks()[0];
        if (!track || !track.getCapabilities) return false;
        return Boolean(track.getCapabilities().torch);
    }

    async toggleTorch() {
        return this.setTorch(!this.torchActive);
    }

    async setTorch(enabled) {
        if (!this.stream) return false;
        const track = this.stream.getVideoTracks()[0];
        if (!track) return false;
        try {
            await track.applyConstraints({
                advanced: [{ torch: Boolean(enabled) }]
            });
            this.torchActive = Boolean(enabled);
            return true;
        } catch (e) {
            console.warn('[QRScanner] Error al conmutar linterna:', e);
            return false;
        }
    }

    stopCamera() {
        this.scanning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        if (this.torchActive) {
            this.setTorch(false).catch(() => {});
        }
        if (this.stream) {
            try {
                this.stream.getTracks().forEach(track => track.stop());
            } catch (e) {}
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    scanFrame() {
        if (!this.scanning || !this.videoElement) return;

        const now = performance.now();
        // Frecuencia optimizada: escanea cada ~65ms (~15 fps de análisis)
        if (now - this.lastScanTime >= 65) {
            this.lastScanTime = now;
            this.scanCycle++;

            if (this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const vw = this.videoElement.videoWidth;
                const vh = this.videoElement.videoHeight;

                if (vw > 0 && vh > 0) {
                    let detectedCode = null;

                    // 1. PRIMERA PRIORIDAD: BarcodeDetector nativo por hardware (procesa frame completo a resolución nativa)
                    if (this.detector) {
                        try {
                            this.detector.detect(this.videoElement).then(barcodes => {
                                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                                    this.handleDetectedCode(barcodes[0].rawValue);
                                }
                            }).catch(() => {});
                        } catch (e) {}
                    }

                    // 2. SEGUNDA PRIORIDAD: jsQR de máxima nitidez óptica 1:1 en la Región de Interés (ROI Central)
                    if (typeof jsQR !== 'undefined') {
                        try {
                            // En ciclos impares: analiza el centro del visor al 100% de resolución nativa del sensor (CERO pixelado)
                            // En ciclos pares: analiza el encuadre completo en alta resolución (hasta 1280px)
                            const isRoiScan = (this.scanCycle % 2 !== 0);

                            if (isRoiScan) {
                                // Región central donde el usuario apunta el visor
                                const cropSize = Math.min(vw, vh, 1080);
                                const sx = Math.floor((vw - cropSize) / 2);
                                const sy = Math.floor((vh - cropSize) / 2);

                                if (this.canvas.width !== cropSize || this.canvas.height !== cropSize) {
                                    this.canvas.width = cropSize;
                                    this.canvas.height = cropSize;
                                }

                                // Copia 1:1 directa sin reducción de escala
                                this.ctx.drawImage(this.videoElement, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize);
                                const imgData = this.ctx.getImageData(0, 0, cropSize, cropSize);
                                const code = jsQR(imgData.data, cropSize, cropSize, {
                                    inversionAttempts: 'attemptBoth'
                                });

                                if (code && code.data) {
                                    detectedCode = code.data;
                                }
                            } else {
                                // Escaneo amplio del encuadre completo
                                const maxDim = 1280;
                                const scale = Math.min(1, maxDim / Math.max(vw, vh));
                                const cw = Math.floor(vw * scale);
                                const ch = Math.floor(vh * scale);

                                if (this.canvas.width !== cw || this.canvas.height !== ch) {
                                    this.canvas.width = cw;
                                    this.canvas.height = ch;
                                }

                                this.ctx.drawImage(this.videoElement, 0, 0, cw, ch);
                                const imgData = this.ctx.getImageData(0, 0, cw, ch);
                                const code = jsQR(imgData.data, cw, ch, {
                                    inversionAttempts: 'attemptBoth'
                                });

                                if (code && code.data) {
                                    detectedCode = code.data;
                                }
                            }
                        } catch (err) {
                            console.warn('[QRScanner] Error en análisis jsQR:', err);
                        }
                    }

                    if (detectedCode) {
                        this.handleDetectedCode(detectedCode);
                        return; // Se detiene al detectar con éxito
                    }
                }
            }
        }

        if (this.scanning) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
        }
    }

    async scanFile(file) {
        if (!file) return null;

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    let detectedText = null;

                    // 1. Intentar BarcodeDetector nativo
                    if (this.detector) {
                        try {
                            const barcodes = await this.detector.detect(img);
                            if (barcodes && barcodes.length > 0) {
                                detectedText = barcodes[0].rawValue;
                            }
                        } catch (e) {}
                    }

                    // 2. Intentar jsQR en alta resolución (hasta 2400px para máxima nitidez)
                    if (!detectedText && typeof jsQR !== 'undefined') {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            const maxDim = 2400;
                            let w = img.width;
                            let h = img.height;
                            if (Math.max(w, h) > maxDim) {
                                const r = maxDim / Math.max(w, h);
                                w = Math.floor(w * r);
                                h = Math.floor(h * r);
                            }
                            canvas.width = w;
                            canvas.height = h;
                            ctx.drawImage(img, 0, 0, w, h);
                            const imgData = ctx.getImageData(0, 0, w, h);
                            const code = jsQR(imgData.data, w, h, {
                                inversionAttempts: 'attemptBoth'
                            });
                            if (code && code.data) {
                                detectedText = code.data;
                            }
                        } catch (err) {
                            console.warn('[QRScanner] Error leyendo archivo con jsQR:', err);
                        }
                    }

                    if (detectedText) {
                        this.handleDetectedCode(detectedText);
                        resolve(detectedText);
                    } else {
                        alert('No se detectó un código QR legible en la imagen seleccionada. Verifique la nitidez o ingrese el código manualmente.');
                        resolve(null);
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    handleDetectedCode(raw) {
        let clean = (raw || '').trim();
        if (!clean) return;

        // Vibración háptica en dispositivos móviles al detectar el código
        if ('vibrate' in navigator) {
            try { navigator.vibrate(100); } catch (e) {}
        }

        // 1. Si contiene parámetro de URL tipo ?qr=EQ-...
        if (clean.includes('qr=')) {
            try {
                const url = new URL(clean, window.location.origin);
                clean = url.searchParams.get('qr') || clean;
            } catch (e) {}
        } else if (clean.includes('/equipo/')) {
            clean = clean.split('/equipo/').pop().split(/[?#]/)[0];
        } else if (clean.includes('#')) {
            clean = clean.split('#').pop();
        }

        // 2. Extraer código de equipo canónico (EQ-XXX-000) si viene embebido en texto o URL
        const match = clean.match(/EQ-[A-Z0-9]+-\d+/i);
        if (match) {
            clean = match[0].toUpperCase();
        }

        if (this.onDetect) {
            this.onDetect(clean, raw);
        }
    }
}

window.QRScannerManager = QRScannerManager;
