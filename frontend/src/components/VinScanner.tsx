'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, X } from 'lucide-react';

interface VinScannerProps {
  onScan: (vin: string) => void;
}

export default function VinScanner({ onScan }: VinScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = showCamera ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showCamera]);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function closeCamera() {
    stopStream();
    setShowCamera(false);
    setProcessing(false);
    setError('');
  }

  async function openCamera() {
    setError('');
    setProcessing(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      setError('No se pudo acceder a la cámara');
    }
  }

  async function takePhoto() {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    setProcessing(true);
    setError('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(dataUrl);
      const text = result?.getText()?.replace(/\*/g, '').trim();
      if (text) {
        onScan(text);
        closeCamera();
      } else {
        setError('No se detectó ningún código de barras');
        setProcessing(false);
      }
    } catch {
      setError('No se detectó ningún código de barras. Intenta de nuevo con mejor iluminación.');
      setProcessing(false);
    }
  }

  useEffect(() => {
    if (!showCamera || !streamRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => setError('Error al reproducir video'));
  }, [showCamera]);

  return (
    <>
      <button
        type="button"
        onClick={openCamera}
        className="flex items-center gap-2 rounded-lg border border-border text-text-muted px-3.5 py-2.5 text-sm hover:bg-bg-page transition-colors"
      >
        <Camera size={16} />
        Escanear VIN
      </button>
      {showCamera && createPortal(
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white shrink-0">
            <span className="text-sm font-medium">Tomar foto del código</span>
            <button
              type="button"
              onClick={closeCamera}
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
            {error && (
              <p className="absolute bottom-24 left-0 right-0 text-center text-danger text-sm bg-black/60 py-2">
                {error}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center px-4 py-6 shrink-0">
            <button
              type="button"
              onClick={takePhoto}
              disabled={processing}
              className="flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-black font-medium shadow-lg hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={20} />
              )}
              {processing ? 'Procesando...' : 'Tomar foto'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
