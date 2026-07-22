// src/pages/ReportForm.tsx
import React from 'react';
import OCRUploadButton from '../features/ocr/components/OCRUploadButton';
import { useOCRFormIntegration } from '../features/ocr/hooks/useOCRFormIntegration';
import { ParsedReportData } from '../features/ocrService';

const ReportForm = () => {
  const { formData, fillFormFromOCR, hasData } = useOCRFormIntegration();

  const handleOCRParsed = (data: ParsedReportData) => {
    fillFormFromOCR(data);
    // Dữ liệu đã được tự động điền vào form
  };

  return (
    <div className="report-form">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">📋 Báo cáo sản xuất</h2>
        <OCRUploadButton 
          onParsedData={handleOCRParsed}
          autoFillForm={true}
          variant="default"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label>Ngày</label>
          <input type="date" value={formData.date || ''} />
        </div>
        <div>
          <label>Ca</label>
          <input type="number" value={formData.shift || ''} />
        </div>
        <div>
          <label>Mã máy</label>
          <input type="text" value={formData.machineCode || ''} />
        </div>
        <div>
          <label>Công nhân</label>
          <input type="text" value={formData.workerName || formData.workerCode || ''} />
        </div>
      </div>
      
      {hasData && (
        <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          ✅ Dữ liệu đã được điền tự động từ ảnh
        </div>
      )}
    </div>
  );
};