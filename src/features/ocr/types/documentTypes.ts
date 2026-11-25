// src/features/ocr/types/documentTypes.ts

export type DocumentType =
  | 'phieu_cap_phat'
  | 'bao_cao_gia_cong'
  | 'nhap_kho'
  | 'xuat_kho'
  | 'nhat_ky_qc'
  | 'bao_tri'
  | 'unknown';

export interface DocumentTypeInfo {
  label: string;
  icon: string;
  color: string;
  fields: string[];
  module: string;
}

export interface LineStructure {
  content: string;
  type: 'title' | 'date' | 'header' | 'signature' | 'row' | 'note' | 'empty' | 'unknown';
  level?: number;
  columns?: string[];
}

export interface DocumentStructure {
  type: DocumentType;
  title?: string;
  date?: string;
  headers: string[];
  rows: string[][];
  signature?: string;
  notes: string[];
  rawText: string;
  structuredLines: LineStructure[];
  confidence: number;
}

export interface Measurement {
  parameter: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  status?: string;
}

export interface AIPrediction {
  success: boolean;
  scan_id?: number;
  prediction: {
    documentType: string;
    fields: Record<string, any>;
    confidence: number;
    reasoning: string[];
    reasoning_steps?: string[];
    confidence_breakdown?: Record<string, number>;
    validation: {
      passed: boolean;
      warnings: string[];
    };
    validation_messages?: string[];
    modelVersion: string;
    action: 'AUTO_IMPORT' | 'NEED_CONFIRMATION' | 'MANUAL_CHECK';
    status_message: string;
    metadata?: Record<string, any>;
  };
}

export interface AIResponse {
  success: boolean;
  scan_id: number;
  prediction: {
    documentType: string;
    fields: Record<string, any>;
    confidence: number;
    reasoning: string[];
    reasoning_steps?: string[];
    confidence_breakdown?: Record<string, number>;
    validation: {
      passed: boolean;
      warnings: string[];
    };
    validation_messages?: string[];
    modelVersion: string;
    action: 'AUTO_IMPORT' | 'NEED_CONFIRMATION' | 'MANUAL_CHECK';
    status_message: string;
    raw_text?: string;
    metadata?: Record<string, any>;
  };
}

export interface ParsedReportData {
  [key: string]: unknown;
  type?: string;
  fields: Record<string, any>;
  measurements?: Measurement[];
  confidence: number;
  raw_text: string;
  parsed_at: string;
  source?: 'ai_backend' | 'tesseract' | 'rule' | 'ml' | 'hybrid';
  reasoning?: string[];
  reasoning_steps?: string[];
  confidence_breakdown?: Record<string, number>;
  validation_messages?: string[];
  action?: string;
  status_message?: string;
  metadata?: Record<string, any>;
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
  scan_id?: string; // 👈 THÊM DÒNG NÀY
}

export interface OCRBatchResult {
  results: OCRResult[];
  totalFiles: number;
  successCount: number;
  errorCount: number;
}

// Field definitions cho từng loại document
export interface BaoCaoGiaCongFields {
  ngay: string;
  ca: string;
  may: string;
  du_an: string;
  so_luong: number;
  vat_lieu: string;
  so_ban_ve: string;
  chi_tiet_so: string;
  ten_chi_tiet: string;
  ng_cong_so: string;
  tong_ng_cong: number;
  thoi_gian_gc_cai: number;
  tong_thoi_gian: number;
  nguoi_van_hanh: string;
  nguoi_kiem_tra: string;
}