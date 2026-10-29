/**
 * QR Scanner Module - Corrientes Débiles
 * Uses jsQR library for universal, 100% offline, guaranteed QR scanning across
 * any Android WebView or browser, with native BarcodeDetector API when available.
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

        this.initDetector();
    }

    async initDetector() {
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                if (formats.includes('qr_code')) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                    console.log('[QRScanner] BarcodeDetector nativo disponible.');
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

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        try {
            // Asegurar que el elemento video tenga los atributos requeridos en móviles
            this.videoElement.setAttribute('autoplay', '');
            this.videoElement.setAttribute('muted', '');
            this.videoElement.setAttribute('playsinline', '');

            // Preferir cámara trasera (environment) con resolución óptima para escaneo
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 }
                },
                audio: false
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.stream;

            await new Promise((resolve) => {
                if (this.videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
                    resolve();
                } else {
                    this.videoElement.onloadedmetadata = () => resolve();
                }
            });

            await this.videoElement.play().catch(e => console.warn('[QRScanner] play() warning:', e));

            // Iniciar ciclo de escaneo continuo
            this.scanFrame();
            return { success: true };
        } catch (err) {
            console.warn('[QRScanner] Error al iniciar cámara:', err);
            this.scanning = false;
            return {
                success: false,
                error: 'No se pudo activar la cámara. Verifique los permisos de cámara en los ajustes de su teléfono.'
            };
        }
    }

    stopCamera() {
        this.scanning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
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
        // Escanear cada ~80ms (12 fps de análisis) para máxima respuesta sin sobrecalentar CPU
        if (now - this.lastScanTime >= 80) {
            this.lastScanTime = now;

            if (this.videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                const vw = this.videoElement.videoWidth;
                const vh = this.videoElement.videoHeight;

                if (vw > 0 && vh > 0) {
                    let detectedCode = null;

                    // 1. Intentar con BarcodeDetector nativo si está disponible
                    if (this.detector) {
                        try {
                            this.detector.detect(this.videoElement).then(barcodes => {
                                if (barcodes && barcodes.length > 0) {
                                    this.handleDetectedCode(barcodes[0].rawValue);
                                }
                            }).catch(() => {});
                        } catch (e) {}
                    }

                    // 2. Escaneo principal con jsQR (Universal en cualquier Android WebView)
                    if (typeof jsQR !== 'undefined') {
                        try {
                            const maxDim = 640;
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
                                inversionAttempts: 'dontInvert'
                            });

                            if (code && code.data) {
                                detectedCode = code.data;
                            }
                        } catch (err) {
                            console.warn('[QRScanner] jsQR error:', err);
                        }
                    }

                    if (detectedCode) {
                        this.handleDetectedCode(detectedCode);
                        return; // Detener escaneo al detectar
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

                    // 1. Intentar BarcodeDetector
                    if (this.detector) {
                        try {
                            const barcodes = await this.detector.detect(img);
                            if (barcodes && barcodes.length > 0) {
                                detectedText = barcodes[0].rawValue;
                            }
                        } catch (e) {}
                    }

                    // 2. Intentar jsQR
                    if (!detectedText && typeof jsQR !== 'undefined') {
                        try {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            const maxDim = 1200;
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

        // Vibrar en móvil al detectar (haptic feedback)
        if ('vibrate' in navigator) {
            try { navigator.vibrate(100); } catch (e) {}
        }

        // Si el código QR contiene una URL del tipo https://.../?qr=EQ-CCTV-001 o #EQ-CCTV-001
        if (clean.includes('qr=')) {
            try {
                const url = new URL(clean, window.location.origin);
                clean = url.searchParams.get('qr') || clean;
            } catch (e) {}
        } else if (clean.includes('#')) {
            clean = clean.split('#').pop();
        }

        if (this.onDetect) {
            this.onDetect(clean);
        }
    }
}

window.QRScannerManager = QRScannerManager;
