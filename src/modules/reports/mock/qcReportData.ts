import type { QaReportEntry } from '@/types/reports';

export const qcEntries: QaReportEntry[] = [
  {
    id: 'qa-001',
    inspectionDate: '2026-05-20',
    orderNumber: 'HD-2026-001',
    inspectionType: 'Kiểm tra đầu vào',
    result: 'passed',
    defectCount: 0,
    inspector: 'Lê Thị C',
    notes: 'OK',
  },
  {
    id: 'qa-002',
    inspectionDate: '2026-05-20',
    orderNumber: 'HD-2026-002',
    inspectionType: 'Kiểm tra giữa quá trình',
    result: 'failed',
    defectCount: 3,
    inspector: 'Nguyễn Văn D',
    notes: 'Xước bề mặt',
  },
  {
    id: 'qa-003',
    inspectionDate: '2026-05-21',
    orderNumber: 'HD-2026-012',
    inspectionType: 'Kiểm tra hoàn chỉnh',
    result: 'failed',
    defectCount: 1,
    inspector: 'Trần Thị B',
    notes: 'Sai kích thước',
  },
  {
    id: 'qa-004',
    inspectionDate: '2026-05-21',
    orderNumber: 'HD-2026-017',
    inspectionType: 'Kiểm tra giữa quá trình',
    result: 'passed',
    defectCount: 0,
    inspector: 'Lê Thị C',
    notes: '',
  },
];

export const defectCategories = [
  { category: 'Xước bề mặt', count: 5 },
  { category: 'Sai kích thước', count: 3 },
  { category: 'Vết cháy', count: 1 },
];

export const qcDailyTrends = [
  { date: '2026-05-18', total: 8, failed: 1 },
  { date: '2026-05-19', total: 12, failed: 2 },
  { date: '2026-05-20', total: 15, failed: 4 },
  { date: '2026-05-21', total: 10, failed: 2 },
  { date: '2026-05-22', total: 14, failed: 3 },
];
