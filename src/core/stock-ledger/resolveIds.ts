import { getSavedCategories } from '@/lib/utils';

/** Resolve warehouse id from stored id, code, or display name */
export function resolveWarehouseId(raw: string | undefined | null): string {
  if (!raw) return 'default';
  const trimmed = String(raw).trim();
  if (!trimmed) return 'default';

  try {
    const keys = ['warehouses', 'category_warehouses'];
    for (const key of keys) {
      const saved = localStorage.getItem(key);
      if (!saved) continue;
      const list = JSON.parse(saved) as Array<Record<string, unknown>>;
      if (!Array.isArray(list)) continue;
      const match = list.find(
        (w) =>
          String(w.id) === trimmed ||
          String(w.maKho) === trimmed ||
          String(w.tenKho) === trimmed ||
          String(w.loaiKho) === trimmed
      );
      if (match?.id) return String(match.id);
      if (match?.maKho) return String(match.maKho);
      if (match?.tenKho) return String(match.tenKho);
    }
  } catch {
    /* use raw */
  }
  return trimmed;
}

/** Resolve product id from category id, code, or display name */
export function resolveProductId(raw: string | undefined | null): string {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  if (!trimmed) return '';

  const categories = getSavedCategories();
  const match = categories.find(
    (c) =>
      c.id === trimmed ||
      c.maLoai === trimmed ||
      c.maChungLoai === trimmed ||
      c.tenLoai === trimmed ||
      c.tenChungLoai === trimmed
  );
  if (match?.id) return match.id;
  if (match?.maLoai) return match.maLoai;
  return trimmed;
}
