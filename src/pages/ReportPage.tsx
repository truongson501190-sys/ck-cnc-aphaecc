// src/pages/ReportPage.tsx
import React, { useState } from 'react';
import OCRUpload from '../features/ocr/components/OCRUpload';
import { OCRResult } from '../features/ocrService';

const ReportPage = () => {
  const [showOCR, setShowOCR] = useState(false);
  // ❌ Xóa dòng này: const [ocrResult, setOcrResult] = useState('');

  const handleTextExtracted = (text: string, result: OCRResult) => {
    console.log('📝 Kết quả OCR:', text);
    // setOcrResult(text);  // ❌ Xóa dòng này
    
    // Parse dữ liệu từ text
    const lines = text.split('\n');
    let productCode = '';
    let quantity = '';
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.includes('Mã SP') || trimmedLine.includes('Mã sản phẩm')) {
        const parts = trimmedLine.split(':');
        if (parts.length > 1) {
          productCode = parts[1].trim();
          console.log('📦 Mã sản phẩm:', productCode);
        }
      }
      if (trimmedLine.includes('Số lượng') || trimmedLine.includes('SL')) {
        const parts = trimmedLine.split(':');
        if (parts.length > 1) {
          quantity = parts[1].trim();
          console.log('📊 Số lượng:', quantity);
        }
      }
    });
    
    alert(`📦 Mã SP: ${productCode || 'Không tìm thấy'}\n📊 Số lượng: ${quantity || 'Không tìm thấy'}`);
    setShowOCR(false);
  };

  const handleError = (error: string) => {
    console.error('❌ Lỗi OCR:', error);
    alert(`❌ Lỗi: ${error}`);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📋 Nhật ký Sản Xuất</h1>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            ➕ Thêm tay
          </button>
          <button 
            onClick={() => setShowOCR(!showOCR)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            📷 Đọc từ ảnh
          </button>
        </div>
      </div>
      
      {showOCR && (
        <div className="mb-4">
          <OCRUpload 
            onTextExtracted={handleTextExtracted}
            onError={handleError}
          />
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-4">
        <p className="text-gray-500">Danh sách nhật ký sản xuất...</p>
      </div>
    </div>
  );
};

export default ReportPage;