// src/features/ocr/hooks/useOCRFormIntegration.ts
import { useState, useCallback } from 'react';
import { ParsedReportData } from '@/features/ocr/services/ocrService';
import { toast } from 'sonner';

// ✅ Định nghĩa kiểu cho form data
interface OCRFormData {
  date?: string;
  shift?: string;
  machineCode?: string;
  workerCode?: string;
  workerName?: string;
  productCode?: string;
  productName?: string;
  batchNumber?: string;
  quantity?: number;
  measurements?: any[];
  defects?: any[];
  result?: 'PASS' | 'FAIL' | 'REWORK' | 'PENDING';
  notes?: string;
  [key: string]: any; // Cho phép các trường khác
}

export const useOCRFormIntegration = (initialData?: Partial<OCRFormData>) => {
  const [formData, setFormData] = useState<Partial<OCRFormData>>(initialData || {});
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [lastParsedData, setLastParsedData] = useState<ParsedReportData | null>(null);

  const fillFormFromOCR = useCallback((parsedData: ParsedReportData) => {
    setLastParsedData(parsedData);
    const fields = parsedData.fields || {};
    const newFormData: Partial<OCRFormData> = {
      date: fields.date,
      shift: fields.shift,
      machineCode: fields.machine_code,
      workerCode: fields.worker_code,
      workerName: fields.worker_name,
      productCode: fields.product_code,
      productName: fields.product_name,
      batchNumber: fields.batch_number,
      quantity: fields.quantity ? Number(fields.quantity) : undefined,
      measurements: fields.measurements || [],
      defects: fields.defects || [],
      result: fields.result || 'PENDING',
      notes: fields.notes,
    };
    setFormData((prev: Partial<OCRFormData>) => ({ ...prev, ...newFormData }));
    setIsAutoFilled(true);
    toast.success('✅ Đã điền dữ liệu vào form từ ảnh!');
    return newFormData;
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialData || {});
    setIsAutoFilled(false);
    setLastParsedData(null);
  }, [initialData]);

  const getFieldValue = useCallback((field: keyof OCRFormData) => {
    return formData[field];
  }, [formData]);

  return {
    formData,
    isAutoFilled,
    lastParsedData,
    fillFormFromOCR,
    resetForm,
    getFieldValue,
    setFormData,
  };
};