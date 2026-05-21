export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  filterSettings: Record<string, unknown>;
}

export interface MachinePerformanceReport {
  id: string;
  machine: string;
  period: string;
  runtimeHours: number;
  downtimeHours: number;
  outputCount: number;
  qualityRate: number;
  oee: number;
}

export interface MaterialConsumptionReport {
  id: string;
  materialCode: string;
  materialName: string;
  quantityUsed: number;
  unit: string;
  project: string;
  consumptionDate: string;
  cost: number;
}

export interface DashboardSummaryStats {
  totalInbound: number;
  totalOutbound: number;
  totalStock: number;
  todayTickets: number;
  activeMachines: number;
  activeJobs: number;
  productionProgressPercent: number;
  lowStockAlerts: number;
}

export interface DashboardSummaryChartPoint {
  date: string;
  inbound: number;
  outbound: number;
}

export interface DashboardMachinePerformance {
  machine: string;
  efficiency: number;
}

export interface DashboardMaterialUsage {
  material: string;
  quantity: number;
  unit: string;
}

export interface DashboardAlertItem {
  itemCode: string;
  itemName: string;
  warehouse: string;
  available: number;
  threshold: number;
}

export interface DashboardJobEntry {
  orderNumber: string;
  product: string;
  status: string;
  progress: number;
  dueDate: string;
}

export interface MachinePerformanceEntry {
  id: string;
  machine: string;
  date: string;
  uptime: number;
  downtime: number;
  output: number;
  qualityRate: number;
  note?: string;
}

export interface MaterialConsumptionEntry {
  id: string;
  date: string;
  warehouse: string;
  materialCode: string;
  materialName: string;
  quantity: number;
  unit: string;
  usageType: string;
  note?: string;
}

export interface QaReportEntry {
  id: string;
  inspectionDate: string;
  orderNumber: string;
  inspectionType: string;
  result: 'passed' | 'failed';
  defectCount: number;
  inspector: string;
  notes?: string;
}
