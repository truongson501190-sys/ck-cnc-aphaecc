import { useAuth } from '@/hooks/useAuth';
import type { UserPermissions, ModulePermission } from '@/types/user';

/**
 * usePermission: tiện ích kiểm tra quyền theo module & hành động.
 * - module: một key trong UserPermissions (vd: 'kho-tong', ...)
 * - action: một key trong ModulePermission (view, add, edit, delete, approve, export)
 */
export function usePermission() {
  const { user } = useAuth();

  const can = (module: keyof UserPermissions, action: keyof ModulePermission): boolean => {
    const perms = user?.permissions?.[module];
    return !!perms && !!perms[action];
  };

  const canView = (module: keyof UserPermissions): boolean => {
    return !!user?.permissions?.[module]?.view;
  };

  return { can, canView };
}