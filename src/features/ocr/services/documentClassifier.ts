// src/features/ocr/services/documentClassifier.ts
import { DocumentType, DocumentTypeInfo } from '../types/documentTypes';

export class DocumentClassifier {
  private keywords: Record<DocumentType, string[]> = {
    phieu_cap_phat: [
      'phiếu cấp phát', 'cấp phát vật tư', 'vật tư',
      'stt', 'chủng loại', 'số lượng', 'dự án', 'người nhận', 'máy',
      'tổ trưởng', 'chữ ký'
    ],
    bao_cao_gia_cong: [
      'báo cáo gia công', 'báo cáo sản xuất',
      'máy', 'dự án', 'số lượng', 'ngày công', 'gia công',
      'xưởng ck-cnc', 'ck-cnc'
    ],
    nhap_kho: [
      'phiếu nhập kho', 'nhập kho',
      'mã hàng', 'tên hàng', 'số lượng', 'đơn giá', 'thành tiền',
      'nhà cung cấp', 'người nhập'
    ],
    xuat_kho: [
      'phiếu xuất kho', 'xuất kho',
      'mã hàng', 'tên hàng', 'số lượng', 'đơn giá', 'thành tiền',
      'khách hàng', 'người xuất'
    ],
    nhat_ky_qc: [
      'nhật ký qc', 'kiểm tra chất lượng', 'qc',
      'kết quả', 'đạt', 'không đạt', 'thông số'
    ],
    bao_tri: [
      'bảo trì', 'sửa chữa', 'bảo dưỡng',
      'máy', 'thiết bị', 'ngày bảo trì', 'nội dung'
    ],
    unknown: []
  };

  private documentInfo: Record<DocumentType, DocumentTypeInfo> = {
    phieu_cap_phat: {
      label: 'Phiếu cấp phát vật tư',
      icon: '📦',
      color: 'blue',
      fields: ['date', 'shift', 'machine_code', 'product_code', 'product_name', 'quantity', 'unit', 'worker_name', 'worker_code'],
      module: 'warehouse'
    },
    bao_cao_gia_cong: {
      label: 'Báo cáo gia công',
      icon: '🔧',
      color: 'green',
      fields: ['date', 'shift', 'machine_code', 'product_code', 'product_name', 'quantity', 'worker_name', 'notes'],
      module: 'production'
    },
    nhap_kho: {
      label: 'Phiếu nhập kho',
      icon: '📥',
      color: 'indigo',
      fields: ['date', 'product_code', 'product_name', 'quantity', 'unit', 'supplier', 'notes'],
      module: 'warehouse'
    },
    xuat_kho: {
      label: 'Phiếu xuất kho',
      icon: '📤',
      color: 'orange',
      fields: ['date', 'product_code', 'product_name', 'quantity', 'unit', 'customer', 'notes'],
      module: 'warehouse'
    },
    nhat_ky_qc: {
      label: 'Nhật ký QC',
      icon: '✅',
      color: 'purple',
      fields: ['date', 'shift', 'product_code', 'product_name', 'quantity', 'result', 'notes'],
      module: 'quality'
    },
    bao_tri: {
      label: 'Bảo trì',
      icon: '🔩',
      color: 'red',
      fields: ['date', 'machine_code', 'worker_name', 'notes'],
      module: 'maintenance'
    },
    unknown: {
      label: 'Không xác định',
      icon: '❓',
      color: 'gray',
      fields: [],
      module: 'unknown'
    }
  };

  classify(text: string): { type: DocumentType; confidence: number; matchedKeywords: string[] } {
    const lower = text.toLowerCase();
    let bestMatch: DocumentType = 'unknown';
    let bestScore = 0;
    let bestKeywords: string[] = [];

    for (const [type, keywords] of Object.entries(this.keywords)) {
      if (type === 'unknown') continue;
      
      const matched: string[] = [];
      let score = 0;
      
      for (const keyword of keywords) {
        if (lower.includes(keyword)) {
          matched.push(keyword);
          score += keyword.length > 10 ? 2 : 1;
        }
      }
      
      const typeLabel = type.replace('_', ' ');
      if (type !== 'unknown' && lower.includes(`phiếu ${typeLabel}`)) {
        score += 3;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = type as DocumentType;
        bestKeywords = matched;
      }
    }

    const confidence = Math.min(bestScore / 15, 1);

    return {
      type: bestMatch,
      confidence,
      matchedKeywords: bestKeywords
    };
  }

  getDocumentInfo(type: DocumentType): DocumentTypeInfo {
    return this.documentInfo[type] || this.documentInfo.unknown;
  }
}