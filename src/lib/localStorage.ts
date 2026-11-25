// src/lib/localStorage.ts

// ============================================================
// 1. ĐỊNH NGHĠA CÁC KEY LƯU TRỮ
// ============================================================

export const STORAGE_KEYS = {
  // Danh mục vật tư
  CATEGORIES: 'materialCategories',
  
  // Các loại giao dịch
  IMPORTS: 'warehouseImports',
  EXPORTS: 'warehouseExports',
  TRANSFERS: 'warehouseTransfers',
  CONSUMABLES: 'consumableExports',
  ADJUSTMENTS: 'warehouseAdjustments',
  
  // Phiếu kiểm kê
  INVENTORY_COUNTS: 'inventoryCountEntries',
  
  // Người dùng (giữ nguyên từ code cũ)
  USERS: 'wms_users',
  USERS_ALT: 'users',
} as const;

// Danh sách các key giao dịch để dễ duyệt
export const TRANSACTION_KEYS = [
  STORAGE_KEYS.IMPORTS,
  STORAGE_KEYS.EXPORTS,
  STORAGE_KEYS.TRANSFERS,
  STORAGE_KEYS.CONSUMABLES,
  STORAGE_KEYS.ADJUSTMENTS,
] as const;

// ============================================================
// 2. HÀM TIỆN ÍCH CHUNG (Generic)
// ============================================================

/**
 * Tải mảng dữ liệu từ localStorage
 */
export function loadArrayFromStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Lưu mảng dữ liệu vào localStorage
 */
export function saveArrayToStorage<T>(key: string, records: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Tạo ID duy nhất
 */
export function buildLocalId(prefix = 'id'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Kiểm tra xem key có tồn tại trong localStorage không
 */
export function hasStorageKey(key: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(key) !== null;
}

/**
 * Xóa một key khỏi localStorage
 */
export function removeStorageKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ============================================================
// 3. HÀM TIỆN ÍCH CHO NGƯỜI DÙNG (giữ nguyên từ code cũ)
// ============================================================

export const USER_STORAGE_KEYS = [STORAGE_KEYS.USERS, STORAGE_KEYS.USERS_ALT] as const;

export function loadUsersFromStorage<T = any>(): T[] {
  if (typeof window === 'undefined') return [];
  for (const key of USER_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore parse errors
    }
  }
  return [];
}

export function saveUsersToStorage<T = any>(users: T[]): void {
  if (typeof window === 'undefined') return;
  for (const key of USER_STORAGE_KEYS) {
    try {
      localStorage.setItem(key, JSON.stringify(users));
    } catch {
      // ignore
    }
  }
}

// ============================================================
// 4. HÀM TIỆN ÍCH CHO DANH MỤC VẬT TƯ
// ============================================================

export function loadCategories<T = any>(): T[] {
  return loadArrayFromStorage<T>(STORAGE_KEYS.CATEGORIES);
}

export function saveCategories<T = any>(categories: T[]): void {
  saveArrayToStorage(STORAGE_KEYS.CATEGORIES, categories);
}

// ============================================================
// 5. HÀM TIỆN ÍCH CHO GIAO DỊCH
// ============================================================

/**
 * Tải tất cả giao dịch từ tất cả các key (nhập, xuất, chuyển, tiêu hao, điều chỉnh)
 * Gán thêm trường `type` để phân biệt
 */
export function loadAllTransactions(): any[] {
  const all: any[] = [];

  // Import
  const imports = loadArrayFromStorage(STORAGE_KEYS.IMPORTS);
  imports.forEach((t: any) => all.push({ ...t, type: 'import' }));

  // Export
  const exports = loadArrayFromStorage(STORAGE_KEYS.EXPORTS);
  exports.forEach((t: any) => all.push({ ...t, type: 'export' }));

  // Transfer
  const transfers = loadArrayFromStorage(STORAGE_KEYS.TRANSFERS);
  transfers.forEach((t: any) => all.push({ ...t, type: 'transfer' }));

  // Consumable
  const consumables = loadArrayFromStorage(STORAGE_KEYS.CONSUMABLES);
  consumables.forEach((t: any) => all.push({ ...t, type: 'consumable' }));

  // Adjustment
  const adjustments = loadArrayFromStorage(STORAGE_KEYS.ADJUSTMENTS);
  adjustments.forEach((t: any) => all.push({ ...t, type: 'adjustment' }));

  return all;
}

/**
 * Lưu một giao dịch vào đúng key dựa trên type
 */
export function saveTransaction(transaction: any): void {
  const { type, ...rest } = transaction;
  let key: string;
  switch (type) {
    case 'import':
      key = STORAGE_KEYS.IMPORTS;
      break;
    case 'export':
      key = STORAGE_KEYS.EXPORTS;
      break;
    case 'transfer':
      key = STORAGE_KEYS.TRANSFERS;
      break;
    case 'consumable':
      key = STORAGE_KEYS.CONSUMABLES;
      break;
    case 'adjustment':
      key = STORAGE_KEYS.ADJUSTMENTS;
      break;
    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
  const existing = loadArrayFromStorage(key);
  // Nếu có id, cập nhật, nếu không thêm mới
  const idx = existing.findIndex((t: any) => t.id === rest.id);
  if (idx >= 0) {
    existing[idx] = { ...rest, type }; // giữ type bên trong
  } else {
    existing.push({ ...rest, type });
  }
  saveArrayToStorage(key, existing);
}

/**
 * Xóa giao dịch theo id và type
 */
export function deleteTransaction(id: string, type: string): void {
  let key: string;
  switch (type) {
    case 'import':
      key = STORAGE_KEYS.IMPORTS;
      break;
    case 'export':
      key = STORAGE_KEYS.EXPORTS;
      break;
    case 'transfer':
      key = STORAGE_KEYS.TRANSFERS;
      break;
    case 'consumable':
      key = STORAGE_KEYS.CONSUMABLES;
      break;
    case 'adjustment':
      key = STORAGE_KEYS.ADJUSTMENTS;
      break;
    default:
      throw new Error(`Unknown transaction type: ${type}`);
  }
  const existing = loadArrayFromStorage(key);
  const filtered = existing.filter((t: any) => t.id !== id);
  saveArrayToStorage(key, filtered);
}

// ============================================================
// 6. HÀM TIỆN ÍCH CHO KIỂM KÊ
// ============================================================

export function loadInventoryCounts<T = any>(): T[] {
  return loadArrayFromStorage<T>(STORAGE_KEYS.INVENTORY_COUNTS);
}

export function saveInventoryCounts<T = any>(counts: T[]): void {
  saveArrayToStorage(STORAGE_KEYS.INVENTORY_COUNTS, counts);
}

export function addInventoryCount<T = any>(count: T): void {
  const counts = loadInventoryCounts();
  counts.push(count);
  saveInventoryCounts(counts);
}

export function updateInventoryCount<T extends { id: string }>(count: T): void {
  const counts = loadInventoryCounts<T>();
  const idx = counts.findIndex(c => c.id === count.id);
  if (idx >= 0) {
    counts[idx] = count;
    saveInventoryCounts(counts);
  }
}

export function deleteInventoryCount(id: string): void {
  const counts = loadInventoryCounts();
  saveInventoryCounts(counts.filter((c: any) => c.id !== id));
}

// ============================================================
// 7. HÀM TIỆN ÍCH: XÓA TẤT CẢ DỮ LIỆU KHO (reset)
// ============================================================

export function clearAllWarehouseData(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    if (typeof key === 'string') {
      localStorage.removeItem(key);
    }
  });
}

// ============================================================
// 8. EXPORT DEFAULT (cho tiện)
// ============================================================

export default {
  STORAGE_KEYS,
  TRANSACTION_KEYS,
  USER_STORAGE_KEYS,
  loadArrayFromStorage,
  saveArrayToStorage,
  buildLocalId,
  hasStorageKey,
  removeStorageKey,
  loadUsersFromStorage,
  saveUsersToStorage,
  loadCategories,
  saveCategories,
  loadAllTransactions,
  saveTransaction,
  deleteTransaction,
  loadInventoryCounts,
  saveInventoryCounts,
  addInventoryCount,
  updateInventoryCount,
  deleteInventoryCount,
  clearAllWarehouseData,
};