import type {
  DashboardSummaryStats,
  DashboardSummaryChartPoint,
  DashboardMachinePerformance,
  DashboardMaterialUsage,
  DashboardAlertItem,
  DashboardJobEntry,
} from '@/types/reports';

export const summaryStats: DashboardSummaryStats = {
  totalInbound: 1348,
  totalOutbound: 1123,
  totalStock: 5876,
  todayTickets: 18,
  activeMachines: 7,
  activeJobs: 11,
  productionProgressPercent: 74,
  lowStockAlerts: 5,
};

export const dailyFlowChart: DashboardSummaryChartPoint[] = [
  { date: '20/05', inbound: 240, outbound: 210 },
  { date: '21/05', inbound: 290, outbound: 190 },
  { date: '22/05', inbound: 260, outbound: 220 },
  { date: '23/05', inbound: 310, outbound: 260 },
  { date: '24/05', inbound: 280, outbound: 230 },
  { date: '25/05', inbound: 340, outbound: 300 },
  { date: '26/05', inbound: 360, outbound: 320 },
];

export const machinePerformanceChart: DashboardMachinePerformance[] = [
  { machine: 'CNC 1', efficiency: 86 },
  { machine: 'CNC 2', efficiency: 82 },
  { machine: 'CNC 3', efficiency: 78 },
  { machine: 'Mài 1', efficiency: 91 },
  { machine: 'Mài 2', efficiency: 88 },
];

export const materialConsumptionChart: DashboardMaterialUsage[] = [
  { material: 'Thép SKD11', quantity: 320, unit: 'kg' },
  { material: 'Nhôm 6061', quantity: 210, unit: 'kg' },
  { material: 'Vật tư cắt', quantity: 180, unit: 'kg' },
  { material: 'Mỡ bôi trơn', quantity: 95, unit: 'L' },
];

export const lowStockAlerts: DashboardAlertItem[] = [
  { itemCode: 'VL-101', itemName: 'Thép SKD11', warehouse: 'Kho CNC', available: 8, threshold: 12 },
  { itemCode: 'VL-204', itemName: 'Nhôm 6061', warehouse: 'Kho Thành phẩm', available: 14, threshold: 20 },
  { itemCode: 'VL-511', itemName: 'Dao cắt', warehouse: 'Kho Vật tư', available: 6, threshold: 10 },
  { itemCode: 'VL-308', itemName: 'Lưỡi cưa', warehouse: 'Kho CNC', available: 4, threshold: 8 },
];

export const activeJobs: DashboardJobEntry[] = [
  { orderNumber: 'HD-2026-012', product: 'Vỏ máy CNC', status: 'Đang gia công', progress: 58, dueDate: '27/05' },
  { orderNumber: 'HD-2026-017', product: 'Bánh răng A', status: 'Chuẩn bị gia công', progress: 22, dueDate: '29/05' },
  { orderNumber: 'HD-2026-021', product: 'Trục chính', status: 'Đang kiểm tra', progress: 82, dueDate: '30/05' },
  { orderNumber: 'HD-2026-025', product: 'Ốc vít', status: 'Gia công hoàn thiện', progress: 96, dueDate: '31/05' },
];
