export interface ProductionPlanEntry {
  id: string;

  jobNo: string;
  project: string;
  machine: string;

  drawingNo: string;
  description: string;

  startDate: string;
  finishDate: string;

  actualStart?: string;
  actualFinish?: string;

  qty: number;
  qtyCompleted: number;
  remaining: number;

  hours: number;
  totalHours: number;

  shift: string;

  days: number;

  progress: number;

  status:
    | 'planned'
    | 'running'
    | 'completed'
    | 'delay';

  note?: string;
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