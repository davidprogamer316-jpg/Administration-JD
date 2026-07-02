'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

const BARCODE_FORMATS = [
  'code_128', 'code_39', 'pdf417', 'qr_code', 'data_matrix',
] as const;

export default function VinScanner({ onScan }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingRef = useRef<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    return () => {
      if (zxingRef.current) {
        try { zxingRef.current.reset(); } catch {}
        zxingRef.current = null;
      }
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
    if (zxingRef.current) {
      try { zxingRef.current.reset(); } catch {}
      zxingRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
    setStatus('');
  }

  // Native BarcodeDetector (Android)
  function startNativeDetector(video: HTMLVideoElement) {
    if (!('BarcodeDetector' in window)) return false;
    let detector: any;
    try {
      detector = new (window as any).BarcodeDetector({ formats: BARCODE_FORMATS as any });
    } catch { return false; }

    setStatus('Escaneando...');
    let running = true;
    const detect = async () => {
      if (!running || !video) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length > 0) {
          const text = codes[0].rawValue.replace(/\*/g, '').trim();
          if (text) { running = false; onScan(text); stopScanning(); return; }
        }
      } catch {}
      requestAnimationFrame(detect);
    };
    detect();
    return true;
  }

  // ZXing fallback (iOS)
  async function startZxing(video: HTMLVideoElement) {
    try {
      setStatus('Cargando escáner...');
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      zxingRef.current = reader;

      setStatus('Escaneando...');
      reader.decodeFromVideoElementContinuously(video, (result: any) => {
        const text = result?.getText()?.replace(/\*/g, '').trim();
        if (text) { onScan(text); stopScanning(); }
      });
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar escáner');
    }
  }

  // Attach stream to video once DOM is ready
  useEffect(() => {
    if (!scanning || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = streamRef.current;

    const onReady = () => {
      const nativeOk = startNativeDetector(video);
      if (!nativeOk) startZxing(video);
    };

    if (!video.paused && video.currentTime > 0) {
      onReady();
    } else {
      video.addEventListener('playing', onReady, { once: true });
      video.addEventListener('loadedmetadata', onReady, { once: true });
    }
    video.play().catch(() => setError('Error al reproducir video'));
  }, [scanning, onScan]);

  const startScanning = useCallback(() => {
    setError('');
    setStatus('');

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
