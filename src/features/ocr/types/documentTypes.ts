// src/features/ocr/types/documentTypes.ts

export type DocumentType = 
  | 'phieu_cap_phat'
  | 'bao_cao_gia_cong'
  | 'nhap_kho'
  | 'xuat_kho'
  | 'nhat_ky_qc'
  | 'bao_tri'
  | 'unknown';

export interface LineStructure {
  content: string;
  type: 'title' | 'header' | 'row' | 'date' | 'signature' | 'note' | 'empty' | 'unknown';
  level?: number;
  columns?: string[];
  isBold?: boolean;
  isItalic?: boolean;
}

export interface DocumentStructure {
  type: DocumentType;
  title?: string;
  date?: string;
  headers: string[];
  rows: string[][];
  signature?: string;
  notes?: string[];
  rawText: string;
  structuredLines: LineStructure[];
  confidence: number;
}

export interface DocumentTypeInfo {
  label: string;
  icon: string;
  color: string;
  fields: string[];
  module?: string;
}