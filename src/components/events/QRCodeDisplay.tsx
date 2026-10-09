import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

export default function QRCodeDisplay({ value, size = 180, className = "" }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#071a3d",
          light: "#ffffff",
        },
      }).catch((err) => {
        console.error("Failed to render QR Code:", err);
      });
    }
  }, [value, size]);

  return (
    <div className={`inline-block overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-sm ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}
