// src/services/advancedTrainer.ts
import { TrainingSample } from '../features/ocr/services/ocrTrainer';
import { ParsedReportData } from '../features/ocrService';

export class AdvancedTrainer {
  private knowledgeBase: Map<string, Record<string, string>> = new Map();

  /**
   * Học từ nhiều mẫu cùng lúc
   */
  batchLearn(samples: TrainingSample[]): void {
    // Nhóm các mẫu theo loại
    const grouped = samples.reduce((acc, sample) => {
      const type = sample.documentType || 'OTHER';
      if (!acc[type]) acc[type] = [];
      acc[type].push(sample);
      return acc;
    }, {} as Record<string, TrainingSample[]>);

    // Học từng nhóm
    for (const [type, group] of Object.entries(grouped)) {
      this.learnPatternsFromGroup(type, group);
    }
  }

  /**
   * Học pattern từ nhóm mẫu
   */
  private learnPatternsFromGroup(type: string, samples: TrainingSample[]): void {
    const commonPatterns = this.findCommonPatterns(samples);
    this.saveToKnowledgeBase(type, commonPatterns);
  }

  /**
   * Tìm pattern chung từ nhiều mẫu
   */
  private findCommonPatterns(samples: TrainingSample[]): Record<string, string> {
    const patterns: Record<string, string> = {};
    
    // Các field cần học pattern
    const fields = ['date', 'shift', 'machine_code', 'worker_code', 'product_code'];
    
    for (const field of fields) {
      const values = samples
        .map(s => (s.expectedData as any)[field])
        .filter(Boolean) as string[];
      
      if (values.length > 1) {
        const commonRegex = this.findCommonRegex(values);
        if (commonRegex) {
          patterns[field] = commonRegex;
        }
      }
    }
    
    // Học measurements
    const allMeasurements = samples.flatMap(s => s.expectedData.measurements || []);
    if (allMeasurements.length > 0) {
      const measurementPattern = this.findMeasurementPatterns(allMeasurements);
      if (measurementPattern) {
        patterns['measurements'] = measurementPattern;
      }
    }
    
    return patterns;
  }

  /**
   * Tìm regex chung cho các giá trị
   */
  private findCommonRegex(values: string[]): string {
    if (values.length === 0) return '';
    
    // Kiểm tra pattern cho mã máy: M01, M02, M03...
    if (values.every(v => /^M\d{2}$/.test(v))) {
      return String.raw`M\d{2}`;
    }
    
    // Kiểm tra pattern cho mã công nhân: NV001, NV002...
    if (values.every(v => /^NV\d{3}$/.test(v))) {
      return String.raw`NV\d{3}`;
    }
    
    // Kiểm tra pattern cho mã sản phẩm: SP01, SP02...
    if (values.every(v => /^SP\d{2}$/.test(v))) {
      return String.raw`SP\d{2}`;
    }
    
    // Kiểm tra pattern cho ngày: DD/MM/YYYY
    if (values.every(v => /^\d{2}\/\d{2}\/\d{4}$/.test(v))) {
      return String.raw`\d{2}/\d{2}/\d{4}`;
    }
    
    // Kiểm tra pattern cho ca: 1, 2, 3
    if (values.every(v => /^[1-3]$/.test(v))) {
      return '[1-3]';
    }
    
    return '';
  }

  /**
   * Tìm pattern cho measurements
   */
  private findMeasurementPatterns(measurements: any[]): string {
    // Tìm các parameter chung
    const params = measurements.map(m => m.parameter);
    const uniqueParams = [...new Set(params)];
    
    if (uniqueParams.length === 0) {
      return '';
    }
    
    // Tạo pattern cho measurement
    const pattern = uniqueParams.map(p => {
      const escapedParam = p.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
      return String.raw`${escapedParam}\s*[:：]\s*([\d.]+)\s*(?:[()]\s*[\d.]+\s*[-–]\s*[\d.]+\s*[)])?\s*([A-Za-z]*)`;
    }).join('|');
    
    return pattern;
  }

  /**
   * Lưu vào knowledge base
   */
  private saveToKnowledgeBase(type: string, patterns: Record<string, string>): void {
    this.knowledgeBase.set(type, patterns);
    console.log(`🧠 Đã học pattern cho loại: ${type}`);
  }

  /**
   * Áp dụng knowledge base để parse
   */
  applyKnowledge(text: string, documentType?: string): Partial<ParsedReportData> | null {
    const patterns = this.getPatternsForType(documentType);
    if (!patterns) return null;

    return this.extractResultsFromPatterns(text, patterns);
  }

  private getPatternsForType(documentType?: string): Record<string, string> | null {
    if (documentType) {
      return this.knowledgeBase.get(documentType) || null;
    }

    return this.knowledgeBase.values().next().value || null;
  }

  private extractResultsFromPatterns(text: string, patterns: Record<string, string>): Partial<ParsedReportData> | null {
    const result: Partial<ParsedReportData> = {};

    for (const [field, pattern] of Object.entries(patterns)) {
      if (field === 'measurements') {
        const measurements = this.extractMeasurementsFromPattern(text, pattern);
        if (measurements.length > 0) {
          result.measurements = measurements;
        }
        continue;
      }

      try {
        const regex = new RegExp(pattern, 'i');
        const match = regex.exec(text);
        if (match?.[1]) {
          (result as any)[field] = match[1].trim();
        }
      } catch (error) {
        console.warn(`Lỗi pattern cho field ${field}:`, error);
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Trích xuất measurements từ pattern
   */
  private extractMeasurementsFromPattern(text: string, pattern: string): any[] {
    const measurements: any[] = [];
    
    try {
      const regex = new RegExp(pattern, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        const parameter = match[1]?.trim() || '';
        const value = match[2] ? Number.parseFloat(match[2]) : 0;
        const unit = match[3]?.trim() || '';
        
        if (parameter && value > 0) {
          measurements.push({
            parameter,
            value,
            min: 0,
            max: 100,
            unit,
            status: 'PASS'
          });
        }
      }
    } catch (error) {
      console.warn('Lỗi extract measurements:', error);
    }
    
    return measurements;
  }

  /**
   * Lấy thống kê knowledge base
   */
  getKnowledgeStats(): {
    types: string[];
    totalPatterns: number;
  } {
    const types = Array.from(this.knowledgeBase.keys());
    let totalPatterns = 0;
    
    for (const patterns of this.knowledgeBase.values()) {
      totalPatterns += Object.keys(patterns).length;
    }
    
    return {
      types,
      totalPatterns
    };
  }

  /**
   * Lưu knowledge base vào localStorage
   */
  saveKnowledge(): void {
    try {
      localStorage.setItem('advanced_trainer_knowledge', 
        JSON.stringify(Object.fromEntries(this.knowledgeBase))
      );
    } catch (error) {
      console.error('Lỗi lưu knowledge base:', error);
    }
  }

  /**
   * Tải knowledge base từ localStorage
   */
  loadKnowledge(): void {
    try {
      const data = localStorage.getItem('advanced_trainer_knowledge');
      if (data) {
        const parsed = JSON.parse(data);
        this.knowledgeBase = new Map(Object.entries(parsed));
        console.log(`📚 Đã tải ${this.knowledgeBase.size} loại pattern`);
      }
    } catch (error) {
      console.error('Lỗi tải knowledge base:', error);
    }
  }

  /**
   * Lấy knowledge base
   */
  getKnowledgeBase(): Map<string, Record<string, string>> {
    return this.knowledgeBase;
  }

  /**
   * Xóa knowledge base
   */
  clearKnowledge(): void {
    this.knowledgeBase.clear();
    localStorage.removeItem('advanced_trainer_knowledge');
    console.log('🗑️ Đã xóa knowledge base');
  }
}

// Export singleton
export const advancedTrainer = new AdvancedTrainer();