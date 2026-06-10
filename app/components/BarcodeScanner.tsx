'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const BARCODE_FORMATS = ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code'] as const;

type BarcodeScannerProps = {
  open: boolean;
  onClose: () => void;
  onDetected: (value: string) => void;
  onError?: (message: string) => void;
  /** When scanner cannot be used (no HTTPS, or unsupported), show this instead of closing immediately */
  language?: 'ar' | 'en';
  closeLabel?: string;
  manualEntryLabel?: string;
};

type DetectedBarcode = { rawValue: string };

const CAMERA_NEEDS_HTTPS_AR =
  'الكاميرا تحتاج HTTPS أو متصفح يدعم المسح. افتح الموقع على https أو استخدم Chrome على الموبايل.';
const CAMERA_NEEDS_HTTPS_EN =
  'Camera requires HTTPS or a browser that supports scanning. Open the site over https or use Chrome on mobile.';

export function BarcodeScanner({
  open,
  onClose,
  onDetected,
  onError,
  language = 'en',
  closeLabel,
  manualEntryLabel,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zxingReaderRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isSecureContext =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const cameraUnavailableMessage = language === 'ar' ? CAMERA_NEEDS_HTTPS_AR : CAMERA_NEEDS_HTTPS_EN;
  const closeText = closeLabel ?? (language === 'ar' ? 'إغلاق' : 'Close');
  const manualText = manualEntryLabel ?? (language === 'ar' ? 'إدخال يدوي' : 'Manual entry');

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;

    const start = async () => {
      setError(null);
      if (!isSecureContext) {
        setError(cameraUnavailableMessage);
        onError?.(cameraUnavailableMessage);
        return;
      }

      const Detector = (window as any).BarcodeDetector as
        | (new (options?: { formats: string[] }) => { detect: (source: ImageBitmapSource) => Promise<DetectedBarcode[]> })
        | undefined;

      if (Detector) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (!active) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            await videoRef.current.play();
          }
          const detector = new Detector({
            formats: [...BARCODE_FORMATS],
          });
          const scan = async () => {
            if (!active || !videoRef.current) return;
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                onDetected(barcodes[0].rawValue);
                onClose();
                return;
              }
            } catch {
              // ignore single-frame errors
            }
            if (active) requestAnimationFrame(scan);
          };
          requestAnimationFrame(scan);
        } catch (err: any) {
          const msg = err?.message || 'Camera access denied';
          setError(msg);
          onError?.(msg);
        }
        return;
      }

      // Fallback: dynamic import @zxing/browser (only when user clicked scan)
      const ZXING_MSG_AR =
        'ميزة المسح بالكاميرا تحتاج تثبيت ZXing أو متصفح يدعم BarcodeDetector. استخدم الإدخال اليدوي أو جهاز باركود.';
      const ZXING_MSG_EN =
        'Camera scanning requires ZXing or BarcodeDetector support. Use manual entry or a barcode gun.';
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        zxingReaderRef.current = reader;
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tryDecode = () => {
          if (!active || !videoRef.current) return;
          reader.decodeFromVideoElement(videoRef.current, (err: any, result: any) => {
            if (!active) return;
            if (result?.getText()) {
              onDetected(result.getText());
              onClose();
              return;
            }
            if (active) setTimeout(tryDecode, 250);
          });
        };
        setTimeout(tryDecode, 500);
      } catch (err: any) {
        const isModuleMissing =
          err?.message?.includes?.('Cannot find module') ||
          err?.message?.includes?.('@zxing/browser') ||
          err?.code === 'MODULE_NOT_FOUND';
        const msg = isModuleMissing
          ? (language === 'ar' ? ZXING_MSG_AR : ZXING_MSG_EN)
          : (err?.message || 'Camera or scanner not available');
        setError(msg);
        onError?.(msg);
      }
    };

    start();

    return () => {
      active = false;
      stopStream();
      if (zxingReaderRef.current && videoRef.current) {
        try {
          zxingReaderRef.current.reset();
        } catch {
          // ignore
        }
      }
    };
  }, [open, isSecureContext, language, onClose, onDetected, onError, cameraUnavailableMessage, stopStream]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0b1220] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-cyan-200 font-semibold">{language === 'ar' ? 'مسح الباركود' : 'Scan Barcode'}</h3>
          <button type="button" onClick={onClose} className="text-slate-300 hover:text-white">
            ✕
          </button>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-cyan-500/20">
          <video ref={videoRef} className="h-72 w-full object-cover" muted playsInline />
        </div>
        {error && <div className="mt-3 text-sm text-red-300">{error}</div>}
        <p className="mt-3 text-xs text-slate-400">
          {language === 'ar' ? 'وجّه الكود داخل الإطار. يمكنك أيضاً استخدام إدخال يدوي.' : 'Align the code inside the frame. You can also use manual entry.'}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              try {
                fileInputRef.current?.click();
              } catch {
                // ignore
              }
            }}
            className="w-full py-2 rounded-lg border border-cyan-500/40 text-cyan-200 text-sm hover:bg-cyan-500/10"
          >
            {language === 'ar' ? 'مسح من صورة (الكاميرا)' : 'Scan from photo (camera)'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm hover:bg-cyan-500/10"
          >
            {closeText}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="w-full py-2 rounded-lg border border-slate-500/40 text-slate-300 text-sm hover:bg-slate-500/10"
          >
            {manualText}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const { BrowserMultiFormatReader } = await import('@zxing/browser');
                const reader = new BrowserMultiFormatReader();
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.src = url;
                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = (err) => reject(err);
                });
                const result = await reader.decodeFromImageElement(img as any);
                URL.revokeObjectURL(url);
                if (result?.getText()) {
                  onDetected(result.getText());
                  onClose();
                  return;
                }
                const msg =
                  language === 'ar'
                    ? 'تعذر قراءة الكود من الصورة. حاول مرة أخرى أو استخدم الإدخال اليدوي.'
                    : 'Could not decode code from image. Try again or use manual entry.';
                setError(msg);
                onError?.(msg);
              } catch (err: any) {
                const msg =
                  err?.message ||
                  (language === 'ar'
                    ? 'تعذر قراءة الكود من الصورة. حاول مرة أخرى أو استخدم الإدخال اليدوي.'
                    : 'Could not decode code from image. Try again or use manual entry.');
                setError(msg);
                onError?.(msg);
              } finally {
                e.target.value = '';
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
