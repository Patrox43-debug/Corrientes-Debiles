/**
 * QR Scanner Module - Corrientes Débiles
 * Escáner QR de alto rendimiento y máxima compatibilidad móvil / Android WebView.
 * Utiliza captura HD con auto-enfoque continuo, análisis optimizado con jsQR (480-500px)
 * y aceleración por hardware BarcodeDetector.
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
        this.isProcessing = false;
        this.hasDetected = false;
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
                    console.log('[QRScanner] BarcodeDetector nativo por hardware activado.');
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
        this.hasDetected = false;
        this.torchActive = false;
        this.isProcessing = false;

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        try {
            // Atributos obligatorios para reproducción fluida sin interacción previa en WebViews
            this.videoElement.setAttribute('autoplay', '');
            this.videoElement.setAttribute('muted', '');
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.setAttribute('webkit-playsinline', '');
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.autoplay = true;

            // Restricciones de cámara balanceadas para máxima compatibilidad y nitidez sin crasheos en Android
            const constraintOptions = [
                // 1. Alta Definición (1080p / 720p) con cámara trasera
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 }
                    },
                    audio: false
                },
                // 2. Cámara trasera estándar
                {
                    video: {
                        facingMode: { ideal: 'environment' }
                    },
                    audio: false
                },
                // 3. Fallback universal: cualquier cámara del dispositivo
                {
                    video: true,
                    audio: false
                }
            ];

            let activeStream = null;
            let lastErr = null;

            for (const option of constraintOptions) {
                try {
                    activeStream = await navigator.mediaDevices.getUserMedia(option);
                    if (activeStream) break;
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!activeStream) {
                throw (lastErr || new Error('No se pudo acceder a la cámara del dispositivo.'));
            }

            this.stream = activeStream;
            this.videoElement.srcObject = this.stream;

            // Intentar reproducir el video
            try {
                await this.videoElement.play();
            } catch (playErr) {
                console.warn('[QRScanner] play() inicial:', playErr);
            }

            // Esperar que el video esté entregando frames reales (videoWidth > 0)
            await new Promise((resolve) => {
                let attempts = 0;
                const checkDimensions = () => {
                    attempts++;
                    if (this.videoElement && this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0) {
                        resolve();
                    } else if (attempts < 30) {
                        setTimeout(checkDimensions, 50);
                    } else {
                        resolve(); // Salida por tiempo prudencial
                    }
                };
                checkDimensions();
            });

            // Configurar enfoque continuo por hardware si la cámara lo soporta
            const track = this.stream.getVideoTracks()[0];
            let hasTorch = false;

            if (track) {
                const settings = track.getSettings ? track.getSettings() : {};
                this.actualResolution = {
                    width: settings.width || this.videoElement.videoWidth || 1280,
                    height: settings.height || this.videoElement.videoHeight || 720
                };

                try {
                    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
                    hasTorch = Boolean(capabilities.torch);

                    const advanced = {};
                    if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
                        advanced.focusMode = 'continuous';
                    }
                    if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
                        advanced.exposureMode = 'continuous';
                    }
                    if (Object.keys(advanced).length > 0) {
                        await track.applyConstraints({ advanced: [advanced] }).catch(() => {});
                    }
                } catch (e) {
                    console.debug('[QRScanner] Capabilities avanzadas no soportadas:', e);
                }
            }

            // Iniciar ciclo de escaneo continuo
            this.scanCycle = 0;
            this.scanFrame();

            return {
                success: true,
                width: this.actualResolution.width,
                height: this.actualResolution.height,
                hasTorch: hasTorch
            };
        } catch (err) {
            console.error('[QRScanner] Error iniciando cámara:', err);
            this.scanning = false;
            return {
                success: false,
                error: 'No se pudo acceder a la cámara. Verifique que los permisos estén habilitados en los ajustes de su teléfono.'
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
            console.warn('[QRScanner] Error en linterna:', e);
            return false;
        }
    }

    stopCamera() {
        this.scanning = false;
        this.hasDetected = false;
        this.isProcessing = false;

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

    playBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(1050, ctx.currentTime);
            gain.gain.setValueAtTime(0.18, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.14);
        } catch (e) {}
    }

    async scanFrame() {
        if (!this.scanning || !this.videoElement || this.hasDetected) return;

        // Evitar solapamiento de procesamiento pesado entre frames
        if (this.isProcessing) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
            return;
        }

        const now = performance.now();
        // Frecuencia fluida: ~50ms (~20 intentos por segundo)
        if (now - this.lastScanTime < 50) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
            return;
        }

        this.lastScanTime = now;
        this.scanCycle++;

        if (this.videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
            return;
        }

        const vw = this.videoElement.videoWidth;
        const vh = this.videoElement.videoHeight;

        if (vw <= 0 || vh <= 0) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
            return;
        }

        this.isProcessing = true;
        let detectedCode = null;

        try {
            // ESTRATEGIA 1: BarcodeDetector nativo por hardware (acelerado por GPU / ML Kit)
            if (this.detector) {
                try {
                    const barcodes = await this.detector.detect(this.videoElement);
                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue && !this.hasDetected) {
                        detectedCode = barcodes[0].rawValue;
                    }
                } catch (e) {
                    // Fallback a jsQR si falla el detector nativo
                }
            }

            // ESTRATEGIA 2: jsQR optimizado con dimensiones de 480px (nitidez y velocidad <12ms)
            if (!detectedCode && typeof jsQR !== 'undefined' && !this.hasDetected) {
                // Alternamos entre:
                // Ciclo Impar: Región Central (ROI) con zoom óptico (480x480)
                // Ciclo Par: Encuadre Completo escalado a 480px
                const isRoi = (this.scanCycle % 2 !== 0);

                if (isRoi) {
                    // Tomamos el 72% central de la cámara donde apunta el visor
                    const cropSize = Math.floor(Math.min(vw, vh) * 0.72);
                    const sx = Math.floor((vw - cropSize) / 2);
                    const sy = Math.floor((vh - cropSize) / 2);
                    const targetDim = 480;

                    if (this.canvas.width !== targetDim || this.canvas.height !== targetDim) {
                        this.canvas.width = targetDim;
                        this.canvas.height = targetDim;
                    }

                    this.ctx.drawImage(this.videoElement, sx, sy, cropSize, cropSize, 0, 0, targetDim, targetDim);
                    const imgData = this.ctx.getImageData(0, 0, targetDim, targetDim);
                    const code = jsQR(imgData.data, targetDim, targetDim, {
                        inversionAttempts: (this.scanCycle % 4 === 1) ? 'dontInvert' : 'attemptBoth'
                    });

                    if (code && code.data) {
                        detectedCode = code.data;
                    }
                } else {
                    // Escaneo amplio del encuadre completo (por si el código está descentrado)
                    const targetW = 480;
                    const scale = targetW / vw;
                    const targetH = Math.floor(vh * scale);

                    if (this.canvas.width !== targetW || this.canvas.height !== targetH) {
                        this.canvas.width = targetW;
                        this.canvas.height = targetH;
                    }

                    this.ctx.drawImage(this.videoElement, 0, 0, targetW, targetH);
                    const imgData = this.ctx.getImageData(0, 0, targetW, targetH);
                    const code = jsQR(imgData.data, targetW, targetH, {
                        inversionAttempts: (this.scanCycle % 4 === 0) ? 'attemptBoth' : 'dontInvert'
                    });

                    if (code && code.data) {
                        detectedCode = code.data;
                    }
                }
            }
        } catch (err) {
            console.warn('[QRScanner] Excepción en scanFrame:', err);
        } finally {
            this.isProcessing = false;
        }

        if (detectedCode && !this.hasDetected) {
            this.handleDetectedCode(detectedCode);
            return;
        }

        if (this.scanning && !this.hasDetected) {
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

                    // 1. Probar BarcodeDetector nativo
                    if (this.detector) {
                        try {
                            const barcodes = await this.detector.detect(img);
                            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                                detectedText = barcodes[0].rawValue;
                            }
                        } catch (e) {}
                    }

                    // 2. Probar con jsQR en múltiples dimensiones óptimas
                    if (!detectedText && typeof jsQR !== 'undefined') {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });

                        for (const targetDim of [600, 800, 480, 1000]) {
                            const scale = Math.min(1, targetDim / Math.max(img.width, img.height));
                            const w = Math.floor(img.width * scale);
                            const h = Math.floor(img.height * scale);

                            canvas.width = w;
                            canvas.height = h;
                            ctx.drawImage(img, 0, 0, w, h);
                            const imgData = ctx.getImageData(0, 0, w, h);
                            const code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' });
                            if (code && code.data) {
                                detectedText = code.data;
                                break;
                            }
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
        if (this.hasDetected) return;
        this.hasDetected = true;

        let clean = (raw || '').trim();
        if (!clean) {
            this.hasDetected = false;
            return;
        }

        // Feedback de detección: Sonido Beep y Vibración háptica
        this.playBeep();
        if ('vibrate' in navigator) {
            try { navigator.vibrate([70, 40, 70]); } catch (e) {}
        }

        // Iluminar el retículo en verde de confirmación
        const reticle = document.querySelector('.scanner-reticle');
        if (reticle) {
            reticle.style.borderColor = '#10b981';
            reticle.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 25px #10b981';
        }

        // 1. Extraer si es URL tipo https://.../?qr=EQ-UPS-001
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

        // 2. Extraer código canónico EQ-XXX-000 si viene dentro de una frase o URL
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
