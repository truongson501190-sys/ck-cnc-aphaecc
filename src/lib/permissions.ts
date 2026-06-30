// src/lib/permissions.ts
/**
 * THỐNG NHẤT PERMISSION FORMAT TOÀN HỆ THỐNG
 * Single Source of Truth cho tất cả permission operations
 * Đồng bộ với menu hệ thống
 */

// ==================== ĐỊNH NGHĨA CƠ BẢN ====================

export type PermissionLevel = 'none' | 'view' | 'full';

export interface PermissionFlag {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export type UserPermissions = Record<string, PermissionFlag>;

// src/lib/permissions.ts

// ==================== PERMISSION KEYS ====================

export const PERMISSION_KEYS = [
  // 🏭 Sản xuất (Manufacturing)
  'ke_hoach_san_xuat',
  'nhat_ky_gia_cong',
  'nhat_ky_qc',
  'nhat_ky_bao_tri',
  'theo_doi_tien_do',
  
  // 📦 Kho bãi (WMS)
  'nhap_kho',
  'xuat_kho',
  'chuyen_kho',
  'xuat_dau',
  'kiem_ke_kho',
  'ton_kho',
  'the_kho',
  'lich_su_giao_dich',
  
  // 📊 Báo cáo & Dashboard
  'dashboard_tong_hop',
  'bao_cao_kho',
  'bao_cao_gia_cong',
  'hieu_suat_may',
  'tieu_hao_vat_lieu',
  'cho_duyet',
  
  // 🗂 Quản Lý Danh Mục (ĐÃ SỬA TÊN)
  'chung_loai',        // ✅ Đúng: Chủng loại
  'kho',               // ✅ Đúng: Kho
  'may_moc',           // ✅ Đúng: Máy móc
  'dao_cu',            // ✅ Đúng: Dao cụ
  'du_an',             // ✅ Đúng: Dự án
  
  // ⚙ Hệ thống
  'quan_ly_nguoi_dung',
  'phan_quyen',
  'audit_log',
  'backup_restore',
  'cai_dat_he_thong',
  
  // 👤 Tài khoản
  'ho_so_ca_nhan',
  'doi_mat_khau',
] as const;

// ==================== PERMISSION GROUPS ====================

export const PERMISSION_GROUPS: Record<string, string[]> = {
  '🏭 Sản xuất': [
    'ke_hoach_san_xuat',
    'nhat_ky_gia_cong',
    'nhat_ky_qc',
    'nhat_ky_bao_tri',
    'theo_doi_tien_do'
  ],
  '📦 Kho bãi (WMS)': [
    'nhap_kho',
    'xuat_kho',
    'chuyen_kho',
    'xuat_dau',
    'kiem_ke_kho',
    'ton_kho',
    'the_kho',
    'lich_su_giao_dich'
  ],
  '📊 Báo cáo & Dashboard': [
    'dashboard_tong_hop',
    'bao_cao_kho',
    'bao_cao_gia_cong',
    'hieu_suat_may',
    'tieu_hao_vat_lieu',
    'cho_duyet'
  ],
  '🗂 Quản Lý Danh Mục': [   // ✅ Đúng tên nhóm
    'chung_loai',            // ✅ Chủng loại
    'kho',                   // ✅ Kho
    'may_moc',               // ✅ Máy móc
    'dao_cu',                // ✅ Dao cụ
    'du_an'                  // ✅ Dự án
  ],
  '⚙ Hệ thống': [
    'quan_ly_nguoi_dung',
    'phan_quyen',
    'audit_log',
    'backup_restore',
    'cai_dat_he_thong'
  ],
  '👤 Tài khoản': [
    'ho_so_ca_nhan',
    'doi_mat_khau'
  ],
};

// ==================== PERMISSION LABELS ====================

export const PERMISSION_LABELS: Record<string, string> = {
  // 🏭 Sản xuất
  'ke_hoach_san_xuat': 'Kế hoạch sản xuất',
  'nhat_ky_gia_cong': 'Nhật ký gia công',
  'nhat_ky_qc': 'Nhật ký QC',
  'nhat_ky_bao_tri': 'Nhật ký bảo trì',
  'theo_doi_tien_do': 'Theo dõi tiến độ',
  
  // 📦 Kho bãi
  'nhap_kho': 'Nhập kho',
  'xuat_kho': 'Xuất kho',
  'chuyen_kho': 'Chuyển kho',
  'xuat_dau': 'Xuất dầu',
  'kiem_ke_kho': 'Kiểm kê kho',
  'ton_kho': 'Tồn kho',
  'the_kho': 'Thẻ kho',
  'lich_su_giao_dich': 'Lịch sử giao dịch',
  
  // 📊 Báo cáo
  'dashboard_tong_hop': 'Dashboard tổng hợp',
  'bao_cao_kho': 'Báo cáo kho',
  'bao_cao_gia_cong': 'Báo cáo gia công',
  'hieu_suat_may': 'Hiệu suất máy',
  'tieu_hao_vat_lieu': 'Tiêu hao vật liệu',
  'cho_duyet': 'Chờ duyệt',
  
  // 🗂 Quản Lý Danh Mục (ĐÃ SỬA)
  'chung_loai': 'Chủng loại',     // ✅ Đúng
  'kho': 'Kho',                    // ✅ Đúng
  'may_moc': 'Máy móc',            // ✅ Đúng
  'dao_cu': 'Dao cụ',              // ✅ Đúng
  'du_an': 'Dự án',                // ✅ Đúng
  
  // ⚙ Hệ thống
  'quan_ly_nguoi_dung': 'Quản lý người dùng',
  'phan_quyen': 'Phân quyền',
  'audit_log': 'Audit Log',
  'backup_restore': 'Backup & Restore',
  'cai_dat_he_thong': 'Cài đặt hệ thống',
  
  // 👤 Tài khoản
  'ho_so_ca_nhan': 'Hồ sơ cá nhân',
  'doi_mat_khau': 'Đổi mật khẩu',
};

// ==================== CONVERT FUNCTIONS ====================

export function levelToFlag(level: PermissionLevel): PermissionFlag {
  return {
    view: level !== 'none',
    add: level === 'full',
    edit: level === 'full',
    delete: level === 'full',
    approve: level === 'full',
    export: level === 'full' || level === 'view',
  };
}

export function flagToLevel(flag: PermissionFlag | null | undefined): PermissionLevel {
  if (!flag) return 'none';
  if (flag.edit && flag.delete && flag.add) return 'full';
  if (flag.view || flag.export) return 'view';
  return 'none';
}

export function permissionsToLevels(permissions: UserPermissions): Record<string, PermissionLevel> {
  const result: Record<string, PermissionLevel> = {};
  for (const key of PERMISSION_KEYS) {
    result[key] = flagToLevel(permissions[key]);
  }
  return result;
}

export function levelsToPermissions(levels: Record<string, PermissionLevel>): UserPermissions {
  const result: UserPermissions = {};
  for (const [key, level] of Object.entries(levels)) {
    result[key] = levelToFlag(level);
  }
  return result;
}

export function createPermissionLevelMap(level: PermissionLevel): Record<string, PermissionLevel> {
  const result: Record<string, PermissionLevel> = {};
  for (const key of PERMISSION_KEYS) {
    result[key] = level;
  }
  return result;
}

export function createUserPermissions(level: PermissionLevel): UserPermissions {
  return levelsToPermissions(createPermissionLevelMap(level));
}

// ==================== DEFAULT PERMISSIONS ====================

export function createDefaultPermissions(): UserPermissions {
  const levels = createPermissionLevelMap('none');
  // User thường chỉ xem được các module cơ bản
  levels.ton_kho = 'view';
  levels.the_kho = 'view';
  levels.lich_su_giao_dich = 'view';
  levels.dashboard_tong_hop = 'view';
  levels.bao_cao_kho = 'view';
  levels.bao_cao_gia_cong = 'view';
  return levelsToPermissions(levels);
}

export function createAdminPermissions(): UserPermissions {
  return createUserPermissions('full');
}

// ==================== CHECK FUNCTIONS ====================

export function hasPermissionFlag(
  flag: PermissionFlag | undefined,
  level: 'view' | 'edit'
): boolean {
  if (!flag) return false;
  if (level === 'view') return flag.view || flag.edit || flag.add || flag.delete || flag.approve;
  if (level === 'edit') return flag.edit || flag.add || flag.delete || flag.approve;
  return false;
}

export function hasPermissionLevel(
  levels: Record<string, PermissionLevel> | undefined,
  moduleKey: string,
  requiredLevel: 'view' | 'edit'
): boolean {
  if (!levels) return false;
  const level = levels[moduleKey] || 'none';
  if (requiredLevel === 'view') return level === 'view' || level === 'full';
  if (requiredLevel === 'edit') return level === 'full';
  return false;
}

// ==================== LEGACY SUPPORT ====================

export function getUserPermissionsStorageKey(msnv: string): string {
  return `permissions_${msnv}`;
}

export function getLegacyWmsUserPermissionsStorageKey(msnv: string): string {
  return `wms_permissions_${msnv}`;
}

export function coercePermissionsToLevels(data: any): Record<string, PermissionLevel> {
  const result: Record<string, PermissionLevel> = createPermissionLevelMap('none');
  if (!data || typeof data !== 'object') return result;
  for (const key of PERMISSION_KEYS) {
    const value = data[key];
    if (value === 'none' || value === 'view' || value === 'full') {
      result[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = flagToLevel(value as PermissionFlag);
    } else if (typeof value === 'boolean') {
      result[key] = value ? 'full' : 'none';
    }
  }
  return result;
}