
import { useAuth } from '@/hooks/useAuth';

type PermissionLevel = 'none' | 'view' | 'full';

const PERMISSION_KEYS = [
  'nhap_kho', 'xuat_kho', 'chuyen_kho', 'xuat_dau', 'kiem_ke_kho', 'ton_kho', 'the_kho', 'lich_su_giao_dich',
  'ke_hoach_san_xuat', 'nhat_ky_gia_cong', 'nhat_ky_qc', 'nhat_ky_bao_tri', 'theo_doi_tien_do',
  'dashboard_tong_hop', 'bao_cao_kho', 'bao_cao_gia_cong', 'bao_cao_qc', 'bao_cao_bao_tri', 'hieu_suat_may', 'cho_duyet',
  'chung_loai', 'kho', 'may_moc', 'du_an',
  'quan_ly_nguoi_dung', 'phan_quyen', 'audit_log', 'backup_restore', 'cai_dat_he_thong'
];

export function usePermission() {
  const { user } = useAuth();

  const getPermissions = () => {
    if (!user?.msnv) {
      const defaultPerms: Record<string, PermissionLevel> = {};
      PERMISSION_KEYS.forEach(key => defaultPerms[key] = 'none');
      return defaultPerms;
    }
    const storedPerms = localStorage.getItem(`wms_user_permissions_${user.msnv}`);
    if (storedPerms) {
      try {
        const parsed = JSON.parse(storedPerms);
        // Convert old boolean format to new string format
        const converted: Record<string, PermissionLevel> = {};
        PERMISSION_KEYS.forEach(key => {
          const val = parsed[key];
          if (typeof val === 'boolean') {
            converted[key] = val ? 'full' : 'none';
          } else if (typeof val === 'string' && ['none', 'view', 'full'].includes(val)) {
            converted[key] = val as PermissionLevel;
          } else {
            converted[key] = 'none';
          }
        });
        return converted;
      } catch (e) {
        // If parse fails, return default none for all keys
        const defaultPerms: Record<string, PermissionLevel> = {};
        PERMISSION_KEYS.forEach(key => defaultPerms[key] = 'none');
        return defaultPerms;
      }
    }
    // If no permissions stored, return default none for all keys
    const defaultPerms: Record<string, PermissionLevel> = {};
    PERMISSION_KEYS.forEach(key => defaultPerms[key] = 'none');
    return defaultPerms;
  };

  const canView = (module: string): boolean => {
    const perm = getPermissions()[module];
    return perm === 'view' || perm === 'full';
  };

  const canEdit = (module: string): boolean => {
    const perm = getPermissions()[module];
    return perm === 'full';
  };

  const hasPermission = (module: string, level: PermissionLevel): boolean => {
    const perm = getPermissions()[module];
    if (level === 'none') return perm === 'none';
    if (level === 'view') return perm === 'view' || perm === 'full';
    if (level === 'full') return perm === 'full';
    return false;
  };

  return { canView, canEdit, hasPermission, getPermissions };
}
