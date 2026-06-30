import {
  createAdminPermissions,
  createDefaultPermissions,
  type PermissionFlag,
  type UserPermissions,
} from '@/lib/permissions';

export type { PermissionFlag, UserPermissions };

/**
 * Primary user authentication & identity record
 * Standardized to snake_case for Supabase consistency
 */
export interface User {
  // Identity & Authentication
  msnv: string;
  full_name?: string;
  fullName?: string;
  ho_ten?: string;
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
  password_hash?: string;

  // HR Information
  department?: string;
  phong_ban?: string;
  position?: string;
  chuc_vu?: string;

  // System Roles
  role?: 'user' | 'manager' | 'admin' | 'quan_ly_xuong' | 'to_truong' | 'to_pho' | 'nhom_truong' | string;
  role_group?: string;
  roleGroup?: string;

  // Status & Audit
  status?: 'active' | 'inactive' | string;
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
  last_login?: string | Date;
  lastLogin?: string;

  // Application State
  permissions?: UserPermissions;
}

export interface UserProfile {
  msnv: string;
  fullName: string;
  department: string;
  roleGroup: string;
}

// =====================
// PERMISSIONS
// =====================
export const DEFAULT_PERMISSIONS: UserPermissions = createDefaultPermissions();

export const ADMIN_PERMISSIONS: UserPermissions = createAdminPermissions();

export interface UserLog {
  id: string;
  adminMsnv: string;
  targetMsnv: string;
  action: string;
  changes: unknown;
  timestamp: string;
}
