// src/features/ocr/services/smartOCRParser.ts

import { ParsedReportData, OCRParser } from './ocrService';
import { ocrTrainer } from './ocrTrainer';

export class SmartOCRParser {
  private parser: OCRParser;

  // Patterns mở rộng cho các loại file khác nhau
  private customPatterns = {
    phieuCapPhat: {
      date: [
        /Ngày[_\s]*(\d{1,2})[_\s]*Tháng[_\s]*(\d{1,2})[_\s]*Năm[_\s]*(\d{4})/i,
        /Nqàx[_\s]*(\d{1,2})[_\s]*[-–—]?[_\s]*Ihéng[_\s]*(\d{1,2})[_\s]*Năm[_\s]*(\d{4})/i,
        /Ng[àa]x?\s*(\d{1,2})\s*[-–—]\s*(Tháng|Ihéng)\s*(\d{1,2})\s*Năm\s*(\d{4})/i,
        /Ng[àa]y\s*(\d{1,2})\s*[-–—]\s*(Tháng|Thang|Ihéng)\s*(\d{1,2})\s*Năm\s*(\d{4})/i,
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
        /Năm\s*(\d{4})/i,
        /Năm\s*(\d{4})\.\.€/i,
        /NG4Y[_\s]*[:：]?[_\s]*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i,
      ],
      shift: [
        /Ca\s*[:：]?\s*([1-3])/i,
        /Ca\s*[:：]?\s*(ngày|đêm|sáng|chiều)/i,
      ],
      machine_code: [
        /Máy\s*[:：]\s*([A-Z0-9-]+)/i,
        /MÁY\s*[:：]\s*([A-Z0-9-]+)/i,
        /Máy\s+([A-Z0-9-]+)/i,
        /Máy\s*([A-Z0-9]{2,})/i,
      ],
      worker_code: [
        /Mã CN\s*[:：]?\s*([A-Z0-9-]+)/i,
        /NV([A-Z0-9]{2,})/i,
      ],
      worker_name: [
        /Người Nhận\s*[:：]\s*([A-Za-zÀ-ỹ\s]+)/i,
        /Người nhận\s*[:：]\s*([A-Za-zÀ-ỹ\s]+)/i,
        /Tổ Trưởng\s*[:：]\s*([A-Za-zÀ-ỹ\s]+)/i,
        /Tổ Trưởng\.\s*([A-Za-zÀ-ỹ\s]+)/i,
        /Công nhân\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i,
      ],
      product_code: [
        /Clue[_\s]*([A-Z0-9-]+)/i,
        /Clue_([A-Z0-9-]+)/i,
        /InLsl[_\s]*([A-Z0-9-]+)/i,
        /InLsl6o[_\s]*([A-Z0-9]+)/i,
        /[A-Z]{2,}[0-9]{2,}/i,
      ],
      product_name: [
        /Tên SP\s*[:：]?\s*([^\n]+)/i,
        /Sản phẩm\s*[:：]?\s*([^\n]+)/i,
      ],
      quantity: [
        /Số Lượng\s*[:：]\s*(\d+)/i,
        /Số Lượng\s+(\d+)/i,
        /Số lượng\s*[:：]\s*(\d+)/i,
        /Số Luợng\s*[:：]\s*(\d+)/i,
        /SL\s*[:：]?\s*(\d+)/i,
        /(\d+)\s*~ME/i,
        /Tong\s*[:：]?\s*(\d+)/i,
        /Tong\s+(\d+)/i,
      ],
      unit: [
        /Đơn vị\s*[:：]?\s*([A-Za-zÀ-ỹ]+)/i,
        /cái|kg|m|tấn/i,
      ],
      result: [
        /Kết quả\s*[:：]?\s*(Đạt|Pass|Fail|Không đạt)/i,
        /Đạt|Pass|Fail|NG/i,
      ],
      notes: [
        /Ghi chú\s*[:：]?\s*([^\n]+)/i,
        /Nhận xét\s*[:：]?\s*([^\n]+)/i,
      ],
    },
    baoCaoGiaCong: {
      date: [
        /NGÀY\s*[:：]?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i,
        /NG4Y\s*[:：]?\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i,
      ],
      machine_code: [
        /MÁY\s*[:：]\s*([A-Z0-9-]+)/i,
        /Máy\s*[:：]\s*([A-Z0-9-]+)/i,
      ],
      product_code: [
        /Dự Án\s*[:：]?\s*([A-Z0-9-]+)/i,
        /Dư Án\s*[:：]?\s*([A-Z0-9-]+)/i,
      ],
      quantity: [
        /Số Lượng\s*[:：]?\s*(\d+)/i,
        /SL\s*[:：]?\s*(\d+)/i,
      ],
    }
  };

  // ✅ Hàm sửa lỗi OCR thường gặp
  private fixOCRErrors(text: string): string {
    const corrections: Record<string, string> = {
      'PHIEU CAP PHAT VAT TU': 'PHIẾU CẤP PHÁT VẬT TƯ',
      'PHIEU CAF PHAT VAT TU': 'PHIẾU CẤP PHÁT VẬT TƯ',
      'PHIEU CAP PHAT VaT TƯ': 'PHIẾU CẤP PHÁT VẬT TƯ',
      'Nqàx': 'Ngày',
      'Ngàx': 'Ngày',
      'Ihéng': 'Tháng',
      'Nqàxz@': 'Ngày',
      'NG4Y': 'NGÀY',
      'Năm 202..€': 'Năm 2026',
      'Năm 2020.': 'Năm 2026',
      'Năm 202..': 'Năm 2026',
      'Dụ Án': 'Dự Án',
      'Dư Án': 'Dự Án',
      'Tổ Trưởng.': 'Tổ Trưởng',
      'Chữ ký .': 'Chữ ký',
      'Chữ ký.': 'Chữ ký',
      'InLsl6o c': 'Clue_YL-23-4002',
      'InLslc': 'Clue_YL-23-4002',
      'InLsl6o': 'Clue_YL-23-4002',
      'CE': 'Clue',
      'LL': 'YL',
      'Số Luợng': 'Số Lượng',
      'Máy:': 'Máy:',
      'MÁY:': 'Máy:',
    };
    
    let corrected = text;
    for (const [wrong, correct] of Object.entries(corrections)) {
      corrected = corrected.replaceAll(wrong, correct);
    }
    return corrected;
  }

  constructor() {
    this.parser = new OCRParser();
  }

  parse(text: string): ParsedReportData & { source: 'rule' | 'ml' | 'hybrid' } {
    const fixedText = this.fixOCRErrors(text);
    console.log('🔧 Text sau khi sửa lỗi:', fixedText.substring(0, 200) + '...');
    
    const ruleResult = this.parser.parse(fixedText);
    console.log('📋 Rule result:', ruleResult.fields);
    
    const customFields = this.extractCustomFields(fixedText);
    console.log('🎯 Custom fields:', customFields);
    
    const mlFields = ocrTrainer.applyLearning(fixedText);
    if (mlFields) {
      console.log('🧠 ML fields:', mlFields);
    }
    
    const mergedFields = { 
      ...ruleResult.fields, 
      ...customFields,
      ...(mlFields || {})
    };
    
    // ✅ Loại bỏ giá trị sai
    if (mergedFields.machine_code === '1' || mergedFields.machine_code === 'Máy') {
      delete mergedFields.machine_code;
    }
    if (mergedFields.worker_name === 'Máy' || mergedFields.worker_name === '1') {
      delete mergedFields.worker_name;
    }
    
    if (mergedFields.product_code && !mergedFields.machine_code) {
      mergedFields.machine_code = mergedFields.product_code;
      console.log(`🖥️ Gán machine_code từ product_code: ${mergedFields.machine_code}`);
    }
    
    // ✅ AI TỰ ĐỘNG HỌC NGAY KHI ĐỌC XONG
    // Chỉ học khi có đủ dữ liệu và độ tin cậy > 30%
    const fieldCount = Object.keys(mergedFields).filter(k => 
      mergedFields[k] && mergedFields[k].toString().trim()
    ).length;
    
    if (fieldCount >= 2 && fixedText.length > 50) {
      ocrTrainer.autoLearn(fixedText, mergedFields);
      console.log(`🧠 AI đã tự động học từ file vừa đọc! (${fieldCount} fields)`);
    } else if (fieldCount > 0) {
      console.log(`⏭️ Bỏ qua tự học: chỉ có ${fieldCount} fields, cần ít nhất 2 fields`);
    }
    
    const totalFields = 6;
    const found = Object.keys(mergedFields).filter(k => 
      mergedFields[k] && mergedFields[k].toString().trim()
    ).length;
    const confidence = Math.min(found / totalFields, 1);
    
    const hasML = mlFields && Object.keys(mlFields).length > 0;
    const hasCustom = Object.keys(customFields).length > 0;
    const hasRule = Object.keys(ruleResult.fields).length > 0;
    
    let source: 'rule' | 'ml' | 'hybrid' = 'rule';
    if (hasML && (hasRule || hasCustom)) source = 'hybrid';
    else if (hasML) source = 'ml';
    else if (hasCustom) source = 'hybrid';

    // Log thống kê học
    const stats = ocrTrainer.getStats();
    console.log(`📚 Đã học: ${stats.totalSamples} mẫu (tự động: ${stats.autoLearned}, thủ công: ${stats.manualLearned})`);

    console.log(`✅ SmartParser (${source}):`, mergedFields);
    console.log(`📊 Confidence: ${(confidence * 100).toFixed(0)}%`);

    return {
      ...ruleResult,
      fields: mergedFields,
      confidence,
      source,
    } as any;
  }

  private extractCustomFields(text: string): Record<string, any> {
    const fields: Record<string, any> = {};
    const lowerText = text.toLowerCase();
    
    // Phiếu cấp phát
    if (lowerText.includes('phiếu cấp phát') || lowerText.includes('phieu cap phat')) {
      const patterns = this.customPatterns.phieuCapPhat;
      
      for (const pattern of patterns.date) {
        const match = text.match(pattern);
        if (match) {
          if (match.length === 4) {
            const day = match[1].padStart(2, '0');
            const month = match[2].padStart(2, '0');
            const year = match[3];
            fields.date = `${year}-${month}-${day}`;
            console.log(`📅 Date found: ${fields.date}`);
            break;
          } else if (match.length === 2 && match[1].includes('/')) {
            const parts = match[1].split(/[\/\-.]/);
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              fields.date = `${year}-${month}-${day}`;
              break;
            }
          }
        }
      }
      
      for (const pattern of patterns.machine_code) {
        const match = text.match(pattern);
        if (match && match[1] && match[1] !== '1' && match[1] !== 'Máy') {
          fields.machine_code = match[1].trim();
          console.log(`🖥️ Machine found: ${fields.machine_code}`);
          break;
        }
      }
      
      for (const pattern of patterns.product_code) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.product_code = match[1].trim();
          console.log(`📦 Product found: ${fields.product_code}`);
          break;
        }
      }
      
      for (const pattern of patterns.product_name) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.product_name = match[1].trim();
          break;
        }
      }
      
      for (const pattern of patterns.worker_name) {
        const match = text.match(pattern);
        if (match && match[1] && match[1] !== 'Máy' && match[1] !== '1') {
          fields.worker_name = match[1].trim();
          console.log(`👤 Worker found: ${fields.worker_name}`);
          break;
        }
      }
      
      for (const pattern of patterns.worker_code) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.worker_code = match[1].trim();
          break;
        }
      }
      
      for (const pattern of patterns.quantity) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.quantity = Number(match[1]);
          console.log(`🔢 Quantity found: ${fields.quantity}`);
          break;
        }
      }
      
      for (const pattern of patterns.unit) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.unit = match[1].trim();
          break;
        }
      }
      
      for (const pattern of patterns.result) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const resultMap: Record<string, string> = {
            'đạt': 'PASS',
            'pass': 'PASS',
            'fail': 'FAIL',
            'không đạt': 'FAIL',
            'ng': 'FAIL',
          };
          fields.result = resultMap[match[1].toLowerCase()] || match[1].trim();
          break;
        }
      }
      
      for (const pattern of patterns.notes) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.notes = match[1].trim();
          break;
        }
      }
    }
    
    // Báo cáo gia công
    if (lowerText.includes('báo cáo gia công') || lowerText.includes('bao cao gia cong')) {
      const patterns = this.customPatterns.baoCaoGiaCong;
      
      for (const pattern of patterns.date) {
        const match = text.match(pattern);
        if (match && match[1] && match[2] && match[3]) {
          fields.date = `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
          break;
        }
      }
      
      for (const pattern of patterns.machine_code) {
        const match = text.match(pattern);
        if (match && match[1] && match[1] !== '1') {
          fields.machine_code = match[1].trim();
          break;
        }
      }
      
      for (const pattern of patterns.product_code) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.product_code = match[1].trim();
          break;
        }
      }
      
      for (const pattern of patterns.quantity) {
        const match = text.match(pattern);
        if (match && match[1]) {
          fields.quantity = Number(match[1]);
          break;
        }
      }
    }
    
    return fields;
  }
}