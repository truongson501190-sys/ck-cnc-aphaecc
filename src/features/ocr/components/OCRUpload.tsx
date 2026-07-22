// src/features/ocr/components/OCRUpload.tsx
import React, { useState, useRef, ChangeEvent } from 'react';
import { ocrService, OCRResult, OCRBatchResult, ParsedReportData } from '@/features/ocr/services/ocrService';
import { Loader2, CheckCircle, XCircle, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface OCRUploadProps {
  onTextExtracted?: (text: string, result: OCRResult) => void;
  onDataParsed?: (data: ParsedReportData, result: OCRResult) => void;
  onBatchComplete?: (results: OCRBatchResult) => void;
  onError?: (error: string) => void;
  onProcessing?: (isProcessing: boolean) => void;
  className?: string;
  multiple?: boolean;
  autoFillForm?: boolean;
  enableAI?: boolean;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const isValidFile = (file: File): boolean => {
  const validTypes = [
    'image/jpeg', 'image/png', 'image/bmp', 'image/tiff',
    'application/pdf',
    'image/webp',
    'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  const extensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];
  
  return validTypes.includes(file.type) || 
         extensions.some(ext => file.name.toLowerCase().endsWith(ext));
};

// ✅ Tăng giới hạn lên 100MB
const isFileSizeValid = (file: File): boolean => {
  return file.size <= 100 * 1024 * 1024; // 100MB
};

const isPdfFile = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.pdf');
};

const getFileType = (file: File): string => {
  return file.type || file.name.split('.').pop()?.toUpperCase() || 'Unknown';
};

const formatFileSize = (size: number): string => {
  if (size < 1024) return size + ' B';
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB';
  return (size / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (fileName: string): string => {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return '📕';
  if (name.endsWith('.docx') || name.endsWith('.doc')) return '📄';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📊';
  if (name.endsWith('.txt')) return '📝';
  return '🖼️';
};

// ============================================================
// MAIN COMPONENT: OCRUpload
// ============================================================
const OCRUpload: React.FC<OCRUploadProps> = ({ 
  onTextExtracted, 
  onDataParsed,
  onBatchComplete, 
  onError, 
  onProcessing,
  className = '',
  multiple = false,
  autoFillForm = true,
  enableAI = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileInfos, setFileInfos] = useState<{ name: string; size: string; type: string; id: string }[]>([]);
  const [pageNumber, setPageNumber] = useState<number | undefined>(undefined);
  const [batchResults, setBatchResults] = useState<OCRBatchResult | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showRawText, setShowRawText] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processValidFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const validInfos: { name: string; size: string; type: string; id: string }[] = [];

    for (const file of files) {
      if (!isValidFile(file)) {
        toast.error(`File ${file.name} không được hỗ trợ`);
        continue;
      }

      if (!isFileSizeValid(file)) {
        toast.error(`File ${file.name} quá lớn (>100MB)`);
        continue;
      }

      const id = crypto.randomUUID();
      validFiles.push(file);
      validInfos.push({
        id,
        name: file.name,
        size: formatFileSize(file.size),
        type: getFileType(file)
      });
    }

    if (validFiles.length > 0) {
      setSelectedFiles(validFiles);
      setFileInfos(validInfos);
      setExtractedText('');
      setParsedData(null);
      setBatchResults(null);
      setValidationErrors([]);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    processValidFiles(files);
  };

  const handleSuccessfulResult = (result: OCRResult) => {
    setExtractedText(result.text!);

    if (result.parsed_data) {
      setParsedData(result.parsed_data);

      const importantFields = ['date', 'product_code', 'quantity', 'machine_code'];
      const missing = importantFields.filter(f => !result.parsed_data?.fields?.[f]);
      if (missing.length > 0) {
        setValidationErrors(missing.map(f => `Thiếu trường "${f}"`));
        toast.warning(`⚠️ Thiếu một số trường: ${missing.join(', ')}`);
      } else {
        setValidationErrors([]);
        toast.success('✅ Đã trích xuất dữ liệu thành công!');
      }

      if (onDataParsed) {
        onDataParsed(result.parsed_data, result);
      }
    }

    if (onTextExtracted) {
      onTextExtracted(result.text!, result);
    }
  };

  const handleFailedResult = (result: OCRResult) => {
    const errorMsg = result.message || 'Không đọc được nội dung file';
    setExtractedText(`❌ Lỗi: ${errorMsg}`);
    if (onError) {
      onError(errorMsg);
    }
    toast.error(`❌ ${errorMsg}`);
  };

  const processOcrResult = (result: OCRResult) => {
    if (result.status === 'success' && result.text) {
      handleSuccessfulResult(result);
      return;
    }
    handleFailedResult(result);
  };

  const handleSingleFileUpload = async (file: File) => {
    const result = await ocrService.processFile(file, pageNumber);
    processOcrResult(result);
  };

  const handleMultipleFileUpload = async (files: File[]) => {
    const batchResult = await ocrService.processFiles(files);
    setBatchResults(batchResult);
    
    const allTexts = batchResult.results
      .filter((r: OCRResult) => r.status === 'success' && r.text)
      .map((r: OCRResult) => `--- ${r.filename} ---\n${r.text}`)
      .join('\n\n');
    
    setExtractedText(allTexts);
    
    const parsedResults = batchResult.results.filter((r: OCRResult) => r.parsed_data);
    if (parsedResults.length > 0 && onDataParsed) {
      onDataParsed(parsedResults[0].parsed_data!, parsedResults[0]);
    }
    
    if (onBatchComplete) {
      onBatchComplete(batchResult);
    }
    
    toast.success(`✅ Đã xử lý ${batchResult.successCount}/${batchResult.totalFiles} file`);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.warning('Vui lòng chọn file báo cáo');
      return;
    }

    setIsLoading(true);
    setExtractedText('');
    setParsedData(null);
    setValidationErrors([]);
    if (onProcessing) onProcessing(true);

    try {
      if (multiple && selectedFiles.length > 1) {
        await handleMultipleFileUpload(selectedFiles);
      } else {
        await handleSingleFileUpload(selectedFiles[0]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Có lỗi xảy ra khi xử lý file';
      setExtractedText(`❌ ${errorMsg}`);
      if (onError) {
        onError(errorMsg);
      }
      toast.error(`❌ ${errorMsg}`);
    } finally {
      setIsLoading(false);
      if (onProcessing) onProcessing(false);
    }
  };

  const handleClear = () => {
    setSelectedFiles([]);
    setFileInfos([]);
    setExtractedText('');
    setParsedData(null);
    setValidationErrors([]);
    setPageNumber(undefined);
    setBatchResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyToForm = () => {
    if (parsedData && onDataParsed) {
      onDataParsed(parsedData, { status: 'success' } as OCRResult);
      toast.success('✅ Đã điền dữ liệu vào form!');
    }
  };

  const hasText = extractedText.length > 0;
  const isMultiple = multiple && selectedFiles.length > 1;
  const isSinglePdf = selectedFiles.length === 1 && isPdfFile(selectedFiles[0].name);

  const getButtonText = () => {
    if (isLoading) {
      return selectedFiles.length > 1 ? `Đang xử lý ${selectedFiles.length} file...` : 'Đang xử lý...';
    }
    return selectedFiles.length > 1 ? `📤 Đọc báo cáo (${selectedFiles.length} file)` : '📤 Đọc báo cáo';
  };

  // ============================================================
  // COMPONENT: Raw Text Display
  // ============================================================
  const RawTextDisplay = () => {
    if (!extractedText) return null;

    return (
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <span>📝</span> Nội dung đọc được từ file
            <span className="text-xs text-gray-400 font-normal">
              ({extractedText.length} ký tự, {extractedText.split('\n').length} dòng)
            </span>
          </h4>
          <div className="flex gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(extractedText);
                toast.success('✅ Đã sao chép toàn bộ nội dung!');
              }}
              className="text-xs px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              📋 Sao chép
            </button>
            {parsedData && (
              <button
                onClick={() => setShowRawText(!showRawText)}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {showRawText ? '📊 Xem dữ liệu' : '📝 Xem raw text'}
              </button>
            )}
          </div>
        </div>

        {showRawText || !parsedData ? (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 max-h-[500px] overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-gray-800">
              {extractedText}
            </pre>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {parsedData.fields && Object.entries(parsedData.fields).map(([key, value]) => (
                <div key={key} className="flex items-start gap-2">
                  <span className="text-xs text-gray-500 min-w-[80px] font-medium">
                    {getFieldLabel(key)}:
                  </span>
                  <span className="text-sm text-gray-800 font-medium break-words">
                    {value !== undefined && value !== null ? String(value) : '---'}
                  </span>
                </div>
              ))}
              {Object.keys(parsedData.fields || {}).length === 0 && (
                <div className="col-span-full text-center text-gray-400 text-sm py-4">
                  Không có dữ liệu được trích xuất. Hiển thị raw text bên dưới.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông tin thêm */}
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
          <span>📏 {extractedText.length} ký tự</span>
          <span>📄 {extractedText.split('\n').length} dòng</span>
          {batchResults && (
            <span>✅ {batchResults.successCount}/{batchResults.totalFiles} file thành công</span>
          )}
          {parsedData && (
            <span>🎯 Độ tin cậy: {Math.round(parsedData.confidence * 100)}%</span>
          )}
        </div>
      </div>
    );
  };

  // Helper để lấy label cho field
  const getFieldLabel = (key: string): string => {
    const labels: Record<string, string> = {
      date: 'Ngày',
      shift: 'Ca',
      machine_code: 'Mã máy',
      worker_code: 'Mã công nhân',
      worker_name: 'Tên công nhân',
      product_code: 'Mã sản phẩm',
      product_name: 'Tên sản phẩm',
      batch_number: 'Số lô',
      quantity: 'Số lượng',
      unit: 'Đơn vị',
      result: 'Kết quả',
      notes: 'Ghi chú',
      material: 'Vật liệu',
      supplier: 'Nhà cung cấp',
      customer: 'Khách hàng',
    };
    return labels[key] || key;
  };

  return (
    <div className={`ocr-upload ${className}`}>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span>📄</span> Đọc báo cáo từ file
            {isMultiple && <span className="text-sm font-normal text-gray-500">({selectedFiles.length} file)</span>}
          </h3>
          {enableAI && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
              🧠 AI Smart
            </span>
          )}
        </div>
        
        <div className="space-y-4">
          {/* File input */}
          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Chọn file báo cáo (ảnh, PDF, Word, Excel, TXT)
              {multiple && <span className="text-xs text-gray-400 ml-2">(có thể chọn nhiều file)</span>}
            </label>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept=".jpg,.jpeg,.png,.bmp,.tiff,.pdf,.docx,.xlsx,.txt,.doc,.xls,.webp,.heic"
              onChange={handleFileChange}
              disabled={isLoading}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            <p className="text-xs text-gray-400 mt-1">
              Hỗ trợ: ảnh (JPG, PNG, BMP, TIFF, WEBP, HEIC), PDF, Word, Excel, TXT • Giới hạn: 100MB
            </p>
          </div>

          {/* File info */}
          {fileInfos.length > 0 && (
            <div className="bg-gray-50 rounded-md p-3 max-h-40 overflow-y-auto">
              {fileInfos.map((info) => (
                <div key={info.id} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getFileIcon(info.name)}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{info.name}</p>
                      <p className="text-xs text-gray-500">{info.size} • {info.type}</p>
                    </div>
                  </div>
                  {batchResults && (
                    <div>
                      {batchResults.results.find((r: OCRResult) => r.filename === info.name)?.status === 'success' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* PDF options */}
          {isSinglePdf && (
            <div className="flex items-center gap-3">
              <label htmlFor="page-number" className="text-sm text-gray-700">
                Trang:
              </label>
              <input
                id="page-number"
                type="number"
                min="0"
                placeholder="Tất cả"
                value={pageNumber ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setPageNumber(val ? Number.parseInt(val, 10) : undefined);
                }}
                className="w-20 px-2 py-1 border rounded-md text-sm"
              />
              <span className="text-xs text-gray-500">(để trống để xử lý tất cả)</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isLoading}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors
                ${selectedFiles.length === 0 || isLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-white" />
                  {getButtonText()}
                </span>
              ) : (
                getButtonText()
              )}
            </button>
            
            {parsedData && autoFillForm && (
              <button
                onClick={handleApplyToForm}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <span>📝</span> Điền form
              </button>
            )}
            
            {hasText && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(extractedText);
                  toast.success('✅ Đã sao chép nội dung vào clipboard!');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                📋 Sao chép
              </button>
            )}
            
            {selectedFiles.length > 0 && (
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
              >
                🗑️ Xóa
              </button>
            )}
          </div>

          {/* Validation warnings */}
          {validationErrors.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Cảnh báo:</p>
                  <ul className="text-sm text-yellow-700 list-disc list-inside">
                    {validationErrors.map((err, index) => (
                      <li key={`${err}-${index}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* ⭐ RAW TEXT DISPLAY - HIỂN THỊ NỘI DUNG ĐỌC ĐƯỢC */}
          <RawTextDisplay />
        </div>
      </div>
    </div>
  );
};

export default OCRUpload;