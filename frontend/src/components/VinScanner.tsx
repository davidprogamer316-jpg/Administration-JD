'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

// Subset supported by both Chrome and Safari BarcodeDetector
const BARCODE_FORMATS = [
  'code_128', 'code_39', 'pdf417', 'qr_code', 'data_matrix',
] as const;

export default function VinScanner({ onScan }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const scanningRef = useRef(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = scanning ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [scanning]);

  function stopScanning() {
    scanningRef.current = false;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setStatus('');
  }

  // Try native BarcodeDetector
  function startNativeDetector(video: HTMLVideoElement) {
    if (!('BarcodeDetector' in window)) return false;

    setStatus('Iniciando escáner...');
    let detector: any;
    try {
      detector = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS as any });
    } catch { return false; }
    setStatus('Escaneando...');

    scanningRef.current = true;
    timerRef.current = setInterval(async () => {
      if (!scanningRef.current) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length > 0) {
          const text = codes[0].rawValue.replace(/\*/g, '').trim();
          if (text) { onScan(text); stopScanning(); }
        }
      } catch {}
    }, 300);
    return true;
  }

  // Fallback using html5-qrcode scanFile (no getUserMedia inside)
  async function startHtml5Fallback() {
    try {
      setStatus('Cargando escáner...');
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      setStatus('Escaneando...');
      const scanner = new Html5Qrcode('vin-reader-scanner', {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.PDF_417,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      scanningRef.current = true;
      timerRef.current = setInterval(async () => {
        const video = videoRef.current;
        if (!video || !scanningRef.current) return;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0);
        const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.8));
        if (!blob || !scanningRef.current) return;
        try {
          const result = await scanner.scanFileV2(new File([blob], 'frame.jpg', { type: 'image/jpeg' }), false);
          const text = result?.decodedText?.replace(/\*/g, '').trim();
          if (text) { onScan(text); stopScanning(); }
        } catch {}
      }, 400);
    } catch { setError('No se pudo iniciar el escáner'); }
  }

  // Attach stream to video once DOM is ready
  useEffect(() => {
    if (!scanning || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = streamRef.current;

    const startScanning = () => {
      const nativeOk = startNativeDetector(video);
      if (!nativeOk) startHtml5Fallback();
    };

    // Check if metadata already loaded (common on iOS)
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      startScanning();
    } else {
      video.addEventListener('loadedmetadata', startScanning, { once: true });
    }
    video.play().catch(() => setError('Error al reproducir video'));
  }, [scanning, onScan]);

  const startScanning = useCallback(() => {
    setError('');
    setStatus('');

    // getUserMedia called SYNCHRONOUSLY during user gesture (iOS requirement)
    const promise = navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    });

    promise.then((stream) => {
      streamRef.current = stream;
      setScanning(true);
    }).catch((err) => {
      setError(err?.message || 'No se pudo acceder a la cámara');
    });
  }, []);

  return (
    <>
      {!scanning ? (
        <button
          type="button"
          onClick={startScanning}
          className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-3.5 py-2.5 text-sm hover:bg-bg-page transition-colors"
        >
          <Camera size={16} />
          Escanear VIN
        </button>
      ) : (
        createPortal(
          <div className="fixed inset-0 z-[60] bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
              <span className="text-sm font-medium">Escanear código</span>
              <button
                type="button"
                onClick={stopScanning}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 relative min-h-0 h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Hidden container for html5-qrcode fallback */}
              <div id="vin-reader-scanner" className="hidden" />
            </div>
            <div className="flex items-center justify-center gap-2 px-4 py-4 text-white/80 text-sm shrink-0">
              <Scan size={18} />
              Apunta al código de barras del VIN
            </div>
            {error && (
              <p className="text-danger text-xs text-center px-4 pb-4">{error}</p>
            )}
            {!error && status && (
              <p className="text-white/60 text-xs text-center px-4 pb-4">{status}</p>
            )}
          </div>,
          document.body
        )
      )}
    </>
  );
}
