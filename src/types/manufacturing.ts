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

  hours: number;
  days: number;

  progress: number;

  status:
    | 'planned'
    | 'running'
    | 'completed'
    | 'delay';

  note?: string;
}