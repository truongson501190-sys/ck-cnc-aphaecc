// src/types/user.ts

// Import từ permissions.ts để đồng bộ, không định nghĩa lại
import type { PermissionFlag, UserPermissions } from '../lib/permissions';

// Re-export để các file khác có thể import từ đây
export type { PermissionFlag, UserPermissions };

export interface User {
  msnv: string;
  fullName: string;
  role: string;
  roleGroup: string;
  status: string;
  name?: string;
  full_name?: string;
  ho_ten: string;
  hoTen?: string;
  phong_ban?: string;
  chuc_vu?: string;
  username?: string;
  email?: string;
  avatar?: string;
  avatarUrl?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  profile_image?: string;
  permissions: UserPermissions;
  department?: string;
  position?: string;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  lastLogin?: string;
  employee_code?: string;
  id?: string | number;
}

// Helper functions
export const getUserAvatar = (user: User | null): string => {
  if (!user) return '';
  return user.avatar || user.profileImage || user.profile_image || '';
};

export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'User';
  return user.fullName || user.ho_ten || user.username || 'User';
};

export const getUserInitial = (user: User | null): string => {
  if (!user) return 'U';
  const name = user.fullName || user.ho_ten || user.username || 'User';
  return name.charAt(0).toUpperCase();
};