const MENU_LABEL_TO_KEY: Record<string, string> = {
  'Nhập kho': 'Nhập kho',
  'Xuất kho': 'Xuất kho',
  'Chuyển kho': 'Chuyển kho',
  'Xuất dầu': 'Xuất dầu',
  'Kiểm kê kho': 'Kiểm kê kho',
  'Tồn kho': 'Tồn kho',
  'Thẻ kho': 'Thẻ kho',
  'Lịch sử giao dịch': 'Lịch sử giao dịch',
  'Kế hoạch sản xuất': 'Kế hoạch sản xuất',
  'Nhật ký gia công': 'Nhật ký gia công',
  'Nhật ký QC': 'Nhật ký QC',
  'Nhật ký bảo trì': 'Nhật ký bảo trì',
  'Theo dõi tiến độ': 'Theo dõi tiến độ',
  'Dashboard tổng hợp': 'Dashboard tổng hợp',
  'Báo cáo kho': 'Báo cáo kho',
  'Báo cáo gia công': 'Báo cáo gia công',
  'Báo cáo QC': 'Báo cáo QC',
  'Báo cáo bảo trì': 'Báo cáo bảo trì',
  'Hiệu suất máy': 'Hiệu suất máy',
  'Chờ duyệt': 'Chờ duyệt',
  'Chủng loại': 'Chủng loại',
  'Vật tư': 'Vật tư',
  'Kho': 'Kho',
  'Máy móc': 'Máy móc',
  'Dự án': 'Dự án',
  'Nhân viên': 'Nhân viên',
  'Quản lý người dùng': 'Quản lý người dùng',
  'Phân quyền': 'Phân quyền',
  'Audit Log': 'Audit Log',
  'Backup & Restore': 'Backup & Restore',
  'Cài đặt hệ thống': 'Cài đặt hệ thống',
};

export interface PermissionUser {
  role?: string;
  roleGroup?: string;
  position?: string;
  msnv?: string;
}

export function hasWmsPermission(user: PermissionUser | null | undefined, menuLabel: string): boolean {
  if (!user) return false;
  
  if (user.role === 'admin') return true;
  
  const wmsPermissionsStr = localStorage.getItem('wms_permissions');
  if (!wmsPermissionsStr) return false;
  
  try {
    const wmsPermissions = JSON.parse(wmsPermissionsStr);
    const userRole = user.roleGroup || user.position || 'Thợ CNC';
    const userMsnv = user.msnv || '';
    const menuKey = MENU_LABEL_TO_KEY[menuLabel] || menuLabel;
    
    if (wmsPermissions[userMsnv]?.[menuKey]) {
      return true;
    }
    
    if (wmsPermissions[userRole]?.[menuKey]) {
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('Error checking wms_permissions:', e);
    return false;
  }
}
