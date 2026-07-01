'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

export default function VinScanner({ onScan }: VinScannerProps) {
  const scannerRef = useRef<any>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (scanning) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [scanning]);

  const startScanning = useCallback(async () => {
    setError('');
    setScanning(true);

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      const scanner = new Html5Qrcode('vin-reader', {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 280, height: 60 },
        },
        (decodedText: string) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {}
      );
    } catch (err: any) {
      setError(err?.message || 'No se pudo acceder a la cámara');
      setScanning(false);
    }
  }, [onScan]);

  function stopScanning() {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

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
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* top bar */}
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

          {/* camera */}
          <div className="flex-1 relative">
            <div
              id="vin-reader"
              className="absolute inset-0"
            />
          </div>

          {/* hint */}
          <div className="flex items-center justify-center gap-2 px-4 py-4 text-white/80 text-sm shrink-0">
            <Scan size={18} />
            Apunta al código de barras del VIN
          </div>
          {error && (
            <p className="text-danger text-xs text-center px-4 pb-4">{error}</p>
          )}
        </div>
      )}
    </>
  );
}
