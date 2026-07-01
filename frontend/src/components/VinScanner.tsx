'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X, Scan } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

const BARCODE_FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'data_matrix',
  'pdf417',
  'qr_code',
  'itf',
  'aztec',
] as const;

export default function VinScanner({ onScan }: VinScannerProps) {
  const scannerRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scanningRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [useNative, setUseNative] = useState(true);

  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
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

  async function startNative() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: BARCODE_FORMATS as any,
      });

      scanningRef.current = true;

      async function detect() {
        if (!scanningRef.current || !videoRef.current) return;
        try {
          const codes = await barcodeDetector.detect(videoRef.current);
          if (codes.length > 0) {
            const text = codes[0].rawValue.replace(/\*/g, '').trim();
            if (text) {
              scanningRef.current = false;
              onScan(text);
              stopScanning();
              return;
            }
          }
        } catch {}
        rafRef.current = requestAnimationFrame(detect);
      }
      detect();
    } catch (err: any) {
      throw err;
    }
  }

  async function startHtml5Qr() {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

    const scanner = new Html5Qrcode('vin-reader', {
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
    scannerRef.current = scanner;

    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 300, height: 80 } },
      (decodedText: string) => {
        const cleaned = decodedText.replace(/\*/g, '').trim();
        if (cleaned) {
          onScan(cleaned);
          stopScanning();
        }
      },
      () => {}
    );
  }

  const startScanning = useCallback(async () => {
    setError('');
    setScanning(true);

    try {
      const hasBarcodeDetector = 'BarcodeDetector' in window;
      if (hasBarcodeDetector && useNative) {
        try {
          await startNative();
          return;
        } catch (err: any) {
          console.warn('BarcodeDetector failed, falling back to html5-qrcode', err);
          setUseNative(false);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
        }
      }
      await startHtml5Qr();
    } catch (err: any) {
      setError(err?.message || 'No se pudo acceder a la cámara');
      setScanning(false);
    }
  }, [onScan, useNative]);

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
            <div className="flex-1 relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ display: useNative ? 'block' : 'none' }}
              />
              <div
                id="vin-reader"
                className="absolute inset-0"
                style={{ display: useNative ? 'none' : 'block' }}
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
