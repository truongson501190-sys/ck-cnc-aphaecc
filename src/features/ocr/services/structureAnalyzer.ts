// src/features/ocr/services/structureAnalyzer.ts
import { LineStructure, DocumentStructure, DocumentType } from '../types/documentTypes';

export class StructureAnalyzer {
  private patterns = {
    title: [
      /^[A-ZÀ-Ỹ][A-ZÀ-Ỹ\s]{10,}$/,
      /^[A-Z][a-zÀ-ỹ]+\s+[A-Z][a-zÀ-ỹ]+/
    ],
    date: [
      /(ngày|date|ngay)\s*[:：]?\s*\d{1,2}/i,
      /\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}/,
      /(tháng|month|thang)\s*\d{1,2}/i,
      /(năm|year|nam)\s*\d{4}/i
    ],
    header: [
      /stt|chủng loại|số lượng|dự án|người nhận|máy|mã hàng|tên hàng|đơn giá|thành tiền/i
    ],
    signature: [
      /(tổ trưởng|chữ ký|người nhận|ký tên|ký duyệt|người giao|người nhận)/i
    ],
    row: [
      /^\s*\d+\s+/,
      /^\s*\d+[\.\)\s]/
    ],
    note: [
      /(ghi chú|nhận xét|lưu ý|note)/i
    ]
  };

  analyze(text: string, docType: DocumentType): DocumentStructure {
    const lines = text.split('\n');
    const structuredLines: LineStructure[] = [];
    const headers: string[] = [];
    const rows: string[][] = [];
    let title: string | undefined;
    let date: string | undefined;
    let signature: string | undefined;
    const notes: string[] = [];

    let inTable = false;

    for (const line of lines) {
      const trimmed = line.trim();
      const structure = this.analyzeLine(trimmed);
      
      if (structure.type === 'header') {
        inTable = true;
        headers.push(trimmed);
      } else if (structure.type === 'row' && inTable) {
        const cols = this.extractColumns(trimmed);
        if (cols.length > 1) {
          rows.push(cols);
        }
        structure.columns = cols;
      } else if (structure.type === 'title') {
        title = trimmed;
      } else if (structure.type === 'date') {
        date = trimmed;
      } else if (structure.type === 'signature') {
        signature = trimmed;
      } else if (structure.type === 'note') {
        notes.push(trimmed);
      } else if (structure.type === 'empty') {
        if (inTable) {
          inTable = false;
        }
      }

      structuredLines.push({
        content: line,
        type: structure.type,
        level: structure.level,
        columns: structure.type === 'row' ? this.extractColumns(trimmed) : undefined,
      });
    }

    return {
      type: docType,
      title,
      date,
      headers,
      rows,
      signature,
      notes,
      rawText: text,
      structuredLines,
      confidence: this.calculateConfidence(structuredLines)
    };
  }

  private analyzeLine(line: string): { type: LineStructure['type']; level?: number; columns?: string[] } {
    if (!line.trim()) {
      return { type: 'empty' };
    }

    for (const pattern of this.patterns.title) {
      if (pattern.test(line)) {
        return { type: 'title', level: 1 };
      }
    }

    for (const pattern of this.patterns.date) {
      if (pattern.test(line)) {
        return { type: 'date' };
      }
    }

    for (const pattern of this.patterns.header) {
      if (pattern.test(line)) {
        return { type: 'header' };
      }
    }

    for (const pattern of this.patterns.signature) {
      if (pattern.test(line)) {
        return { type: 'signature' };
      }
    }

    for (const pattern of this.patterns.row) {
      if (pattern.test(line)) {
        return { type: 'row' };
      }
    }

    for (const pattern of this.patterns.note) {
      if (pattern.test(line)) {
        return { type: 'note' };
      }
    }

    return { type: 'unknown' };
  }

  private extractColumns(line: string): string[] {
    if (line.includes('\t')) {
      return line.split('\t').map(c => c.trim()).filter(c => c);
    }
    
    const cols = line.split(/\s{2,}/).map(c => c.trim()).filter(c => c);
    if (cols.length > 1) {
      return cols;
    }
    
    return [line.trim()];
  }

  private calculateConfidence(lines: LineStructure[]): number {
    const total = lines.length;
    if (total === 0) return 0;
    
    const classified = lines.filter(l => l.type !== 'unknown' && l.type !== 'empty').length;
    return Math.min(classified / total, 1);
  }
}