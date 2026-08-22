// src/features/ocr/components/OCRUploadButton.tsx

import React, { useState, useRef, useEffect } from 'react';
import { ocrService } from '../services/ocrService';
import { StructuredOCRDisplay } from './StructuredOCRDisplay';
import { ParsedReportData, OCRResult } from '../types/documentTypes';

// ============================================================
// PROPS
// ============================================================

interface OCRUploadButtonProps {
  onDataParsed?: (data: ParsedReportData) => void;
  onError?: (error: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  accept?: string;
  multiple?: boolean;
  buttonText?: string;
  className?: string;
  userId?: string;
}

// ============================================================
// COMPONENT
// ============================================================

export const OCRUploadButton: React.FC<OCRUploadButtonProps> = ({
  onDataParsed,
  onError,
  onUploadStart,
  onUploadEnd,
  accept = 'image/*,.pdf',
  multiple = false,
  buttonText = '📂 Chọn file scan',
  className = '',
  userId = 'system',
}) => {
  // ============================================================
  // STATE
  // ============================================================

  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [ocrData, setOcrData] = useState<ParsedReportData | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [textLength, setTextLength] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleOpenPopup = () => {
    setIsOpen(true);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsProcessing(true);
    setError(null);
    setOcrData(null);
    setScanId(null);
    setSuccessMessage(null);
    onUploadStart?.();

    try {
      console.log('📤 Uploading file:', file.name);

      const result: OCRResult = await ocrService.processFile(file);

      if (result.status === 'success' && result.parsed_data) {
        const parsedData = result.parsed_data;
        setOcrData(parsedData);
        setTextLength(result.text?.length || 0);
        setScanId(result.scan_id || null);

        console.log('✅ OCR thành công:', parsedData);
        onDataParsed?.(parsedData);
      } else {
        const errorMsg = result.message || 'Không thể đọc file. Vui lòng thử lại.';
        setError(errorMsg);
        onError?.(errorMsg);
        console.error('❌ OCR thất bại:', result);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi không xác định';
      setError(errorMsg);
      onError?.(errorMsg);
      console.error('❌ Lỗi xử lý:', err);
    } finally {
      setIsProcessing(false);
      onUploadEnd?.();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCorrection = async (corrections: Record<string, any>) => {
    if (!scanId) {
      setError('Không có scanId để học. Vui lòng upload lại file.');
      return;
    }

    setIsLearning(true);
    setError(null);
    try {
      await ocrService.learn(scanId, corrections, userId);
      console.log('✅ AI đã học thành công');

      setOcrData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          fields: { ...prev.fields, ...corrections },
          confidence: Math.min(prev.confidence + 0.02, 1),
        };
      });
      setSuccessMessage('✅ AI đã học thành công!');
    } catch (err) {
      console.error('❌ Lỗi học:', err);
      setError('Không thể gửi dữ liệu học. Vui lòng thử lại.');
    } finally {
      setIsLearning(false);
    }
  };

  const handleConfirm = async (data: Record<string, any>) => {
    if (!scanId) {
      setError('Không có scanId để nhập ERP. Vui lòng upload lại file.');
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      const result = await ocrService.importToERP(scanId, data, userId);
      console.log('✅ Nhập ERP thành công:', result);
      setSuccessMessage(`✅ Nhập ERP thành công! Transaction ID: ${result.transaction_id}`);
      // Có thể reset state hoặc chuyển trang
    } catch (err) {
      console.error('❌ Lỗi nhập ERP:', err);
      setError('Không thể nhập ERP. Vui lòng thử lại.');
    } finally {
      setIsImporting(false);
    }
  };

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    console.log('🔍 State:', {
      isOpen,
      hasText: !!ocrData,
      isProcessing,
      hasData: !!ocrData,
      textLength,
      hasError: !!error,
      hasSuccess: !!successMessage,
    });
  }, [isOpen, ocrData, isProcessing, textLength, error, successMessage]);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className={`ocr-upload-button ${className}`}>
      {/* Input file ẩn */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => handleFileUpload(e.target.files)}
        className="hidden"
        disabled={isProcessing}
      />

      {/* Nút upload */}
      <button
        onClick={handleOpenPopup}
        disabled={isProcessing || isLearning || isImporting}
        className={`
          px-4 py-2 rounded-md font-medium transition-colors
          ${
            isProcessing || isLearning || isImporting
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }
        `}
      >
        {isProcessing && <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Đang xử lý...</span>}
        {isLearning && <span className="flex items-center gap-2"><span className="animate-spin">📚</span> Đang học...</span>}
        {isImporting && <span className="flex items-center gap-2"><span className="animate-spin">📦</span> Đang nhập ERP...</span>}
        {!isProcessing && !isLearning && !isImporting && buttonText}
      </button>

      {/* Success message */}
      {successMessage && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 text-sm">
          {successMessage}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Kết quả OCR */}
      {ocrData && !isProcessing && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              📄 {textLength} ký tự • {Object.keys(ocrData.fields).length} trường
            </span>
            <span className="text-xs text-gray-400">
              {ocrData.source === 'ai_backend' ? '🤖 AI' : '📷 Tesseract'}
            </span>
          </div>

          <StructuredOCRDisplay
            data={ocrData}
            onCorrection={handleCorrection}
            onConfirm={handleConfirm}
            isLearning={isLearning}
            isImporting={isImporting}
          />
        </div>
      )}
    </div>
  );
};

export default OCRUploadButton;