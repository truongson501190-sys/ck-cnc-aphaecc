import React from "react";
import { QRCodeCanvas } from "qrcode.react";

interface MachineQRCodeProps {
  machineId: string;
  machineName: string;
}

export const MachineQRCode: React.FC<MachineQRCodeProps> = ({
  machineId,
  machineName,
}) => {
  const qrValue = `https://your-domain.com/machines/${machineId}`;

  const downloadQR = () => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const link = document.createElement("a");
    link.download = `${machineName}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center">
      <QRCodeCanvas value={qrValue} size={180} level="H" includeMargin />
      <p className="mt-3 text-sm font-semibold text-gray-700">{machineName}</p>
      <button
        onClick={downloadQR}
        className="mt-2 px-4 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Tải mã QR
      </button>
    </div>
  );
};
