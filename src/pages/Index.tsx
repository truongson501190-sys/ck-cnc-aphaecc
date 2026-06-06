import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyNews } from '@/components/DailyNews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Factory, LayoutDashboard, Layers, Settings, UserCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from '@/hooks/usePermission';
import { ERP_ROUTE } from '@/modules/erp/routes';

// Định nghĩa route mặc định
const DEFAULT_ROUTES = {
  manufacturing: {
    plan: '/ke-hoach-san-xuat',
    machiningLog: '/nhat-ky-san-xuat',
    qcLog: '/nhat-ky-qc',
    maintenanceLog: '/nhat-ky-bao-tri',
    progress: '/theo-doi-tien-do',
  },
  warehouse: {
    import: '/nhap-kho',
    export: '/xuat-kho',
    transfer: '/chuyen-kho',
    oil: '/xuat-dau',
    inventoryCount: '/kiem-ke-kho',
    stockCard: '/the-kho',
    transactionHistory: '/lich-su-giao-dich',
  },
  reports: {
    summary: '/dashboard',
    warehouse: '/bao-cao-kho',
    machining: '/bao-cao-gia-cong',
    qc: '/bao-cao-qc',
    maintenance: '/bao-cao-bao-tri',
    machinePerformance: '/hieu-suat-may',
    pendingApproval: '/cho-duyet',
    inventory: '/ton-kho',
  },
  masterData: {
    categories: '/danh-muc/chung-loai',
    locations: '/danh-muc/kho',
    machines: '/danh-muc/may-moc',
    projects: '/danh-muc/du-an',
  },
  system: {
    users: '/he-thong/nguoi-dung',
    roles: '/he-thong/phan-quyen',
    auditLog: '/he-thong/audit-log',
    backupRestore: '/he-thong/backup',
    settings: '/he-thong/cai-dat',
  },
};

// Hàm lấy route an toàn
const getRoute = (route: any, defaultRoute: string): string => {
  if (typeof route === 'string') return route;
  if (route && typeof route === 'object') {
    if (route.production) return route.production;
    if (route.tools) return route.tools;
    if (route.damage) return route.damage;
    if (route.cost) return route.cost;
  }
  return defaultRoute;
};

// Cấu hình các module với màu sắc
const FEATURE_GROUPS = {
  manufacturing: { 
    label: 'Sản xuất (Manufacturing)', 
    icon: Factory, 
    color: 'orange', 
    bgLight: 'bg-orange-50',
    borderLight: 'border-orange-200',
    textLight: 'text-orange-600',
    buttonBg: 'bg-orange-500',
    buttonHover: 'hover:bg-orange-600',
    features: [
      { key: 'ke_hoach_san_xuat', label: 'Kế hoạch sản xuất', route: getRoute(ERP_ROUTE?.manufacturing?.plan, DEFAULT_ROUTES.manufacturing.plan) },
      { key: 'nhat_ky_gia_cong', label: 'Nhật ký gia công', route: getRoute(ERP_ROUTE?.manufacturing?.machiningLog, DEFAULT_ROUTES.manufacturing.machiningLog) },
      { key: 'nhat_ky_qc', label: 'Nhật ký QC', route: getRoute(ERP_ROUTE?.manufacturing?.qcLog, DEFAULT_ROUTES.manufacturing.qcLog) },
      { key: 'nhat_ky_bao_tri', label: 'Nhật ký bảo trì', route: getRoute(ERP_ROUTE?.manufacturing?.maintenanceLog, DEFAULT_ROUTES.manufacturing.maintenanceLog) },
      { key: 'theo_doi_tien_do', label: 'Theo dõi tiến độ', route: getRoute(ERP_ROUTE?.manufacturing?.progress, DEFAULT_ROUTES.manufacturing.progress) },
    ]
  },
  warehouse: { 
    label: 'Kho bãi (WMS)', 
    icon: Package, 
    color: 'green', 
    bgLight: 'bg-green-50',
    borderLight: 'border-green-200',
    textLight: 'text-green-600',
    buttonBg: 'bg-green-500',
    buttonHover: 'hover:bg-green-600',
    features: [
      { key: 'nhap_kho', label: 'Nhập kho', route: getRoute(ERP_ROUTE?.warehouse?.import, DEFAULT_ROUTES.warehouse.import) },
      { key: 'xuat_kho', label: 'Xuất kho', route: getRoute(ERP_ROUTE?.warehouse?.export, DEFAULT_ROUTES.warehouse.export) },
      { key: 'chuyen_kho', label: 'Chuyển kho', route: getRoute(ERP_ROUTE?.warehouse?.transfer, DEFAULT_ROUTES.warehouse.transfer) },
      { key: 'xuat_dau', label: 'Xuất dầu', route: getRoute(ERP_ROUTE?.warehouse?.oil, DEFAULT_ROUTES.warehouse.oil) },
      { key: 'kiem_ke_kho', label: 'Kiểm kê kho', route: getRoute(ERP_ROUTE?.warehouse?.inventoryCount, DEFAULT_ROUTES.warehouse.inventoryCount) },
      { key: 'ton_kho', label: 'Tồn kho', route: getRoute(ERP_ROUTE?.reports?.inventory, DEFAULT_ROUTES.reports.inventory) },
      { key: 'the_kho', label: 'Thẻ kho', route: getRoute(ERP_ROUTE?.warehouse?.stockCard, DEFAULT_ROUTES.warehouse.stockCard) },
      { key: 'lich_su_giao_dich', label: 'Lịch sử giao dịch', route: getRoute(ERP_ROUTE?.warehouse?.transactionHistory, DEFAULT_ROUTES.warehouse.transactionHistory) },
    ]
  },
  reports: { 
    label: 'Báo cáo & Dashboard', 
    icon: LayoutDashboard, 
    color: 'indigo', 
    bgLight: 'bg-indigo-50',
    borderLight: 'border-indigo-200',
    textLight: 'text-indigo-600',
    buttonBg: 'bg-indigo-500',
    buttonHover: 'hover:bg-indigo-600',
    features: [
      { key: 'dashboard_tong_hop', label: 'Dashboard tổng hợp', route: getRoute(ERP_ROUTE?.reports?.summary, DEFAULT_ROUTES.reports.summary) },
      { key: 'bao_cao_kho', label: 'Báo cáo kho', route: getRoute(ERP_ROUTE?.reports?.warehouse, DEFAULT_ROUTES.reports.warehouse) },
      { key: 'bao_cao_gia_cong', label: 'Báo cáo gia công', route: getRoute(ERP_ROUTE?.reports?.machining, DEFAULT_ROUTES.reports.machining) },
      { key: 'bao_cao_qc', label: 'Báo cáo QC', route: getRoute(ERP_ROUTE?.reports?.qc, DEFAULT_ROUTES.reports.qc) },
      { key: 'bao_cao_bao_tri', label: 'Báo cáo bảo trì', route: getRoute(ERP_ROUTE?.reports?.maintenance, DEFAULT_ROUTES.reports.maintenance) },
      { key: 'hieu_suat_may', label: 'Hiệu suất máy', route: getRoute(ERP_ROUTE?.reports?.machinePerformance, DEFAULT_ROUTES.reports.machinePerformance) },
      { key: 'cho_duyet', label: 'Chờ duyệt', route: getRoute(ERP_ROUTE?.reports?.pendingApproval, DEFAULT_ROUTES.reports.pendingApproval) },
    ]
  },
  masterData: { 
    label: 'Quản lý Danh mục', 
    icon: Layers, 
    color: 'yellow', 
    bgLight: 'bg-yellow-50',
    borderLight: 'border-yellow-200',
    textLight: 'text-yellow-600',
    buttonBg: 'bg-yellow-500',
    buttonHover: 'hover:bg-yellow-600',
    features: [
      { key: 'chung_loai', label: 'Chủng loại', route: getRoute(ERP_ROUTE?.masterData?.categories, DEFAULT_ROUTES.masterData.categories) },
      { key: 'kho', label: 'Kho', route: getRoute(ERP_ROUTE?.masterData?.locations, DEFAULT_ROUTES.masterData.locations) },
      { key: 'may_moc', label: 'Máy móc', route: getRoute(ERP_ROUTE?.masterData?.machines, DEFAULT_ROUTES.masterData.machines) },
      { key: 'du_an', label: 'Dự án', route: getRoute(ERP_ROUTE?.masterData?.projects, DEFAULT_ROUTES.masterData.projects) },
    ]
  },
  system: { 
    label: 'Hệ thống', 
    icon: Settings, 
    color: 'gray', 
    bgLight: 'bg-gray-50',
    borderLight: 'border-gray-200',
    textLight: 'text-gray-600',
    buttonBg: 'bg-gray-500',
    buttonHover: 'hover:bg-gray-600',
    features: [
      { key: 'quan_ly_nguoi_dung', label: 'Quản lý người dùng', route: getRoute(ERP_ROUTE?.system?.users, DEFAULT_ROUTES.system.users) },
      { key: 'phan_quyen', label: 'Phân quyền', route: getRoute(ERP_ROUTE?.system?.roles, DEFAULT_ROUTES.system.roles) },
      { key: 'audit_log', label: 'Audit Log', route: getRoute(ERP_ROUTE?.system?.auditLog, DEFAULT_ROUTES.system.auditLog) },
      { key: 'backup_restore', label: 'Backup & Restore', route: getRoute(ERP_ROUTE?.system?.backupRestore, DEFAULT_ROUTES.system.backupRestore) },
      { key: 'cai_dat_he_thong', label: 'Cài đặt hệ thống', route: getRoute(ERP_ROUTE?.system?.settings, DEFAULT_ROUTES.system.settings) },
    ]
  },
};

export default function Index() {
  const { user, logout } = useAuth();
  const { canView } = usePermission();
  const navigate = useNavigate();
  
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!user) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500">Vui lòng đăng nhập để tiếp tục</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>Đăng nhập</Button>
      </div>
    );
  }

  const hasPermission = (key: string) => {
    try {
      return canView(key);
    } catch {
      return true;
    }
  };

  const formattedDate = currentTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString('vi-VN');

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return { icon: '☀️', text: 'Chào buổi sáng' };
    if (hour < 18) return { icon: '⛅', text: 'Chào buổi chiều' };
    return { icon: '🌙', text: 'Chào buổi tối' };
  };

  const greeting = getGreeting();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="px-4 md:px-6 py-6">
        
        {/* HEADER - Tiêu đề bên trái, card user bên phải sát mép */}
        <div className="flex items-center justify-between gap-4 mb-8">
          {/* Tiêu đề bên trái */}
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Hệ Thống ERP/WMS CK-CNC
            </h1>
            <p className="text-slate-500 text-sm mt-1">Quản lý sản xuất, kho bãi và báo cáo toàn diện</p>
          </div>
          
          {/* Card thông tin user - CỐ ĐỊNH, SÁT MÉP PHẢI */}
          <div className="w-72 sticky top-6 flex-shrink-0">
            <Card className="border-l-4 border-blue-500 shadow-md rounded-xl overflow-hidden bg-white">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-xs font-medium text-slate-500">{formattedDate}</div>
                    <div className="text-xl font-bold text-blue-600 font-mono">{formattedTime}</div>
                    <div className="text-xs font-medium text-orange-500 mt-0.5">
                      {greeting.icon} {greeting.text}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-slate-800 text-sm">
                      {user?.fullName || user?.username || 'Người dùng'}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-0.5">
                        <UserCircle size={12} />
                        {user?.role || 'User'}
                      </span>
                      <span className="text-green-500 flex items-center gap-0.5">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        Online
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => logout()}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2 mt-1"
                    >
                      <LogOut size={12} className="mr-0.5" />
                      Đăng xuất
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* NỘI DUNG CHÍNH - full width, không có container rào cản */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CỘT TRÁI - Danh sách module (chiếm 8/12 cột) */}
          <div className="lg:col-span-8 space-y-6">
            {Object.entries(FEATURE_GROUPS).map(([key, group]) => {
              const visibleFeatures = group.features.filter((f) => hasPermission(f.key));
              if (visibleFeatures.length === 0) return null;
              
              const IconComponent = group.icon;
              
              return (
                <Card key={key} className={`border-l-4 border-${group.color}-500 shadow-md rounded-xl overflow-hidden`}>
                  <CardHeader className={`py-3 ${group.bgLight} border-b ${group.borderLight}`}>
                    <CardTitle className={`flex items-center gap-2 ${group.textLight} text-sm font-semibold`}>
                      <IconComponent size={18} /> {group.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 bg-white">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {visibleFeatures.map((feature) => (
                        <Button
                          key={feature.key}
                          className={`${group.buttonBg} ${group.buttonHover} text-white text-xs h-auto py-2 px-3 whitespace-normal justify-start shadow-sm transition-all duration-200 hover:shadow-md`}
                          onClick={() => navigate(feature.route)}
                        >
                          {feature.label}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* CỘT PHẢI - Tin tức (chiếm 4/12 cột, SÁT MÉP PHẢI) */}
          <div className="lg:col-span-4">
            <div className="sticky top-6">
              <DailyNews />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}