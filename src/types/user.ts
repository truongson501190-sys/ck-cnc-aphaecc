export interface User {
  msnv: string; // Mã số nhân viên - dùng để đăng nhập
  fullName: string;
  // optional alias used across components
  name?: string;
  // compatibility aliases (legacy components expect these fields)
  hoTen?: string;
  chucDanh?: string;
  boPhan?: string;
  matKhau?: string;
  vaiTro?: string;
  trangThai?: string;
  email?: string;
  username?: string;
  lastLogin?: string | Date;
  department: 'Tổ CNC' | 'Tổ Cơ khí' | 'Kho' | 'Admin' | 'Khác' | 'Quản trị';
  position: string; // Chức danh
  role: 'user' | 'manager' | 'admin';
  status: string;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  'kho-tong': ModulePermission;
  'kho-co-khi': ModulePermission;
  'kho-cnc': ModulePermission;
  'kho-dau': ModulePermission;
  'bao-cao-tong-hop': ModulePermission;
}

export interface ModulePermission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
  export: boolean;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  'kho-tong': { view: false, add: false, edit: false, delete: false, approve: false, export: false },
  'kho-co-khi': { view: false, add: false, edit: false, delete: false, approve: false, export: false },
  'kho-cnc': { view: false, add: false, edit: false, delete: false, approve: false, export: false },
  'kho-dau': { view: false, add: false, edit: false, delete: false, approve: false, export: false },
  'bao-cao-tong-hop': { view: false, add: false, edit: false, delete: false, approve: false, export: false },
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  'kho-tong': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
  'kho-co-khi': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
  'kho-cnc': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
  'kho-dau': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
  'bao-cao-tong-hop': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
};

export interface UserLog {
  id: string;
  adminMsnv: string;
  targetMsnv: string;
  action: string;
  changes: any;
  timestamp: string;
}