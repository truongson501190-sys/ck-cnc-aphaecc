import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category } from '@/types/categories';
import type { RawRecord } from '@/types/common';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function parseStorage(key: string): RawRecord[] {
  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getValueAsNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function getSavedCategories(): Category[] {
  const categoryTypes = parseStorage('categoryTypes');
  const categoryItems = parseStorage('category_items');
  const merged = [...categoryTypes, ...categoryItems];

  const normalized = merged.map((cat) => {
    const id = typeof cat.id === 'string'
      ? cat.id
      : typeof cat.maLoai === 'string'
      ? cat.maLoai
      : typeof cat.maChungLoai === 'string'
      ? cat.maChungLoai
      : typeof cat.tenChungLoai === 'string'
      ? cat.tenChungLoai
      : typeof cat.tenLoai === 'string'
      ? cat.tenLoai
      : `${Math.random()}`;

    return {
      id,
      maLoai: typeof cat.maLoai === 'string'
        ? cat.maLoai
        : typeof cat.maChungLoai === 'string'
        ? cat.maChungLoai
        : typeof cat.id === 'string'
        ? cat.id
        : typeof cat.tenChungLoai === 'string'
        ? cat.tenChungLoai
        : typeof cat.tenLoai === 'string'
        ? cat.tenLoai
        : '',
      tenLoai: typeof cat.tenLoai === 'string'
        ? cat.tenLoai
        : typeof cat.tenChungLoai === 'string'
        ? cat.tenChungLoai
        : '',
      tenChungLoai: typeof cat.tenChungLoai === 'string'
        ? cat.tenChungLoai
        : typeof cat.tenLoai === 'string'
        ? cat.tenLoai
        : '',
      donVi: typeof cat.donVi === 'string'
        ? cat.donVi
        : typeof cat.donViTinh === 'string'
        ? cat.donViTinh
        : '',
      gia: getValueAsNumber(cat.gia) || getValueAsNumber(cat.donGia),
      minimumStock: typeof cat.minimumStock === 'number'
        ? cat.minimumStock
        : getValueAsNumber(cat.minimumStock),
      createdAt: typeof cat.createdAt === 'string'
        ? cat.createdAt
        : new Date().toISOString()
    };
  }) as Category[];

  return normalized.filter((cat, index, self) =>
    index === self.findIndex(c =>
      (c.id === cat.id && cat.id !== '') ||
      (c.maLoai === cat.maLoai && cat.maLoai !== '') ||
      (c.tenChungLoai === cat.tenChungLoai && cat.tenChungLoai !== '')
    )
  );
}
