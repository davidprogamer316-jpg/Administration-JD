'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

export default function VinScanner({ onScan }: VinScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  async function startScanning() {
    setError('');
    setScanning(true);

    try {
      const scanner = new Html5Qrcode('vin-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 100 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
        },
        () => {}
      );
    } catch (err) {
      setError('No se pudo acceder a la cámara');
      setScanning(false);
    }
  }

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
        <div className="space-y-2">
          <div className="relative">
            <div id="vin-reader" className="rounded-lg overflow-hidden" />
            <button
              type="button"
              onClick={stopScanning}
              className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white hover:bg-black/70 transition-colors"
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
