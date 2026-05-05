import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Category } from '@/types/categories';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSavedCategories(): Category[] {
  const parseStorage = (key: string): any[] => {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const categoryTypes = parseStorage('categoryTypes');
  const categoryItems = parseStorage('category_items');
  const merged = [...categoryTypes, ...categoryItems];

  const normalized = merged.map((cat: any) => ({
    id: cat.id || cat.maLoai || cat.maChungLoai || cat.tenChungLoai || Date.now().toString(),
    maLoai: cat.maLoai || cat.maChungLoai || cat.id || cat.tenChungLoai || cat.tenLoai || '',
    tenLoai: cat.tenLoai || cat.tenChungLoai || '',
    tenChungLoai: cat.tenChungLoai || cat.tenLoai || '',
    donVi: cat.donVi || cat.donViTinh || '',
    gia: typeof cat.gia === 'number' ? cat.gia : parseFloat(cat.gia) || parseFloat(cat.donGia) || 0,
    minimumStock: cat.minimumStock || 0,
    createdAt: cat.createdAt || new Date().toISOString()
  })) as Category[];

  return normalized.filter((cat, index, self) =>
    index === self.findIndex(c => c.id === cat.id || c.maLoai === cat.maLoai)
  );
}
