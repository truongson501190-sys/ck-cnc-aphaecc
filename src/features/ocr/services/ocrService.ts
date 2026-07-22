// src/features/ocr/services/ocrService.ts

import { SmartOCRParser } from '@/features/ocr/services/smartOCRParser';
import { AIEnhancer } from '@/features/ocr/services/aiEnhancer';

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
      /(?:ngày|date)\s*[:：]\s*(\d{1,2})[ /.-](\d{1,2})[ /.-](\d{4})/i,
      /(\d{2})[ /.-](\d{2})[ /.-](\d{4})/,
      /(\d{1,2})\s*[ /.-]\s*(\d{1,2})\s*[ /.-]\s*(\d{4})/,
    ],
    shift: [/ca\s*[:：]?\s*(\d+)/i, /shift\s*[:：]?\s*(\d+)/i, /ca\s*([1-3])/i],
    machine_code: [
      /m[ãa]\s*m[áa]y\s*[:：]\s*([A-Z0-9-]+)/i,
      /máy\s*[:：]\s*([A-Z0-9-]+)/i,
      /machine\s*[:：]\s*([A-Z0-9-]+)/i,
      /M([A-Z0-9]{2,})/,
      /MC[ -]?\s*([A-Z0-9]+)/i,
    ],
    worker_code: [
      /c[ôo]ng\s*nh[âa]n\s*[:：]\s*([A-Z0-9-]+)/i,
      /worker\s*[:：]\s*([A-Z0-9-]+)/i,
      /NV([A-Z0-9]{2,})/i,
      /nh[âa]n\s*vi[êe]n\s*[:：]\s*([A-Z0-9-]+)/i,
    ],
    worker_name: [
      /t[êe]n\s*c[ôo]ng\s*nh[âa]n\s*[:：]\s*([A-Za-zÀ-ỹ\s]+)/i,
      /worker\s*name\s*[:：]\s*([A-Za-zÀ-ỹ\s]+)/i,
    ],
    product_code: [
      /m[ãa]\s*s[ảa]n\s*ph[ẩa]m\s*[:：]\s*([A-Z0-9-]+)/i,
      /product\s*code\s*[:：]\s*([A-Z0-9-]+)/i,
      /SP([A-Z0-9]{2,})/i,
      /P[ -]?\s*([A-Z0-9]+)/i,
    ],
    product_name: [
      /t[êe]n\s*s[ảa]n\s*ph[ẩa]m\s*[:：]\s*([^\n]+)/i,
      /product\s*name\s*[:：]\s*([^\n]+)/i,
      /s[ảa]n\s*ph[ẩa]m\s*[:：]\s*([^\n]+)/i,
    ],
    batch_number: [
      /s[ôo]\s*l[ôo]\s*[:：]\s*([A-Z0-9-]+)/i,
      /batch\s*[:：]\s*([A-Z0-9-]+)/i,
      /l[ôo]\s*([A-Z0-9]{2,})/i,
      /lot\s*[:：]\s*([A-Z0-9-]+)/i,
    ],
    quantity: [
      /s[ôo]\s*lư[ơo]ng\s*[:：]\s*(\d+)/i,
      /quantity\s*[:：]\s*(\d+)/i,
      /t[ôo]ng\s*(\d+)/i,
      /sl\s*[:：]\s*(\d+)/i,
    ],
    unit: [
      /đ[ơo]n\s*v[ịi]\s*[:：]\s*([A-Za-zÀ-ỹ]+)/i,
      /unit\s*[:：]\s*([A-Za-z]+)/i,
    ],
    result: [
      /k[ếe]t\s*qu[ảa]\s*[:：]\s*([A-Za-zÀ-ỹ\s]+)/i,
      /result\s*[:：]\s*([A-Za-z]+)/i,
    ],
    notes: [
      /ghi\s*ch[úu]\s*[:：]\s*([^\n]+)/i,
      /notes\s*[:：]\s*([^\n]+)/i,
      /nh[ậa]n\s*x[ée]t\s*[:：]\s*([^\n]+)/i,
    ],
    material: [
      /v[ậa]t\s*li[ệe]u\s*[:：]\s*([^\n]+)/i,
      /material\s*[:：]\s*([^\n]+)/i,
    ],
    supplier: [
      /nh[àa]\s*cung\s*c[ấa]p\s*[:：]\s*([^\n]+)/i,
      /supplier\s*[:：]\s*([^\n]+)/i,
    ],
    customer: [
      /kh[áa]ch\s*h[àa]ng\s*[:：]\s*([^\n]+)/i,
      /customer\s*[:：]\s*([^\n]+)/i,
    ],
  };

  parse(text: string): ParsedReportData {
    const cleanText = this.cleanText(text);
    const fields: Record<string, any> = {};

    for (const [field, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          const value = match[1].trim();
          const num = Number(value);
          fields[field] = Number.isNaN(num) ? value : num;
          break;
        }
      }
    }

    const totalFields = Object.keys(this.patterns).length;
    const foundFields = Object.keys(fields).length;
    const confidence = Math.min(foundFields / totalFields, 1);

    return {
      type: 'other',
      fields,
      confidence,
      raw_text: text,
      parsed_at: new Date().toISOString(),
    };
  }

  private cleanText(text: string): string {
    return text
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n')
      .replaceAll(/\s+/g, ' ')
      .replaceAll(/[•●■◆▶▸➢➣➤★☆✦✧❖]/g, '')
      .trim();
  }
}

// ==================== OCR SERVICE ====================
export class OCRService {
  private readonly apiUrl?: string;
  private readonly parser: OCRParser;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl;
    this.parser = new OCRParser();
  }

  private getCandidateApiUrls(): string[] {
    const configured = (this.apiUrl || import.meta.env.VITE_OCR_API_URL || '').trim();
    const candidates = [configured, 'http://127.0.0.1:5001', 'http://localhost:5001'];

    if (typeof window !== 'undefined') {
      candidates.unshift(`http://${window.location.hostname}:5001`);
    }

    return Array.from(new Set(candidates.filter(Boolean).map((value) => value.replace(/\/$/, ''))));
  }

  private async fetchWithFallback(path: string, init?: RequestInit): Promise<Response> {
    const errors: unknown[] = [];

    for (const baseUrl of this.getCandidateApiUrls()) {
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          ...init,
          mode: 'cors',
          credentials: 'omit',
        });

        if (response.ok || response.status >= 400) {
          return response;
        }
      } catch (error) {
        errors.push(error);
      }
    }

    throw errors.at(-1) || new Error('OCR request failed');
  }

  async processFile(file: File, page?: number): Promise<OCRResult> {
    const formData = new FormData();
    formData.append('file', file);

    let path = '/ocr';
    if (page !== undefined && page >= 0) {
      path += `?page=${page}`;
    }

    try {
      const response = await this.fetchWithFallback(path, {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json')
        ? await response.json()
        : { status: 'error', message: await response.text() };

      if (!response.ok) {
        return {
          status: 'error',
          message: payload?.message || 'OCR server returned an error',
        };
      }

      const result = payload as OCRResult;
        if (result.status === 'success' && result.text) {
        // Dùng SmartOCRParser
        const smartParser = new SmartOCRParser();
        const parsed = smartParser.parse(result.text);
        // Dùng AIEnhancer
        const enhancer = new AIEnhancer();
        const enhanced = enhancer.enhance(parsed);
        result.parsed_data = enhanced;
        }
      return result;
    } catch (error) {
      console.error('Lỗi khi gọi OCR API:', error);
      return {
        status: 'error',
        message: 'Không thể kết nối đến server OCR. Vui lòng chạy backend tại http://127.0.0.1:5001 hoặc kiểm tra cổng 5001.',
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

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithFallback('/health', { method: 'GET' });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  getField<T = any>(data: ParsedReportData, field: string, defaultValue?: T): T | undefined {
    return data.fields?.[field] ?? defaultValue;
  }
}

export const ocrService = new OCRService();