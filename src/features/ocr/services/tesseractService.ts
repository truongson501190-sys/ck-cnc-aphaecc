// src/features/ocr/services/tesseractService.ts
import Tesseract from 'tesseract.js';
import { OCRResult } from './ocrService';
import { loadPDFDocument, pdfToImage } from './pdfToImage';

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
      console.log('📎 File:', file.name, 'type:', file.type, 'size:', file.size);

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || 
                      file.name.match(/\.(jpg|jpeg|png|bmp|tiff|webp|gif)$/i);

      let allText = '';

      // ✅ XỬ LÝ PDF
      if (isPdf) {
        console.log('📄 Phát hiện PDF, đang xử lý từng trang...');
        
        // Lấy số trang PDF
        const pdf = await loadPDFDocument(file);
        const totalPages = pdf.numPages;
        console.log(`📄 PDF có ${totalPages} trang`);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`📊 Đang xử lý trang ${pageNum}/${totalPages}...`);
          
          const pageImage = await pdfToImage(file, pageNum);
          console.log(`   ✅ Đã chuyển trang ${pageNum} thành ảnh`);

          const result = await Tesseract.recognize(
            pageImage,
            'vie+eng',
            {
              logger: (m: { status: string; progress: number }) => {
                if (m.status === 'recognizing text') {
                  console.log(`   Tiến độ: ${Math.round(m.progress * 100)}%`);
                }
              }
            }
          );
          
          const pageText = result.data.text || '';
          if (pageText.trim()) {
            allText += `\n--- Trang ${pageNum} ---\n${pageText}`;
          }
        }
        
        console.log(`✅ OCR PDF thành công: ${allText.length} ký tự`);

      } else if (isImage) {
        // ✅ XỬ LÝ ẢNH
        console.log('🖼️ Xử lý ảnh...');
        const result = await Tesseract.recognize(
          file,
          'vie+eng',
          {
            logger: (m: { status: string; progress: number }) => {
              if (m.status === 'recognizing text') {
                console.log(`📊 Tiến độ: ${Math.round(m.progress * 100)}%`);
              }
            }
          }
        );
        allText = result.data.text || '';
        console.log(`✅ OCR ảnh thành công: ${allText.length} ký tự`);

      } else {
        return {
          status: 'error',
          message: `File "${file.name}" không được hỗ trợ. Vui lòng upload ảnh (JPG, PNG, BMP, TIFF, WEBP) hoặc PDF.`
        };
      }

      if (allText.length === 0) {
        return {
          status: 'error',
          message: 'Không tìm thấy chữ trong file. Vui lòng thử file có chữ rõ hơn.'
        };
      }

      return {
        status: 'success',
        text: allText,
        length: allText.length,
        filename: file.name,
        file_type: isPdf ? 'pdf' : 'image',
      };

    } catch (error) {
      console.error('❌ Lỗi OCR:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Lỗi OCR. Vui lòng thử file khác.'
      };
    } finally {
      this.isProcessing = false;
    }
  }
}

export const tesseractService = new TesseractService();