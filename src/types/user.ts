// src/types/user.ts

// src/types/user.ts

export type PermissionFlag = boolean | { view: boolean; create?: boolean; edit?: boolean; delete?: boolean };

export interface UserPermissions {
  [key: string]: PermissionFlag; // Backwards-compatible: boolean or structured { view, edit }
}

export interface User {
  msnv: string;
  fullName: string;
  name?: string; // Thêm field name
  hoTen?: string;
  chucDanh?: string;
  boPhan?: string;
  matKhau?: string;
  vaiTro?: string;
  trangThai?: string;
  department: string;
  roleGroup: string;
  role?: 'user' | 'manager' | 'admin' | 'quan_ly_xuong' | 'to_truong' | 'to_pho' | 'nhom_truong';
  permissions?: UserPermissions;
  email?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  username?: string;
  lastLogin?: string | Date;
  position?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfile {
  msnv: string;
  fullName: string;
  department: string;
  roleGroup: string;
}

// ======================
// PERMISSIONS
// ======================
export const DEFAULT_PERMISSIONS: UserPermissions = {
  // WMS - Warehouse Management
  nhap_kho: false,
  xuat_kho: false,
  chuyen_kho: false,
  xuat_dau: false,
  kiem_ke_kho: false,
  ton_kho: false,
  the_kho: false,
  lich_su_giao_dich: false,
  // Manufacturing
  ke_hoach_san_xuat: false,
  nhat_ky_gia_cong: false,
  nhat_ky_qc: false,
  nhat_ky_bao_tri: false,
  theo_doi_tien_do: false,
  // Reports
  dashboard_tong_hop: false,
  bao_cao_kho: false,
  bao_cao_gia_cong: false,
  bao_cao_qc: false,
  bao_cao_bao_tri: false,
  hieu_suat_may: false,
  cho_duyet: false,
  // Master Data
  chung_loai: false,
  kho: false,
  may_moc: false,
  du_an: false,
  // System (Admin only)
  quan_ly_nguoi_dung: false,
  phan_quyen: false,
  audit_log: false,
  backup_restore: false,
  cai_dat_he_thong: false,
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  nhap_kho: true,
  xuat_kho: true,
  chuyen_kho: true,
  xuat_dau: true,
  kiem_ke_kho: true,
  ton_kho: true,
  the_kho: true,
  lich_su_giao_dich: true,
  ke_hoach_san_xuat: true,
  nhat_ky_gia_cong: true,
  nhat_ky_qc: true,
  nhat_ky_bao_tri: true,
  theo_doi_tien_do: true,
  dashboard_tong_hop: true,
  bao_cao_kho: true,
  bao_cao_gia_cong: true,
  bao_cao_qc: true,
  bao_cao_bao_tri: true,
  hieu_suat_may: true,
  cho_duyet: true,
  chung_loai: true,
  kho: true,
  may_moc: true,
  du_an: true,
  quan_ly_nguoi_dung: true,
  phan_quyen: true,
  audit_log: true,
  backup_restore: true,
  cai_dat_he_thong: true,
};

export interface UserLog {
  id: string;
  adminMsnv: string;
  targetMsnv: string;
  action: string;
  changes: unknown;
  timestamp: string;
}