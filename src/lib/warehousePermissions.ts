/**
 * Warehouse Permission Management by Department
 * 
 * Defines which warehouses each department can access for exports
 */

export type Department = 'Kho' | 'Tổ CNC' | 'Tổ Cơ khí' | 'Admin' | 'Khác' | 'Quản trị';

export type WarehouseCode = 'kho-tong' | 'kho-cnc' | 'kho-co-khi' | 'kho-dau';

export interface WarehouseInfo {
  code: WarehouseCode;
  name: string;
  displayName: string;
}

/**
 * Warehouse codes mapping
 */
export const WAREHOUSES: Record<WarehouseCode, WarehouseInfo> = {
  'kho-tong': { code: 'kho-tong', name: 'Kho Tổng', displayName: 'Kho Tổng' },
  'kho-cnc': { code: 'kho-cnc', name: 'Kho CNC', displayName: 'Kho CNC' },
  'kho-co-khi': { code: 'kho-co-khi', name: 'Kho Cơ Khí', displayName: 'Kho Cơ Khí' },
  'kho-dau': { code: 'kho-dau', name: 'Kho Dầu', displayName: 'Kho Dầu' }
};

/**
 * Department to warehouse mapping for export permissions
 * 
 * Rules:
 * - Bộ phận "Kho": Được phép xuất tất cả (Kho Tổng, Kho CNC, Kho Cơ Khí, Kho Dầu)
 * - Bộ phận "Tổ CNC": Chỉ được phép xuất Kho CNC
 * - Bộ phận "Cơ Khí": Chỉ được phép xuất Kho Cơ Khí
 * - Admin: Được phép xuất tất cả
 */
const DEPARTMENT_WAREHOUSE_PERMISSIONS: Record<Department, WarehouseCode[]> = {
  'Kho': ['kho-tong', 'kho-cnc', 'kho-co-khi', 'kho-dau'],
  'Tổ CNC': ['kho-cnc'],
  'Tổ Cơ khí': ['kho-co-khi'],
  'Quản trị': ['kho-tong', 'kho-cnc', 'kho-co-khi', 'kho-dau'],
  'Admin': ['kho-tong', 'kho-cnc', 'kho-co-khi', 'kho-dau'],
  'Khác': []
};

/**
 * Get allowed warehouses for a specific department
 * @param department - The department name
 * @returns Array of warehouse codes that the department can access
 */
export function getAllowedWarehousesByDepartment(department: Department | string | undefined): WarehouseCode[] {
  if (!department) {
    return [];
  }

  // Normalize department name
  const normalized = department.trim();
  const allowed = DEPARTMENT_WAREHOUSE_PERMISSIONS[normalized as Department];

  if (allowed) {
    return allowed;
  }

  // Default to empty array if department not found
  return [];
}

/**
 * Check if a department can export from a specific warehouse
 * @param department - The department name
 * @param warehouse - The warehouse code
 * @returns true if the department has permission to export from this warehouse
 */
export function canExportFromWarehouse(
  department: Department | string | undefined,
  warehouse: WarehouseCode | string | undefined
): boolean {
  if (!department || !warehouse) {
    return false;
  }

  const allowed = getAllowedWarehousesByDepartment(department);
  return allowed.includes(warehouse as WarehouseCode);
}

/**
 * Get all allowed warehouses for a department with display information
 * @param department - The department name
 * @returns Array of warehouse info objects
 */
export function getAllowedWarehousesInfo(department: Department | string | undefined): WarehouseInfo[] {
  const codes = getAllowedWarehousesByDepartment(department);
  return codes.map(code => WAREHOUSES[code]).filter(Boolean);
}

/**
 * Get warehouse display name by code
 * @param code - The warehouse code
 * @returns The display name of the warehouse
 */
export function getWarehouseDisplayName(code: WarehouseCode | string | undefined): string {
  if (!code) return '';
  const warehouse = WAREHOUSES[code as WarehouseCode];
  return warehouse ? warehouse.displayName : code;
}

/**
 * Validate warehouse selection for a user
 * @param department - The user's department
 * @param selectedWarehouse - The selected warehouse code
 * @returns Validation result with message
 */
export function validateWarehouseSelection(
  department: Department | string | undefined,
  selectedWarehouse: WarehouseCode | string | undefined
): { valid: boolean; message: string } {
  if (!department) {
    return { valid: false, message: 'Vui lòng chọn người xuất trước' };
  }

  if (!selectedWarehouse) {
    return { valid: false, message: 'Vui lòng chọn kho xuất' };
  }

  const allowed = getAllowedWarehousesByDepartment(department);
  const warehouseCode = selectedWarehouse as WarehouseCode;

  if (!allowed.includes(warehouseCode)) {
    const allowedNames = allowed.map(code => getWarehouseDisplayName(code)).join(', ');
    return {
      valid: false,
      message: `Bộ phận "${department}" chỉ được phép xuất từ: ${allowedNames}`
    };
  }

  return { valid: true, message: '' };
}
