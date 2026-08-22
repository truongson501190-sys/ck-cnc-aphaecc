// src/features/ocr/services/ocrService.ts

import { ocrApiClient } from './ocrApiClient';
import { tesseractService } from './tesseractService';
import { pdfToImage } from './pdfToImage';
import type {
  OCRResult,
  OCRBatchResult,
  ParsedReportData,
  AIResponse,
} from '../types/documentTypes';

export type { OCRResult, OCRBatchResult, ParsedReportData, AIResponse } from '../types/documentTypes';

// ============================================================
// CONSTANTS
// ============================================================

const API_BASE = import.meta.env.VITE_AI_API_URL || 'http://localhost:8002';

// ============================================================
// OCR SERVICE
// ============================================================

export class OCRService {
  private _lastParsedData?: ParsedReportData;

  constructor() {
    console.log('🤖 ERP AI Service initialized (Backend AI Priority)');
  }

  /**
   * Xử lý một file: Ưu tiên gọi Backend AI, fallback Tesseract
   */
  async processFile(file: File, page?: number): Promise<OCRResult> {
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isImage =
      file.type.startsWith('image/') ||
      file.name.match(/\.(jpg|jpeg|png|bmp|tiff|webp|gif)$/i);

    if (!isImage && !isPdf) {
      return {
        status: 'error',
        message: `❌ File "${file.name}" KHÔNG được hỗ trợ.\n\n📌 Hệ thống hỗ trợ ẢNH và PDF:\n   • JPG, JPEG, PNG, BMP, TIFF, WEBP, GIF\n   • PDF (OCR trang được chọn)`,
      };
    }

    try {
      // =========================================================
      // 🌟 BƯỚC 1: GỌI BACKEND AI
      // =========================================================
      console.log('✨ Gọi Backend AI (Qwen2.5-VL + PaddleOCR) xử lý...');

      let imageFile: File;
      if (isPdf) {
        console.log('📄 Đang chuyển đổi trang PDF sang hình ảnh...');
        imageFile = await pdfToImage(file, page ?? 1);
      } else {
        imageFile = file;
      }

      try {
        const response: AIResponse = await ocrApiClient.parseDocument(imageFile);

        if (response.success) {
          const parsedData: ParsedReportData = {
            type: response.prediction.documentType || 'bao_cao_gia_cong',
            fields: response.prediction.fields,
            confidence: response.prediction.confidence,
            raw_text: response.prediction.raw_text || response.prediction.metadata?.raw_text || JSON.stringify(response.prediction.fields, null, 2),
            parsed_at: new Date().toISOString(),
            source: 'ai_backend',
            reasoning: response.prediction.reasoning,
            reasoning_steps: response.prediction.reasoning_steps,
            confidence_breakdown: response.prediction.confidence_breakdown,
            validation_messages: response.prediction.validation_messages,
            action: response.prediction.action,
            status_message: response.prediction.status_message,
            metadata: response.prediction.metadata,
          };
          this._lastParsedData = parsedData;

          // Trả về kèm scan_id để dùng cho learn/import
          return {
            status: 'success',
            filename: file.name,
            file_type: isPdf ? 'pdf' : 'image',
            text: parsedData.raw_text,
            length: parsedData.raw_text.length,
            page_processed: isPdf ? (page ?? 1) : undefined,
            parsed_data: parsedData,
            scan_id: String(response.scan_id || ''),
          };
        } else {
          console.warn('⚠️ Backend AI không trả về thành công, chuyển sang Tesseract fallback...');
        }
      } catch (aiError) {
        console.warn('⚠️ Backend AI không khả dụng, chuyển sang Tesseract fallback:', aiError);
      }

      // =========================================================
      // 🐢 BƯỚC 2: FALLBACK - TESSERACT.JS
      // =========================================================
      console.log('💻 Đang chạy Tesseract.js OCR (Fallback)...');
      const tessResult = await tesseractService.processFile(imageFile);
      tessResult.filename = file.name;
      tessResult.file_type = isPdf ? 'pdf' : 'image';
      if (isPdf) {
        tessResult.page_processed = page ?? 1;
      }

      if (tessResult.status === 'success' && tessResult.text) {
        const parsedData = this.fallbackParse(tessResult.text);
        parsedData.source = 'tesseract';
        tessResult.parsed_data = parsedData;
        // Fallback không có scan_id, dùng filename làm ID
        tessResult.scan_id = `fallback_${file.name}`;
        console.log(
          `✅ Tesseract OCR hoàn tất, parse được ${Object.keys(parsedData.fields).length} trường.`
        );
      }

      return tessResult;
    } catch (error) {
      console.error('❌ Lỗi xử lý OCR File:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Lỗi OCR. Vui lòng thử lại với file ảnh khác.',
      };
    }
  }

  /**
   * Fallback parser (rule-based) khi backend không khả dụng
   */
  private fallbackParse(text: string): ParsedReportData {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const fields: Record<string, any> = {};

    const patterns: Record<string, RegExp[]> = {
      ngay: [/(?:ngày|date)\s*[:：]?\s*(\d{1,2})[ /.-](\d{1,2})[ /.-](\d{4})/i],
      ca: [/ca\s*[:：]?\s*(\d+)/i, /ca\s*([1-3])/i],
      may: [/máy\s*[:：]?\s*([A-Z0-9-]+)/i, /MC[ -]?\s*([A-Z0-9]+)/i],
      so_luong: [/số\s*lượng\s*[:：]?\s*(\d+)/i, /sl\s*[:：]?\s*(\d+)/i],
      nguoi_van_hanh: [/người\s*vận\s*hành\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i],
      nguoi_kiem_tra: [/người\s*kiểm\s*tra\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i],
    };

    for (const [field, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = pattern.exec(cleanText);
        if (match?.[1]) {
          const value = match[1].trim();
          const numericValue = Number(value);
          fields[field] = Number.isNaN(numericValue) ? value : numericValue;
          break;
        }
      }
    }

    const confidence = Math.min(Object.keys(fields).length / Object.keys(patterns).length, 1);

    return {
      type: 'bao_cao_gia_cong',
      fields,
      confidence,
      raw_text: text,
      parsed_at: new Date().toISOString(),
      source: 'tesseract',
    };
  }

  /**
   * Xử lý nhiều file
   */
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

  /**
   * Gửi sửa của user để AI học (Sprint 2)
   */
  async learn(scanId: string, corrections: Record<string, any>, userId: string = 'system') {
    const promises = Object.entries(corrections).map(([field, newValue]) => {
        // Lấy giá trị cũ từ state (nếu có) hoặc để trống
        const oldValue = this._lastParsedData?.fields?.[field] ?? '';
        
        return fetch(`${API_BASE}/api/ai/learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                scan_id: scanId,
                field_name: field,
                wrong_value: String(oldValue),
                correct_value: String(newValue),
                context: `User corrected ${field} from ${oldValue} to ${newValue}`,
                user_id: userId,
            }),
        });
    });

    await Promise.all(promises);
    console.log('✅ Corrections sent for learning');
}

  /**
   * Nhập dữ liệu đã xác nhận vào ERP (Sprint 3)
   */
  async importToERP(scanId: string, data: Record<string, any>, userId: string = 'system') {
    const response = await fetch(`${API_BASE}/api/ai/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scan_id: scanId,
        data: data,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Import ERP failed: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Lấy một field từ dữ liệu đã parse
   */
  getField<T = any>(data: ParsedReportData, field: string, defaultValue?: T): T | undefined {
    return data.fields?.[field] ?? defaultValue;
  }
}

export const ocrService = new OCRService();