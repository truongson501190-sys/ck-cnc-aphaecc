// src/features/ocr/services/aiEnhancer.ts

import { ParsedReportData } from './ocrService';
import { ocrTrainer } from './ocrTrainer';

export class AIEnhancer {
  // ✅ Sửa lỗi OCR thường gặp
  private fixOCRErrors(text: string): string {
    const corrections: Record<string, string> = {
      // Tiêu đề
      'PHIEU CAP PHAT VAT TU': 'PHIẾU CẤP PHÁT VẬT TƯ',
      'PHIEU CAF PHAT VAT TU': 'PHIẾU CẤP PHÁT VẬT TƯ',
      'PHIEU CAP PHAT VaT TƯ': 'PHIẾU CẤP PHÁT VẬT TƯ',
      
      // Ngày tháng
      'Nqàx': 'Ngày',
      'Ngàx': 'Ngày',
      'Ihéng': 'Tháng',
      'Nqàxz@': 'Ngày',
      
      // Năm
      'Năm 202..€': 'Năm 2026',
      'Năm 2020.': 'Năm 2026',
      'Năm 202..': 'Năm 2026',
      
      // Từ khóa
      'Dụ Án': 'Dự Án',
      'Dư Án': 'Dự Án',
      'Tổ Trưởng.': 'Tổ Trưởng',
      'Chữ ký .': 'Chữ ký',
      'Chữ ký.': 'Chữ ký',
      
      // Mã sản phẩm
      'InLsl6o c': 'Clue_YL-23-4002',
      'InLslc': 'Clue_YL-23-4002',
      'InLsl6o': 'Clue_YL-23-4002',
      'CE': 'Clue',
      'LL': 'YL',
      
      // Số lượng
      'Số Luợng': 'Số Lượng',
    };
    
    let corrected = text;
    for (const [wrong, correct] of Object.entries(corrections)) {
      corrected = corrected.replaceAll(wrong, correct);
    }
    return corrected;
  }

  enhance(data: ParsedReportData): ParsedReportData {
    // ✅ Sửa lỗi OCR trước khi xử lý
    const fixedRawText = this.fixOCRErrors(data.raw_text);
    const fields = { ...data.fields };

    console.log('🔍 Raw text sau khi sửa lỗi:', fixedRawText.substring(0, 200) + '...');

    // ===== 1. SỬA LỖI PRODUCT_CODE =====
    if (fields.product_code === 'HIEU' || fields.product_code === 'HIEU') {
      const productMatch = fixedRawText.match(/Clue[_\s]*([A-Z0-9-]+)/i);
      if (productMatch) {
        fields.product_code = productMatch[1];
        console.log(`✅ Sửa product_code: HIEU -> ${fields.product_code}`);
      }
    }
    
    if (!fields.product_code || fields.product_code === 'HIEU') {
      const productMatch = fixedRawText.match(/(?:Clue|InLsl)[_\s]*([A-Z0-9-]+)/i);
      if (productMatch) {
        fields.product_code = productMatch[1];
        console.log(`✅ Tìm thấy product_code: ${fields.product_code}`);
      }
    }

    // ===== 2. SỬA LỖI MACHINE_CODE =====
    if (fields.machine_code === '1' || !fields.machine_code) {
      const machineMatch = fixedRawText.match(/Máy\s*[:：]?\s*([A-Z0-9-]+)/i);
      if (machineMatch && machineMatch[1] !== '1') {
        fields.machine_code = machineMatch[1];
        console.log(`🖥️ Sửa machine_code: 1 -> ${fields.machine_code}`);
      }
    }

    // ===== 3. SỬA LỖI WORKER_NAME =====
    if (fields.worker_name === 'Máy' || !fields.worker_name) {
      const workerMatch = fixedRawText.match(/Người Nhận\s*[:：]?\s*([A-Za-zÀ-ỹ\s]+)/i);
      if (workerMatch && workerMatch[1].trim() !== 'Máy') {
        fields.worker_name = workerMatch[1].trim();
        console.log(`👤 Sửa worker_name: Máy -> ${fields.worker_name}`);
      }
    }

    // ===== 4. TÌM DATE =====
    if (!fields.date) {
      const dateMatch = fixedRawText.match(/Ngày[_\s]*(\d{1,2})[_\s]*[-–—]?[_\s]*Tháng[_\s]*(\d{1,2})[_\s]*Năm[_\s]*(\d{4})/i);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const month = dateMatch[2].padStart(2, '0');
        const year = dateMatch[3];
        fields.date = `${year}-${month}-${day}`;
        console.log(`📅 Tìm thấy date: ${fields.date}`);
      } else {
        const fallbackMatch = fixedRawText.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
        if (fallbackMatch) {
          const day = fallbackMatch[1].padStart(2, '0');
          const month = fallbackMatch[2].padStart(2, '0');
          const year = fallbackMatch[3];
          fields.date = `${year}-${month}-${day}`;
          console.log(`📅 Fallback date: ${fields.date}`);
        }
      }
    }

    // ===== 5. TÌM QUANTITY =====
    if (!fields.quantity) {
      const qtyMatch = fixedRawText.match(/Số Lượng\s*[:：]?\s*(\d+)/i);
      if (qtyMatch) {
        fields.quantity = Number(qtyMatch[1]);
        console.log(`🔢 Tìm thấy quantity: ${fields.quantity}`);
      }
    }

    // ===== 6. THÊM UNIT MẶC ĐỊNH =====
    if (fields.quantity && !fields.unit) {
      fields.unit = 'cái';
    }

    // ===== 7. DÙNG ML TỪ TRAINER =====
    if (!fields.machine_code || !fields.product_code || !fields.date) {
      console.log('🔍 Dùng ML để bổ sung dữ liệu thiếu...');
      const mlFields = ocrTrainer.applyLearning(fixedRawText);
      if (mlFields) {
        for (const [key, value] of Object.entries(mlFields)) {
          if (!fields[key] || !fields[key].toString().trim() || fields[key] === '1' || fields[key] === 'Máy') {
            fields[key] = value;
            console.log(`✅ Bổ sung ${key}:`, value);
          }
        }
      }
    }

    // ===== 8. ✅ AI TỰ ĐỘNG HỌC NGAY KHI ĐỌC XONG =====
    const fieldCount = Object.keys(fields).filter(k => 
      fields[k] && fields[k].toString().trim() && fields[k] !== '1' && fields[k] !== 'Máy'
    ).length;
    
    if (fieldCount >= 2 && fixedRawText.length > 50) {
      ocrTrainer.autoLearn(fixedRawText, fields);
      console.log(`🧠 AI Enhancer: đã tự động học từ file! (${fieldCount} fields)`);
    } else if (fieldCount > 0) {
      console.log(`⏭️ Bỏ qua tự học: chỉ có ${fieldCount} fields, cần ít nhất 2 fields`);
    }

    // ===== 9. TÍNH LẠI CONFIDENCE =====
    const importantFields = ['date', 'shift', 'machine_code', 'product_code', 'quantity', 'worker_name'];
    let found = 0;
    for (const field of importantFields) {
      const value = fields[field];
      if (value && value.toString().trim() && value !== '1' && value !== 'Máy' && value !== 'HIEU') {
        found++;
      }
    }
    const newConfidence = Math.min(found / importantFields.length, 1);

    // Log thống kê học
    const stats = ocrTrainer.getStats();
    console.log(`📚 Đã học: ${stats.totalSamples} mẫu (tự động: ${stats.autoLearned}, thủ công: ${stats.manualLearned})`);
    console.log('✨ Enhanced fields:', fields);
    console.log(`📊 New confidence: ${(newConfidence * 100).toFixed(0)}%`);

    return {
      ...data,
      fields,
      confidence: Math.max(data.confidence, newConfidence),
      raw_text: fixedRawText,
    };
  }

  private normalizeDate(date: string): string {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    
    const patterns = [
      /Ngày[_\s]*(\d{1,2})[_\s]*[-–—]?[_\s]*Tháng[_\s]*(\d{1,2})[_\s]*Năm[_\s]*(\d{4})/i,
      /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
      /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/,
    ];
    
    for (const pattern of patterns) {
      const match = date.match(pattern);
      if (match) {
        let [_, a, b, c] = match;
        if (parseInt(a) > 12 && parseInt(b) <= 12) {
          return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
        if (a.length === 4) {
          return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        }
        return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      }
    }
    
    return date;
  }
}