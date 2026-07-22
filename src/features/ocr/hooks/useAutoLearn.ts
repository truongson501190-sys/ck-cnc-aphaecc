// src/features/ocr/hooks/useAutoLearn.ts
import { useEffect } from 'react';
import { ocrTrainer } from '@/features/ocr/services/ocrTrainer';
import { ParsedReportData } from '@/features/ocr/services/ocrService';

export const useAutoLearn = (
  parsedData: ParsedReportData | null,
  originalText: string,
  isConfirmed: boolean,
  onLearningComplete?: () => void
) => {
  useEffect(() => {
    if (isConfirmed && parsedData && originalText) {
      const stats = ocrTrainer.getStats();
      if (stats.totalSamples < 50) {
        ocrTrainer.learnFromCorrection(originalText, parsedData.fields);
        console.log('🧠 AI đã tự động học từ dữ liệu mới!');
        if (onLearningComplete) onLearningComplete();
      }
    }
  }, [isConfirmed, parsedData, originalText, onLearningComplete]);
};