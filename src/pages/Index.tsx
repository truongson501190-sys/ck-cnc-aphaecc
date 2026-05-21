import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  Package,
  FolderTree,
  BarChart3,
  Settings,
  Factory,
  Users,
} from 'lucide-react';

import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { useAuth } from '@/hooks/useAuth';
import { ERP_ROUTE } from '@/modules/erp/routes';

export default function Index() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Vui lòng đăng nhập
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex">

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
        <div className="p-4 md:p-6">

          {/* Header */}
          <div className="mb-6 mt-12 md:mt-0">
            <h1 className="text-xl md:text-3xl font-bold text-gray-800">
              Hệ Thống ERP/WMS Xưởng CNC-CK
            </h1>

            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="secondary">
                ERP/WMS
              </Badge>

              <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
              </Badge>
            </div>
          </div>

          {/* ERP Modules */}
          <div className="space-y-6">

            {/* KHO BÃI */}
            <Card className="shadow-md border-l-4 border-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600 text-lg md:text-xl">
                  <Package className="w-4 h-4 md:w-5 md:h-5" />
                  Kho bãi (WMS)
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">

                  <Button
                    className="h-12 text-sm md:text-base"
                    onClick={() => navigate(ERP_ROUTE.warehouse.import)}
                  >
                    Nhập kho
                  </Button>

                  <Button
                    className="h-12 text-sm md:text-base"
                    onClick={() => navigate(ERP_ROUTE.warehouse.export)}
                  >
                    Xuất kho
                  </Button>

                  <Button
                    className="h-12 text-sm md:text-base"
                    onClick={() => navigate(ERP_ROUTE.warehouse.transfer)}
                  >
                    Chuyển kho
                  </Button>

                  <Button
                    className="h-12 text-sm md:text-base"
                    onClick={() => navigate(ERP_ROUTE.warehouse.oil)}
                  >
                    Xuất dầu
                  </Button>

                  <Button className="h-12 text-sm md:text-base">
                    Kiểm kê kho
                  </Button>

                  <Button
                    className="h-12 text-sm md:text-base"
                    onClick={() => navigate(ERP_ROUTE.reports.inventory)}
                  >
                    Tồn kho
                  </Button>

                  <Button className="h-12 text-sm md:text-base">
                    Thẻ kho
                  </Button>

                  <Button className="h-12 text-sm md:text-base">
                    Lịch sử giao dịch
                  </Button>

                </div>
              </CardContent>
            </Card>

           {/* SẢN XUẤT */}
<Card className="shadow-md border-l-4 border-orange-500">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-orange-600 text-lg md:text-xl">
      <Factory className="w-4 h-4 md:w-5 md:h-5" />
      Sản xuất (Manufacturing)
    </CardTitle>
  </CardHeader>

  <CardContent>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.manufacturing.plan)}
      >
        Kế hoạch sản xuất
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.manufacturing.machiningLog)}
      >
        Nhật ký gia công
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.manufacturing.qcLog)}
      >
        Nhật ký QC
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.manufacturing.maintenanceLog)}
      >
        Nhật ký bảo trì
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.manufacturing.progress)}
      >
        Theo dõi tiến độ
      </Button>

    </div>
  </CardContent>
</Card>

            {/* BÁO CÁO */}
<Card className="shadow-md border-l-4 border-indigo-500">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-indigo-600 text-lg md:text-xl">
      <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
      Báo cáo & Dashboard
    </CardTitle>
  </CardHeader>

  <CardContent>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.summary)}
      >
        Dashboard tổng hợp
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.warehouse)}
      >
        Báo cáo kho
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.machining)}
      >
        Báo cáo gia công
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.qc)}
      >
        Báo cáo QC
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.maintenance)}
      >
        Báo cáo bảo trì
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.machinePerformance)}
      >
        Hiệu suất máy
      </Button>

      <Button
        className="h-12 text-sm md:text-base"
        onClick={() => navigate(ERP_ROUTE.reports.materialConsumption)}
      >
        Tiêu hao vật liệu
      </Button>

    </div>
  </CardContent>
</Card>

           {/* DANH MỤC */}
{isAdmin && (
  <Card className="shadow-md border-l-4 border-yellow-500">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-yellow-600 text-lg md:text-xl">
        <FolderTree className="w-4 h-4 md:w-5 md:h-5" />
        Quản lý Danh mục
      </CardTitle>
    </CardHeader>

    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

        <Button
          className="h-12 text-sm md:text-base"
          onClick={() => navigate(ERP_ROUTE.masterData.categories)}
        >
          Chủng loại
        </Button>

        <Button
          className="h-12 text-sm md:text-base"
          onClick={() => navigate(ERP_ROUTE.masterData.materials)}
        >
          Vật liệu
        </Button>

        <Button
          className="h-12 text-sm md:text-base"
          onClick={() => navigate(ERP_ROUTE.masterData.locations)}
        >
          Kho
        </Button>

        <Button
          className="h-12 text-sm md:text-base"
          onClick={() => navigate(ERP_ROUTE.masterData.machines)}
        >
          Máy móc
        </Button>

        <Button
          className="h-12 text-sm md:text-base"
          onClick={() => navigate(ERP_ROUTE.masterData.projects)}
        >
          Dự án
        </Button>

        <Button
          className="h-12 text-sm md:text-base"
          onClick={() => navigate(ERP_ROUTE.masterData.employees)}
        >
          Nhân viên
        </Button>

      </div>
    </CardContent>
  </Card>
)}

            {/* HỆ THỐNG */}
            {isAdmin && (
              <Card className="shadow-md border-l-4 border-gray-600">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-700 text-lg md:text-xl">
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                    Hệ thống
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                    <Button
                      className="h-12 text-sm md:text-base"
                      onClick={() => navigate(ERP_ROUTE.system.users)}
                    >
                      Quản lý người dùng
                    </Button>

                    <Button className="h-12 text-sm md:text-base">
                      Phân quyền
                    </Button>

                    <Button className="h-12 text-sm md:text-base">
                      Audit Log
                    </Button>

                    <Button className="h-12 text-sm md:text-base">
                      Backup & Restore
                    </Button>

                    <Button className="h-12 text-sm md:text-base">
                      Cài đặt hệ thống
                    </Button>

                  </div>
                </CardContent>
              </Card>
            )}

            {/* TÀI KHOẢN */}
            <Card className="shadow-md border-l-4 border-pink-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-pink-600 text-lg md:text-xl">
                  <Users className="w-4 h-4 md:w-5 md:h-5" />
                  Tài khoản
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

                  <Button className="h-12 text-sm md:text-base">
                    Hồ sơ cá nhân
                  </Button>

                  <Button className="h-12 text-sm md:text-base">
                    Đổi mật khẩu
                  </Button>

                  <Button
                    variant="destructive"
                    className="h-12 text-sm md:text-base"
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