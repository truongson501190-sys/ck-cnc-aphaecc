import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DailyNews } from '@/components/DailyNews';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Factory, LayoutDashboard, Layers, Settings, UserCircle } from 'lucide-react';
import NutQuayLai from '@/components/NutQuayLai';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { ERP_ROUTE } from '@/modules/erp/routes';

// Cấu hình đầy đủ của chú
const FEATURE_GROUPS = {
  manufacturing: { label: 'Sản xuất (Manufacturing)', icon: Factory, color: 'orange', features: [
    { key: 'ke_hoach_san_xuat', label: 'Kế hoạch sản xuất', route: ERP_ROUTE.manufacturing.plan },
    { key: 'nhat_ky_gia_cong', label: 'Nhật ký gia công', route: ERP_ROUTE.manufacturing.machiningLog },
    { key: 'nhat_ky_qc', label: 'Nhật ký QC', route: ERP_ROUTE.manufacturing.qcLog },
    { key: 'nhat_ky_bao_tri', label: 'Nhật ký bảo trì', route: ERP_ROUTE.manufacturing.maintenanceLog },
    { key: 'theo_doi_tien_do', label: 'Theo dõi tiến độ', route: ERP_ROUTE.manufacturing.progress },
  ]},
  warehouse: { label: 'Kho bãi (WMS)', icon: Package, color: 'green', features: [
    { key: 'nhap_kho', label: 'Nhập kho', route: ERP_ROUTE.warehouse.import },
    { key: 'xuat_kho', label: 'Xuất kho', route: ERP_ROUTE.warehouse.export },
    { key: 'chuyen_kho', label: 'Chuyển kho', route: ERP_ROUTE.warehouse.transfer },
    { key: 'xuat_dau', label: 'Xuất dầu', route: ERP_ROUTE.warehouse.oil },
    { key: 'kiem_ke_kho', label: 'Kiểm kê kho', route: ERP_ROUTE.warehouse.inventoryCount },
    { key: 'ton_kho', label: 'Tồn kho', route: ERP_ROUTE.reports.inventory },
    { key: 'the_kho', label: 'Thẻ kho', route: ERP_ROUTE.warehouse.stockCard },
    { key: 'lich_su_giao_dich', label: 'Lịch sử giao dịch', route: ERP_ROUTE.warehouse.transactionHistory },
  ]},
  reports: { label: 'Báo cáo & Dashboard', icon: LayoutDashboard, color: 'indigo', features: [
    { key: 'dashboard_tong_hop', label: 'Dashboard tổng hợp', route: ERP_ROUTE.reports.summary },
    { key: 'bao_cao_kho', label: 'Báo cáo kho', route: ERP_ROUTE.reports.warehouse },
    { key: 'bao_cao_gia_cong', label: 'Báo cáo gia công', route: ERP_ROUTE.reports.machining },
    { key: 'bao_cao_qc', label: 'Báo cáo QC', route: ERP_ROUTE.reports.qc },
    { key: 'bao_cao_bao_tri', label: 'Báo cáo bảo trì', route: ERP_ROUTE.reports.maintenance },
    { key: 'hieu_suat_may', label: 'Hiệu suất máy', route: ERP_ROUTE.reports.machinePerformance },
    { key: 'cho_duyet', label: 'Chờ duyệt', route: ERP_ROUTE.reports.pendingApproval },
  ]},
  masterData: { label: 'Quản lý Danh mục', icon: Layers, color: 'yellow', features: [
    { key: 'chung_loai', label: 'Chủng loại', route: ERP_ROUTE.masterData.categories },
    { key: 'kho', label: 'Kho', route: ERP_ROUTE.masterData.locations },
    { key: 'may_moc', label: 'Máy móc', route: ERP_ROUTE.masterData.machines },
    { key: 'du_an', label: 'Dự án', route: ERP_ROUTE.masterData.projects },
  ]},
  system: { label: 'Hệ thống', icon: Settings, color: 'gray', features: [
    { key: 'quan_ly_nguoi_dung', label: 'Quản lý người dùng', route: ERP_ROUTE.system.users },
    { key: 'phan_quyen', label: 'Phân quyền', route: ERP_ROUTE.system.roles },
    { key: 'audit_log', label: 'Audit Log', route: ERP_ROUTE.system.auditLog },
    { key: 'backup_restore', label: 'Backup & Restore', route: ERP_ROUTE.system.backupRestore },
    { key: 'cai_dat_he_thong', label: 'Cài đặt hệ thống', route: ERP_ROUTE.system.settings },
  ]},
};

const COLOR_STYLES: any = {
  orange: { border: 'border-orange-500', text: 'text-orange-600', bg: 'bg-orange-500', hover: 'hover:bg-orange-600' },
  green: { border: 'border-green-500', text: 'text-green-600', bg: 'bg-green-500', hover: 'hover:bg-green-600' },
  indigo: { border: 'border-indigo-500', text: 'text-indigo-600', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600' },
  yellow: { border: 'border-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600' },
  gray: { border: 'border-gray-500', text: 'text-gray-600', bg: 'bg-gray-500', hover: 'hover:bg-gray-600' },
};

export default function Index() {
  const { user, logout } = useAuth();
  const { canView, isAdmin } = usePermission();
  const navigate = useNavigate();

  if (!user) return <div className="p-10">Vui lòng đăng nhập</div>;

  const hasPermission = (key: string) => isAdmin || canView(key);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Hệ Thống ERP/WMS CK-CNC</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT TRÁI */}
        <div className="lg:col-span-2 space-y-6">
          {Object.entries(FEATURE_GROUPS).map(([key, group]: any) => {
            const visible = group.features.filter((f: any) => hasPermission(f.key));
            if (visible.length === 0) return null;
            const style = COLOR_STYLES[group.color];
            return (
              <Card key={key} className={`border-l-4 ${style.border}`}>
                <CardHeader className="py-3"><CardTitle className={`flex items-center gap-2 ${style.text}`}><group.icon size={20}/> {group.label}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {visible.map((f: any) => <Button key={f.key} className={`${style.bg} ${style.hover} text-white`} onClick={() => navigate(f.route)}>{f.label}</Button>)}
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {/* CỘT PHẢI: CHỈ CÒN TIN TỨC */}
        <div className="hidden lg:block lg:col-span-1">
        <div className="h-full">  {/* Thêm h-full */}
              <DailyNews />
           </div>
        </div>
      </div>
      <NutQuayLai />
    </div>
  );
}