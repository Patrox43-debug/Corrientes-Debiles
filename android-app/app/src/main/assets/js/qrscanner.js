/**
 * QR Scanner Module - Corrientes Débiles
 * Sistema Híbrido de Escaneo QR de Grado Industrial:
 * 1. Motor Primario: Html5Qrcode con ZXing multi-ángulo y aceleración BarcodeDetector nativa.
 * 2. Motor Secundario: Captura WebRTC con jsQR balanceado y BarcodeDetector.
 * 3. Captura Fotográfica Directa: Compatibilidad 100% móvil con la cámara del dispositivo.
 */

class QRScannerManager {
    constructor() {
        this.html5QrCode = null;
        this.containerId = 'qr-reader';
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
        this.activeEngine = 'none'; // 'html5-qrcode' | 'webrtc-jsqr'

        this.initDetector();
    }

    async initDetector() {
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                if (formats.includes('qr_code')) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                }
            } catch (err) {
                this.detector = null;
            }
        }
    }

    async startCamera(videoElementOrContainerId, onDetect) {
        this.onDetect = onDetect;
        this.scanning = true;
        this.hasDetected = false;
        this.torchActive = false;
        this.isProcessing = false;

        // Reset visual reticle to orange
        const reticle = document.querySelector('.scanner-reticle');
        if (reticle) {
            reticle.style.borderColor = 'rgba(249, 115, 22, 0.7)';
            reticle.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.5)';
        }

        // 1. INTENTO PRIMARIO: Html5Qrcode (ZXing industrial + BarcodeDetector)
        if (typeof Html5Qrcode !== 'undefined') {
            try {
                const container = document.getElementById(this.containerId);
                if (container) {
                    if (!this.html5QrCode) {
                        this.html5QrCode = new Html5Qrcode(this.containerId);
                    }

                    const config = {
                        fps: 15,
                        qrbox: (w, h) => {
                            const min = Math.min(w, h);
                            const box = Math.max(200, Math.floor(min * 0.72));
                            return { width: box, height: box };
                        },
                        aspectRatio: 1.0,
                        videoConstraints: {
                            facingMode: { ideal: 'environment' }
                        }
                    };

                    await this.html5QrCode.start(
                        { facingMode: 'environment' },
                        config,
                        (decodedText) => {
                            if (!this.hasDetected) {
                                this.handleDetectedCode(decodedText);
                            }
                        },
                        () => {} // Ignorar cuadros sin coincidencia
                    );

                    this.activeEngine = 'html5-qrcode';
                    const directVideo = document.getElementById('scanner-video');
                    if (directVideo) directVideo.style.display = 'none';
                    container.style.display = 'block';

                    let hasTorch = false;
                    try {
                        const caps = this.html5QrCode.getRunningTrackCapabilities();
                        hasTorch = Boolean(caps && caps.torch);
                    } catch (e) {}

                    return {
                        success: true,
                        engine: 'ZXing / Html5Qrcode (Industrial)',
                        hasTorch: hasTorch
                    };
                }
            } catch (html5Err) {
                console.warn('[QRScanner] Html5Qrcode falló al iniciar, probando fallback WebRTC:', html5Err);
            }
        }

        // 2. INTENTO SECUNDARIO: Fallback nativo WebRTC + jsQR / BarcodeDetector
        return this.startFallbackCamera(videoElementOrContainerId);
    }

    async startFallbackCamera(videoElementOrContainerId) {
        let video = (typeof videoElementOrContainerId === 'string') 
            ? document.getElementById(videoElementOrContainerId) 
            : videoElementOrContainerId;

        if (!video || !(video instanceof HTMLVideoElement)) {
            video = document.getElementById('scanner-video');
        }

        this.videoElement = video;
        if (!this.videoElement) {
            return { success: false, error: 'Elemento de video no encontrado.' };
        }

        const qrReaderDiv = document.getElementById(this.containerId);
        if (qrReaderDiv) qrReaderDiv.style.display = 'none';
        this.videoElement.style.display = 'block';

        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        }

        try {
            this.videoElement.setAttribute('autoplay', '');
            this.videoElement.setAttribute('muted', '');
            this.videoElement.setAttribute('playsinline', '');
            this.videoElement.setAttribute('webkit-playsinline', '');
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.autoplay = true;

            const constraintOptions = [
                {
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280, max: 1920 },
                        height: { ideal: 720, max: 1080 }
                    },
                    audio: false
                },
                {
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false
                },
                {
                    video: true,
                    audio: false
                }
            ];

            let activeStream = null;
            let lastErr = null;

            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('API de cámara no disponible en este navegador o contexto no seguro.');
            }

            for (const option of constraintOptions) {
                try {
                    activeStream = await navigator.mediaDevices.getUserMedia(option);
                    if (activeStream) break;
                } catch (e) {
                    lastErr = e;
                }
            }

            if (!activeStream) {
                throw (lastErr || new Error('No se pudo acceder a la cámara.'));
            }

            this.stream = activeStream;
            this.videoElement.srcObject = this.stream;

            try {
                await this.videoElement.play();
            } catch (playErr) {
                console.warn('[QRScanner] play() inicial:', playErr);
            }

            await new Promise((resolve) => {
                let attempts = 0;
                const check = () => {
                    attempts++;
                    if (this.videoElement && this.videoElement.videoWidth > 0 && this.videoElement.videoHeight > 0) {
                        resolve();
                    } else if (attempts < 30) {
                        setTimeout(check, 50);
                    } else {
                        resolve();
                    }
                };
                check();
            });

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
                } catch (e) {}
            }

            this.activeEngine = 'webrtc-jsqr';
            this.scanCycle = 0;
            this.scanFrame();

            return {
                success: true,
                engine: 'WebRTC / jsQR Fallback',
                width: this.actualResolution.width,
                height: this.actualResolution.height,
                hasTorch: hasTorch
            };
        } catch (err) {
            console.error('[QRScanner] Error en startFallbackCamera:', err);
            this.scanning = false;
            return {
                success: false,
                error: (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')
                    ? 'Permiso de cámara denegado. Conceda permiso de cámara en los ajustes de la aplicación.'
                    : (err.message || 'Cámara no disponible.')
            };
        }
    }

    async toggleTorch() {
        return this.setTorch(!this.torchActive);
    }

    async setTorch(enabled) {
        // En Html5Qrcode
        if (this.activeEngine === 'html5-qrcode' && this.html5QrCode && this.html5QrCode.isScanning) {
            try {
                await this.html5QrCode.applyVideoConstraints({
                    advanced: [{ torch: Boolean(enabled) }]
                });
                this.torchActive = Boolean(enabled);
                return true;
            } catch (e) {
                console.warn('[QRScanner] Error linterna Html5Qrcode:', e);
            }
        }

        // En WebRTC directo
        if (this.stream) {
            const track = this.stream.getVideoTracks()[0];
            if (track) {
                try {
                    await track.applyConstraints({ advanced: [{ torch: Boolean(enabled) }] });
                    this.torchActive = Boolean(enabled);
                    return true;
                } catch (e) {}
            }
        }

        return false;
    }

    async stopCamera() {
        this.scanning = false;
        this.hasDetected = false;
        this.isProcessing = false;

        if (this.torchActive) {
            this.setTorch(false).catch(() => {});
        }

        if (this.html5QrCode && this.html5QrCode.isScanning) {
            try {
                await this.html5QrCode.stop();
            } catch (e) {}
        }

        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }

        if (this.stream) {
            try {
                this.stream.getTracks().forEach(t => t.stop());
            } catch (e) {}
            this.stream = null;
        }

        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }

        this.activeEngine = 'none';
    }

    playBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(1050, ctx.currentTime);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {}
    }

    async scanFrame() {
        if (!this.scanning || !this.videoElement || this.hasDetected) return;

        if (this.isProcessing) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
            return;
        }

        const now = performance.now();
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
            if (this.detector) {
                try {
                    const barcodes = await this.detector.detect(this.videoElement);
                    if (barcodes && barcodes.length > 0 && barcodes[0].rawValue && !this.hasDetected) {
                        detectedCode = barcodes[0].rawValue;
                    }
                } catch (e) {}
            }

            if (!detectedCode && typeof jsQR !== 'undefined' && !this.hasDetected) {
                const isRoi = (this.scanCycle % 2 !== 0);
                if (isRoi) {
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
                    if (code && code.data) detectedCode = code.data;
                } else {
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
                    if (code && code.data) detectedCode = code.data;
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

        // 1. Probar Html5Qrcode (ZXing multi-ángulo integrado)
        if (typeof Html5Qrcode !== 'undefined') {
            try {
                const scanner = this.html5QrCode || new Html5Qrcode(this.containerId);
                const decodedText = await scanner.scanFile(file, false);
                if (decodedText) {
                    this.handleDetectedCode(decodedText);
                    return decodedText;
                }
            } catch (e) {
                console.debug('[QRScanner] scanFile con Html5Qrcode no detectó en pase 1:', e);
            }
        }

        // 2. Fallback con BarcodeDetector y jsQR en múltiples dimensiones
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = async () => {
                    let detectedText = null;

                    if (this.detector) {
                        try {
                            const barcodes = await this.detector.detect(img);
                            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                                detectedText = barcodes[0].rawValue;
                            }
                        } catch (e) {}
                    }

                    if (!detectedText && typeof jsQR !== 'undefined') {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d', { willReadFrequently: true });

                        for (const targetDim of [800, 600, 480, 1000, 1200]) {
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
                        alert('No se detectó un código QR legible en la imagen. Intente acercar más la cámara a la etiqueta o escriba el código manualmente.');
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

        this.playBeep();
        if ('vibrate' in navigator) {
            try { navigator.vibrate([70, 40, 70]); } catch (e) {}
        }

        const reticle = document.querySelector('.scanner-reticle');
        if (reticle) {
            reticle.style.borderColor = '#10b981';
            reticle.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 25px #10b981';
        }

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
