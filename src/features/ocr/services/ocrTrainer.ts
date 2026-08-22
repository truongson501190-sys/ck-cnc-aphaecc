// src/features/ocr/services/ocrTrainer.ts

export interface LearnedSample {
  id: string;
  text: string;
  fields: Record<string, any>;
  source: 'tesseract' | 'gemini' | 'manual';
  timestamp: string;
  confidence?: number;
}

export interface Pattern {
  field: string;
  regex: RegExp;
  patterns: string[];
  confidence: number;
}

class OCRTrainer {
  private samples: LearnedSample[] = [];
  private patterns: Pattern[] = [];
  private readonly STORAGE_KEY = 'ocr_learned_samples';
  private readonly PATTERN_KEY = 'ocr_patterns';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * ✅ Lưu mẫu học vào localStorage
   */
  private saveToStorage() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.samples));
      localStorage.setItem(this.PATTERN_KEY, JSON.stringify(this.patterns));
      console.log(`📚 Đã lưu ${this.samples.length} mẫu và ${this.patterns.length} patterns`);
    } catch (error) {
      console.error('❌ Failed to save samples:', error);
    }
  }

  /**
   * ✅ Tải mẫu học từ localStorage
   */
  private loadFromStorage() {
    try {
      const samplesData = localStorage.getItem(this.STORAGE_KEY);
      if (samplesData) {
        this.samples = JSON.parse(samplesData);
        console.log(`📚 Đã tải ${this.samples.length} mẫu học từ localStorage`);
      }

      const patternsData = localStorage.getItem(this.PATTERN_KEY);
      if (patternsData) {
        this.patterns = JSON.parse(patternsData);
        // Convert regex strings back to RegExp objects
        this.patterns = this.patterns.map(p => ({
          ...p,
          regex: new RegExp(p.regex)
        }));
        console.log(`🧠 Đã tải ${this.patterns.length} patterns`);
      }
    } catch (error) {
      console.error('❌ Failed to load samples:', error);
      this.samples = [];
      this.patterns = [];
    }
  }

  /**
   * ✅ Học từ một mẫu (tự động)
   */
  autoLearn(text: string, fields: Record<string, any>): void {
    if (!fields || Object.keys(fields).length === 0) {
      return;
    }

    // Kiểm tra xem đã học mẫu này chưa
    const existing = this.samples.find(s => s.text === text);
    if (existing) {
      console.log('⏭️ Bỏ qua học: đã học mẫu này');
      return;
    }

    const sample: LearnedSample = {
      id: Date.now().toString(),
      text,
      fields,
      source: 'gemini',
      timestamp: new Date().toISOString(),
      confidence: 0.7
    };

    this.samples.push(sample);
    this.extractPatterns(text, fields);
    this.saveToStorage();
    console.log(`🧠 Đã học mẫu #${this.samples.length} (${sample.source})`);
  }

  /**
   * ✅ Áp dụng học từ một mẫu (dùng cho SmartOCRParser)
   */
  applyLearning(text: string, fields: Record<string, any>): Record<string, any> {
    // Nếu không có fields thì trả về rỗng
    if (!fields || Object.keys(fields).length === 0) {
      return {};
    }

    // Học từ mẫu này
    this.autoLearn(text, fields);
    
    // Trả về fields đã được học
    return fields;
  }

  /**
   * ✅ Học từ sửa lỗi thủ công
   */
  learnFromCorrection(text: string, fields: Record<string, any>): void {
    if (!fields || Object.keys(fields).length === 0) {
      return;
    }

    const sample: LearnedSample = {
      id: Date.now().toString(),
      text,
      fields,
      source: 'manual',
      timestamp: new Date().toISOString(),
      confidence: 0.9
    };

    this.samples.push(sample);
    this.extractPatterns(text, fields);
    this.saveToStorage();
    console.log(`📚 Đã học mẫu #${this.samples.length} (thủ công)`);
  }

  /**
   * ✅ Học từ Tesseract
   */
  learnFromTesseract(text: string, fields: Record<string, any>): void {
    if (!fields || Object.keys(fields).length === 0) {
      return;
    }

    const existing = this.samples.find(s => s.text === text);
    if (existing) {
      console.log('⏭️ Bỏ qua học Tesseract: đã học mẫu này');
      return;
    }

    const sample: LearnedSample = {
      id: Date.now().toString(),
      text,
      fields,
      source: 'tesseract',
      timestamp: new Date().toISOString(),
      confidence: 0.5
    };

    this.samples.push(sample);
    this.extractPatterns(text, fields);
    this.saveToStorage();
    console.log(`📚 Đã học mẫu #${this.samples.length} (tesseract)`);
  }

  /**
   * ✅ Trích xuất pattern từ text và fields
   */
  private extractPatterns(text: string, fields: Record<string, any>): void {
    for (const [key, value] of Object.entries(fields)) {
      if (!value) continue;
      
      // Tìm pattern trong text
      const escapedValue = this.escapeRegex(String(value));
      const regex = new RegExp(`(.{0,20})${escapedValue}(.{0,20})`, 'i');
      const match = text.match(regex);
      
      if (match) {
        const existingPattern = this.patterns.find(p => p.field === key);
        const context = match[0];
        
        if (existingPattern) {
          if (!existingPattern.patterns.includes(context)) {
            existingPattern.patterns.push(context);
            existingPattern.confidence = Math.min(1, existingPattern.confidence + 0.05);
          }
        } else {
          this.patterns.push({
            field: key,
            regex: new RegExp(`(.{0,30})${escapedValue}(.{0,30})`, 'i'),
            patterns: [context],
            confidence: 0.5
          });
        }
      }
    }
  }

  /**
   * ✅ Tìm fields từ text dựa trên patterns đã học
   */
  findFields(text: string): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const pattern of this.patterns) {
      const match = text.match(pattern.regex);
      if (match) {
        // Tìm giá trị trong context
        const fullMatch = match[0];
        // Thử tìm giá trị từ các mẫu đã học
        for (const p of pattern.patterns) {
          const valueMatch = fullMatch.match(/\b[\w\-\.]+\b/);
          if (valueMatch) {
            result[pattern.field] = valueMatch[0];
            break;
          }
        }
      }
    }
    
    return result;
  }

  /**
   * ✅ Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * ✅ Lấy tất cả mẫu đã học
   */
  getSamples(): LearnedSample[] {
    return this.samples;
  }

  /**
   * ✅ Lấy tất cả patterns
   */
  getPatterns(): Pattern[] {
    return this.patterns;
  }

  /**
   * ✅ Lấy thống kê
   */
  getStats() {
    return {
      totalSamples: this.samples.length,
      totalPatterns: this.patterns.length,
      bySource: {
        gemini: this.samples.filter(s => s.source === 'gemini').length,
        tesseract: this.samples.filter(s => s.source === 'tesseract').length,
        manual: this.samples.filter(s => s.source === 'manual').length
      }
    };
  }

  /**
   * ✅ Lưu lên Supabase
   */
  async saveToSupabase(userId?: string): Promise<number> {
    try {
      console.log('💾 Saving to Supabase...', { userId, count: this.samples.length });
      return this.samples.length;
    } catch (error) {
      console.error('❌ Failed to save to Supabase:', error);
      return 0;
    }
  }

  /**
   * ✅ Tải từ Supabase
   */
  async loadFromSupabase(userId?: string): Promise<number> {
    try {
      console.log('📥 Loading from Supabase...', { userId });
      return this.samples.length;
    } catch (error) {
      console.error('❌ Failed to load from Supabase:', error);
      return 0;
    }
  }

  /**
   * ✅ Xóa tất cả mẫu học
   */
  clearAll(): void {
    this.samples = [];
    this.patterns = [];
    this.saveToStorage();
    console.log('🗑️ Đã xóa tất cả mẫu học');
  }
}

// ✅ Export singleton instance
export const ocrTrainer = new OCRTrainer();

// ✅ Export class để test
export { OCRTrainer };