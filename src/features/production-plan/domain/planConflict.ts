import { format } from 'date-fns';
import type {
  ExtendedPlanEntry,
  MachineDowntime,
  ScheduleConflict,
  CalendarDowntime,
} from './types';

export function getScheduleConflicts(entries: ExtendedPlanEntry[]): ScheduleConflict[] {
  const active = entries.filter(
    (entry) =>
      entry.status !== 'completed' &&
      entry.progress < 100 &&
      entry.machine &&
      entry.startDate &&
      entry.finishDate &&
      entry.startDate <= entry.finishDate
  );
  const conflicts: ScheduleConflict[] = [];
  for (let i = 0; i < active.length; i += 1) {
    const first = active[i];
    for (let j = i + 1; j < active.length; j += 1) {
      const second = active[j];
      if (
        first.machine === second.machine &&
        first.startDate <= second.finishDate &&
        first.finishDate >= second.startDate
      ) {
        conflicts.push({
          key: [first.id, second.id].sort().join(':'),
          first,
          second,
        });
      }
    }
  }
  return conflicts;
}

export function normalizePlanQuantities<T extends ExtendedPlanEntry>(entry: T): T {
  const rawQty = Number(entry.qty);
  const qty = Number.isFinite(rawQty) ? Math.max(0, rawQty) : 0;
  const rawCompleted = Number(entry.qtyCompleted);
  const qtyCompleted =
    entry.status === 'completed'
      ? qty
      : Math.min(qty, Number.isFinite(rawCompleted) ? Math.max(0, rawCompleted) : 0);
  const progress = qty > 0 ? Math.min(100, Math.round((qtyCompleted / qty) * 100)) : 0;
  return {
    ...entry,
    qty,
    qtyCompleted,
    remaining: Number((qty - qtyCompleted).toFixed(2)),
    progress,
  };
}

export function findDowntimeConflict(
  machine: string,
  startDate: string,
  finishDate: string,
  downtime: MachineDowntime[]
): MachineDowntime | undefined {
  return downtime.find(
    (item) =>
      item.machine === machine &&
      startDate <= item.endDate &&
      finishDate >= item.startDate
  );
}

export function isMachineUnavailable(
  machine: string,
  date: string,
  downtime: CalendarDowntime[]
): boolean {
  return downtime.some(
    (item) =>
      item.machine === machine &&
      date >= item.startDate &&
      date <= item.endDate
  );
}

export function getTodayStr(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function isPlanDelayed(
  plan: ExtendedPlanEntry,
  todayStr: string
): boolean {
  if (
    !plan.finishDate ||
    plan.progress >= 100 ||
    plan.status === 'completed' ||
    plan.status === 'hold'
  ) {
    return false;
  }
  return todayStr > plan.finishDate;
}
