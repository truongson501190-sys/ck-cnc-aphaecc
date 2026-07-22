// src/features/ocr/components/
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import OCRUpload from '@/features/ocr/components/OCRUpload';
import { OCRResult, ParsedReportData } from '@/features/ocr/services/ocrService';
import { Loader2 } from 'lucide-react';

interface OCRUploadButtonProps {
  onDataExtracted?: (data: any) => void;
  onParsedData?: (data: ParsedReportData) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  buttonText?: string;
  autoFillForm?: boolean;
}

const createParsedReportData = (raw: any, text: string = ''): ParsedReportData => {
  const fields: Record<string, any> = {};
  
  // Map các trường từ raw vào fields nếu có
  if (raw.ngayThang) fields.date = raw.ngayThang;
  if (raw.ca) fields.shift = raw.ca;
  if (raw.maySanXuat) fields.machine_code = raw.maySanXuat;
  if (raw.maDuAn) fields.product_code = raw.maDuAn;
  if (raw.tenDuAn) fields.product_name = raw.tenDuAn;
  if (raw.soLuongHoanThanh) fields.quantity = raw.soLuongHoanThanh;
  if (raw.nguoiVanHanh) fields.worker_name = raw.nguoiVanHanh;
  if (raw.nguyenCongSo) fields.batch_number = raw.nguyenCongSo;
  if (raw.noiDungGiaCong) fields.notes = raw.noiDungGiaCong;
  
  return {
    type: 'production',
    fields,
    confidence: 0.7,
    raw_text: text,
    parsed_at: new Date().toISOString(),
  };
};

const processOCRResult = (
  text: string,
  result: OCRResult,
  onParsedData?: (data: ParsedReportData) => void,
  onDataExtracted?: (data: any) => void,
  onClose?: () => void
) => {
  console.log('📝 Kết quả OCR:', text);
  const parsedData = result.parsed_data ?? createParsedReportData({}, text);
  onParsedData?.(parsedData);
  onDataExtracted?.(parsedData);
  onClose?.();
};

const OCRUploadButton: React.FC<OCRUploadButtonProps> = ({
  onDataExtracted,
  onParsedData,
  variant = 'outline',
  size = 'default',
  className = '',
  buttonText = '📷 Đọc từ ảnh',
  autoFillForm = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleTextExtracted = (text: string, result: OCRResult) => {
    processOCRResult(
      text,
      result,
      onParsedData,
      onDataExtracted,
      () => setIsOpen(false)
    );
  };

  const handleError = (error: string) => {
    toast.error('❌ Lỗi OCR: ' + error);
  };

  const toggleDialog = () => setIsOpen((prev) => !prev);

  return (
    <>
      <Button
        onClick={toggleDialog}
        variant={variant}
        size={size}
        className={`border-green-500 text-green-600 hover:bg-green-50 ${className}`}
      >
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">📷</span> Đọc dữ liệu từ ảnh báo cáo
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Tải lên ảnh báo cáo (JPG, PNG, BMP, TIFF) để tự động trích xuất thông tin vào form
            </p>
            <OCRUpload
              onTextExtracted={handleTextExtracted}
              onError={handleError}
              onProcessing={setIsProcessing}
              multiple={false}
              autoFillForm={autoFillForm}
              onDataParsed={(data) => {
                onParsedData?.(data);
              }}
            />
            {isProcessing && (
              <div className="mt-4 flex items-center gap-2 text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Đang xử lý ảnh, vui lòng đợi...</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OCRUploadButton;