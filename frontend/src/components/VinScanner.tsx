'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

export default function VinScanner({ onScan }: VinScannerProps) {
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
          qrbox: { width: 280, height: 50 },
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
    <div>
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
        <div className="space-y-2" ref={containerRef}>
          <div className="relative">
            <div
              id="vin-reader"
              className="rounded-lg overflow-hidden"
              style={{ minHeight: 200 }}
            />
            <button
              type="button"
              onClick={stopScanning}
              className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors z-10"
            >
              <CameraOff size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-accent text-xs">
            <Scan size={14} />
            Apunta la cámara al código de barras del VIN
          </div>
          {error && (
            <p className="text-danger text-xs">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
