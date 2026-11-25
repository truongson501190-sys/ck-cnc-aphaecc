import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfMonth,
} from 'date-fns';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { ProductionPlanEntry } from '@/types/manufacturing';

import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  Cpu,
  Download,
  Edit3,
  Link2,
  LayoutList,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  buildLocalId,
  hasStorageKey,
  loadArrayFromStorage,
  saveArrayToStorage,
} from '@/lib/localStorage';
import { usePermission } from '@/hooks/usePermission';
import type {
  CalendarDowntime,
  ExtendedPlanEntry,
  MachineDowntime,
} from '@/features/production-plan/domain/types';
import {
  findDowntimeConflict,
  getScheduleConflicts,
  getTodayStr,
  isMachineUnavailable,
  isPlanDelayed,
  normalizePlanQuantities,
} from '@/features/production-plan/domain/planConflict';
import { parseExcelDate, parseExcelNumber } from '@/features/production-plan/utils/excelParser';
import {
  CATEGORY_LABELS as FEATURE_CATEGORY_LABELS,
  MACHINE_CATALOG as FEATURE_MACHINE_CATALOG,
  SHIFT_OPTIONS as FEATURE_SHIFT_OPTIONS,
  SHIFT_TO_RULE as FEATURE_SHIFT_TO_RULE,
  getEffectiveHoursPerDay as featureGetEffectiveHoursPerDay,
  getMachineCategory as featureGetMachineCategory,
  normalizeMachineName as featureNormalizeMachineName,
  normalizeShiftValue as featureNormalizeShiftValue,
} from '@/features/production-plan/domain/machineCatalog';

const STORAGE_KEY = 'productionPlanEntries';
const DOWNTIME_STORAGE_KEY = 'productionMachineDowntime';

// ============================================================================
// A. CALENDAR / CAPACITY MODULE (hợp nhất từ file mới)
// ============================================================================

export type ShiftKey = 'shift1' | 'shift2';

export interface ShiftWorkRule {
  enabled: boolean;
  regularHours: number;
  overtimeHours: number;
}

export interface MachineWeekdayRule {
  enabled: boolean;
  shifts: Record<ShiftKey, ShiftWorkRule>;
}

export interface MachineWeeklyCalendar {
  machine: string;
  weekdays: Record<number, MachineWeekdayRule>; // 0=CN .. 6=T7
  updatedAt: string;
}

export interface MachineCalendarDateOverride {
  date: string;
  machine: string; // '*' = toàn bộ máy
  enabled: boolean;
  note?: string;
  shifts?: Partial<Record<ShiftKey, Partial<ShiftWorkRule>>>;
}

export interface DailyShiftCapacity {
  shift: ShiftKey;
  enabled: boolean;
  regularHours: number;
  overtimeHours: number;
  productionHours: number;
}

export interface DailyMachineCapacity {
  date: string;
  shifts: DailyShiftCapacity[];
  totalHours: number;
  isDowntime: boolean;
  note?: string;
}

const DEFAULT_SHIFT: ShiftWorkRule = {
  enabled: true,
  regularHours: 8,
  overtimeHours: 0,
};

function clampNonNegative(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * Giờ sản xuất hiệu dụng của một ca.
 * - 0.5h chuẩn bị đầu ca + báo cáo cuối ca.
 * - Ca ≥ 10h có thêm 0.5h nghỉ trưa.
 * - Có OT thì thêm 0.5h ăn cơm.
 * Kết quả khớp với SHIFT_OPTIONS: 8→7.5, 10→9, 12→11; ×2 ca: 15/18/22.
 */
export function getShiftProductionHours(rule: ShiftWorkRule): number {
  const regular = clampNonNegative(rule.regularHours);
  const overtime = clampNonNegative(rule.overtimeHours);
  if (regular + overtime <= 0) return 0;

  const regularBreak = regular > 8 ? 1.0 : 0.5;
  const overtimeMealBreak = overtime > 0 ? 0.5 : 0;
  return Math.max(0, regular + overtime - regularBreak - overtimeMealBreak);
}

function mergeShiftRule(base: ShiftWorkRule, patch?: Partial<ShiftWorkRule>): ShiftWorkRule {
  return {
    enabled: patch?.enabled ?? base.enabled,
    regularHours: clampNonNegative(patch?.regularHours, base.regularHours),
    overtimeHours: clampNonNegative(patch?.overtimeHours, base.overtimeHours),
  };
}

export function createDefaultMachineCalendar(machine: string): MachineWeeklyCalendar {
  const weekdays = {} as Record<number, MachineWeekdayRule>;
  for (let d = 0; d < 7; d++) {
    weekdays[d] = {
      enabled: d !== 0,
      shifts: {
        shift1: { ...DEFAULT_SHIFT },
        shift2: { ...DEFAULT_SHIFT },
      },
    };
  }
  return { machine, weekdays, updatedAt: new Date().toISOString() };
}

export function getMachineDayCapacity(args: {
  machine: string;
  date: string;
  calendar?: MachineWeeklyCalendar;
  overrides?: MachineCalendarDateOverride[];
  downtime?: CalendarDowntime[];
}): DailyMachineCapacity {
  const { machine, date, calendar, overrides = [], downtime = [] } = args;

  const isDowntime = downtime.some(
    (item) => item.machine === machine && date >= item.startDate && date <= item.endDate
  );
  if (isDowntime) {
    return {
      date,
      shifts: [],
      totalHours: 0,
      isDowntime: true,
      note: 'Máy đang bảo trì/ngừng máy',
    };
  }

  const parsed = parseISO(date);
  if (!isValid(parsed)) {
    return { date, shifts: [], totalHours: 0, isDowntime: false, note: 'Ngày không hợp lệ' };
  }
  const weekday = parsed.getDay();
  const weeklyRule =
    calendar?.weekdays?.[weekday] ?? createDefaultMachineCalendar(machine).weekdays[weekday];

  const override = overrides.find(
    (item) => item.date === date && (item.machine === machine || item.machine === '*')
  );

  if (override && !override.enabled) {
    return {
      date,
      shifts: [],
      totalHours: 0,
      isDowntime: false,
      note: override.note || 'Ngày nghỉ',
    };
  }

  const shifts: DailyShiftCapacity[] = (['shift1', 'shift2'] as ShiftKey[]).map((key) => {
    const base = weeklyRule.shifts[key] ?? DEFAULT_SHIFT;
    const merged = mergeShiftRule(base, override?.shifts?.[key]);
    const enabled =
      Boolean(weeklyRule.enabled && merged.enabled) ||
      Boolean(override?.shifts?.[key]?.enabled);
    return {
      shift: key,
      enabled,
      regularHours: merged.regularHours,
      overtimeHours: merged.overtimeHours,
      productionHours: enabled ? getShiftProductionHours(merged) : 0,
    };
  });

  return {
    date,
    shifts,
    totalHours: shifts.reduce((sum, s) => sum + s.productionHours, 0),
    isDowntime: false,
    note: override?.note,
  };
}

export function getMachineCapacityInRange(args: {
  machine: string;
  startDate: string;
  endDate: string;
  calendar?: MachineWeeklyCalendar;
  overrides?: MachineCalendarDateOverride[];
  downtime?: CalendarDowntime[];
}): number {
  const { machine, startDate, endDate, calendar, overrides, downtime } = args;
  if (!startDate || !endDate || startDate > endDate) return 0;

  let total = 0;
  const cursor = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(cursor) || !isValid(end)) return 0;

  while (cursor <= end) {
    const date = format(cursor, 'yyyy-MM-dd');
    total += getMachineDayCapacity({ machine, date, calendar, overrides, downtime }).totalHours;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Number(total.toFixed(2));
}

export function calculateFinishByMachineCalendar(args: {
  machine: string;
  startDate: string;
  requiredHours: number;
  calendar?: MachineWeeklyCalendar;
  overrides?: MachineCalendarDateOverride[];
  downtime?: CalendarDowntime[];
  maxDays?: number;
}): { finishDate: string; daysUsed: number; remainingHours: number } {
  const { machine, startDate, calendar, overrides, downtime, maxDays = 3660 } = args;
  let remainingHours = clampNonNegative(args.requiredHours);

  if (!startDate || remainingHours <= 0) {
    return { finishDate: startDate, daysUsed: 0, remainingHours };
  }

  const cursor = parseISO(startDate);
  if (!isValid(cursor)) {
    return { finishDate: '', daysUsed: 0, remainingHours };
  }

  let daysUsed = 0;
  let lastDate = startDate;

  for (let index = 0; index < maxDays; index += 1) {
    const date = format(cursor, 'yyyy-MM-dd');
    const daily = getMachineDayCapacity({ machine, date, calendar, overrides, downtime });

    if (daily.totalHours > 0) {
      daysUsed += 1;
      lastDate = date;
      for (const shift of daily.shifts) {
        if (!shift.enabled || shift.productionHours <= 0) continue;
        remainingHours -= Math.min(remainingHours, shift.productionHours);
        if (remainingHours <= 0.000001) {
          return { finishDate: date, daysUsed, remainingHours: 0 };
        }
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  // Không đủ quỹ giờ trong maxDays — trả về ngày cuối cùng đã xét.
  return { finishDate: lastDate, daysUsed, remainingHours };
}

// ============================================================================
// B. MASTER DATA: 34 MÁY + 6 CHẾ ĐỘ CA
// ============================================================================

export type MachineCategory = 'large' | 'small' | 'portable';

export interface MachineMasterItem {
  name: string;
  category: MachineCategory;
  aliases?: string[];
}

export const MACHINE_CATALOG: MachineMasterItem[] = [
  { name: 'Máy CNC FB160HC', category: 'large', aliases: ['BF160HC', 'FB160HC'] },
  { name: 'Máy CNC TOS VARNSDORF', category: 'large', aliases: ['TOS VARNSDORF', 'TOS'] },
  { name: 'Máy MITSUBISHI M-VB24/13', category: 'large', aliases: ['M-VB24/13', 'MITSUBISHI'] },
  { name: 'Máy Phay CNC LP5020', category: 'large', aliases: ['LP5020'] },
  { name: 'Máy Phay CNC SP2016', category: 'large', aliases: ['SP2016'] },
  { name: 'Máy Phay CNC Hision GNU', category: 'large', aliases: ['Hision GNU', 'GNU'] },
  { name: 'Máy doa Phay Union', category: 'large', aliases: ['Union'] },
  { name: 'Máy doa SHIBAURA B2', category: 'large', aliases: ['Shibaura B2', 'B2'] },
  { name: 'Máy tiện SHIBAURA TSS - 30/55A', category: 'large', aliases: ['SHIBAURA TSS', 'TSS-30/55A'] },
  { name: 'Máy tiện O-M-LTD', category: 'large', aliases: ['O-M-LTD', 'OM'] },
  { name: 'Máy tiện KOTOBUKI', category: 'large', aliases: ['KOTOBUKI'] },
  { name: 'Máy Tiện DAINICHI', category: 'large', aliases: ['DAINICHI'] },
  { name: 'Máy tiện Hankook', category: 'large', aliases: ['Hankook'] },
  { name: 'Máy bào UCHIDA', category: 'large', aliases: ['UCHIDA'] },
  { name: 'Máy khoan OGAWA', category: 'large', aliases: ['OGAWA'] },
  { name: 'Máy doa MODEL 2K636', category: 'large', aliases: ['2K636', 'MODEL 2K636'] },
  { name: 'Máy Phay Hision VMC1300II', category: 'small', aliases: ['Máy Phay Hisian VMC1300II', 'VMC1300II'] },
  { name: 'Máy Phay Hision VMC1200II', category: 'small', aliases: ['Máy Phay Hisian VMC1200II', 'VMC1200II'] },
  { name: 'Máy Phay CNC Hision VMC1000II/P', category: 'small', aliases: ['VMC1000II/P'] },
  { name: 'Máy Phay CNC Hision VMC1000II', category: 'small', aliases: ['VMC1000II'] },
  { name: 'MÁY PHAY DOOSAN', category: 'small', aliases: ['DOOSAN'] },
  { name: 'MÁY PHAY HITACHI SEIKI', category: 'small', aliases: ['HITACHI SEIKI', 'HITACHI'] },
  { name: 'MÁY PHAY OKK', category: 'small', aliases: ['OKK'] },
  { name: 'MÁY TIỆN DOOSAN LYNX 300', category: 'small', aliases: ['LYNX 300'] },
  { name: 'Máy tiện CNC HISION TC25', category: 'small', aliases: ['TC25', 'HISION TC25'] },
  { name: 'Máy tiện Okuma', category: 'small', aliases: ['Okuma'] },
  { name: 'Máy tiện LLA', category: 'small', aliases: ['LLA'] },
  { name: 'Máy Tiện Tuda', category: 'small', aliases: ['Tuda'] },
  { name: 'Máy cắt dây DATE', category: 'small', aliases: ['DATE'] },
  { name: 'Máy doa di động', category: 'portable' },
  { name: 'Portable Machine tool CLIMAX', category: 'portable', aliases: ['CLIMAX'] },
  { name: 'ID Mounted Electric portable Flange facing machine FLS-610', category: 'portable', aliases: ['FLS-610'] },
  { name: 'ID Mounted Electric Flange facing machine', category: 'portable' },
  { name: 'Manual Flange facing machine MFC-350', category: 'portable', aliases: ['MFC-350'] },
];

export interface ShiftOption {
  value: string;
  shortLabel: string;
  label: string;
  effectiveHours: number;
}

export const SHIFT_OPTIONS: ShiftOption[] = [
  { value: '8h/1shift', shortLabel: '8h/1ca (7.5h)', label: '8h/ 1shift (7.5h/ngày)', effectiveHours: 7.5 },
  { value: '8h/2shift', shortLabel: '8h/2ca (15h)', label: '8h/ 2shift (15h/ngày)', effectiveHours: 15 },
  { value: '10h/1shift', shortLabel: '10h/1ca (9h)', label: '10h/ 1shift (9h/ngày)', effectiveHours: 9 },
  { value: '10h/2shift', shortLabel: '10h/2ca (18h)', label: '10h/ 2shift (18h/ngày)', effectiveHours: 18 },
  { value: '12h/1shift', shortLabel: '12h/1ca (11h)', label: '12h/ 1shift (11h/ngày)', effectiveHours: 11 },
  { value: '12h/2shift', shortLabel: '12h/2ca (22h)', label: '12h/ 2shift (22h/ngày)', effectiveHours: 22 },
];

interface ShiftRuleShape {
  regularHours: number;
  shiftsPerDay: 1 | 2;
}

const SHIFT_TO_RULE: Record<string, ShiftRuleShape> = {
  '8h/1shift': { regularHours: 8, shiftsPerDay: 1 },
  '8h/2shift': { regularHours: 8, shiftsPerDay: 2 },
  '10h/1shift': { regularHours: 10, shiftsPerDay: 1 },
  '10h/2shift': { regularHours: 10, shiftsPerDay: 2 },
  '12h/1shift': { regularHours: 12, shiftsPerDay: 1 },
  '12h/2shift': { regularHours: 12, shiftsPerDay: 2 },
};

const CATEGORY_LABELS: Record<MachineCategory, string> = {
  large: 'Máy Lớn',
  small: 'Máy Nhỏ',
  portable: 'Máy Di Động',
};

// ============================================================================
// C. HELPERS
// ============================================================================

/** Calendar tổng hợp từ shift của job — bridge giữa UI (6 ca) và model calendar. */
function buildShiftCalendar(
  machine: string,
  shiftValue: string,
  skipSunday: boolean
): MachineWeeklyCalendar {
  const rule =
    FEATURE_SHIFT_TO_RULE[featureNormalizeShiftValue(shiftValue)] ??
    FEATURE_SHIFT_TO_RULE['10h/2shift'];
  const weekdays = {} as Record<number, MachineWeekdayRule>;
  for (let d = 0; d < 7; d++) {
    const isSunday = d === 0;
    weekdays[d] = {
      enabled: !(skipSunday && isSunday),
      shifts: {
        shift1: { enabled: true, regularHours: rule.regularHours, overtimeHours: 0 },
        shift2: {
          enabled: rule.shiftsPerDay === 2,
          regularHours: rule.regularHours,
          overtimeHours: 0,
        },
      },
    };
  }
  return { machine, weekdays, updatedAt: new Date().toISOString() };
}

const shiftCalendarCache = new Map<string, MachineWeeklyCalendar>();

function getShiftCalendarCached(
  machine: string,
  shiftValue: string,
  skipSunday: boolean
): MachineWeeklyCalendar {
  const normalizedShift = featureNormalizeShiftValue(shiftValue);
  const key = `${machine}|${normalizedShift}|${skipSunday}`;
  let calendar = shiftCalendarCache.get(key);
  if (!calendar) {
    calendar = buildShiftCalendar(machine, normalizedShift, skipSunday);
    shiftCalendarCache.set(key, calendar);
  }
  return calendar;
}

function findFirstAvailableOnOrAfter(
  dateStr: string,
  machine: string,
  shiftValue: string,
  skipSunday: boolean,
  downtime: CalendarDowntime[]
): string {
  if (!dateStr) return dateStr;
  const cursor = parseISO(dateStr);
  if (!isValid(cursor)) return dateStr;
  const calendar = getShiftCalendarCached(machine, shiftValue, skipSunday);
  for (let i = 0; i < 366; i++) {
    const d = format(cursor, 'yyyy-MM-dd');
    if (getMachineDayCapacity({ machine, date: d, calendar, downtime }).totalHours > 0) {
      return d;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dateStr;
}

function findFirstAvailableAfter(
  dateStr: string,
  machine: string,
  shiftValue: string,
  skipSunday: boolean,
  downtime: CalendarDowntime[]
): string {
  const parsed = parseISO(dateStr);
  if (!isValid(parsed)) return dateStr;
  const next = addDays(parsed, 1);
  return findFirstAvailableOnOrAfter(
    format(next, 'yyyy-MM-dd'),
    machine,
    shiftValue,
    skipSunday,
    downtime
  );
}

function calculateFinishDateForPlan(args: {
  startDate: string;
  requiredHours: number;
  machine: string;
  shiftValue: string;
  skipSunday: boolean;
  downtime: CalendarDowntime[];
}): { finishDate: string; daysUsed: number } {
  const { startDate, requiredHours, machine, shiftValue, skipSunday, downtime } = args;
  if (!startDate || requiredHours <= 0) return { finishDate: '', daysUsed: 0 };
  const calendar = getShiftCalendarCached(machine, shiftValue, skipSunday);
  const r = calculateFinishByMachineCalendar({
    machine,
    startDate,
    requiredHours,
    calendar,
    downtime,
  });
  return { finishDate: r.finishDate, daysUsed: r.daysUsed };
}

/**
 * WORKAROUND tam thoi: chon ca pho bien nhat cua cac job dang mo tren may
 * de suy ra quy gio/ngay. Day KHONG phai cau hinh that cua may.
 * TODO: thay bang MachineShiftConfig khi co UI cau hinh ca theo may.
 */
function getDominantShift(jobs: ExtendedPlanEntry[]): string {
  const counts: Record<string, number> = {};
  jobs
    .filter((j) => j.status !== 'completed' && j.progress < 100)
    .forEach((j) => {
      const s = featureNormalizeShiftValue(j.shift);
      counts[s] = (counts[s] || 0) + 1;
    });
  const entries = Object.entries(counts);
  if (entries.length === 0) return '10h/2shift';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

// ============================================================================
// D. TYPES NỘI BỘ
// ============================================================================

const defaultPlans: ExtendedPlanEntry[] = [
  {
    id: '1',
    jobNo: 'AL-5540',
    project: 'Seaconics-P.CNC',
    machine: 'Máy CNC FB160HC',
    drawingNo: '2209899',
    description: 'Machine House-N2',
    startDate: '2026-11-02',
    finishDate: '2026-11-06',
    actualStart: '2026-11-02',
    actualFinish: '2026-11-06',
    qty: 1,
    qtyCompleted: 1,
    remaining: 0,
    hours: 80,
    totalHours: 80,
    shift: '10h/2shift',
    days: 4.4,
    progress: 100,
    status: 'completed',
    note: '',
  },
  {
    id: '2',
    jobNo: 'AL-5541',
    project: 'Seaconics-P.CNC',
    machine: 'Máy CNC FB160HC',
    drawingNo: '2219461',
    description: 'Kingpost Lower Part',
    startDate: '2026-11-18',
    finishDate: '2026-11-28',
    actualStart: '2026-11-19',
    actualFinish: '',
    qty: 1,
    qtyCompleted: 0.6,
    remaining: 0.4,
    hours: 160,
    totalHours: 160,
    shift: '10h/2shift',
    days: 8.9,
    progress: 60,
    status: 'running',
    note: '',
  },
  {
    id: '3',
    jobNo: 'AL-5548',
    project: 'Seaconics-P.KTDA',
    machine: 'Máy doa SHIBAURA B2',
    drawingNo: '219587',
    description: 'Inner Boom - Primary Structure',
    startDate: '2026-11-12',
    finishDate: '2026-11-16',
    actualStart: '2026-11-12',
    actualFinish: '',
    qty: 1,
    qtyCompleted: 0.8,
    remaining: 0.2,
    hours: 54,
    totalHours: 54,
    shift: '10h/2shift',
    days: 3.0,
    progress: 80,
    status: 'running',
    note: 'Chờ QC kiểm tra lỗ doa',
  },
];

const emptyFormState: Omit<ExtendedPlanEntry, 'id'> = {
  jobNo: '',
  project: '',
  machine: '',
  drawingNo: '',
  description: '',
  startDate: '',
  finishDate: '',
  actualStart: '',
  actualFinish: '',
  qty: 1,
  qtyCompleted: 0,
  remaining: 1,
  hours: 0,
  totalHours: 0,
  shift: '10h/2shift',
  days: 0,
  progress: 0,
  status: 'planned',
  note: '',
};

// ============================================================================
// E. COMPONENT
// ============================================================================

function InlineNumberInput({
  value,
  onChange,
  disabled,
  className,
  min,
  max,
  step = 'any',
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
}) {
  const [local, setLocal] = useState(String(value));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal(String(value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setLocal(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const numberValue = Number(next);
      if (Number.isFinite(numberValue) && numberValue !== value) {
        onChange(numberValue);
      }
    }, 400);
  };

  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      value={local}
      onChange={(event) => handleChange(event.target.value)}
      className={className}
    />
  );
}

export function ProductionPlan() {
  const navigate = useNavigate();
  const { canEdit } = usePermission();
  const canEditOrDelete = canEdit('ke_hoach_san_xuat');

  const [plans, setPlans] = useState<ExtendedPlanEntry[]>([]);
  const [machineDowntime, setMachineDowntime] = useState<MachineDowntime[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ExtendedPlanEntry | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDowntimeDialogOpen, setIsDowntimeDialogOpen] = useState(false);
  const [downtimeMachine, setDowntimeMachine] = useState('');
  const [downtimeStartDate, setDowntimeStartDate] = useState('');
  const [downtimeEndDate, setDowntimeEndDate] = useState('');
  const [downtimeNote, setDowntimeNote] = useState('');

  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  const [viewMode, setViewMode] = useState<'table' | 'machine'>('table');

  const [activeCategoryTab, setActiveCategoryTab] = useState<'all' | MachineCategory>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [machineFilter, setMachineFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(new Set());

  const [viewMonth, setViewMonth] = useState<string>(() => format(new Date(), 'yyyy-MM'));
  const [monthSpan, setMonthSpan] = useState<1 | 2>(2);
  const [skipSunday, setSkipSunday] = useState<boolean>(true);

  const [formData, setFormData] = useState<Omit<ExtendedPlanEntry, 'id'>>(emptyFormState);

  const todayStr = useMemo(() => getTodayStr(), []);

  // Load & persist
  useEffect(() => {
    const hasSavedPlans = hasStorageKey(STORAGE_KEY);
    const saved = loadArrayFromStorage<ExtendedPlanEntry>(STORAGE_KEY);
    const source = hasSavedPlans ? saved : defaultPlans;
    const normalized = source.map((item) => ({
      ...normalizePlanQuantities(item),
      machine: featureNormalizeMachineName(item.machine),
      shift: featureNormalizeShiftValue(item.shift || ''),
    }));
    if (!hasSavedPlans) saveArrayToStorage(STORAGE_KEY, normalized);
    setPlans(normalized);

    const savedDowntime = loadArrayFromStorage<MachineDowntime>(DOWNTIME_STORAGE_KEY);
    setMachineDowntime(savedDowntime);

    // Fix: viewMonth mặc định lấy theo job sớm nhất
    if (!hasSavedPlans && normalized.length > 0) {
      const earliest = [...normalized]
        .map((p) => p.startDate)
        .filter(Boolean)
        .sort()[0];
      if (earliest) setViewMonth(earliest.slice(0, 7));
    }
  }, []);

  const savePlans = (next: ExtendedPlanEntry[]): boolean => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền chỉnh sửa kế hoạch sản xuất');
      return false;
    }
    const normalizedNext = next.map((entry) => normalizePlanQuantities(entry));
    for (const entry of normalizedNext) {
      const previous = plans.find((plan) => plan.id === entry.id);
      const scheduleChanged =
        !previous ||
        previous.machine !== entry.machine ||
        previous.startDate !== entry.startDate ||
        previous.finishDate !== entry.finishDate;
      if (
        scheduleChanged &&
        entry.status !== 'completed' &&
        entry.progress < 100 &&
        entry.startDate &&
        entry.finishDate
      ) {
        const conflict = findDowntimeConflict(
          entry.machine,
          entry.startDate,
          entry.finishDate,
          machineDowntime
        );
        if (conflict) {
          toast.error(
            `Không thể xếp Job ${entry.jobNo}: máy ${entry.machine} ngừng từ ` +
              `${conflict.startDate} đến ${conflict.endDate}`
          );
          return false;
        }
      }
    }
    const previousConflicts = new Set(getScheduleConflicts(plans).map((c) => c.key));
    const introduced = getScheduleConflicts(normalizedNext).find(
      (c) => !previousConflicts.has(c.key)
    );
    if (introduced) {
      toast.error(
        `Không thể lưu: Job ${introduced.first.jobNo} và ` +
          `${introduced.second.jobNo} trùng lịch máy ${introduced.first.machine}`
      );
      return false;
    }
    saveArrayToStorage(STORAGE_KEY, normalizedNext as ProductionPlanEntry[]);
    setPlans(normalizedNext);
    return true;
  };

  // Downtime CRUD
  const saveMachineDowntime = () => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền điều độ kế hoạch sản xuất');
      return;
    }
    if (!downtimeMachine || !downtimeStartDate || !downtimeEndDate) {
      toast.error('Vui lòng chọn máy và nhập đầy đủ ngày bắt đầu/kết thúc');
      return;
    }
    if (downtimeStartDate > downtimeEndDate) {
      toast.error('Ngày kết thúc bảo trì không được nhỏ hơn ngày bắt đầu');
      return;
    }
    const overlap = machineDowntime.find(
      (w) =>
        w.machine === downtimeMachine &&
        downtimeStartDate <= w.endDate &&
        downtimeEndDate >= w.startDate
    );
    if (overlap) {
      toast.error(
        `Lịch ngừng máy trùng với lịch đã có (${overlap.startDate} – ${overlap.endDate})`
      );
      return;
    }
    const window: MachineDowntime = {
      id: buildLocalId('downtime'),
      machine: downtimeMachine,
      startDate: downtimeStartDate,
      endDate: downtimeEndDate,
      note: downtimeNote.trim(),
    };
    const next = [...machineDowntime, window];
    saveArrayToStorage(DOWNTIME_STORAGE_KEY, next);
    setMachineDowntime(next);

    const affected = plans.filter(
      (p) =>
        p.machine === downtimeMachine &&
        p.status !== 'completed' &&
        p.progress < 100 &&
        p.startDate <= downtimeEndDate &&
        p.finishDate >= downtimeStartDate
    );
    if (affected.length > 0) {
      toast.warning(
        `Đã ghi lịch ngừng máy; cần rà soát ${affected.length} Job đang nằm trong khoảng này`
      );
    } else {
      toast.success('Đã lưu lịch bảo trì/ngừng máy');
    }
    setIsDowntimeDialogOpen(false);
    setDowntimeNote('');
  };

  const deleteMachineDowntime = (id: string) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền điều độ kế hoạch sản xuất');
      return;
    }
    const next = machineDowntime.filter((w) => w.id !== id);
    saveArrayToStorage(DOWNTIME_STORAGE_KEY, next);
    setMachineDowntime(next);
    toast.success('Đã xóa lịch ngừng máy');
  };

  const openDowntimeDialog = (machine: string) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền điều độ kế hoạch sản xuất');
      return;
    }
    setDowntimeMachine(machine);
    setDowntimeStartDate(todayStr);
    setDowntimeEndDate(todayStr);
    setDowntimeNote('');
    setIsDowntimeDialogOpen(true);
  };

  // Timeline memo (đã bỏ workingDaysInSpan vì đã chuyển sang calendar-based)
  const { timelineDays, monthGroups } = useMemo(() => {
    const parsed = parseISO(`${viewMonth}-01`);
    const baseDate = isValid(parsed) ? parsed : new Date();
    const start = startOfMonth(baseDate);
    const endMonthDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() + (monthSpan - 1),
      1
    );
    const end = endOfMonth(endMonthDate);
    const days = eachDayOfInterval({ start, end });

    const groups: { key: string; label: string; count: number }[] = [];
    days.forEach((d) => {
      const key = format(d, 'yyyy-MM');
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.count += 1;
      } else {
        groups.push({ key, label: `Tháng ${format(d, 'MM/yyyy')}`, count: 1 });
      }
    });
    return { timelineDays: days, monthGroups: groups };
  }, [viewMonth, monthSpan]);

  const shiftMonth = (offset: number) => {
    const [year, month] = viewMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    setViewMonth(format(next, 'yyyy-MM'));
  };

  const categoryCounts = useMemo(() => {
    const counts = { all: plans.length, large: 0, small: 0, portable: 0 };
    plans.forEach((p) => {
      counts[featureGetMachineCategory(p.machine)] += 1;
    });
    return counts;
  }, [plans]);

  const categoryPlans = useMemo(() => {
    if (activeCategoryTab === 'all') return plans;
    return plans.filter((p) => featureGetMachineCategory(p.machine) === activeCategoryTab);
  }, [plans, activeCategoryTab]);

  const kpiStats = useMemo(() => {
    const total = categoryPlans.length;
    const completed = categoryPlans.filter(
      (x) => x.status === 'completed' || x.progress >= 100
    ).length;
    const hold = categoryPlans.filter((x) => x.status === 'hold').length;
    const delay = categoryPlans.filter((x) => isPlanDelayed(x, todayStr)).length;
    const running = categoryPlans.filter(
      (x) => x.status === 'running' && x.progress < 100 && !isPlanDelayed(x, todayStr)
    ).length;
    const totalHours = categoryPlans.reduce((s, x) => s + (Number(x.totalHours) || 0), 0);
    const activeMachines = new Set(
      categoryPlans
        .filter((x) => x.progress < 100 && x.status !== 'completed')
        .map((x) => x.machine)
    ).size;
    return {
      total,
      running,
      completed,
      delay,
      hold,
      totalHours: Math.round(totalHours),
      activeMachines,
    };
  }, [categoryPlans, todayStr]);

  const availableMachinesForTab = useMemo(() => {
    if (activeCategoryTab === 'all') return FEATURE_MACHINE_CATALOG;
    return FEATURE_MACHINE_CATALOG.filter((m) => m.category === activeCategoryTab);
  }, [activeCategoryTab]);

  const projectList = useMemo(
    () => Array.from(new Set(categoryPlans.map((x) => x.project).filter(Boolean))),
    [categoryPlans]
  );

  const filteredPlans = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return categoryPlans.filter((plan) => {
      const searchMatch =
        !term ||
        plan.jobNo.toLowerCase().includes(term) ||
        plan.project.toLowerCase().includes(term) ||
        plan.drawingNo.toLowerCase().includes(term) ||
        plan.description.toLowerCase().includes(term) ||
        plan.machine.toLowerCase().includes(term);

      const projectMatch = projectFilter === 'all' || plan.project === projectFilter;
      const machineMatch = machineFilter === 'all' || plan.machine === machineFilter;

      const delayed = isPlanDelayed(plan, todayStr);
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'delay'
          ? delayed
          : statusFilter === 'completed'
          ? plan.status === 'completed' || plan.progress >= 100
          : statusFilter === 'hold'
          ? plan.status === 'hold'
          : plan.status === statusFilter && !delayed);

      return searchMatch && projectMatch && machineMatch && statusMatch;
    });
  }, [categoryPlans, searchTerm, projectFilter, machineFilter, statusFilter, todayStr]);

  const groupedPlans = useMemo(() => {
    const grouped = new Map<string, ExtendedPlanEntry[]>();
    filteredPlans.forEach((plan) => {
      if (!grouped.has(plan.machine)) grouped.set(plan.machine, []);
      grouped.get(plan.machine)?.push(plan);
    });
    return grouped;
  }, [filteredPlans]);

  useEffect(() => {
    setExpandedMachines((previous) => {
      const next = new Set(previous);
      groupedPlans.forEach((_, machine) => next.add(machine));
      return next;
    });
  }, [groupedPlans]);

  const toggleMachine = (machine: string) => {
    setExpandedMachines((previous) => {
      const next = new Set(previous);
      if (next.has(machine)) next.delete(machine);
      else next.add(machine);
      return next;
    });
  };

  // Fix: prune selectedIds khi filter thay đổi
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => filteredPlans.some((p) => p.id === id))
    );
  }, [filteredPlans]);

  // Cascade scheduling dùng calendar
  const cascadeScheduleForMachine = (targetMachine: string) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền điều độ kế hoạch sản xuất');
      return;
    }
    const machineJobs = plans
      .filter(
        (p) =>
          p.machine === targetMachine && p.progress < 100 && p.status !== 'completed'
      )
      .map((job, index) => ({ job, index }))
      .sort(
        (a, b) =>
          (a.job.startDate || '9999-12-31').localeCompare(
            b.job.startDate || '9999-12-31'
          ) || a.index - b.index
      )
      .map(({ job }) => job);

    if (machineJobs.length < 2) {
      toast.info(
        `Máy ${targetMachine} chỉ có ${machineJobs.length} Job đang mở, không cần xếp nối đuôi.`
      );
      return;
    }

    let cursorFinish = '';
    const updatedMap = new Map<string, ExtendedPlanEntry>();

    machineJobs.forEach((job, idx) => {
      const effHours = featureGetEffectiveHoursPerDay(job.shift);
      const remHours =
        job.qty > 0
          ? Number(((job.remaining / job.qty) * job.totalHours).toFixed(1))
          : job.totalHours;
      const daysNeeded =
        job.days > 0 ? job.days : effHours > 0 ? Number((remHours / effHours).toFixed(1)) : 1;
      const requiredHours = Math.max(0, remHours > 0 ? remHours : job.totalHours);

      let nextStart: string;
      if (idx === 0) {
        nextStart = findFirstAvailableOnOrAfter(
          job.startDate || todayStr,
          targetMachine,
          job.shift,
          skipSunday,
          machineDowntime
        );
      } else if (cursorFinish) {
        nextStart = findFirstAvailableAfter(
          cursorFinish,
          targetMachine,
          job.shift,
          skipSunday,
          machineDowntime
        );
      } else {
        nextStart = findFirstAvailableOnOrAfter(
          job.startDate || todayStr,
          targetMachine,
          job.shift,
          skipSunday,
          machineDowntime
        );
      }

      const { finishDate: nextFinish } = calculateFinishDateForPlan({
        startDate: nextStart,
        requiredHours,
        machine: targetMachine,
        shiftValue: job.shift,
        skipSunday,
        downtime: machineDowntime,
      });
      cursorFinish = nextFinish;
      updatedMap.set(job.id, {
        ...job,
        startDate: nextStart,
        finishDate: nextFinish,
        days: daysNeeded,
      });
    });

    const nextAll = plans.map((p) => updatedMap.get(p.id) || p);
    if (!savePlans(nextAll)) return;
    toast.success(
      `Đã xếp lịch nối đuôi ${machineJobs.length} Job trên máy ${targetMachine}`
    );
  };

  // Excel parser
  const parsedExcelRows = useMemo(() => {
    if (!pasteRawText.trim()) return [];
    const lines = pasteRawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines
      .map((line) => {
        const cols = line.split('\t');
        if (
          cols[0]?.toLowerCase().includes('job') ||
          cols[1]?.toLowerCase().includes('job')
        ) {
          return null;
        }
        const jobNo = (cols[0] || '').trim();
        const project = (cols[1] || '').trim();
        const machine = featureNormalizeMachineName(cols[2] || '');
        const drawingNo = (cols[3] || '').trim();
        const description = (cols[4] || '').trim();
        const startDate = parseExcelDate(cols[5]);
        let finishDate = parseExcelDate(cols[6]);
        const qty = parseExcelNumber(cols[7], 1);
        const hours = parseExcelNumber(cols[8], 0);
        const shift = featureNormalizeShiftValue(cols[9] || '10h/2shift');

        const totalHours = Number((qty * hours).toFixed(1));
        const effHours = featureGetEffectiveHoursPerDay(shift);
        const days = effHours > 0 ? Number((totalHours / effHours).toFixed(1)) : 0;

        if (!finishDate && startDate && totalHours > 0) {
          const r = calculateFinishDateForPlan({
            startDate,
            requiredHours: totalHours,
            machine: machine || 'MÁY PHAY DOOSAN',
            shiftValue: shift,
            skipSunday,
            downtime: machineDowntime,
          });
          finishDate = r.finishDate;
        }

        if (!jobNo && !machine) return null;

        const entry: ExtendedPlanEntry = {
          id: buildLocalId('plan'),
          jobNo: jobNo || 'NEW-JOB',
          project,
          machine: machine || 'MÁY PHAY DOOSAN',
          drawingNo,
          description,
          startDate,
          finishDate,
          actualStart: '',
          actualFinish: '',
          qty,
          qtyCompleted: 0,
          remaining: qty,
          hours,
          totalHours,
          shift,
          days,
          progress: 0,
          status: 'planned',
          note: 'Imported from Excel',
        };
        return entry;
      })
      .filter((x): x is ExtendedPlanEntry => x !== null);
  }, [pasteRawText, skipSunday, machineDowntime]);

  const handleConfirmExcelImport = () => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền chỉnh sửa kế hoạch sản xuất');
      return;
    }
    if (parsedExcelRows.length === 0) {
      toast.error('Không đọc được dòng dữ liệu hợp lệ nào từ Excel');
      return;
    }
    if (!savePlans([...parsedExcelRows, ...plans])) return;
    toast.success(`Đã nhập thành công ${parsedExcelRows.length} Job từ Excel`);
    setPasteRawText('');
    setIsPasteModalOpen(false);
  };

  // Inline update (dùng calendar)
  const handleInlineUpdate = (id: string, patch: Partial<ExtendedPlanEntry>) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền chỉnh sửa kế hoạch sản xuất');
      return;
    }
    const next = plans.map((plan) => {
      if (plan.id !== id) return plan;
      const updated = { ...plan, ...patch };

      if ('shift' in patch) {
        const effHours = featureGetEffectiveHoursPerDay(updated.shift);
        updated.days = effHours > 0 ? Number((updated.totalHours / effHours).toFixed(1)) : 0;
        if (updated.startDate) {
          const r = calculateFinishDateForPlan({
            startDate: updated.startDate,
            requiredHours: Number(updated.totalHours) || 0,
            machine: updated.machine,
            shiftValue: updated.shift,
            skipSunday,
            downtime: machineDowntime,
          });
          updated.finishDate = r.finishDate;
        }
      }

      if ('qtyCompleted' in patch || 'qty' in patch || 'progress' in patch) {
        const quantityUpdate =
          'progress' in patch
            ? {
                ...updated,
                qtyCompleted:
                  (Math.max(0, Number(updated.qty) || 0) *
                    Math.min(100, Math.max(0, Number(updated.progress) || 0))) /
                  100,
              }
            : updated;
        const normalized = normalizePlanQuantities(quantityUpdate);
        Object.assign(updated, normalized);
        if (updated.status !== 'hold') {
          updated.status =
            updated.progress >= 100
              ? 'completed'
              : updated.progress > 0 || updated.actualStart
              ? 'running'
              : 'planned';
        }
      }
      return updated;
    });
    savePlans(next);
  };

  // Conflict warnings trong Dialog
  const formConflicts = useMemo(() => {
    if (
      !formData.machine ||
      !formData.startDate ||
      !formData.finishDate ||
      formData.status === 'completed' ||
      formData.progress >= 100
    ) {
      return { schedule: null, downtime: null };
    }
    return {
      schedule: plans.find(
        (p) =>
          p.id !== selectedPlan?.id &&
          p.machine === formData.machine &&
          p.progress < 100 &&
          p.status !== 'completed' &&
          p.startDate &&
          p.finishDate &&
          formData.startDate <= p.finishDate &&
          formData.finishDate >= p.startDate
      ) || null,
      downtime: findDowntimeConflict(
        formData.machine,
        formData.startDate,
        formData.finishDate,
        machineDowntime
      ),
    };
  }, [
    formData.machine,
    formData.startDate,
    formData.finishDate,
    formData.status,
    formData.progress,
    plans,
    selectedPlan,
    machineDowntime,
  ]);

  const updateFormCalculations = (patch: Partial<Omit<ExtendedPlanEntry, 'id'>>) => {
    setFormData((prev) => {
      const next = { ...prev, ...patch };
      const rawQty = Number(next.qty);
      const qty = Number.isFinite(rawQty) ? Math.max(0, rawQty) : 0;
      const rawCompleted = Number(next.qtyCompleted);
      let qtyCompleted = Math.min(
        qty,
        Number.isFinite(rawCompleted) ? Math.max(0, rawCompleted) : 0
      );
      let progress = qty > 0 ? Math.round((qtyCompleted / qty) * 100) : 0;
      if ('progress' in patch) {
        progress = Math.min(100, Math.max(0, Number(patch.progress) || 0));
        qtyCompleted = Number(((qty * progress) / 100).toFixed(2));
      }
      const hoursPerUnit = Math.max(0, Number(next.hours) || 0);
      const remaining = Number((qty - qtyCompleted).toFixed(2));

      let totalHours = Number(next.totalHours) || 0;
      if ('qty' in patch || 'hours' in patch) {
        totalHours = Number((qty * hoursPerUnit).toFixed(1));
      }

      let days = Number(next.days) || 0;
      if ('qty' in patch || 'hours' in patch || 'totalHours' in patch || 'shift' in patch) {
        const eff = featureGetEffectiveHoursPerDay(next.shift || '10h/2shift');
        days = eff > 0 ? Number((totalHours / eff).toFixed(1)) : 0;
      }

      let finishDate = next.finishDate;
      if (
        ('startDate' in patch ||
          'qty' in patch ||
          'hours' in patch ||
          'shift' in patch ||
          'machine' in patch) &&
        next.startDate &&
        totalHours > 0
      ) {
        const r = calculateFinishDateForPlan({
          startDate: next.startDate,
          requiredHours: totalHours,
          machine: next.machine,
          shiftValue: next.shift,
          skipSunday,
          downtime: machineDowntime,
        });
        finishDate = r.finishDate;
      }

      return {
        ...next,
        qty,
        qtyCompleted,
        remaining,
        totalHours,
        days,
        finishDate,
        progress,
      };
    });
  };

  const exportToExcelCSV = () => {
    const headers = [
      'Job No', 'Nhóm Máy', 'Machine', 'Project', 'Drawing No', 'Description',
      'Start', 'Finish', 'Actual Start', 'Actual Finish', 'Qty', 'Qty Complete',
      'Remaining', 'Time/pc (h)', 'Total Time (h)', 'Shift', 'Progress (%)',
      'Status', 'Note',
    ];
    const rows = filteredPlans.map((p) => [
      p.jobNo,
      FEATURE_CATEGORY_LABELS[featureGetMachineCategory(p.machine)],
      p.machine,
      p.project,
      p.drawingNo,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.startDate,
      p.finishDate,
      p.actualStart,
      p.actualFinish,
      p.qty,
      p.qtyCompleted,
      p.remaining,
      p.hours,
      p.totalHours,
      p.shift,
      p.progress,
      isPlanDelayed(p, todayStr) ? 'Delay' : p.status,
      `"${(p.note || '').replace(/"/g, '""')}"`,
    ]);
    const csv =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Production_Plan_${viewMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Đã xuất file báo cáo Excel (.csv)');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filteredPlans.map((p) => p.id) : []);
  };

  const deleteSelected = () => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền xóa kế hoạch sản xuất');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('Chưa chọn dòng nào');
      return;
    }
    if (!confirm(`Xóa ${selectedIds.length} Job đã chọn?`)) return;
    if (!savePlans(plans.filter((x) => !selectedIds.includes(x.id)))) return;
    setSelectedIds([]);
    toast.success('Đã xóa dữ liệu');
  };

  const openNewDialog = (presetMachine?: string) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền chỉnh sửa kế hoạch sản xuất');
      return;
    }
    setSelectedPlan(null);
    const defaultMachine =
      presetMachine ||
      (activeCategoryTab !== 'all'
        ? FEATURE_MACHINE_CATALOG.find((m) => m.category === activeCategoryTab)?.name || ''
        : '');
    setFormData({ ...emptyFormState, machine: defaultMachine });
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: ExtendedPlanEntry) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền chỉnh sửa kế hoạch sản xuất');
      return;
    }
    setSelectedPlan(plan);
    setFormData({
      ...plan,
      machine: featureNormalizeMachineName(plan.machine),
      shift: featureNormalizeShiftValue(plan.shift),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền xóa kế hoạch sản xuất');
      return;
    }
    if (!confirm('Xóa Job này?')) return;
    if (!savePlans(plans.filter((x) => x.id !== id))) return;
    setSelectedIds((prev) => prev.filter((x) => x !== id));
    toast.success('Đã xóa Job');
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditOrDelete) {
      toast.error('Bạn không có quyền chỉnh sửa kế hoạch sản xuất');
      return;
    }
    if (!formData.jobNo.trim() || !formData.machine) {
      toast.error('Vui lòng nhập Job No và chọn Máy gia công');
      return;
    }
    if (formData.startDate && formData.finishDate && formData.startDate > formData.finishDate) {
      toast.error('Ngày kết thúc (Finish) không được nhỏ hơn ngày bắt đầu (Start)');
      return;
    }

    const computedStatus: ExtendedPlanEntry['status'] =
      formData.status === 'hold'
        ? 'hold'
        : formData.progress >= 100 || formData.actualFinish
        ? 'completed'
        : formData.progress > 0 || formData.actualStart
        ? 'running'
        : 'planned';

    const qty = Math.max(0, Number(formData.qty) || 0);
    const entry = normalizePlanQuantities({
      id: selectedPlan?.id ?? buildLocalId('plan'),
      ...formData,
      qtyCompleted: computedStatus === 'completed' ? qty : formData.qtyCompleted,
      progress: computedStatus === 'completed' ? 100 : formData.progress,
      status: computedStatus,
    });
    const candidate = selectedPlan
      ? plans.map((p) => (p.id === selectedPlan.id ? entry : p))
      : [entry, ...plans];
    const conflict = getScheduleConflicts(candidate).find(
      (c) => c.first.id === entry.id || c.second.id === entry.id
    );
    if (conflict) {
      const other = conflict.first.id === entry.id ? conflict.second : conflict.first;
      toast.error(
        `Không thể lưu: Job ${entry.jobNo} trùng lịch với ${other.jobNo} trên máy ${entry.machine}`
      );
      return;
    }
    if (!savePlans(candidate)) return;
    toast.success(selectedPlan ? 'Đã cập nhật kế hoạch' : 'Đã thêm Job mới');
    setIsDialogOpen(false);
  };

  const groupedCatalog = useMemo(
    () => ({
      large: FEATURE_MACHINE_CATALOG.filter((m) => m.category === 'large'),
      small: FEATURE_MACHINE_CATALOG.filter((m) => m.category === 'small'),
      portable: FEATURE_MACHINE_CATALOG.filter((m) => m.category === 'portable'),
    }),
    []
  );

  const spanStartStr = format(timelineDays[0], 'yyyy-MM-dd');
  const spanEndStr = format(timelineDays[timelineDays.length - 1], 'yyyy-MM-dd');

  const headerChecked =
    filteredPlans.length > 0 && filteredPlans.every((p) => selectedIds.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="space-y-4">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Production Plan Pro</h1>
              <p className="text-xs text-slate-500">
                Điều độ kế hoạch sản xuất, Tải công suất & Xếp lịch tự động (34 thiết bị)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border bg-white p-1">
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
              >
                <LayoutList className="w-4 h-4 mr-1.5" /> Theo Job
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'machine' ? 'default' : 'ghost'}
                onClick={() => setViewMode('machine')}
              >
                <Cpu className="w-4 h-4 mr-1.5" /> Theo Máy (34)
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setIsPasteModalOpen(true)}
              disabled={!canEditOrDelete}
            >
              <ClipboardPaste className="w-4 h-4 mr-2" /> Dán từ Excel
            </Button>
            <Button variant="outline" onClick={exportToExcelCSV}>
              <Download className="w-4 h-4 mr-2" /> Xuất Excel
            </Button>
            {viewMode === 'table' && (
              <Button
                variant="destructive"
                onClick={deleteSelected}
                disabled={!canEditOrDelete || selectedIds.length === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete{' '}
                {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </Button>
            )}
            <Button onClick={() => openNewDialog()} disabled={!canEditOrDelete}>
              <Plus className="w-4 h-4 mr-2" /> Add Job
            </Button>
          </div>
        </div>

        {/* TABS */}
        <Tabs
          value={activeCategoryTab}
          onValueChange={(val) => {
            setActiveCategoryTab(val as 'all' | MachineCategory);
            setMachineFilter('all');
            setSelectedIds([]);
          }}
        >
          <TabsList className="bg-white border h-11 p-1">
            <TabsTrigger value="all" className="px-4">Tất cả ({categoryCounts.all})</TabsTrigger>
            <TabsTrigger value="large" className="px-4">Máy Lớn ({categoryCounts.large})</TabsTrigger>
            <TabsTrigger value="small" className="px-4">Máy Nhỏ ({categoryCounts.small})</TabsTrigger>
            <TabsTrigger value="portable" className="px-4">Máy Di Động ({categoryCounts.portable})</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card><CardContent className="p-3.5">
            <div className="text-xs font-medium text-slate-500">Tổng Job</div>
            <div className="text-2xl font-bold mt-1">{kpiStats.total}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3.5">
            <div className="text-xs font-medium text-slate-500">Đang chạy</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{kpiStats.running}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3.5">
            <div className="text-xs font-medium text-slate-500">Hoàn thành</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{kpiStats.completed}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3.5">
            <div className="text-xs font-medium text-slate-500">Trễ tiến độ</div>
            <div className="text-2xl font-bold text-red-600 mt-1">{kpiStats.delay}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3.5">
            <div className="text-xs font-medium text-slate-500">Tạm dừng (Hold)</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{kpiStats.hold}</div>
          </CardContent></Card>
          <Card><CardContent className="p-3.5">
            <div className="text-xs font-medium text-slate-500">Tổng giờ / Máy chạy</div>
            <div className="text-xl font-bold text-slate-800 mt-1">
              {kpiStats.totalHours}h{' '}
              <span className="text-xs font-normal text-slate-500">
                ({kpiStats.activeMachines}/{availableMachinesForTab.length})
              </span>
            </div>
          </CardContent></Card>
        </div>

        {/* FILTER BAR */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="w-full md:w-[220px]"
                placeholder="Tìm Job No, Dự án, Bản vẽ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-[165px]">
                  <SelectValue placeholder="All Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Project</SelectItem>
                  {projectList.map((x) => (
                    <SelectItem key={x} value={x}>{x}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger className="w-full md:w-[215px]">
                  <SelectValue placeholder="All Machine" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Machine ({availableMachinesForTab.length})
                  </SelectItem>
                  {availableMachinesForTab.map((m) => (
                    <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delay">Delay</SelectItem>
                  <SelectItem value="hold">Tạm dừng (Hold)</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setMonthSpan(monthSpan === 1 ? 2 : 1)}
                >
                  <CalendarDays className="w-4 h-4 mr-1" /> {monthSpan} Tháng
                </Button>
                <Button type="button" variant="outline" size="icon" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Input
                  type="month"
                  value={viewMonth}
                  onChange={(e) => e.target.value && setViewMonth(e.target.value)}
                  className="w-[150px]"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ================= TABLE VIEW ================= */}
        {viewMode === 'table' ? (
          <Card>
            <CardContent className="p-0 overflow-auto max-h-[68vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-20 shadow-sm">
                  <TableRow className="bg-slate-50">
                    <TableHead colSpan={19} className="text-xs font-semibold text-slate-600 uppercase">
                      Kế hoạch chi tiết (Sửa nhanh Done & Shift trực tiếp trên bảng)
                    </TableHead>
                    {monthGroups.map((mg) => (
                      <TableHead
                        key={mg.key}
                        colSpan={mg.count}
                        className="text-center font-bold text-slate-800 bg-blue-50/70 border-l"
                      >
                        {mg.label}
                      </TableHead>
                    ))}
                    <TableHead />
                  </TableRow>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-30 w-10 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer align-middle"
                        checked={headerChecked}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <TableHead className="sticky left-10 bg-white z-30 min-w-[90px] max-w-[90px]">
                      Job No
                    </TableHead>
                    <TableHead className="sticky left-[130px] bg-white z-30 min-w-[195px] border-r">
                      Machine
                    </TableHead>
                    <TableHead className="min-w-[105px]">Nhóm</TableHead>
                    <TableHead className="min-w-[125px]">Project</TableHead>
                    <TableHead className="min-w-[95px]">Drw No</TableHead>
                    <TableHead className="min-w-[210px]">Description</TableHead>
                    <TableHead className="min-w-[100px]">Start</TableHead>
                    <TableHead className="min-w-[100px]">Finish</TableHead>
                    <TableHead className="min-w-[100px]">Actual Start</TableHead>
                    <TableHead className="min-w-[100px]">Actual Finish</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right min-w-[75px]">Done</TableHead>
                    <TableHead className="text-right">Rem</TableHead>
                    <TableHead className="text-right">Time(h)</TableHead>
                    <TableHead className="text-right">Total(h)</TableHead>
                    <TableHead className="min-w-[135px]">Shift</TableHead>
                    <TableHead className="min-w-[100px] border-r">% Complete</TableHead>
                    {timelineDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const isToday = dayStr === todayStr;
                      const isSunday = day.getDay() === 0;
                      return (
                        <TableHead
                          key={dayStr}
                          className={`text-center min-w-[30px] px-0.5 text-xs ${
                            isToday
                              ? 'bg-red-100 text-red-700 font-bold border-x border-red-400'
                              : isSunday
                              ? 'bg-slate-100 text-slate-400'
                              : ''
                          }`}
                        >
                          {format(day, 'dd')}
                        </TableHead>
                      );
                    })}
                    <TableHead className="sticky right-0 bg-white z-30 text-center border-l">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={19 + timelineDays.length}
                        className="text-center py-10 text-slate-500"
                      >
                        Không có dữ liệu phù hợp với bộ lọc hiện tại.
                      </TableCell>
                    </TableRow>
                  ) : (
                    Array.from(groupedPlans.entries()).flatMap(([machine, jobs]) => {
                      const expanded = expandedMachines.has(machine);
                      const category = featureGetMachineCategory(machine);
                      const machineHeader = (
                        <TableRow key={`machine-${machine}`} className="bg-slate-100/90 hover:bg-slate-100">
                          <TableCell
                            colSpan={19 + timelineDays.length}
                            className="sticky left-0 border-y border-slate-200 py-2"
                          >
                            <button
                              type="button"
                              onClick={() => toggleMachine(machine)}
                              className="flex w-full items-center gap-2 text-left"
                              aria-expanded={expanded}
                            >
                              {expanded ? (
                                <ChevronDown className="h-4 w-4 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-slate-600" />
                              )}
                              <span className="font-bold text-slate-800">{machine}</span>
                              <Badge
                                variant="outline"
                                className={
                                  category === 'large'
                                    ? 'border-amber-500 text-amber-700 bg-amber-50'
                                    : category === 'portable'
                                    ? 'border-purple-500 text-purple-700 bg-purple-50'
                                    : 'border-sky-500 text-sky-700 bg-sky-50'
                                }
                              >
                                {FEATURE_CATEGORY_LABELS[category]}
                              </Badge>
                              <span className="ml-auto text-xs font-medium text-slate-500">
                                {jobs.length} job
                              </span>
                            </button>
                          </TableCell>
                        </TableRow>
                      );

                      if (!expanded) return [machineHeader];

                      const machineRows = jobs.map((plan) => {
                      const delayed = isPlanDelayed(plan, todayStr);
                      const isHold = plan.status === 'hold';
                      const category = featureGetMachineCategory(plan.machine);
                      const rowBg = delayed
                        ? 'bg-red-50/40'
                        : isHold
                        ? 'bg-purple-50/40'
                        : 'bg-white';
                      const actualEndRef =
                        plan.actualFinish || (plan.actualStart ? todayStr : '');
                      return (
                        <TableRow
                          key={plan.id}
                          className={
                            delayed
                              ? 'text-red-600 font-medium bg-red-50/30'
                              : isHold
                              ? 'text-purple-700 bg-purple-50/30'
                              : ''
                          }
                        >
                          <TableCell className={`sticky left-0 z-10 text-center w-10 ${rowBg}`}>
                            <input
                              type="checkbox"
                              className="w-4 h-4 cursor-pointer align-middle"
                              checked={selectedIds.includes(plan.id)}
                              onChange={() => toggleSelect(plan.id)}
                            />
                          </TableCell>
                          <TableCell
                            className={`sticky left-10 z-10 font-semibold min-w-[90px] max-w-[90px] ${rowBg}`}
                          >
                            <div className="flex items-center gap-1 truncate">
                              <span className="truncate">{plan.jobNo}</span>
                              {isHold && (
                                <Badge className="bg-purple-600 text-white text-[10px] px-1 py-0">
                                  HOLD
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={`sticky left-[130px] z-10 border-r font-medium min-w-[195px] ${rowBg}`}
                          >
                            {plan.machine}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                category === 'large'
                                  ? 'border-amber-500 text-amber-700 bg-amber-50'
                                  : category === 'portable'
                                  ? 'border-purple-500 text-purple-700 bg-purple-50'
                                  : 'border-sky-500 text-sky-700 bg-sky-50'
                              }
                            >
                              {FEATURE_CATEGORY_LABELS[category]}
                            </Badge>
                          </TableCell>
                          <TableCell>{plan.project}</TableCell>
                          <TableCell>{plan.drawingNo}</TableCell>
                          <TableCell className="min-w-[210px]">{plan.description}</TableCell>
                          <TableCell className="whitespace-nowrap">{plan.startDate}</TableCell>
                          <TableCell className="whitespace-nowrap">{plan.finishDate}</TableCell>
                          <TableCell className="whitespace-nowrap">{plan.actualStart}</TableCell>
                          <TableCell className="whitespace-nowrap">{plan.actualFinish}</TableCell>
                          <TableCell className="text-right">{plan.qty}</TableCell>
                          <TableCell className="text-right p-1">
                            <InlineNumberInput
                              value={plan.qtyCompleted}
                              disabled={!canEditOrDelete}
                              onChange={(value) =>
                                handleInlineUpdate(plan.id, { qtyCompleted: value })
                              }
                              className="h-7 w-16 text-right px-1.5 text-xs ml-auto"
                            />
                          </TableCell>
                          <TableCell className="text-right">{plan.remaining}</TableCell>
                          <TableCell className="text-right">{plan.hours}</TableCell>
                          <TableCell className="text-right">{plan.totalHours}</TableCell>
                          <TableCell className="p-1">
                            <Select
                              disabled={!canEditOrDelete}
                              value={featureNormalizeShiftValue(plan.shift)}
                              onValueChange={(val) => handleInlineUpdate(plan.id, { shift: val })}
                            >
                              <SelectTrigger className="h-7 w-[125px] text-xs px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FEATURE_SHIFT_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.shortLabel}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="border-r">
                            <div className="w-[85px]">
                              <div className="w-full bg-slate-200 rounded overflow-hidden">
                                <div
                                  className="h-2.5 rounded transition-all"
                                  style={{
                                    width: `${Math.min(100, Math.max(0, plan.progress))}%`,
                                    backgroundColor: isHold
                                      ? '#9333ea'
                                      : plan.progress >= 100
                                      ? '#22c55e'
                                      : delayed
                                      ? '#ef4444'
                                      : plan.progress >= 50
                                      ? '#3b82f6'
                                      : '#f59e0b',
                                  }}
                                />
                              </div>
                              <InlineNumberInput
                                value={plan.progress}
                                disabled={!canEditOrDelete}
                                min={0}
                                max={100}
                                onChange={(value) =>
                                  handleInlineUpdate(plan.id, { progress: value })
                                }
                                className="h-6 w-14 text-center px-1 text-xs mt-0.5"
                              />
                            </div>
                          </TableCell>
                          {timelineDays.map((day) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const isToday = dayStr === todayStr;
                            const isPlanActive =
                              Boolean(plan.startDate) &&
                              Boolean(plan.finishDate) &&
                              dayStr >= plan.startDate &&
                              dayStr <= plan.finishDate;
                            const isActualActive =
                              Boolean(plan.actualStart) &&
                              Boolean(actualEndRef) &&
                              dayStr >= (plan.actualStart || '') &&
                              dayStr <= actualEndRef;
                            return (
                              <TableCell
                                key={dayStr}
                                title={`${plan.jobNo} | Plan: ${plan.startDate} → ${plan.finishDate}${
                                  plan.actualStart ? ` | Actual: ${plan.actualStart}` : ''
                                }`}
                                className={`p-0 border-r border-slate-100 ${
                                  isToday ? 'border-x border-red-400 bg-red-50/30' : ''
                                }`}
                              >
                                <div className="flex flex-col justify-center gap-0.5 h-6">
                                  <div
                                    className={`h-2.5 w-full ${
                                      isPlanActive
                                        ? isHold
                                          ? 'bg-purple-500'
                                          : delayed
                                          ? 'bg-red-500'
                                          : plan.progress >= 100
                                          ? 'bg-green-500'
                                          : 'bg-blue-500'
                                        : 'bg-transparent'
                                    }`}
                                  />
                                  <div
                                    className={`h-1.5 w-full ${
                                      isActualActive ? 'bg-amber-500' : 'bg-transparent'
                                    }`}
                                  />
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell className={`sticky right-0 z-10 border-l ${rowBg}`}>
                            <div className="flex justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(plan)}
                                disabled={!canEditOrDelete}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(plan.id)}
                                disabled={!canEditOrDelete}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                      });
                      return [machineHeader, ...machineRows];
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          /* ================= MACHINE VIEW ================= */
          <Card>
            <CardContent className="p-0 overflow-auto max-h-[70vh]">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-20 shadow-sm">
                  <TableRow className="bg-slate-50">
                    <TableHead colSpan={4} className="text-xs font-bold text-slate-700">
                      DANH SÁCH THIẾT BỊ ({availableMachinesForTab.length} MÁY) & TẢI CÔNG SUẤT
                    </TableHead>
                    {monthGroups.map((mg) => (
                      <TableHead
                        key={mg.key}
                        colSpan={mg.count}
                        className="text-center font-bold text-slate-800 bg-blue-50/70 border-l"
                      >
                        {mg.label}
                      </TableHead>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white z-30 min-w-[235px]">
                      Tên Máy (Giao việc / Xếp nối đuôi)
                    </TableHead>
                    <TableHead className="min-w-[95px]">Nhóm</TableHead>
                    <TableHead className="min-w-[115px]">Tải công suất</TableHead>
                    <TableHead className="min-w-[115px] border-r">Trạng thái</TableHead>
                    {timelineDays.map((day) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const isToday = dayStr === todayStr;
                      const isSunday = day.getDay() === 0;
                      return (
                        <TableHead
                          key={dayStr}
                          className={`text-center min-w-[34px] px-0.5 text-xs ${
                            isToday
                              ? 'bg-red-100 text-red-700 font-bold border-x border-red-400'
                              : isSunday
                              ? 'bg-slate-100 text-slate-400'
                              : ''
                          }`}
                        >
                          {format(day, 'dd')}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableMachinesForTab
                    .filter((m) => machineFilter === 'all' || m.name === machineFilter)
                    .map((machine) => {
                      const machineJobs = plans.filter((p) => p.machine === machine.name);
                      const openJobs = machineJobs.filter(
                        (p) => p.progress < 100 && p.status !== 'completed'
                      );
                      // Fix: ưu tiên job 'running'
                      const activeJob =
                        openJobs.find((j) => j.status === 'running') || openJobs[0];

                      const scheduledHoursInSpan = machineJobs
                        .filter(
                          (j) =>
                            j.startDate &&
                            j.finishDate &&
                            j.startDate <= spanEndStr &&
                            j.finishDate >= spanStartStr
                        )
                        .reduce((sum, j) => sum + (Number(j.totalHours) || 0), 0);

                      // Fix: capacity theo calendar thay vì hard-code *18
                      const dominantShift = getDominantShift(machineJobs);
                      const machineCalendar = getShiftCalendarCached(
                        machine.name,
                        dominantShift,
                        skipSunday
                      );
                      const capacityHours = getMachineCapacityInRange({
                        machine: machine.name,
                        startDate: spanStartStr,
                        endDate: spanEndStr,
                        calendar: machineCalendar,
                        downtime: machineDowntime,
                      });
                      const loadPct =
                        capacityHours > 0
                          ? Math.round((scheduledHoursInSpan / capacityHours) * 100)
                          : scheduledHoursInSpan > 0
                          ? 100
                          : 0;

                      const downtimeInSpan = machineDowntime.filter(
                        (w) =>
                          w.machine === machine.name &&
                          w.startDate <= spanEndStr &&
                          w.endDate >= spanStartStr
                      );

                      return (
                        <TableRow key={machine.name} className="hover:bg-slate-50/70">
                          <TableCell className="sticky left-0 bg-white z-10 font-medium">
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate max-w-[165px]" title={machine.name}>
                                {machine.name}
                              </span>
                              {canEditOrDelete && (
                                <div className="flex items-center shrink-0">
                                  {openJobs.length >= 2 && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-amber-600 hover:bg-amber-50"
                                      title="Xếp lịch nối đuôi tự động cho máy này"
                                      onClick={() => cascadeScheduleForMachine(machine.name)}
                                    >
                                      <Link2 className="w-3.5 h-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-red-500 hover:bg-red-50"
                                    title={`Lịch bảo trì/ngừng máy cho ${machine.name}`}
                                    onClick={() => openDowntimeDialog(machine.name)}
                                  >
                                    <CalendarDays className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-slate-400 hover:text-blue-600"
                                    title={`Giao việc cho ${machine.name}`}
                                    onClick={() => openNewDialog(machine.name)}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {FEATURE_CATEGORY_LABELS[machine.category]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="w-[95px]">
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span title={`Quỹ giờ khả dụng: ${capacityHours}h (${dominantShift})`}>
                                  {Math.round(scheduledHoursInSpan)}h / {capacityHours}h
                                </span>
                                <span
                                  className={
                                    loadPct > 100 ? 'text-red-600 font-bold' : 'text-slate-600'
                                  }
                                >
                                  {loadPct}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 h-1.5 rounded overflow-hidden">
                                <div
                                  className="h-full"
                                  style={{
                                    width: `${Math.min(100, loadPct)}%`,
                                    backgroundColor:
                                      loadPct > 100
                                        ? '#ef4444'
                                        : loadPct >= 75
                                        ? '#f59e0b'
                                        : '#22c55e',
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="border-r">
                            {activeJob ? (
                              <Badge
                                className={
                                  activeJob.status === 'hold'
                                    ? 'bg-purple-600 text-white text-xs'
                                    : 'bg-blue-600 text-white text-xs'
                                }
                              >
                                {activeJob.jobNo} ({activeJob.progress}%)
                              </Badge>
                            ) : downtimeInSpan.length > 0 ? (
                              <Badge className="bg-red-600 text-white text-xs">
                                Bảo trì ({downtimeInSpan.length})
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-slate-500 text-xs">
                                Trống lịch
                              </Badge>
                            )}
                          </TableCell>
                          {timelineDays.map((day) => {
                            const dayStr = format(day, 'yyyy-MM-dd');
                            const isToday = dayStr === todayStr;
                            const jobsOnDay = machineJobs.filter(
                              (j) =>
                                j.startDate &&
                                j.finishDate &&
                                dayStr >= j.startDate &&
                                dayStr <= j.finishDate
                            );
                            const jobOnDay = jobsOnDay[0];
                            const hasOverlap = jobsOnDay.length > 1;
                            const isDowntime = isMachineUnavailable(
                              machine.name,
                              dayStr,
                              machineDowntime
                            );
                            const isStart = jobOnDay?.startDate === dayStr;
                            const delayed = jobOnDay ? isPlanDelayed(jobOnDay, todayStr) : false;
                            const downtimeNote = machineDowntime.find(
                              (w) =>
                                w.machine === machine.name &&
                                dayStr >= w.startDate &&
                                dayStr <= w.endDate
                            )?.note;
                            return (
                              <TableCell
                                key={dayStr}
                                onClick={() => jobOnDay && handleEdit(jobOnDay)}
                                title={[
                                  jobsOnDay.length > 0
                                    ? jobsOnDay
                                        .map((j) => `${j.jobNo} (${j.progress}%)`)
                                        .join(' + TRÙNG LỊCH: ')
                                    : `${machine.name}: Trống ngày ${dayStr}`,
                                  isDowntime
                                    ? `BẢO TRÌ/NGỪNG MÁY${downtimeNote ? `: ${downtimeNote}` : ''}`
                                    : '',
                                ]
                                  .filter(Boolean)
                                  .join(' | ')}
                                className={`p-0 border-r border-slate-100 ${
                                  jobOnDay ? 'cursor-pointer' : ''
                                } ${isToday ? 'border-x border-red-400 bg-red-50/30' : ''}`}
                              >
                                {jobOnDay ? (
                                  <div
                                    className={`h-6 flex items-center text-[10px] font-bold text-white px-1 overflow-hidden whitespace-nowrap ${
                                      isDowntime
                                        ? 'bg-red-700 ring-2 ring-red-900'
                                        : hasOverlap
                                        ? 'bg-amber-600 ring-1 ring-red-500'
                                        : jobOnDay.status === 'hold'
                                        ? 'bg-purple-600'
                                        : delayed
                                        ? 'bg-red-500'
                                        : jobOnDay.progress >= 100
                                        ? 'bg-green-600'
                                        : 'bg-blue-600'
                                    }`}
                                  >
                                    {isStart ? jobOnDay.jobNo : ''}
                                  </div>
                                ) : (
                                  <div
                                    className={`h-6 flex items-center justify-center text-[9px] font-semibold ${
                                      isDowntime ? 'bg-red-100 text-red-700' : ''
                                    }`}
                                  >
                                    {isDowntime ? 'BT' : ''}
                                  </div>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* LEGEND */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 px-1">
          <span className="font-semibold">Chú thích:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> Đang chạy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" /> Hoàn thành 100%
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" /> Trễ tiến độ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> Tạm dừng (Hold)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-200 border border-red-500 inline-block" />{' '}
            Bảo trì/ngừng máy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-sm bg-amber-500 inline-block" /> Thực tế (Actual)
          </span>
        </div>

        {/* PASTE DIALOG */}
        <Dialog open={isPasteModalOpen} onOpenChange={setIsPasteModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Dán dữ liệu kế hoạch từ Excel</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p className="text-slate-600">
                Copy các dòng từ file Excel theo thứ tự cột:{' '}
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                  Job No | Project | Machine | Drw No | Description | Start | Finish | Qty | Time(h) | Shift
                </code>{' '}
                rồi dán (`Ctrl + V`) vào ô dưới đây:
              </p>
              <Textarea
                rows={6}
                placeholder={`Ví dụ:\nAL-5560\tSeaconics\tFB160HC\t2209901\tBase Frame\t2026-11-25\t2026-11-30\t1\t90\t10h/2shift`}
                value={pasteRawText}
                onChange={(e) => setPasteRawText(e.target.value)}
                className="font-mono text-xs"
              />
              {parsedExcelRows.length > 0 && (
                <div className="border rounded-md overflow-auto max-h-60">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 text-xs">
                        <TableHead>Job No</TableHead>
                        <TableHead>Máy nhận diện</TableHead>
                        <TableHead>Start → Finish</TableHead>
                        <TableHead>Qty × Time</TableHead>
                        <TableHead>Shift (Days)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {parsedExcelRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-semibold">{row.jobNo}</TableCell>
                          <TableCell>{row.machine}</TableCell>
                          <TableCell>
                            {row.startDate || '—'} → {row.finishDate || '—'}
                          </TableCell>
                          <TableCell>
                            {row.qty} × {row.hours}h = {row.totalHours}h
                          </TableCell>
                          <TableCell>
                            {row.shift} ({row.days} ngày)
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasteModalOpen(false)}
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmExcelImport}
                  disabled={!canEditOrDelete || parsedExcelRows.length === 0}
                >
                  Nhập {parsedExcelRows.length} Job vào kế hoạch
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* DOWNTIME DIALOG */}
        <Dialog open={isDowntimeDialogOpen} onOpenChange={setIsDowntimeDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Lịch bảo trì/ngừng máy: {downtimeMachine}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Khoảng ngày ngừng máy sẽ chặn lịch Job mới và giảm quỹ công suất. Job hiện có
                trong khoảng này sẽ được giữ lại để quản đốc rà soát.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ngày bắt đầu</Label>
                  <Input
                    type="date"
                    value={downtimeStartDate}
                    onChange={(e) => setDowntimeStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Ngày kết thúc</Label>
                  <Input
                    type="date"
                    value={downtimeEndDate}
                    onChange={(e) => setDowntimeEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Ghi chú</Label>
                <Textarea
                  value={downtimeNote}
                  onChange={(e) => setDowntimeNote(e.target.value)}
                  placeholder="Ví dụ: bảo trì định kỳ, chờ linh kiện..."
                />
              </div>
              <div className="space-y-2">
                <Label>Lịch đã đăng ký</Label>
                {machineDowntime
                  .filter((w) => w.machine === downtimeMachine)
                  .sort((a, b) => a.startDate.localeCompare(b.startDate))
                  .map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded border p-2 text-sm"
                    >
                      <span>
                        {w.startDate} → {w.endDate}
                        {w.note ? ` — ${w.note}` : ''}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMachineDowntime(w.id)}
                      >
                        Xóa
                      </Button>
                    </div>
                  ))}
                {machineDowntime.every((w) => w.machine !== downtimeMachine) && (
                  <p className="text-sm text-slate-500">Chưa có lịch bảo trì/ngừng máy.</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDowntimeDialogOpen(false)}
                >
                  Đóng
                </Button>
                <Button type="button" disabled={!canEditOrDelete} onClick={saveMachineDowntime}>
                  Lưu lịch ngừng máy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ADD/EDIT DIALOG */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPlan ? `Edit Job: ${selectedPlan.jobNo}` : 'Add New Job'}
              </DialogTitle>
            </DialogHeader>

            {formConflicts.schedule && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 border border-red-300 text-red-800 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>
                  Không thể lưu do trùng lịch: Máy <strong>{formConflicts.schedule.machine}</strong>{' '}
                  đang có Job <strong>{formConflicts.schedule.jobNo}</strong> (
                  {formConflicts.schedule.startDate} → {formConflicts.schedule.finishDate}). Hãy đổi lịch
                  hoặc đánh dấu Job hoàn thành.
                </span>
              </div>
            )}

            {formConflicts.downtime && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-50 border border-amber-300 text-amber-800 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Máy <strong>{formConflicts.downtime.machine}</strong> đang ngừng từ{' '}
                  {formConflicts.downtime.startDate} → {formConflicts.downtime.endDate}
                  {formConflicts.downtime.note ? ` (${formConflicts.downtime.note})` : ''} — không thể lưu.
                </span>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Job No *</Label>
                  <Input
                    required
                    value={formData.jobNo}
                    onChange={(e) => setFormData({ ...formData, jobNo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Project</Label>
                  <Input
                    value={formData.project}
                    onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Machine (Phân nhóm thiết bị) *</Label>
                  <Select
                    value={formData.machine}
                    onValueChange={(val) => updateFormCalculations({ machine: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn máy gia công..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      <SelectGroup>
                        <SelectLabel className="text-amber-700 font-bold bg-amber-50">
                          — NHÓM MÁY LỚN / HẠNG NẶNG ({groupedCatalog.large.length}) —
                        </SelectLabel>
                        {groupedCatalog.large.map((m) => (
                          <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-sky-700 font-bold bg-sky-50 mt-1">
                          — NHÓM MÁY NHỎ & TRUNG BÌNH ({groupedCatalog.small.length}) —
                        </SelectLabel>
                        {groupedCatalog.small.map((m) => (
                          <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-purple-700 font-bold bg-purple-50 mt-1">
                          — NHÓM MÁY DI ĐỘNG / TẠI CHỖ ({groupedCatalog.portable.length}) —
                        </SelectLabel>
                        {groupedCatalog.portable.map((m) => (
                          <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Drawing No</Label>
                  <Input
                    value={formData.drawingNo}
                    onChange={(e) => setFormData({ ...formData, drawingNo: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Trạng thái ưu tiên</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => {
                      if (val === 'completed') {
                        updateFormCalculations({ status: 'completed', progress: 100 });
                      } else {
                        setFormData({
                          ...formData,
                          status: val as ExtendedPlanEntry['status'],
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Tự động (Theo tiến độ)</SelectItem>
                      <SelectItem value="running">Đang chạy (Running)</SelectItem>
                      <SelectItem value="hold">Tạm dừng (Hold)</SelectItem>
                      <SelectItem value="completed">Hoàn thành (Completed)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.qty}
                    onChange={(e) => updateFormCalculations({ qty: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Time / pc (h)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.hours}
                    onChange={(e) => updateFormCalculations({ hours: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Total Time (h)</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.totalHours}
                    onChange={(e) =>
                      updateFormCalculations({ totalHours: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Shift (Ca làm việc)</Label>
                  <Select
                    value={formData.shift}
                    onValueChange={(val) => updateFormCalculations({ shift: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chế độ ca..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_SHIFT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Start (Ngày bắt đầu)</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => updateFormCalculations({ startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Finish (Tự gợi ý theo Days)</Label>
                  <Input
                    type="date"
                    value={formData.finishDate}
                    onChange={(e) =>
                      setFormData({ ...formData, finishDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={skipSunday}
                      onChange={(e) => setSkipSunday(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span>Trừ ngày Chủ Nhật khi tính Finish</span>
                  </label>
                </div>
                <div>
                  <Label>Qty Complete</Label>
                  <Input
                    type="number"
                    step="any"
                    value={formData.qtyCompleted}
                    onChange={(e) =>
                      updateFormCalculations({ qtyCompleted: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Remaining</Label>
                  <Input value={formData.remaining} readOnly className="bg-slate-100" />
                </div>
                <div>
                  <Label>Progress %</Label>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    max={100}
                    value={formData.progress}
                    onChange={(e) =>
                      updateFormCalculations({ progress: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Actual Start</Label>
                    <Input
                      type="date"
                      value={formData.actualStart}
                      onChange={(e) =>
                        setFormData({ ...formData, actualStart: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Actual Finish</Label>
                    <Input
                      type="date"
                      value={formData.actualFinish}
                      onChange={(e) =>
                        setFormData({ ...formData, actualFinish: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="md:col-span-4">
                  <Label>Note (Ghi chú / Lý do Hold)</Label>
                  <Textarea
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!canEditOrDelete}>Save</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}