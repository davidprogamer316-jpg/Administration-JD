'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

const BARCODE_FORMATS = [
  'code_128', 'code_39', 'code_93', 'codabar',
  'data_matrix', 'pdf417', 'qr_code', 'itf', 'aztec',
] as const;

export default function VinScanner({ onScan }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
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

  // Attach stream to video & start BarcodeDetector once DOM is ready
  useEffect(() => {
    if (!scanning || !streamRef.current) return;
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream;
    video.play().then(() => {
      if (!('BarcodeDetector' in window)) return;
      const detector = new (window as any).BarcodeDetector({
        formats: BARCODE_FORMATS as any,
      });
      let running = true;
      const detect = async () => {
        if (!running || !video) return;
        try {
          const codes = await detector.detect(video);
          if (codes.length > 0) {
            const text = codes[0].rawValue.replace(/\*/g, '').trim();
            if (text) {
              running = false;
              onScan(text);
              stopScanning();
              return;
            }
          }
        } catch {}
        rafRef.current = requestAnimationFrame(detect);
      };
      detect();
      return () => { running = false; };
    }).catch(() => {
      setError('Error al reproducir video');
    });
  }, [scanning, onScan]);

  const stopScanning = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const startScanning = useCallback(() => {
    setError('');

    // getUserMedia called SYNCHRONOUSLY during user gesture (required by iOS)
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
          </div>,
          document.body
        )
      )}
    </>
  );
}
