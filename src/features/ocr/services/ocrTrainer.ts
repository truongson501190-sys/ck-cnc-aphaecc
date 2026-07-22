// src/features/ocr/services/ocrTrainer.ts

export interface TrainingSample {
  id: string;
  name: string;
  documentType: string;
  rawText: string;
  expectedFields: Record<string, any>;
  patterns: Record<string, string[]>;
  createdAt: string;
  updatedAt: string;
  autoLearned?: boolean; // Đánh dấu học tự động
}

export class OCRTrainer {
  private samples: TrainingSample[] = [];
  private learningPatterns: Map<string, any[]> = new Map();
  private maxSamples = 100; // Giới hạn số mẫu học

  constructor() {
    this.loadSamples();
  }

  addSample(sample: TrainingSample): void {
    // Kiểm tra trùng lặp
    const isDuplicate = this.samples.some(s => 
      s.rawText === sample.rawText && 
      JSON.stringify(s.expectedFields) === JSON.stringify(sample.expectedFields)
    );
    
    if (isDuplicate) {
      console.log('⏭️ Bỏ qua mẫu trùng lặp');
      return;
    }

    // Giới hạn số mẫu
    if (this.samples.length >= this.maxSamples) {
      // Xóa mẫu cũ nhất
      this.samples.shift();
    }

    this.samples.push(sample);
    this.learnFromSample(sample);
    this.saveSamples();
    
    console.log(`📚 Đã học mẫu #${this.samples.length}`);
  }

  private learnFromSample(sample: TrainingSample): void {
    const fields = sample.expectedFields;
    const lines = sample.rawText.split('\n');
    
    for (const [field, value] of Object.entries(fields)) {
      if (!value) continue;
      
      const strValue = String(value);
      const patterns = this.learningPatterns.get(field) || [];
      
      for (const line of lines) {
        if (line.includes(strValue)) {
          const pattern = line.replace(strValue, '(.+)').trim();
          // Chỉ thêm pattern mới
          if (!patterns.includes(pattern)) {
            patterns.push(pattern);
            console.log(`🧠 Học pattern cho ${field}: "${pattern}"`);
          }
        }
      }
      
      this.learningPatterns.set(field, patterns);
    }
  }

  // ✅ Học tự động từ dữ liệu đọc được
  autoLearn(text: string, fields: Record<string, any>): void {
    // Chỉ học khi có đủ dữ liệu
    if (!text || text.length < 50) {
      console.log('⏭️ Bỏ qua học: text quá ngắn');
      return;
    }

    if (!fields || Object.keys(fields).length === 0) {
      console.log('⏭️ Bỏ qua học: không có fields');
      return;
    }

    // Kiểm tra xem đã học chưa
    const alreadyLearned = this.samples.some(s => 
      s.rawText === text || 
      (s.rawText.length > 50 && s.rawText.substring(0, 100) === text.substring(0, 100))
    );

    if (alreadyLearned) {
      console.log('⏭️ Bỏ qua học: đã học mẫu này');
      return;
    }

    // Tự động học
    const sample: TrainingSample = {
      id: crypto.randomUUID(),
      name: `Tự học ${this.samples.length + 1}`,
      documentType: 'AUTO',
      rawText: text,
      expectedFields: fields,
      patterns: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoLearned: true,
    };
    
    this.addSample(sample);
    console.log(`✅ AI đã tự động học (${this.samples.length} mẫu)`);
  }

  learnFromCorrection(originalText: string, correctedFields: Record<string, any>): void {
    const sample: TrainingSample = {
      id: crypto.randomUUID(),
      name: `Sửa thủ công ${this.samples.length + 1}`,
      documentType: 'MANUAL',
      rawText: originalText,
      expectedFields: correctedFields,
      patterns: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoLearned: false,
    };
    
    this.addSample(sample);
    toast?.success(`🧠 Đã học từ dữ liệu bạn sửa!`);
  }

  private saveSamples(): void {
    try {
      localStorage.setItem('ocr_training_samples', JSON.stringify(this.samples));
      localStorage.setItem('ocr_learning_patterns', JSON.stringify(
        Object.fromEntries(this.learningPatterns)
      ));
    } catch (error) {
      console.error('Lỗi lưu mẫu học:', error);
    }
  }

  loadSamples(): void {
    try {
      const samples = localStorage.getItem('ocr_training_samples');
      if (samples) {
        this.samples = JSON.parse(samples);
        console.log(`📚 Đã tải ${this.samples.length} mẫu học`);
      }
      
      const patterns = localStorage.getItem('ocr_learning_patterns');
      if (patterns) {
        this.learningPatterns = new Map(Object.entries(JSON.parse(patterns)));
        console.log(`🧠 Đã tải ${this.learningPatterns.size} patterns`);
      }
    } catch (error) {
      console.error('Lỗi tải mẫu học:', error);
    }
  }

  applyLearning(text: string): Record<string, any> | null {
    const result: Record<string, any> = {};
    
    for (const [field, patterns] of this.learningPatterns) {
      for (const pattern of patterns) {
        if (typeof pattern === 'string') {
          try {
            const regex = new RegExp(pattern, 'i');
            const match = text.match(regex);
            if (match && match[1]) {
              const value = match[1].trim();
              const num = Number(value);
              result[field] = Number.isNaN(num) ? value : num;
              break;
            }
          } catch (e) {
            // Bỏ qua pattern lỗi
          }
        }
      }
    }
    
    return Object.keys(result).length > 0 ? result : null;
  }

  getStats(): {
    totalSamples: number;
    autoLearned: number;
    manualLearned: number;
    fieldsLearned: string[];
    patternsCount: number;
  } {
    const autoLearned = this.samples.filter(s => s.autoLearned).length;
    const manualLearned = this.samples.filter(s => !s.autoLearned).length;
    
    return {
      totalSamples: this.samples.length,
      autoLearned,
      manualLearned,
      fieldsLearned: Array.from(this.learningPatterns.keys()),
      patternsCount: Array.from(this.learningPatterns.values())
        .reduce((sum, arr) => sum + arr.length, 0)
    };
  }

  // Xóa tất cả mẫu học
  clearAll(): void {
    this.samples = [];
    this.learningPatterns = new Map();
    this.saveSamples();
    console.log('🗑️ Đã xóa tất cả mẫu học');
  }
}

export const ocrTrainer = new OCRTrainer();

// Toast helper
let toast: any = null;
export const setToast = (toastInstance: any) => {
  toast = toastInstance;
};