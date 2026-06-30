// src/modules/erp/routes.ts
import type { LucideIcon } from 'lucide-react';
import { hasPermissionFlag, type UserPermissions } from '@/lib/permissions';

import {
  Home,
  Package,
  PackageOpen,
  Droplets,
  ArrowRightLeft,
  FolderTree,
  BarChart3,
  Factory,
  Wrench,
  ClipboardCheck,
  Users,
  Settings,
  ShieldCheck,
  FileText,
  Database,
  UserCircle,
  Key,
  ListChecks,
  ClipboardList,
  Activity,
  Cpu,
  LayoutDashboard,
  Layers,
  MapPin,
  Hourglass,
  Clock,
  HardDrive,
  LogOut,
  NotebookPen,
  BarChart2,
  Drill,
  Microscope,
  Gauge,
  TrendingUp,
  FileWarning,
  DollarSign,
} from 'lucide-react';

// Định nghĩa đơn giản, cho phép mọi key string
export type ERPNavAuthUser = {
  role?: string;
  permissions?: UserPermissions;
} | null | undefined;

export const ERP_ROUTE = {
  login: '/login',
  dashboard: '/',
  warehouse: {
    import: '/warehouse/import',
    export: '/warehouse/export',
    transfer: '/warehouse/transfer',
    oil: '/warehouse/oil',
    inventoryCount: '/warehouse/inventory-count',
    stockCard: '/warehouse/stock-card',
    transactionHistory: '/warehouse/transaction-history',
  },
  manufacturing: {
    plan: '/manufacturing/plan',
    machiningLog: '/manufacturing/machining-log',
    qcLog: '/manufacturing/qc-log',
    maintenanceLog: '/manufacturing/maintenance-log',
    progress: '/manufacturing/progress',
  },
  reports: {
    summary: '/reports/summary',
    warehouse: '/reports/warehouse',
    machining: {
      production: '/reports/machining/production',  // TỔNG HỢP SẢN XUẤT
      tools: '/reports/machining/tools',            // DAO CỤ SỬ DỤNG
      damage: '/reports/machining/damage',          // HAO HỤT DAO CỤ
      cost: '/reports/machining/cost',              // CHI PHÍ GIA CÔNG
    },
    qc: '/reports/qc',
    maintenance: '/reports/maintenance',
    machinePerformance: '/reports/machine-performance',
    pendingApproval: '/reports/pending-approval',
    inventory: '/reports/inventory',
  },
  masterData: {
    categories: '/master-data/categories',
    locations: '/master-data/locations',
    machines: '/master-data/machines',
    projects: '/master-data/projects',
  },
  system: {
    users: '/system/users',
    roles: '/system/roles',
    auditLog: '/system/audit-log',
    backupRestore: '/system/backup-restore',
    settings: '/system/settings',
  },
  account: {
    profile: '/account/profile',
    changePassword: '/account/change-password',
  },
};

export type ERPNavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;
  permissionKey?: string;
  adminOnly?: boolean;
  action?: 'logout';
  children?: ERPNavItem[];  // Thêm children để hỗ trợ sub-menu
};

// ĐỊNH NGHĨA CHUẨN: Đã sửa 'xport' và cho phép nhận 'path', ẩn bắt buộc 'items'
export type ERPNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  path?: string;        // Đường dẫn trực tiếp cho mục phẳng như Trang chủ
  items?: ERPNavItem[]; // Dấu ? để không bắt buộc phải khai báo cụm con
};

export const ERP_NAVIGATION: ERPNavGroup[] = [
  // =========================================================================
  // TRANG CHỦ: Định dạng phẳng hoàn toàn, nằm im một chỗ, bấm ăn ngay
  // =========================================================================
  {
    id: 'main',
    label: 'Trang chủ',
    icon: Home,
    path: ERP_ROUTE.dashboard,
  },
  
  // =========================================================================
  // PHÂN HỆ SẢN XUẤT
  // =========================================================================
  {
    id: 'manufacturing',
    label: 'Sản xuất (Manufacturing)',
    icon: Factory,
    items: [
      { id: 'plan', label: 'Kế hoạch sản xuất', icon: ClipboardList, path: ERP_ROUTE.manufacturing.plan, permissionKey: 'ke_hoach_san_xuat' },
      { id: 'machining-log', label: 'Nhật ký gia công', icon: NotebookPen, path: ERP_ROUTE.manufacturing.machiningLog, permissionKey: 'nhat_ky_gia_cong' },
      { id: 'qc-log', label: 'Nhật ký QC', icon: ClipboardCheck, path: ERP_ROUTE.manufacturing.qcLog, permissionKey: 'nhat_ky_qc' },
      { id: 'maintenance-log', label: 'Nhật ký bảo trì', icon: Wrench, path: ERP_ROUTE.manufacturing.maintenanceLog, permissionKey: 'nhat_ky_bao_tri' },
      { id: 'progress', label: 'Theo dõi tiến độ', icon: Activity, path: ERP_ROUTE.manufacturing.progress, permissionKey: 'theo_doi_tien_do' },
    ],
  },

  // =========================================================================
  // PHÂN HỆ KHO BÃI
  // =========================================================================
  {
    id: 'warehouse',
    label: 'Kho bãi (WMS)',
    icon: Package,
    items: [
      { id: 'import', label: 'Nhập kho', icon: Package, path: ERP_ROUTE.warehouse.import, permissionKey: 'nhap_kho' },
      { id: 'export', label: 'Xuất kho', icon: PackageOpen, path: ERP_ROUTE.warehouse.export, permissionKey: 'xuat_kho' },
      { id: 'transfer', label: 'Chuyển kho', icon: ArrowRightLeft, path: ERP_ROUTE.warehouse.transfer, permissionKey: 'chuyen_kho' },
      { id: 'oil', label: 'Xuất dầu', icon: Droplets, path: ERP_ROUTE.warehouse.oil, permissionKey: 'xuat_dau' },
      { id: 'inventory-count', label: 'Kiểm kê kho', icon: ListChecks, path: ERP_ROUTE.warehouse.inventoryCount, permissionKey: 'kiem_ke_kho' },
      { id: 'inventory', label: 'Tồn kho', icon: HardDrive, path: ERP_ROUTE.reports.inventory, permissionKey: 'ton_kho' },
      { id: 'stock-card', label: 'Thẻ kho', icon: ClipboardList, path: ERP_ROUTE.warehouse.stockCard, permissionKey: 'the_kho' },
      { id: 'transaction-history', label: 'Lịch sử giao dịch', icon: Clock, path: ERP_ROUTE.warehouse.transactionHistory, permissionKey: 'lich_su_giao_dich' },
    ],
  },
  
  // =========================================================================
  // BÁO CÁO & DASHBOARD
  // =========================================================================
  {
    id: 'reports',
    label: ' Báo cáo & Dashboard',
    icon: LayoutDashboard,
    items: [
      { 
        id: 'dashboard-summary', 
        label: 'Dashboard tổng hợp', 
        icon: LayoutDashboard, 
        path: ERP_ROUTE.reports.summary, 
        permissionKey: 'dashboard_tong_hop' 
      },
      { 
        id: 'warehouse-report', 
        label: 'Báo cáo kho', 
        icon: Package, 
        path: ERP_ROUTE.reports.warehouse, 
        permissionKey: 'bao_cao_kho' 
      },
      { 
        id: 'machining-report', 
        label: 'Báo cáo gia công', 
        icon: Drill, 
        permissionKey: 'bao_cao_gia_cong',
        children: [
          { id: 'machining-production', label: 'Tông hợp sản xuất', icon: BarChart2, path: ERP_ROUTE.reports.machining.production, permissionKey: 'bao_cao_gia_cong' },
          { id: 'machining-tools', label: 'Dao cụ sử dụng', icon: Drill, path: ERP_ROUTE.reports.machining.tools, permissionKey: 'bao_cao_gia_cong' },
          { id: 'machining-damage', label: 'Hao hỏng dao cụ', icon: FileWarning, path: ERP_ROUTE.reports.machining.damage, permissionKey: 'bao_cao_gia_cong' },
          { id: 'machining-cost', label: 'Chi phí gia công', icon: DollarSign, path: ERP_ROUTE.reports.machining.cost, permissionKey: 'bao_cao_gia_cong' },
        ]
      },
      { 
        id: 'qc-report', 
        label: 'Báo cáo QC', 
        icon: Microscope, 
        path: ERP_ROUTE.reports.qc, 
        permissionKey: 'bao_cao_qc' 
      },
      { 
        id: 'maintenance-report', 
        label: 'Báo cáo bảo trì', 
        icon: Wrench, 
        path: ERP_ROUTE.reports.maintenance, 
        permissionKey: 'bao_cao_bao_tri' 
      },
      { 
        id: 'machine-performance', 
        label: 'Hiệu suất máy', 
        icon: Gauge, 
        path: ERP_ROUTE.reports.machinePerformance, 
        permissionKey: 'hieu_suat_may' 
      },
      { 
        id: 'pending-approval', 
        label: 'Chờ duyệt', 
        icon: Hourglass, 
        path: ERP_ROUTE.reports.pendingApproval, 
        permissionKey: 'cho_duyet' 
      },
    ],
  },

  // =========================================================================
  // DANH MỤC
  // =========================================================================
  {
    id: 'masterData',
    label: 'Quản lý Danh mục',
    icon: Layers,
    items: [
      { id: 'categories', label: 'Chủng loại', icon: FolderTree, path: ERP_ROUTE.masterData.categories, permissionKey: 'chung_loai' },
      { id: 'locations', label: 'Kho', icon: MapPin, path: ERP_ROUTE.masterData.locations, permissionKey: 'kho' },
      { id: 'machines', label: 'Máy móc', icon: Cpu, path: ERP_ROUTE.masterData.machines, permissionKey: 'may_moc' },
      { id: 'projects', label: 'Dự án', icon: ClipboardList, path: ERP_ROUTE.masterData.projects, permissionKey: 'du_an' },
    ],
  },

  // =========================================================================
  // HỆ THỐNG
  // =========================================================================
  {
    id: 'system',
    label: 'Hệ thống',
    icon: Settings,
    items: [
      { id: 'users', label: 'Quản lý người dùng', icon: Users, path: ERP_ROUTE.system.users, permissionKey: 'quan_ly_nguoi_dung' },
      { id: 'roles', label: 'Phân quyền', icon: ShieldCheck, path: ERP_ROUTE.system.roles, permissionKey: 'phan_quyen' },
      { id: 'audit-log', label: 'Audit Log', icon: FileText, path: ERP_ROUTE.system.auditLog, permissionKey: 'audit_log' },
      { id: 'backup-restore', label: 'Backup & Restore', icon: Database, path: ERP_ROUTE.system.backupRestore, permissionKey: 'backup_restore' },
      { id: 'settings', label: 'Cài đặt hệ thống', icon: Settings, path: ERP_ROUTE.system.settings, permissionKey: 'cai_dat_he_thong' },
    ],
  },

  // =========================================================================
  // TÀI KHOẢN
  // =========================================================================
  {
    id: 'account',
    label: 'Tài khoản',
    icon: UserCircle,
    items: [
      { id: 'profile', label: 'Hồ sơ cá nhân', icon: UserCircle, path: ERP_ROUTE.account.profile },
      { id: 'change-password', label: 'Đổi mật khẩu', icon: Key, path: ERP_ROUTE.account.changePassword },
      { id: 'logout', label: 'Đăng xuất', icon: LogOut, action: 'logout' },
    ],
  },
];

export const isNavItemVisible = (
  item: ERPNavItem | undefined,
  user?: ERPNavAuthUser
) => {
  if (!user || !item) return false;
  
  // Admin full access
  if (user.role === 'admin') return true;
  
  // Không có permission key = mọi người đều thấy
  if (!item.permissionKey) return true;

  // Kiểm tra trực tiếp từ user.permissions[permissionKey]
  const hasPermission = hasPermissionFlag(user.permissions?.[item.permissionKey], 'view');
  
  return hasPermission;
};
