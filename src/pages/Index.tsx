import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Package,
  Factory,
  LayoutDashboard,
  Layers,
  Settings,
  UserCircle,
} from 'lucide-react';

import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';

import { useAuth } from '@/hooks/useAuth';
import { ERP_ROUTE } from '@/modules/erp/routes';

export default function Index() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Vui lòng đăng nhập
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex">
      
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden">
        <MobileSidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-3 md:p-6">

          {/* Header */}
          <div className="mb-5 mt-12 md:mt-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
              Hệ Thống ERP/WMS CNC
            </h1>

            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">
                ERP/WMS
              </Badge>

              <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                {user.role === 'admin'
                  ? 'Quản trị viên'
                  : 'Người dùng'}
              </Badge>
            </div>
          </div>

          <div className="space-y-5">

            {/* ================= KHO BÃI ================= */}
            <Card className="shadow-sm border-l-4 border-green-500 rounded-xl max-w-5xl mx-auto">
              
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-green-600 text-base md:text-lg">
                  <Package className="w-5 h-5" />
                  Kho bãi (WMS)
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.import)}
                  >
                    Nhập kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.export)}
                  >
                    Xuất kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.transfer)}
                  >
                    Chuyển kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.oil)}
                  >
                    Xuất dầu
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.inventoryCount)}
                  >
                    Kiểm kê kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.inventory)}
                  >
                    Tồn kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.stockCard)}
                  >
                    Thẻ kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-green-500 hover:bg-green-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.warehouse.transactionHistory)}
                  >
                    Lịch sử giao dịch
                  </Button>

                </div>
              </CardContent>
            </Card>

            {/* ================= SẢN XUẤT ================= */}
            <Card className="shadow-sm border-l-4 border-orange-500 rounded-xl max-w-5xl mx-auto">

              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-orange-600 text-base md:text-lg">
                  <Factory className="w-5 h-5" />
                  Sản xuất (Manufacturing)
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-orange-500 hover:bg-orange-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.manufacturing.plan)}
                  >
                    Kế hoạch sản xuất
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-orange-500 hover:bg-orange-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.manufacturing.machiningLog)}
                  >
                    Nhật ký gia công
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-orange-500 hover:bg-orange-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.manufacturing.qcLog)}
                  >
                    Nhật ký QC
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-orange-500 hover:bg-orange-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.manufacturing.maintenanceLog)}
                  >
                    Nhật ký bảo trì
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-orange-500 hover:bg-orange-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.manufacturing.progress)}
                  >
                    Theo dõi tiến độ
                  </Button>

                </div>
              </CardContent>
            </Card>

            {/* ================= BÁO CÁO ================= */}
            <Card className="shadow-sm border-l-4 border-indigo-500 rounded-xl max-w-5xl mx-auto">

              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-indigo-600 text-base md:text-lg">
                  <LayoutDashboard className="w-5 h-5" />
                  Báo cáo & Dashboard
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.summary)}
                  >
                    Dashboard tổng hợp
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.warehouse)}
                  >
                    Báo cáo kho
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.machining)}
                  >
                    Báo cáo gia công
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.qc)}
                  >
                    Báo cáo QC
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.maintenance)}
                  >
                    Báo cáo bảo trì
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.machinePerformance)}
                  >
                    Hiệu suất máy
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-indigo-500 hover:bg-indigo-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.reports.materialConsumption)}
                  >
                    Tiêu hao vật liệu
                  </Button>

                </div>
              </CardContent>
            </Card>

            {/* ================= DANH MỤC ================= */}
            {isAdmin && (
              <Card className="shadow-sm border-l-4 border-yellow-500 rounded-xl max-w-5xl mx-auto">

                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="flex items-center gap-2 text-yellow-600 text-base md:text-lg">
                    <Layers className="w-5 h-5" />
                    Quản lý Danh mục
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 px-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-yellow-500 hover:bg-yellow-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.masterData.categories)}
                    >
                      Chủng loại
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-yellow-500 hover:bg-yellow-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.masterData.materials)}
                    >
                      Vật liệu
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-yellow-500 hover:bg-yellow-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.masterData.locations)}
                    >
                      Kho
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-yellow-500 hover:bg-yellow-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.masterData.machines)}
                    >
                      Máy móc
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-yellow-500 hover:bg-yellow-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.masterData.projects)}
                    >
                      Dự án
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-yellow-500 hover:bg-yellow-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.masterData.employees)}
                    >
                      Nhân viên
                    </Button>

                  </div>
                </CardContent>
              </Card>
            )}

            {/* ================= HỆ THỐNG ================= */}
            {isAdmin && (
              <Card className="shadow-sm border-l-4 border-gray-500 rounded-xl max-w-5xl mx-auto">

                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="flex items-center gap-2 text-gray-600 text-base md:text-lg">
                    <Settings className="w-5 h-5" />
                    Hệ thống
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-0 px-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-gray-500 hover:bg-gray-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.system.users)}
                    >
                      Quản lý người dùng
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-gray-500 hover:bg-gray-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.system.roles)}
                    >
                      Phân quyền
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-gray-500 hover:bg-gray-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.system.auditLog)}
                    >
                      Audit Log
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-gray-500 hover:bg-gray-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.system.backupRestore)}
                    >
                      Backup & Restore
                    </Button>

                    <Button
                      className="min-h-[42px] text-xs md:text-sm bg-gray-500 hover:bg-gray-600 text-white whitespace-normal break-words"
                      onClick={() => navigate(ERP_ROUTE.system.settings)}
                    >
                      Cài đặt hệ thống
                    </Button>

                  </div>
                </CardContent>
              </Card>
            )}

            {/* ================= TÀI KHOẢN ================= */}
            <Card className="shadow-sm border-l-4 border-pink-500 rounded-xl max-w-5xl mx-auto">

              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="flex items-center gap-2 text-pink-600 text-base md:text-lg">
                  <UserCircle className="w-5 h-5" />
                  Tài khoản
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-0 px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-pink-500 hover:bg-pink-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.account.profile)}
                  >
                    Hồ sơ cá nhân
                  </Button>

                  <Button
                    className="min-h-[42px] text-xs md:text-sm bg-pink-500 hover:bg-pink-600 text-white whitespace-normal break-words"
                    onClick={() => navigate(ERP_ROUTE.account.changePassword)}
                  >
                    Đổi mật khẩu
                  </Button>

                  <Button
                    variant="destructive"
                    className="min-h-[42px] text-xs md:text-sm whitespace-normal break-words"
                    onClick={logout}
                  >
                    Đăng xuất
                  </Button>

                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}