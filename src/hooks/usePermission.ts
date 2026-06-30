
import { useAuth } from '@/contexts/AuthContext';
import { PERMISSION_KEYS, type PermissionLevel } from '@/lib/permissions';

export function usePermission() {
  const { hasPermission: hasAuthPermission, isAdmin } = useAuth();

  const canView = (module: string): boolean => {
    if (isAdmin) return true;
    return hasAuthPermission(module, 'view');
  };

  const canEdit = (module: string): boolean => {
    if (isAdmin) return true;
    return hasAuthPermission(module, 'edit');
  };

  const hasPermission = (module: string, level: PermissionLevel): boolean => {
    if (isAdmin) return true;
    if (level === 'none') return !hasAuthPermission(module, 'view');
    if (level === 'view') return canView(module);
    if (level === 'full') return canEdit(module);
    return false;
  };

  const getPermissions = () => {
    const perms: Record<string, PermissionLevel> = {};
    PERMISSION_KEYS.forEach(key => {
      if (canEdit(key)) {
        perms[key] = 'full';
      } else if (canView(key)) {
        perms[key] = 'view';
      } else {
        perms[key] = 'none';
      }
    });
    return perms;
  };

  return { canView, canEdit, hasPermission, getPermissions };
}
