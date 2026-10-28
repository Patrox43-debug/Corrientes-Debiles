/**
 * QR Scanner Module
 * Uses native BarcodeDetector API when available,
 * with fallbacks for image upload and manual/test selection.
 */

class QRScannerManager {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.scanning = false;
        this.detector = null;
        this.animFrameId = null;
        this.onDetect = null;

        this.initDetector();
    }

    async initDetector() {
        if ('BarcodeDetector' in window) {
            try {
                const formats = await BarcodeDetector.getSupportedFormats();
                if (formats.includes('qr_code')) {
                    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
                    console.log('Native BarcodeDetector (qr_code) available.');
                }
            } catch (err) {
                console.warn('BarcodeDetector error:', err);
                this.detector = null;
            }
        }
    }

    async startCamera(videoElement, onDetect) {
        this.videoElement = videoElement;
        this.onDetect = onDetect;
        this.scanning = true;

        try {
            // Request camera facing environment (rear camera on mobile)
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            this.scanFrame();
            return { success: true };
        } catch (err) {
            console.warn('Camera access denied or unavailable:', err);
            this.scanning = false;
            return {
                success: false,
                error: 'No se pudo acceder a la cámara. Verifique los permisos o utilice la carga de imagen/código manual.'
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
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    async scanFrame() {
        if (!this.scanning || !this.videoElement) return;

        if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
            if (this.detector) {
                try {
                    const barcodes = await this.detector.detect(this.videoElement);
                    if (barcodes.length > 0) {
                        const rawValue = barcodes[0].rawValue;
                        this.handleDetectedCode(rawValue);
                        return; // pause further scan once detected
                    }
                } catch (e) {
                    // detection frame error
                }
            }
        }

        if (this.scanning) {
            this.animFrameId = requestAnimationFrame(() => this.scanFrame());
        }
    }

    async scanFile(file) {
        if (!file) return null;

        // If BarcodeDetector is available, test image bitmap
        if (this.detector) {
            try {
                const imgBitmap = await createImageBitmap(file);
                const barcodes = await this.detector.detect(imgBitmap);
                if (barcodes.length > 0) {
                    const code = barcodes[0].rawValue;
                    this.handleDetectedCode(code);
                    return code;
                }
            } catch (e) {
                console.warn('File barcode detect error', e);
            }
        }

        // Return error if no code detected
        alert('No se detectó un código QR legible en la imagen seleccionada. Intente con otra toma o ingrese el código manualmente.');
        return null;
    }

    handleDetectedCode(raw) {
        let clean = raw.trim();
        // If code is URL like http://.../?qr=EQ-CCTV-001 or #EQ-CCTV-001
        if (clean.includes('qr=')) {
            const url = new URL(clean, window.location.origin);
            clean = url.searchParams.get('qr') || clean;
        } else if (clean.includes('#')) {
            clean = clean.split('#').pop();
        }

        if (this.onDetect) {
            this.onDetect(clean);
        }
    }
}

window.QRScannerManager = QRScannerManager;
