// src/features/ocr/services/tesseractService.ts
import Tesseract from 'tesseract.js';
import { OCRResult } from './ocrService';
import { pdfToImage } from './pdfToImage';
import { preprocessImage } from './imageProcessor';

// ✅ Load PDF.js helper
async function loadPDFJS(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.js';
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        reject(new Error('PDF.js không được tải đúng cách'));
      }
    };
    script.onerror = () => reject(new Error('Không thể tải PDF.js từ CDN'));
    document.head.appendChild(script);
  });
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export class TesseractService {
  private isProcessing = false;
  private worker: Tesseract.Worker | null = null;

  private async getWorker(): Promise<Tesseract.Worker> {
    if (this.worker) {
      return this.worker;
    }
    
    this.worker = await Tesseract.createWorker('vie+eng', 1, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          console.log(`📊 Tiến độ: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    // ✅ Cấu hình tham số
    try {
      await this.worker.setParameters({
        tessedit_pageseg_mode: 6, // SINGLE_BLOCK
        tessedit_ocr_engine_mode: 1, // LSTM_ONLY
        tessedit_do_deskew: true,
      });
    } catch (e) {
      console.log('⚠️ Không thể setParameters, dùng cấu hình mặc định');
    }
    
    return this.worker;
  }

  private formatText(text: string): string {
    const lines = text.split('\n');
    const formatted: string[] = [];
    let emptyCount = 0;
    
    for (const line of lines) {
      if (line.trim() === '') {
        emptyCount++;
        if (emptyCount < 2) {
          formatted.push('');
        }
      } else {
        emptyCount = 0;
        formatted.push(line.replace(/\s+/g, ' ').trim());
      }
    }
    
    return formatted.join('\n');
  }

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
      const worker = await this.getWorker();

      if (isPdf) {
        console.log('📄 Phát hiện PDF, đang xử lý từng trang...');
        
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await loadPDFJS();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        console.log(`📄 PDF có ${totalPages} trang`);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          console.log(`📊 Đang xử lý trang ${pageNum}/${totalPages}...`);
          
          const pageImage = await pdfToImage(file, pageNum);
          const processedImage = await preprocessImage(pageImage);
          
          const result = await worker.recognize(processedImage);
          
          const pageText = result.data.text || '';
          if (pageText.trim()) {
            allText += `\n--- Trang ${pageNum} ---\n${this.formatText(pageText)}`;
          }
        }
        
        console.log(`✅ OCR PDF thành công: ${allText.length} ký tự`);

      } else if (isImage) {
        console.log('🖼️ Xử lý ảnh...');
        
        const processedImage = await preprocessImage(file);
        const result = await worker.recognize(processedImage);
        
        allText = this.formatText(result.data.text || '');
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

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

// ✅ EXPORT DUY NHẤT
export const tesseractService = new TesseractService();