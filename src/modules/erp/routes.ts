import type { LucideIcon } from 'lucide-react';
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
  Boxes,
} from 'lucide-react';
import type { UserPermissions } from '@/types/user';

/** Minimal user shape for route visibility checks (sidebar + mobile). */
export type ERPNavAuthUser = { role?: string; permissions?: UserPermissions } | null | undefined;

export const ERP_ROUTE = {
  login: '/login',
  dashboard: '/',
  warehouse: {
    base: '/warehouse',
    import: '/warehouse/import',
    export: '/warehouse/export',
    transfer: '/warehouse/transfer',
    oil: '/warehouse/oil',
    inventoryCount: '/warehouse/inventory-count',
    stockCard: '/warehouse/stock-card',
    transactionHistory: '/warehouse/transaction-history',
  },
  manufacturing: {
    base: '/manufacturing',
    plan: '/manufacturing/plan',
    /** Daily operational log — nhập liệu gia công */
    machiningLog: '/manufacturing/machining-log',
    qcLog: '/manufacturing/qc-log',
    maintenanceLog: '/manufacturing/maintenance-log',
    progress: '/manufacturing/progress',
    /** @deprecated Use machiningLog — kept for backward-compatible URLs */
    productionReport: '/manufacturing/production-report',
    qcReport: '/manufacturing/qc',
    maintenanceReport: '/manufacturing/maintenance-report',
    productionLog: '/manufacturing/production-log',
  },
  reports: {
    base: '/reports',
    summary: '/reports/summary',
    warehouse: '/reports/warehouse',
    /** Analytics / KPI — not daily entry forms */
    machining: '/reports/machining',
    qc: '/reports/qc',
    maintenance: '/reports/maintenance',
    machinePerformance: '/reports/machine-performance',
    materialConsumption: '/reports/material-consumption',
    inventory: '/reports/inventory',
    /** @deprecated Redirects to machining analytics */
    manufacturing: '/reports/manufacturing',
    costing: '/reports/costing',
    productionKpi: '/reports/production-kpi',
    pendingApproval: '/reports/pending-approval',
  },
  masterData: {
    base: '/master-data',
    categories: '/master-data/categories',
    materials: '/master-data/materials',
    locations: '/master-data/locations',
    machines: '/master-data/machines',
    projects: '/master-data/projects',
    employees: '/master-data/employees',
  },
  system: {
    base: '/system',
    users: '/system/users',
    roles: '/system/roles',
    auditLog: '/system/audit-log',
    backupRestore: '/system/backup-restore',
    settings: '/system/settings',
  },
  account: {
    base: '/account',
    profile: '/account/profile',
    changePassword: '/account/change-password',
  },
  legacy: {
    dashboard: '/trang-chu',
    import: '/nhap-kho',
    export: '/xuat-kho',
    transfer: '/chuyen-kho',
    oil: '/xuat-dau',
    inventory: '/ton-kho',
    productionReport: '/san-xuat/bao-cao',
    maintenanceReport: '/san-xuat/bao-tri',
    qcReport: '/san-xuat/qc',
    categoryManagement: '/quan-ly-danh-muc',
    userManagement: '/user-management',
  },
};

export const ERP_PERMISSION_KEY: Record<string, keyof UserPermissions> = {
  import: 'kho-tong',
  export: 'kho-tong',
  transfer: 'kho-tong',
  oil: 'kho-dau',
  reports: 'bao-cao-tong-hop',
  inventory: 'bao-cao-tong-hop',
  'machining-log': 'bao-cao-gia-cong',
  'production-report': 'bao-cao-gia-cong',
  'qc-log': 'qc',
  'qc-report': 'qc',
  'maintenance-log': 'bao-tri',
  'maintenance-report': 'bao-tri',
};

export type ERPNavItem = {
  id: string | null;
  label: string;
  icon: LucideIcon;
  path?: string;
  permissionKey?: keyof UserPermissions;
  adminOnly?: boolean;
  action?: 'logout';
};

export type ERPNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: ERPNavItem[];
};

export const ERP_NAVIGATION: ERPNavGroup[] = [
  {
    id: 'main',
    label: 'Trang chủ',
    icon: Home,
    items: [
      {
        id: null,
        label: 'Trang chủ',
        icon: Home,
        path: ERP_ROUTE.dashboard,
      },
    ],
  },
  {
    id: 'warehouse',
    label: 'Kho bãi (WMS)',
    icon: Package,
    items: [
      {
        id: 'import',
        label: 'Nhập kho',
        icon: Package,
        path: ERP_ROUTE.warehouse.import,
        permissionKey: 'kho-tong',
      },
      {
        id: 'export',
        label: 'Xuất kho',
        icon: PackageOpen,
        path: ERP_ROUTE.warehouse.export,
        permissionKey: 'kho-tong',
      },
      {
        id: 'transfer',
        label: 'Chuyển kho',
        icon: ArrowRightLeft,
        path: ERP_ROUTE.warehouse.transfer,
        permissionKey: 'kho-tong',
      },
      {
        id: 'oil',
        label: 'Xuất dầu',
        icon: Droplets,
        path: ERP_ROUTE.warehouse.oil,
        permissionKey: 'kho-dau',
      },
      {
        id: 'inventory-count',
        label: 'Kiểm kê kho',
        icon: ListChecks,
        path: ERP_ROUTE.warehouse.inventoryCount,
      },
      {
        id: 'inventory',
        label: 'Tồn kho',
        icon: HardDrive,
        path: ERP_ROUTE.reports.inventory,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'stock-card',
        label: 'Thẻ kho',
        icon: ClipboardList,
        path: ERP_ROUTE.warehouse.stockCard,
      },
      {
        id: 'transaction-history',
        label: 'Lịch sử giao dịch',
        icon: Clock,
        path: ERP_ROUTE.warehouse.transactionHistory,
      },
    ],
  },
  {
    id: 'manufacturing',
    label: 'Sản xuất (Manufacturing)',
    icon: Factory,
    items: [
      {
        id: 'plan',
        label: 'Kế hoạch sản xuất',
        icon: ClipboardList,
        path: ERP_ROUTE.manufacturing.plan,
      },
      {
        id: 'machining-log',
        label: 'Nhật ký gia công',
        icon: NotebookPen,
        path: ERP_ROUTE.manufacturing.machiningLog,
      },
      {
        id: 'qc-log',
        label: 'Nhật ký QC',
        icon: ClipboardCheck,
        path: ERP_ROUTE.manufacturing.qcLog,
      },
      {
        id: 'maintenance-log',
        label: 'Nhật ký bảo trì',
        icon: Wrench,
        path: ERP_ROUTE.manufacturing.maintenanceLog,
      },
      {
        id: 'progress',
        label: 'Theo dõi tiến độ',
        icon: Activity,
        path: ERP_ROUTE.manufacturing.progress,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Báo cáo & Dashboard',
    icon: LayoutDashboard,
    items: [
      {
        id: 'summary',
        label: 'Dashboard tổng hợp',
        icon: LayoutDashboard,
        path: ERP_ROUTE.reports.summary,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'warehouse-report',
        label: 'Báo cáo kho',
        icon: Package,
        path: ERP_ROUTE.reports.warehouse,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'machining-report',
        label: 'Báo cáo gia công',
        icon: BarChart2,
        path: ERP_ROUTE.reports.machining,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'qc-report-analytics',
        label: 'Báo cáo QC',
        icon: BarChart3,
        path: ERP_ROUTE.reports.qc,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'maintenance-report-analytics',
        label: 'Báo cáo bảo trì',
        icon: BarChart3,
        path: ERP_ROUTE.reports.maintenance,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'machine-performance',
        label: 'Hiệu suất máy',
        icon: Cpu,
        path: ERP_ROUTE.reports.machinePerformance,
        permissionKey: 'bao-cao-tong-hop',
      },
      {
        id: 'pending-approval',
        label: 'Chờ duyệt',
        icon: Hourglass,
        path: ERP_ROUTE.reports.pendingApproval,
        permissionKey: 'bao-cao-tong-hop',
      },
    ],
  },
  {
    id: 'masterData',
    label: 'Quản lý Danh mục',
    icon: Layers,
    items: [
      {
        id: 'categories',
        label: 'Chủng loại',
        icon: FolderTree,
        path: ERP_ROUTE.masterData.categories,
        adminOnly: true,
      },
      {
        id: 'locations',
        label: 'Kho',
        icon: MapPin,
        path: ERP_ROUTE.masterData.locations,
        adminOnly: true,
      },
      {
        id: 'machines',
        label: 'Máy móc',
        icon: Cpu,
        path: ERP_ROUTE.masterData.machines,
        adminOnly: true,
      },
      {
        id: 'projects',
        label: 'Dự án',
        icon: ClipboardList,
        path: ERP_ROUTE.masterData.projects,
        adminOnly: true,
      },
    ],
  },
  {
    id: 'system',
    label: 'Hệ thống',
    icon: Settings,
    items: [
      {
        id: 'users',
        label: 'Quản lý người dùng',
        icon: Users,
        path: ERP_ROUTE.system.users,
        adminOnly: true,
      },
      {
        id: 'roles',
        label: 'Phân quyền',
        icon: ShieldCheck,
        path: ERP_ROUTE.system.roles,
        adminOnly: true,
      },
      {
        id: 'audit-log',
        label: 'Audit Log',
        icon: FileText,
        path: ERP_ROUTE.system.auditLog,
        adminOnly: true,
      },
      {
        id: 'backup-restore',
        label: 'Backup & Restore',
        icon: Database,
        path: ERP_ROUTE.system.backupRestore,
        adminOnly: true,
      },
      {
        id: 'settings',
        label: 'Cài đặt hệ thống',
        icon: Settings,
        path: ERP_ROUTE.system.settings,
        adminOnly: true,
      },
    ],
  },
  {
    id: 'account',
    label: 'Tài khoản',
    icon: UserCircle,
    items: [
      {
        id: 'profile',
        label: 'Hồ sơ cá nhân',
        icon: UserCircle,
        path: ERP_ROUTE.account.profile,
      },
      {
        id: 'change-password',
        label: 'Đổi mật khẩu',
        icon: Key,
        path: ERP_ROUTE.account.changePassword,
      },
      {
        id: 'logout',
        label: 'Đăng xuất',
        icon: LogOut,
        action: 'logout',
      },
    ],
  },
];

export const isNavItemVisible = (item: ERPNavItem | undefined, user?: ERPNavAuthUser) => {
  if (!user || !item) return false;
  if (item.adminOnly && user.role !== 'admin') return false;
  if (!item.permissionKey) return true;
  return !!user.permissions?.[item.permissionKey]?.view;
};

export const ERP_LEGACY_REDIRECTS = [
  { from: ERP_ROUTE.legacy.dashboard, to: ERP_ROUTE.dashboard },
  { from: ERP_ROUTE.legacy.import, to: ERP_ROUTE.warehouse.import },
  { from: ERP_ROUTE.legacy.export, to: ERP_ROUTE.warehouse.export },
  { from: ERP_ROUTE.legacy.transfer, to: ERP_ROUTE.warehouse.transfer },
  { from: ERP_ROUTE.legacy.oil, to: ERP_ROUTE.warehouse.oil },
  { from: ERP_ROUTE.legacy.inventory, to: ERP_ROUTE.reports.inventory },
  { from: ERP_ROUTE.legacy.productionReport, to: ERP_ROUTE.manufacturing.machiningLog },
  { from: ERP_ROUTE.legacy.maintenanceReport, to: ERP_ROUTE.manufacturing.maintenanceLog },
  { from: ERP_ROUTE.legacy.qcReport, to: ERP_ROUTE.manufacturing.qcLog },
  { from: ERP_ROUTE.legacy.categoryManagement, to: ERP_ROUTE.masterData.categories },
  { from: ERP_ROUTE.legacy.userManagement, to: ERP_ROUTE.system.users },
  // Manufacturing — deprecated URLs → canonical operational logs
  { from: ERP_ROUTE.manufacturing.productionReport, to: ERP_ROUTE.manufacturing.machiningLog },
  { from: ERP_ROUTE.manufacturing.productionLog, to: ERP_ROUTE.manufacturing.machiningLog },
  { from: ERP_ROUTE.manufacturing.qcReport, to: ERP_ROUTE.manufacturing.qcLog },
  { from: ERP_ROUTE.manufacturing.maintenanceReport, to: ERP_ROUTE.manufacturing.maintenanceLog },
  // Reports — old analytics path
  { from: ERP_ROUTE.reports.manufacturing, to: ERP_ROUTE.reports.machining },
];