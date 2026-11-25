import type { ProductionPlanEntry } from '@/types/manufacturing';

export interface CalendarDowntime {
  machine: string;
  startDate: string;
  endDate: string;
  note?: string;
}

export type ExtendedPlanEntry = Omit<ProductionPlanEntry, 'status'> & {
  status: ProductionPlanEntry['status'] | 'hold';
};

export interface MachineDowntime extends CalendarDowntime {
  id: string;
  note: string;
}

export interface ScheduleConflict {
  key: string;
  first: ExtendedPlanEntry;
  second: ExtendedPlanEntry;
}
