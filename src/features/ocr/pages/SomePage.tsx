// src/features/ocr/pages/SomePage.tsx
import React, { useState } from 'react';
import OCRUpload from '@/features/ocr/components/OCRUpload';
import { OCRResult } from '@/features/ocr/services/ocrService';
import { supabase } from '@/lib/supabase';  // ✅ Sửa import supabase

// Interface cho dữ liệu báo cáo
interface ReportData {
  productCode?: string;
  quantity?: string;
  rawText: string;
  employeeId?: string;
  date?: string;
  filename?: string;
  pageProcessed?: string;
}

const ReportPage = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<OCRResult | null>(null);
  const [extractedData, setExtractedData] = useState<{
    productCode?: string;
    quantity?: string;
  }>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  /**
   * Lưu dữ liệu báo cáo vào Supabase
   */
  const saveReportToSupabase = async (data: ReportData): Promise<boolean> => {
    try {
      console.log('🔄 Đang lưu dữ liệu vào Supabase...');
      
      const reportData = {
        product_code: data.productCode || '',
        quantity: data.quantity || '',
        raw_text: data.rawText || '',
        employee_id: data.employeeId || '',
        report_date: data.date || new Date().toISOString().split('T')[0],
        filename: data.filename || '',
        page_processed: data.pageProcessed || 'all',
        created_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select();

      if (error) {
        throw new Error(error.message);
      }

      console.log('✅ Đã lưu báo cáo thành công vào Supabase:', result);
      return true;
    } catch (error) {
      console.error('❌ Lỗi khi lưu vào Supabase:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Lỗi không xác định');
      
      try {
        const pendingReports = JSON.parse(localStorage.getItem('pending_reports') || '[]');
        pendingReports.push({
          ...data,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('pending_reports', JSON.stringify(pendingReports));
        console.log('💾 Đã lưu tạm vào localStorage, sẽ đồng bộ sau');
        return true;
      } catch (storageError) {
        console.error('❌ Không thể lưu vào localStorage:', storageError);
        return false;
      }
    }
  };

  /**
   * Đồng bộ các báo cáo đã lưu tạm
   */
  const syncPendingReports = async () => {
    try {
      const pendingReports = JSON.parse(localStorage.getItem('pending_reports') || '[]');
      if (pendingReports.length === 0) return;

      console.log(`🔄 Đang đồng bộ ${pendingReports.length} báo cáo đã lưu tạm...`);
      
      for (const report of pendingReports) {
        await saveReportToSupabase(report);
      }

      localStorage.removeItem('pending_reports');
      console.log('✅ Đã đồng bộ tất cả báo cáo!');
    } catch (error) {
      console.error('❌ Lỗi đồng bộ:', error);
    }
  };

  /**
   * Xử lý khi OCR trả về kết quả
   */
  const handleTextExtracted = async (text: string, result: OCRResult) => {
    console.log('📝 Text từ OCR:', text);
    setLastResult(result);
    setSaveStatus('idle');
    setErrorMessage('');
    
    const lines = text.split('\n');
    let productCode: string | undefined;
    let quantity: string | undefined;
    let employeeId: string | undefined;
    let reportDate: string | undefined;
    
    const patterns = {
      productCode: [
        /Mã SP\s*[:|]\s*(.+)/, 
        /Mã sản phẩm\s*[:|]\s*(.+)/, 
        /Product\s*[:|]\s*(.+)/i,
        /Mã hàng\s*[:|]\s*(.+)/
      ],
      quantity: [
        /Số lượng\s*[:|]\s*(.+)/, 
        /SL\s*[:|]\s*(.+)/, 
        /Quantity\s*[:|]\s*(.+)/i,
        /Qty\s*[:|]\s*(.+)/
      ],
      employeeId: [
        /Mã NV\s*[:|]\s*(.+)/, 
        /Mã nhân viên\s*[:|]\s*(.+)/, 
        /Employee\s*[:|]\s*(.+)/i
      ],
      date: [
        /Ngày\s*[:|]\s*(.+)/, 
        /Date\s*[:|]\s*(.+)/i
      ]
    };
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      for (const pattern of patterns.productCode) {
        const match = pattern.exec(trimmedLine);
        if (match) {
          productCode = match[1].trim();
          console.log('📦 Mã sản phẩm:', productCode);
          break;
        }
      }
      
      for (const pattern of patterns.quantity) {
        const match = pattern.exec(trimmedLine);
        if (match) {
          quantity = match[1].trim();
          console.log('📊 Số lượng:', quantity);
          break;
        }
      }
      
      for (const pattern of patterns.employeeId) {
        const match = pattern.exec(trimmedLine);
        if (match) {
          employeeId = match[1].trim();
          console.log('👤 Mã nhân viên:', employeeId);
          break;
        }
      }
      
      for (const pattern of patterns.date) {
        const match = pattern.exec(trimmedLine);
        if (match) {
          reportDate = match[1].trim();
          console.log('📅 Ngày báo cáo:', reportDate);
          break;
        }
      }
    });
    
    setExtractedData({ productCode, quantity });
    
    if (productCode || quantity) {
      setSaveStatus('saving');
      const success = await saveReportToSupabase({
        productCode,
        quantity,
        rawText: text,
        employeeId,
        date: reportDate,
        filename: result.filename,
        pageProcessed: result.page_processed?.toString()
      });
      
      setSaveStatus(success ? 'success' : 'error');
      
      if (success) {
        console.log('✅ Báo cáo đã được lưu thành công!');
        await syncPendingReports();
      } else {
        console.error('❌ Lưu báo cáo thất bại!');
      }
    } else {
      console.log('ℹ️ Không tìm thấy dữ liệu để lưu');
      setSaveStatus('error');
      setErrorMessage('Không tìm thấy dữ liệu báo cáo (mã SP, số lượng)');
    }
  };

  const handleError = (error: string) => {
    console.error('OCR Error:', error);
    setSaveStatus('error');
    setErrorMessage(error);
  };

  const viewReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      console.log('📋 10 báo cáo gần nhất:', data);
      alert(`📋 Đã tìm thấy ${data?.length || 0} báo cáo. Xem console để biết chi tiết.`);
    } catch (error) {
      console.error('❌ Lỗi khi lấy danh sách báo cáo:', error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">📋 Quản lý báo cáo xưởng</h1>
          <p className="text-gray-600">Tải lên báo cáo (ảnh hoặc PDF) để tự động trích xuất và lưu dữ liệu</p>
        </div>
        <button
          onClick={viewReports}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm"
        >
          📋 Xem báo cáo
        </button>
      </div>
      
      <OCRUpload
        onTextExtracted={handleTextExtracted}
        onError={handleError}
        onProcessing={setIsProcessing}
      />
      
      {isProcessing && (
        <div className="mt-4 text-center text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            ⏳ Đang xử lý file, vui lòng đợi...
          </div>
        </div>
      )}
      
      {saveStatus === 'success' && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-green-500 text-xl">✅</span>
            <div>
              <p className="text-sm font-medium text-green-700">Lưu báo cáo thành công!</p>
              <p className="text-xs text-green-600 mt-1">Dữ liệu đã được lưu vào Supabase</p>
            </div>
          </div>
        </div>
      )}
      
      {saveStatus === 'error' && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-xl">❌</span>
            <div>
              <p className="text-sm font-medium text-red-700">Lưu báo cáo thất bại!</p>
              <p className="text-xs text-red-600 mt-1">{errorMessage || 'Dữ liệu đã được lưu tạm, sẽ đồng bộ sau'}</p>
            </div>
          </div>
        </div>
      )}
      
      {lastResult && saveStatus !== 'error' && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <span className="text-blue-500 text-xl">ℹ️</span>
            <div>
              <p className="text-sm text-blue-700">
                Đã xử lý file: <strong>{lastResult.filename}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {lastResult.page_processed !== 'all' && `Trang ${lastResult.page_processed} • `}
                {lastResult.length} ký tự
              </p>
            </div>
          </div>
        </div>
      )}
      
      {(extractedData.productCode || extractedData.quantity) && (
        <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
          <h3 className="font-semibold mb-2 text-purple-800">📊 Dữ liệu trích xuất:</h3>
          <div className="space-y-1">
            {extractedData.productCode && (
              <p className="text-sm">
                <span className="text-gray-600">Mã sản phẩm:</span>{' '}
                <strong className="text-purple-700">{extractedData.productCode}</strong>
              </p>
            )}
            {extractedData.quantity && (
              <p className="text-sm">
                <span className="text-gray-600">Số lượng:</span>{' '}
                <strong className="text-purple-700">{extractedData.quantity}</strong>
              </p>
            )}
            {saveStatus === 'saving' && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang lưu dữ liệu...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportPage;