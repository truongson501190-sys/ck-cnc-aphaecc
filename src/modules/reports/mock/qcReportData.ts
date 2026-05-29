import type { QaReportEntry } from '@/types/reports';

export const qcEntries: QaReportEntry[] = [
  { id: 'qc-001', inspectionDate: '2026-05-18', orderNumber: 'DH-1001', inspectionType: 'Kiểm tra đầu vào', result: 'passed', defectCount: 0, inspector: 'Nguyễn Văn A' },
  { id: 'qc-002', inspectionDate: '2026-05-18', orderNumber: 'DH-1002', inspectionType: 'Kiểm tra giữa quá trình', result: 'failed', defectCount: 2, inspector: 'Trần Thị B', notes: 'Lỗi kích thước' },
  { id: 'qc-003', inspectionDate: '2026-05-19', orderNumber: 'DH-1003', inspectionType: 'Kiểm tra cuối', result: 'passed', defectCount: 0, inspector: 'Lê Văn C' },
  { id: 'qc-004', inspectionDate: '2026-05-20', orderNumber: 'DH-1004', inspectionType: 'Kiểm tra đầu vào', result: 'passed', defectCount: 0, inspector: 'Nguyễn Văn A' },
  { id: 'qc-005', inspectionDate: '2026-05-21', orderNumber: 'DH-1005', inspectionType: 'Kiểm tra giữa quá trình', result: 'passed', defectCount: 0, inspector: 'Trần Thị B' },
  { id: 'qc-006', inspectionDate: '2026-05-22', orderNumber: 'DH-1006', inspectionType: 'Kiểm tra cuối', result: 'failed', defectCount: 1, inspector: 'Lê Văn C', notes: 'Lỗi bề mặt' },
];

export const defectCategories = [
  { category: 'Lỗi kích thước', count: 5 },
  { category: 'Lỗi bề mặt', count: 3 },
  { category: 'Lỗi vật liệu', count: 2 },
  { category: 'Lỗi lắp ráp', count: 1 },
];
