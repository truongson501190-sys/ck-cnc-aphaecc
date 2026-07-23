// src/features/ocr/services/ocrService.ts

import { SmartOCRParser } from '@/features/ocr/services/smartOCRParser';
import { AIEnhancer } from '@/features/ocr/services/aiEnhancer';
import { tesseractService } from './tesseractService';
import { pdfToImage } from './pdfToImage';

export interface ParsedReportData {
  type?: 'production' | 'import' | 'export' | 'qc' | 'other';
  fields: Record<string, any>;
  confidence: number;
  raw_text: string;
  parsed_at: string;
}

export interface OCRResult {
  status: 'success' | 'error';
  filename?: string;
  file_type?: string;
  text?: string;
  length?: number;
  message?: string;
  page_processed?: string | number;
  parsed_data?: ParsedReportData;
}

export interface OCRBatchResult {
  results: OCRResult[];
  totalFiles: number;
  successCount: number;
  errorCount: number;
}

// ==================== OCR PARSER ====================
export class OCRParser {
  private readonly patterns: Record<string, RegExp[]> = {
    date: [
      /(?:ngày|date)\s*[:：]?\s*(\d{1,2})[ /.-](\d{1,2})[ /.-](\d{4})/i,
      /(\d{2})[ /.-](\d{2})[ /.-](\d{4})/,
      /(\d{1,2})\s*[ /.-]\s*(\d{1,2})\s*[ /.-]\s*(\d{4})/,
    ],
    shift: [/ca\s*[:：]?\s*(\d+)/i, /shift\s*[:：]?\s*(\d+)/i, /ca\s*([1-3])/i],
    machine_code: [
      /máy\s*[:：]?\s*([A-Z0-9-]+)/i,
      /machine\s*[:：]?\s*([A-Z0-9-]+)/i,
      /M([A-Z0-9]{2,})/,
      /MC[ -]?\s*([A-Z0-9]+)/i,
    ],
    worker_code: [
      /công\s*nhân\s*[:：]?\s*([A-Z0-9-]+)/i,
      /worker\s*[:：]?\s*([A-Z0-9-]+)/i,
      /NV([A-Z0-9]{2,})/i,
      /nhân\s*viên\s*[:：]?\s*([A-Z0-9-]+)/i,
    ],
    worker_name: [
      /tên\s*công\s*nhân\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i,
      /worker\s*name\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i,
    ],
    product_code: [
      /mã\s*sản\s*phẩm\s*[:：]?\s*([A-Z0-9-]+)/i,
      /product\s*code\s*[:：]?\s*([A-Z0-9-]+)/i,
      /SP([A-Z0-9]{2,})/i,
      /P[ -]?\s*([A-Z0-9]+)/i,
    ],
    product_name: [
      /tên\s*sản\s*phẩm\s*[:：]?\s*([^\n]+)/i,
      /product\s*name\s*[:：]?\s*([^\n]+)/i,
      /sản\s*phẩm\s*[:：]?\s*([^\n]+)/i,
    ],
    batch_number: [
      /số\s*lô\s*[:：]?\s*([A-Z0-9-]+)/i,
      /batch\s*[:：]?\s*([A-Z0-9-]+)/i,
      /lô\s*([A-Z0-9]{2,})/i,
      /lot\s*[:：]?\s*([A-Z0-9-]+)/i,
    ],
    quantity: [
      /số\s*lượng\s*[:：]?\s*(\d+)/i,
      /quantity\s*[:：]?\s*(\d+)/i,
      /tổng\s*[:：]?\s*(\d+)/i,
      /sl\s*[:：]?\s*(\d+)/i,
    ],
    unit: [/đơn\s*vị\s*[:：]?\s*([A-Za-zÀ-ỹ]+)/i, /unit\s*[:：]?\s*([A-Za-z]+)/i],
    result: [
      /kết\s*quả\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i,
      /result\s*[:：]?\s*([A-Za-z]+)/i,
    ],
    notes: [
      /ghi\s*chú\s*[:：]?\s*([^\n]+)/i,
      /notes\s*[:：]?\s*([^\n]+)/i,
      /nhận\s*xét\s*[:：]?\s*([^\n]+)/i,
    ],
    material: [/vật\s*liệu\s*[:：]?\s*([^\n]+)/i, /material\s*[:：]?\s*([^\n]+)/i],
    supplier: [/nhà\s*cung\s*cấp\s*[:：]?\s*([^\n]+)/i, /supplier\s*[:：]?\s*([^\n]+)/i],
    customer: [/khách\s*hàng\s*[:：]?\s*([^\n]+)/i, /customer\s*[:：]?\s*([^\n]+)/i],
  };

  parse(text: string): ParsedReportData {
    const cleanText = this.cleanText(text);
    const fields: Record<string, any> = {};

    for (const [field, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = pattern.exec(cleanText);
        if (match?.[1]) {
          const value = match[1].trim();
          const numericValue = Number(value);
          fields[field] = Number.isNaN(numericValue) ? value : numericValue;
          break;
        }
      }
    }

    const confidence = Math.min(Object.keys(fields).length / Object.keys(this.patterns).length, 1);
    return {
      type: 'other',
      fields,
      confidence,
      raw_text: text,
      parsed_at: new Date().toISOString(),
    };
  }

  private cleanText(text: string): string {
    return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').replaceAll(/\s+/g, ' ').trim();
  }
}

// ==================== OCR SERVICE ====================
export class OCRService {
  private readonly parser: OCRParser;

  constructor() {
    this.parser = new OCRParser();
  }

  private processText(text: string): ParsedReportData {
    const smartParser = new SmartOCRParser();
    const parsed = smartParser.parse(text);
    const enhancer = new AIEnhancer();
    const enhanced = enhancer.enhance(parsed);
    return enhanced;
  }

  async processFile(file: File, page?: number): Promise<OCRResult> {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || 
                    file.name.match(/\.(jpg|jpeg|png|bmp|tiff|webp|gif)$/i);

    if (!isImage && !isPdf) {
      return {
        status: 'error',
        message: `❌ File "${file.name}" KHÔNG được hỗ trợ.\n\n📌 Hệ thống hỗ trợ ẢNH và PDF:\n   • JPG, JPEG, PNG, BMP, TIFF, WEBP, GIF\n   • PDF (OCR trang được chọn)`
      };
    }
    
    try {
      console.log(isPdf ? '📄 Chuyển PDF sang ảnh để OCR' : '🧠 Dùng Tesseract.js');
      const imageFile = isPdf ? await pdfToImage(file, page ?? 1) : file;
      const result = await tesseractService.processFile(imageFile);
      result.filename = file.name;
      result.file_type = isPdf ? 'pdf' : 'image';
      if (isPdf) {
        result.page_processed = page ?? 1;
      }
      
      if (result.status === 'success' && result.text) {
        const parsedData = this.processText(result.text);
        result.parsed_data = parsedData;
        console.log('✅ OCR thành công, đã parse dữ liệu');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Lỗi Tesseract.js:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Lỗi OCR. Vui lòng thử file ảnh khác (JPG, PNG).'
      };
    }
  }

  async processFiles(files: File[]): Promise<OCRBatchResult> {
    const results: OCRResult[] = [];
    let successCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;

    for (const [index, file] of files.entries()) {
      console.log(`🔄 Đang xử lý file ${index + 1}/${totalFiles}: ${file.name}`);
      const result = await this.processFile(file);
      if (result.status === 'success') {
        successCount++;
      } else {
        errorCount++;
      }
      results.push({
        ...result,
        filename: result.filename || file.name,
      });
    }

    return {
      results,
      totalFiles,
      successCount,
      errorCount,
    };
  }

  getField<T = any>(data: ParsedReportData, field: string, defaultValue?: T): T | undefined {
    return data.fields?.[field] ?? defaultValue;
  }
}

export const ocrService = new OCRService();