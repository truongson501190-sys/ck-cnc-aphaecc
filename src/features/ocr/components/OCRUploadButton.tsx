// src/features/ocr/components/OCRUploadButton.tsx
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import OCRUpload from '@/features/ocr/components/OCRUpload';
import { OCRResult, ParsedReportData } from '@/features/ocr/services/ocrService';
import { Loader2, Maximize2, Minimize2, X, Copy, Check, Edit, Save } from 'lucide-react';
import { DocumentClassifier } from '../services/documentClassifier';
import { StructureAnalyzer } from '../services/structureAnalyzer';
import { StructuredOCRDisplay } from './StructuredOCRDisplay';
import { DocumentStructure } from '../types/documentTypes';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState<string>('');
  
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrData, setOcrData] = useState<ParsedReportData | null>(null);
  const [docStructure, setDocStructure] = useState<DocumentStructure | null>(null);

  const isOpenRef = useRef(false);
  const hasResultRef = useRef(false);
  const isProcessingRef = useRef(false);
  const classifier = useRef(new DocumentClassifier());
  const analyzer = useRef(new StructureAnalyzer());

  useEffect(() => {
    console.log('🔍 State:', { 
      isOpen, 
      hasText: !!ocrText, 
      isProcessing,
      hasData: !!ocrData,
      textLength: ocrText.length,
      isEditing
    });
  }, [isOpen, ocrText, isProcessing, ocrData, isEditing]);

  const handleTextExtracted = useCallback((text: string, result: OCRResult) => {
    console.log('📝 OCR done, text length:', text.length);
    
    const parsedData = result.parsed_data ?? createParsedReportData({}, text);
    
    const classification = classifier.current.classify(text);
    console.log('📌 Document type:', classification.type, 'confidence:', classification.confidence);
    
    const structure = analyzer.current.analyze(text, classification.type);
    setDocStructure(structure);
    
    setOcrText(text);
    setEditedText(text);
    setOcrData(parsedData);
    hasResultRef.current = true;
    
    if (onParsedData) {
      onParsedData(parsedData);
    }
    if (onDataExtracted) {
      onDataExtracted(parsedData);
    }
    
    toast.success(`✅ Đã đọc xong! (${text.length} ký tự)`);
  }, [onParsedData, onDataExtracted]);

  const handleError = useCallback((error: string) => {
    toast.error('❌ Lỗi OCR: ' + error);
  }, []);

  const handleOpen = useCallback(() => {
    console.log('📂 Mở popup');
    setIsOpen(true);
    isOpenRef.current = true;
    setOcrText('');
    setEditedText('');
    setOcrData(null);
    setDocStructure(null);
    setIsEditing(false);
    hasResultRef.current = false;
    isProcessingRef.current = false;
  }, []);

  const handleClose = useCallback(() => {
    console.log('📂 Đóng popup (user click)');
    setIsOpen(false);
    isOpenRef.current = false;
    setOcrText('');
    setEditedText('');
    setOcrData(null);
    setDocStructure(null);
    setCopied(false);
    setIsEditing(false);
    hasResultRef.current = false;
    isProcessingRef.current = false;
  }, []);

  const handleApplyData = useCallback(() => {
    console.log('📂 Áp dụng dữ liệu');
    
    let finalData = ocrData;
    if (isEditing && editedText !== ocrText) {
      finalData = createParsedReportData({}, editedText);
      setOcrData(finalData);
    }
    
    if (finalData && onParsedData) {
      onParsedData(finalData);
    }
    if (finalData && onDataExtracted) {
      onDataExtracted(finalData);
    }
    toast.success('✅ Đã áp dụng dữ liệu vào form!');
    handleClose();
  }, [ocrData, onParsedData, onDataExtracted, handleClose, isEditing, editedText, ocrText]);

  const handleCopy = useCallback(() => {
    const textToCopy = isEditing ? editedText : ocrText;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast.success('✅ Đã sao chép nội dung!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [isEditing, editedText, ocrText]);

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      setOcrText(editedText);
      const newData = createParsedReportData({}, editedText);
      setOcrData(newData);
      toast.info('📝 Đã cập nhật nội dung!');
    } else {
      setEditedText(ocrText);
    }
    setIsEditing(!isEditing);
  }, [isEditing, editedText, ocrText]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  if (!isOpen) {
    return (
      <Button
        onClick={handleOpen}
        variant={variant}
        size={size}
        className={`border-green-500 text-green-600 hover:bg-green-50 ${className}`}
      >
        {buttonText}
      </Button>
    );
  }

  const popupContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !hasResultRef.current && !isProcessingRef.current) {
          handleClose();
        }
      }}
    >
      <div 
        className={`
          bg-white dark:bg-gray-900 rounded-2xl shadow-2xl
          ${isFullscreen ? 'w-[95vw] h-[95vh]' : 'w-[95vw] max-w-4xl max-h-[90vh]'}
          flex flex-col
          transition-all duration-300
          relative
          overflow-hidden
        `}
        style={{
          border: '1px solid #e5e7eb',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📷</span>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Đọc dữ liệu từ ảnh báo cáo
              </h2>
              {isProcessing && (
                <span className="text-sm font-normal text-blue-600 flex items-center gap-1">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </span>
              )}
              {!isProcessing && ocrText && (
                <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                  ✅ Đã đọc xong
                </span>
              )}
              {isEditing && (
                <span className="text-sm font-normal text-orange-600 flex items-center gap-1">
                  ✏️ Đang sửa
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                disabled={isProcessing}
              >
                <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tải lên ảnh báo cáo (JPG, PNG, BMP, TIFF, PDF) để tự động trích xuất thông tin
          </p>
        </div>

        {/* ===== BODY - BỐ CỤC DỌC ===== */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px] bg-gray-50 dark:bg-gray-800/50">
          {/* OCR Upload */}
          <div className="mb-4">
            <OCRUpload
              key="ocr-upload-popup"
              onTextExtracted={handleTextExtracted}
              onError={handleError}
              onProcessing={(processing) => {
                setIsProcessing(processing);
                isProcessingRef.current = processing;
              }}
              multiple={false}
              autoFillForm={autoFillForm}
              onDataParsed={(data) => {
                console.log('📊 onDataParsed called, updating state');
                setOcrData(data);
                if (onParsedData) onParsedData(data);
              }}
            />
          </div>

          {/* ===== HIỂN THỊ KẾT QUẢ ===== */}
          {ocrText && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              {/* Header kết quả */}
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    📝 Kết quả đọc được
                  </h4>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                    {ocrText.length} ký tự
                  </span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                    {ocrText.split('\n').length} dòng
                  </span>
                  {docStructure && docStructure.type !== 'unknown' && (
                    <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                      {docStructure.type.replace('_', ' ')}
                    </span>
                  )}
                  {isEditing && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">
                      ✏️ Đang sửa
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                  <button
                    onClick={handleToggleEdit}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1
                      ${isEditing 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/30' 
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30'
                      }`}
                  >
                    {isEditing ? <Save className="h-3.5 w-3.5" /> : <Edit className="h-3.5 w-3.5" />}
                    {isEditing ? 'Lưu sửa' : 'Sửa'}
                  </button>
                  <button
                    onClick={handleApplyData}
                    className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    ✅ Áp dụng
                  </button>
                </div>
              </div>

              {/* ===== CỘT 1: Nội dung OCR ===== */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">📄 Nội dung từ OCR</span>
                  <span className="text-xs text-gray-400">{ocrText.split('\n').length} dòng</span>
                </div>
                <div className="p-3 min-h-[150px] max-h-[300px] overflow-auto">
                  {docStructure ? (
                    <StructuredOCRDisplay
                      structure={docStructure}
                      isEditing={isEditing}
                      editedText={editedText}
                      onEdit={(text) => setEditedText(text)}
                    />
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <pre className="text-sm whitespace-pre-wrap font-mono text-gray-800 dark:text-gray-200">
                        {ocrText}
                      </pre>
                    </div>
                  )}
                </div>
              </div>

              {/* ===== CỘT 2: Dữ liệu trích xuất (ở dưới) ===== */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">📊 Dữ liệu trích xuất</span>
                  {!isEditing && ocrData && (
                    <span className="text-xs text-gray-400">
                      🎯 {Math.round(ocrData.confidence * 100)}%
                    </span>
                  )}
                </div>
                <div className="p-3 min-h-[100px] max-h-[250px] overflow-y-auto">
                  {!isEditing && ocrData?.fields && Object.keys(ocrData.fields).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(ocrData.fields).map(([key, value]) => {
                        const labels: Record<string, string> = {
                          date: 'Ngày',
                          shift: 'Ca',
                          machine_code: 'Mã máy',
                          worker_code: 'Mã CN',
                          worker_name: 'Tên CN',
                          product_code: 'Mã SP',
                          product_name: 'Tên SP',
                          batch_number: 'Số lô',
                          quantity: 'Số lượng',
                          unit: 'Đơn vị',
                          result: 'Kết quả',
                          notes: 'Ghi chú',
                          material: 'Vật liệu',
                          supplier: 'Nhà cung cấp',
                          customer: 'Khách hàng',
                        };
                        return (
                          <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50">
                            <span className="text-xs text-gray-500 font-medium min-w-[70px]">
                              {labels[key] || key}
                            </span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate ml-2">
                              {value !== undefined && value !== null ? String(value) : '---'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : isEditing ? (
                    <div className="flex items-center justify-center h-full text-center text-gray-400 text-sm">
                      <div>
                        <span className="text-3xl block mb-2">✏️</span>
                        <p>Đang sửa nội dung</p>
                        <p className="text-xs text-gray-400">Nhấn "Lưu sửa" để cập nhật dữ liệu</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-center text-gray-400 text-sm">
                      <div>
                        <span className="text-3xl block mb-2">⚠️</span>
                        <p>Không trích xuất được dữ liệu</p>
                        <p className="text-xs text-gray-400">Vui lòng kiểm tra nội dung bên trên</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin thêm */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400">
                <span>📏 {isEditing ? editedText.length : ocrText.length} ký tự</span>
                <span>📄 {isEditing ? editedText.split('\n').length : ocrText.split('\n').length} dòng</span>
                {!isEditing && ocrData && (
                  <span>🎯 Độ tin cậy: {Math.round(ocrData.confidence * 100)}%</span>
                )}
                {isEditing && (
                  <span className="text-orange-500">✏️ Đang sửa - nhấn "Lưu sửa" để hoàn tất</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex justify-between items-center">
          <span className="text-xs text-gray-400">💡 Có thể kéo thả file vào đây</span>
          <div className="flex gap-2">
            {ocrText && (
              <>
                <button
                  onClick={handleToggleEdit}
                  className={`px-4 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1
                    ${isEditing 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                    }`}
                >
                  {isEditing ? <Save className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                  {isEditing ? 'Lưu sửa' : '✏️ Sửa'}
                </button>
                <button
                  onClick={handleApplyData}
                  className="px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Áp dụng
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              disabled={isProcessing}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        onClick={handleOpen}
        variant={variant}
        size={size}
        className={`border-green-500 text-green-600 hover:bg-green-50 ${className}`}
      >
        {buttonText}
      </Button>
      {isOpen && createPortal(popupContent, document.body)}
    </>
  );
};

export default OCRUploadButton;