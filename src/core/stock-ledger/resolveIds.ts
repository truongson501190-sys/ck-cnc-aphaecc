import { getSavedCategories } from '@/lib/utils';

/**
 * QUAN TRỌNG: Throw error thay vì fallback để tránh ghi data rác vào stock_ledger.
 * Nếu user gặp error này → cần load Master Data trước khi nhập/xuất kho.
 */
export function resolveWarehouseId(raw: string | undefined | null): string {
  if (!raw) {
    throw new Error('warehouse_id là bắt buộc. Vui lòng chọn kho trước khi nhập/xuất.');
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    throw new Error('warehouse_id là bắt buộc. Vui lòng chọn kho trước khi nhập/xuất.');
  }

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
    // Continue to the explicit not-found error below.
  }
  throw new Error(`Không tìm thấy kho "${raw}". Vui lòng vào Master Data → Kho để load danh sách kho.`);
}

/**
 * QUAN TRỌNG: Throw error thay vì fallback để tránh ghi data rác vào stock_ledger.
 * Nếu user gặp error này → cần load Master Data trước khi nhập/xuất kho.
 */
export function resolveProductId(raw: string | undefined | null): string {
  if (!raw) {
    throw new Error('product_id là bắt buộc. Vui lòng chọn sản phẩm.');
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    throw new Error('product_id là bắt buộc. Vui lòng chọn sản phẩm.');
  }

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
  throw new Error(`Không tìm thấy sản phẩm "${raw}". Vui lòng vào Master Data → Chủng loại để load danh sách.`);
}
