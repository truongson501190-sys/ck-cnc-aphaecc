// hooks/useOCRWithForm.ts
import { useState, useCallback } from 'react';
import { ocrService, ParsedReportData } from '../features/ocrService';

export const useOCRWithForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedReportData | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      setProgress(30);
      const result = await ocrService.processFile(file);
      setProgress(80);

      if (result.status === 'success' && result.parsed_data) {
        setParsedData(result.parsed_data);
        
        // Validate
        const validation = ocrService.validateParsedData(result.parsed_data);
        if (!validation.isValid) {
          setWarnings(validation.errors);
        }
        
        setProgress(100);
        return { success: true, data: result.parsed_data };
      } else {
        setError(result.message || 'OCR xử lý thất bại');
        return { success: false, error: result.message };
      }
    } catch (err) {
      setError('Lỗi khi xử lý file');
      console.error(err);
      return { success: false, error: 'Lỗi không xác định' };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setParsedData(null);
    setError(null);
    setWarnings([]);
    setProgress(0);
  }, []);

  const formatData = useCallback((data?: ParsedReportData) => {
    return ocrService.formatParsedData(data || parsedData || {} as ParsedReportData);
  }, [parsedData]);

  return {
    loading,
    error,
    parsedData,
    warnings,
    progress,
    processFile,
    clearData,
    formatData,
    hasData: !!parsedData,
    isValid: warnings.length === 0
  };
};