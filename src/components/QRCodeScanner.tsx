import React, { useEffect, useRef, useState } from 'react';

// Lightweight dynamic QR scanner using `html5-qrcode` if available at runtime.
// This avoids a hard dependency at build time; if you want camera scanning,
// run: `pnpm add html5-qrcode`.
export const QRCodeScanner: React.FC<{ onDetected?: (text: string) => void }> = ({ onDetected }) => {
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  type Html5QrcodeLike = {
    start: (
      cameraIdOrConfig: string | { facingMode?: string },
      configurations?: { fps?: number; qrbox?: number; [key: string]: unknown },
      qrCodeSuccessCallback?: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: string) => void,
    ) => Promise<void>;
    stop: () => Promise<void>;
    clear: () => void;
  };

  const scannerRef = useRef<Html5QrcodeLike | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initScanner() {
      try {
        const mod = await import('html5-qrcode');
        const Html5Qrcode = mod.Html5Qrcode;
        if (!mounted) return;

        if (!containerRef.current) {
          setError('Không tìm thấy vùng hiển thị camera.');
          return;
        }

        const elementId = `html5qr-scanner-${Date.now()}`;
        containerRef.current.id = elementId;

        const scanner = new Html5Qrcode(elementId) as unknown as Html5QrcodeLike;
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => {
            setResult(decodedText);
            if (onDetected) onDetected(decodedText);
          },
          (errorMessage: string) => {
            // occasional decode errors are normal; ignore
          }
        );
      } catch (err: unknown) {
        setError('Máy quét QR không khả dụng. Cài thêm `html5-qrcode` bằng `pnpm add html5-qrcode` để bật chế độ camera.');
        console.error('QR init error:', err);
      }
    }

    initScanner();

    return () => {
      mounted = false;
      const scanner = scannerRef.current;
      if (scanner && scanner.stop) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
  }, [onDetected]);

  return (
    <div className="flex flex-col items-center mt-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">📱 Quét mã QR máy</h2>

      <div
        ref={containerRef}
        className="w-72 h-72 rounded-lg shadow-md bg-gray-100 flex items-center justify-center"
      >
        {!error && !result && <p className="text-sm text-gray-500">Đang khởi tạo camera...</p>}
        {error && (
          <div className="text-sm text-yellow-700 p-2 text-center">{error}</div>
        )}
      </div>

      {result ? (
        <div className="mt-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg shadow-sm">
          ✅ Đã quét: <span className="font-semibold">{result}</span>
        </div>
      ) : null}
    </div>
  );
};
