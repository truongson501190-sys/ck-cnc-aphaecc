
import { useState, useEffect, useCallback } from 'react';
import type { RoleRecord, PermissionLevel } from '@/types/system';

const STORAGE_KEY = 'system_roles';

// Danh sách quyền mặc định (dùng để khởi tạo)
const PERMISSION_KEYS = [
  'nhap_kho', 'xuat_kho', 'chuyen_kho', 'xuat_dau', 'kiem_ke_kho', 'ton_kho', 'the_kho', 'lich_su_giao_dich',
  'ke_hoach_san_xuat', 'nhat_ky_gia_cong', 'nhat_ky_qc', 'nhat_ky_bao_tri', 'theo_doi_tien_do',
  'dashboard_tong_hop', 'bao_cao_kho', 'bao_cao_gia_cong', 'bao_cao_qc', 'bao_cao_bao_tri', 'hieu_suat_may', 'cho_duyet',
  'chung_loai', 'kho', 'may_moc', 'du_an',
  'quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 'backup_restore', 'cai_dat_he_thong'
];

// Vai trò mặc định
const DEFAULT_ROLES: RoleRecord[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Quản trị viên hệ thống - toàn quyền truy cập',
    permissions: PERMISSION_KEYS.reduce((acc, key) => {
      acc[key] = 'full';
      return acc;
    }, {} as Record<string, PermissionLevel>),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'manager',
    name: 'Quản lý',
    description: 'Quản lý - xem được báo cáo và quản lý một số module',
    permissions: PERMISSION_KEYS.reduce((acc, key) => {
      if (['quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 'backup_restore', 'cai_dat_he_thong'].includes(key)) {
        acc[key] = 'none';
      } else {
        acc[key] = 'full';
      }
      return acc;
    }, {} as Record<string, PermissionLevel>),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'user',
    name: 'Người dùng',
    description: 'Người dùng thông thường - chỉ xem và thao tác cơ bản',
    permissions: PERMISSION_KEYS.reduce((acc, key) => {
      if (['ton_kho', 'the_kho', 'lich_su_giao_dich', 'dashboard_tong_hop'].includes(key)) {
        acc[key] = 'view';
      } else {
        acc[key] = 'none';
      }
      return acc;
    }, {} as Record<string, PermissionLevel>),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function useRoles() {
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(() => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRoles(Array.isArray(parsed) ? parsed : DEFAULT_ROLES);
      } else {
        setRoles(DEFAULT_ROLES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ROLES));
      }
    } catch (err) {
      console.error('Error loading roles:', err);
      setRoles(DEFAULT_ROLES);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRoles = useCallback((newRoles: RoleRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newRoles));
      setRoles(newRoles);
    } catch (err) {
      console.error('Error saving roles:', err);
    }
  }, []);

  const getRoleById = useCallback((id: string): RoleRecord | undefined => {
    return roles.find(r => r.id === id);
  }, [roles]);

  const upsertRole = useCallback((role: RoleRecord) => {
    const index = roles.findIndex(r => r.id === role.id);
    let newRoles: RoleRecord[];

    if (index >= 0) {
      newRoles = [...roles];
      newRoles[index] = { ...role, updatedAt: new Date().toISOString() };
    } else {
      newRoles = [...roles, { ...role, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    }

    saveRoles(newRoles);
  }, [roles, saveRoles]);

  const deleteRole = useCallback((id: string) => {
    if (id === 'admin') return; // Không cho xóa vai trò admin
    const newRoles = roles.filter(r => r.id !== id);
    saveRoles(newRoles);
  }, [roles, saveRoles]);

  useEffect(() => {
    loadRoles();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadRoles();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadRoles]);

  return {
    roles,
    loading,
    loadRoles,
    saveRoles,
    getRoleById,
    upsertRole,
    deleteRole,
    PERMISSION_KEYS
  };
}

export function getRoles(): RoleRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : DEFAULT_ROLES;
    }
    return DEFAULT_ROLES;
  } catch (err) {
    console.error('Error getting roles:', err);
    return DEFAULT_ROLES;
  }
}

export function getRoleById(id: string): RoleRecord | undefined {
  const roles = getRoles();
  return roles.find(r => r.id === id);
}

