export interface ProductionPlanEntry {
  id: string;
  project: string;
  productCode: string;
  productName: string;
  quantityPlanned: number;
  startDate: string;
  endDate: string;
  status: 'planned' | 'in_progress' | 'completed' | 'stopped';
  owner: string;
  notes?: string;
}

export interface ProgressUpdateEntry {
  id: string;
  orderNumber: string;
  productCode: string;
  productName: string;
  machine: string;
  operator: string;
  progressPercent: number;
  status: 'on_track' | 'delayed' | 'completed';
  updatedAt: string;
  comment?: string;
}
