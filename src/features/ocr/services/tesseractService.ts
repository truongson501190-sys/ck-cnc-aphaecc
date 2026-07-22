// src/features/ocr/services/tesseractService.ts
import Tesseract from 'tesseract.js';
import { OCRResult } from './ocrService';

export class TesseractService {
  private isProcessing = false;

  async processFile(file: File): Promise<OCRResult> {
    if (this.isProcessing) {
      return {
        status: 'error',
        message: 'Đang xử lý file khác, vui lòng đợi...'
      };
    }

    this.isProcessing = true;

    try {
      console.log('🔍 Đang OCR với Tesseract.js...');
      
      // Chuyển file thành image URL
      const imageUrl = URL.createObjectURL(file);
      
      // OCR với Tesseract.js
      const result = await Tesseract.recognize(
        imageUrl, 
        'vie+eng',
        {
          // ✅ Định nghĩa kiểu cho parameter m
          logger: (m: { status: string; progress: number }) => {
            if (m.status === 'recognizing text') {
              console.log(`📊 Tiến độ: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      // Giải phóng memory
      URL.revokeObjectURL(imageUrl);

      const text = result.data.text || '';
      console.log('✅ OCR thành công:', text.length, 'ký tự');

      return {
        status: 'success',
        text: text,
        length: text.length,
        filename: file.name,
        file_type: file.type,
      };

    } catch (error) {
      console.error('❌ Lỗi OCR:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Lỗi OCR không xác định'
      };
    } finally {
      this.isProcessing = false;
    }
  }
}

export const tesseractService = new TesseractService();