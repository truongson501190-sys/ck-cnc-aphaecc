
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
