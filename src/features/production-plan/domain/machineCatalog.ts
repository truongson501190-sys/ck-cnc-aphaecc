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

export interface ShiftRuleShape {
  regularHours: number;
  shiftsPerDay: 1 | 2;
}

export const SHIFT_TO_RULE: Record<string, ShiftRuleShape> = {
  '8h/1shift': { regularHours: 8, shiftsPerDay: 1 },
  '8h/2shift': { regularHours: 8, shiftsPerDay: 2 },
  '10h/1shift': { regularHours: 10, shiftsPerDay: 1 },
  '10h/2shift': { regularHours: 10, shiftsPerDay: 2 },
  '12h/1shift': { regularHours: 12, shiftsPerDay: 1 },
  '12h/2shift': { regularHours: 12, shiftsPerDay: 2 },
};

export const CATEGORY_LABELS: Record<MachineCategory, string> = {
  large: 'Máy Lớn',
  small: 'Máy Nhỏ',
  portable: 'Máy Di Động',
};

export function getMachineCategory(machineName: string): MachineCategory {
  const normalized = (machineName || '').trim().toLowerCase();
  const found = MACHINE_CATALOG.find(
    (machine) =>
      machine.name.toLowerCase() === normalized ||
      machine.aliases?.some((alias) => alias.toLowerCase() === normalized)
  );
  return found ? found.category : 'small';
}

export function normalizeMachineName(machineName: string): string {
  const normalized = (machineName || '').trim().toLowerCase();
  if (!normalized) return '';
  const exact = MACHINE_CATALOG.find(
    (machine) =>
      machine.name.toLowerCase() === normalized ||
      machine.aliases?.some((alias) => alias.toLowerCase() === normalized)
  );
  if (exact) return exact.name;

  const compact = normalized.replace(/\s+/g, '');
  const fuzzy = MACHINE_CATALOG.find(
    (machine) =>
      machine.name.toLowerCase().replace(/\s+/g, '').includes(compact) ||
      machine.aliases?.some((alias) =>
        alias.toLowerCase().replace(/\s+/g, '') === compact
      )
  );
  return fuzzy ? fuzzy.name : machineName.trim();
}

export function normalizeShiftValue(shiftValue: string): string {
  const normalized = (shiftValue || '').replace(/\s+/g, '').replace(/ca$/i, 'shift').toLowerCase();
  const found = SHIFT_OPTIONS.find(
    (option) => option.value.replace(/\s+/g, '').toLowerCase() === normalized
  );
  return found ? found.value : '10h/2shift';
}

export function getEffectiveHoursPerDay(shiftValue: string): number {
  const normalized = normalizeShiftValue(shiftValue);
  const found = SHIFT_OPTIONS.find((option) => option.value === normalized);
  return found ? found.effectiveHours : 18;
}
