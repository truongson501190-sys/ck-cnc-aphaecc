import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Factory,
  Package,
  PackageOpen,
  Droplets,
  ArrowRightLeft,
  FolderTree,
  BarChart3,
  Users,
  TrendingUp,
  Wrench,
  CheckCircle,
} from 'lucide-react';
import { ExactLayoutWarehouseImport } from '@/components/inventory/ExactLayoutWarehouseImport';
import { ExactLayoutWarehouseExport } from '@/components/inventory/ExactLayoutWarehouseExport';
import { ExactLayoutOilExport } from '@/components/inventory/ExactLayoutOilExport';
import { ExactLayoutWarehouseTransfer } from '@/components/inventory/ExactLayoutWarehouseTransfer';
import { CategoryManagement } from '@/components/inventory/CategoryManagement';
import { ReportsPage } from '@/components/ReportsPage';
import { UserManagement } from '@/pages/UserManagement';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { useAuth } from '@/hooks/useAuth';
import { WarehouseTransaction } from '@/types/inventory';
import type { UserPermissions } from '@/types/user';
import { toast } from 'sonner';
import { usePermission } from '@/hooks/usePermission';

const SECTION_MODULE: Record<string, keyof UserPermissions> = {
  import: 'kho-tong',
  export: 'kho-tong',
  transfer: 'kho-tong',
  oil: 'kho-dau',
  reports: 'bao-cao-tong-hop',
  inventory: 'bao-cao-tong-hop',
};

interface IndexProps {
  initialSection?: string | null;
}

export default function Index({ initialSection }: IndexProps) {
  const { user, isAdmin } = useAuth();
  const { can } = usePermission();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string | null>(initialSection ?? null);
  const [warehouseTransactions, setWarehouseTransactions] = useState<WarehouseTransaction[]>([]);

  useEffect(() => {
    // Load warehouse transactions
    try {
      const savedTransactions = localStorage.getItem('warehouseTransactions');
      if (savedTransactions) {
        setWarehouseTransactions(JSON.parse(savedTransactions));
      }
    } catch (error) {
      console.error('Error loading warehouse transactions:', error);
    }
  }, []);

  const canViewSection = (sectionId: string | null): boolean => {
    if (!user) return false;
    if (!sectionId) return true;
    const key = SECTION_MODULE[sectionId];
    if (!key) return true;
    return !!user.permissions?.[key]?.view;
  };

  const handleWarehouseTransaction = (transaction: Omit<WarehouseTransaction, 'id' | 'createdAt'>) => {
    // Map quyền theo loại giao dịch kho
    const moduleKey: keyof UserPermissions = transaction.type === 'oil_export' ? 'kho-dau' : 'kho-tong';
    if (!can(moduleKey, 'add')) {
      const label = transaction.type === 'oil_export' ? 'xuất dầu' : 'giao dịch kho';
      toast.error(`Bạn không có quyền tạo ${label}`);
      return;
    }

    const newTransaction: WarehouseTransaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };

    const updatedTransactions = [...warehouseTransactions, newTransaction];
    setWarehouseTransactions(updatedTransactions);
    localStorage.setItem('warehouseTransactions', JSON.stringify(updatedTransactions));
  };

  // Function to handle section changes from sidebar
  const handleSectionChange = (section: string | null) => {
    if (!canViewSection(section)) {
      toast.error('Bạn không có quyền truy cập mục này');
      return;
    }
    setActiveSection(section);
  };

  const getQuickStats = () => {
    const today = new Date().toISOString().split('T')[0];

    return {
      todayWarehouse: warehouseTransactions.filter((t) => t.transactionDate === today).length,
      totalItems: warehouseTransactions.length,
    };
  };

  const stats = getQuickStats();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Vui lòng đăng nhập</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Responsive layout with mobile support
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
      </div>

      {/* Mobile Sidebar - Only shown on mobile */}
      <div className="md:hidden">
        <MobileSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 md:p-6">
          {/* Header with title - Mobile responsive */}
          <div className="mb-4 md:mb-6 mt-12 md:mt-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 mobile-padding">
              {!activeSection && 'Hệ Thống Quản Lý Kho Xưởng CNC-CK'}
              {activeSection === 'import' && 'Phiếu Nhập Kho'}
              {activeSection === 'export' && 'Phiếu Xuất Kho'}
              {activeSection === 'oil' && 'Phiếu Xuất Dầu'}
          {activeSection === 'transfer' && 'Phiếu Chuyển Kho'}
          {activeSection === 'reports' && 'Báo Cáo Tổng Hợp'}
          {activeSection === 'inventory' && 'Tồn kho'}
              {activeSection === 'categories' && 'Quản Lý Danh Mục'}
              {activeSection === 'users' && 'Quản Lý Nhân Sự'}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
              <Badge variant="secondary" className="text-xs sm:text-sm px-2 sm:px-3 py-1 w-fit"></Badge>
              <Badge variant={user.role === 'admin' ? 'default' : 'outline'} className="text-xs sm:text-sm px-2 sm:px-3 py-1 w-fit">
                {user.role === 'admin' ? 'Quản trị viên' : ''}
              </Badge>
            </div>
          </div>

          {/* Show homepage content when no section is selected */}
          {!activeSection && (
            <>
              {/* Quick Stats - Mobile responsive grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8 mobile-stats-grid">
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
                  <CardContent className="p-3 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-green-100 text-xs md:text-sm">Kho hôm nay</p>
                        <p className="text-xl md:text-3xl font-bold">{stats.todayWarehouse}</p>
                      </div>
                      <Package className="w-6 h-6 md:w-8 md:h-8 text-green-200 mt-2 md:mt-0" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <CardContent className="p-3 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-purple-100 text-xs md:text-sm">Tổng hoạt động</p>
                        <p className="text-xl md:text-3xl font-bold">{stats.totalItems}</p>
                      </div>
                      <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-purple-200 mt-2 md:mt-0" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Navigation Cards - Mobile responsive grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mobile-card-grid">
                {canViewSection('import') && (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('import')}>
                    <CardHeader className="text-center pb-3 md:pb-4">
                      <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <Package className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold text-green-600">Phiếu Nhập Kho</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Tạo phiếu nhập kho </p>
                      <Badge variant="outline" className="text-xs md:text-sm">
                        {warehouseTransactions.filter((t) => t.type === 'import').length} phiếu nhập
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {canViewSection('export') && (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('export')}>
                    <CardHeader className="text-center pb-3 md:pb-4">
                      <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-red-100 rounded-full flex items-center justify-center group-hover:bg-red-200 transition-colors">
                        <PackageOpen className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold text-red-600">Phiếu Xuất Kho</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Tạo phiếu xuất kho </p>
                      <Badge variant="outline" className="text-xs md:text-sm">
                        {warehouseTransactions.filter((t) => t.type === 'export').length} phiếu xuất
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {canViewSection('oil') && (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('oil')}>
                    <CardHeader className="text-center pb-3 md:pb-4">
                      <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                        <Droplets className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold text-orange-600">Phiếu Xuất Dầu</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Quản lý xuất dầu mỡ cho máy CNC </p>
                      <Badge variant="outline" className="text-xs md:text-sm">
                        {warehouseTransactions.filter((t) => t.type === 'oil_export').length} lần xuất
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {canViewSection('transfer') && (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('transfer')}>
                    <CardHeader className="text-center pb-3 md:pb-4">
                      <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <ArrowRightLeft className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold text-purple-600">Phiếu Chuyển Kho</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Chuyển hàng hóa giữa các kho trong xưởng</p>
                      <Badge variant="outline" className="text-xs md:text-sm">
                        {warehouseTransactions.filter((t) => t.type === 'transfer').length} lần chuyển
                      </Badge>
                    </CardContent>
                  </Card>
                )}

                {canViewSection('reports') && (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('reports')}>
                    <CardHeader className="text-center pb-3 md:pb-4">
                      <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold text-indigo-600">Báo Cáo Tổng Hợp</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Xem báo cáo thống kê và phân tích dữ liệu xưởng</p>
                      <Badge variant="outline" className="text-xs md:text-sm">Thống kê & Phân tích</Badge>
                    </CardContent>
                  </Card>
                )}

                {canViewSection('inventory') && (
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => navigate('/ton-kho')}>
                    <CardHeader className="text-center pb-3 md:pb-4">
                      <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-sky-100 rounded-full flex items-center justify-center group-hover:bg-sky-200 transition-colors">
                        <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-sky-600" />
                      </div>
                      <CardTitle className="text-lg md:text-xl font-bold text-sky-600">Tồn kho</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Xem tồn kho chi tiết theo mức tồn và cảnh báo sắp hết</p>
                      <Badge variant="outline" className="text-xs md:text-sm">Trang riêng</Badge>
                    </CardContent>
                  </Card>
                )}

                {/* Admin Only Cards */}
                {isAdmin && isAdmin() && (
                  <>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('categories')}>
                      <CardHeader className="text-center pb-3 md:pb-4">
                        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center group-hover:bg-yellow-200 transition-colors">
                          <FolderTree className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
                        </div>
                        <CardTitle className="text-lg md:text-xl font-bold text-yellow-600">Quản Lý Danh Mục</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Quản lý danh mục hàng hóa trong xưởng</p>
                        <Badge variant="outline" className="text-xs md:text-sm">Chỉ Quản trị viên</Badge>
                      </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer group mobile-touch-target" onClick={() => handleSectionChange('users')}>
                      <CardHeader className="text-center pb-3 md:pb-4">
                        <div className="mx-auto w-12 h-12 md:w-16 md:h-16 bg-pink-100 rounded-full flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                          <Users className="w-6 h-6 md:w-8 md:h-8 text-pink-600" />
                        </div>
                        <CardTitle className="text-lg md:text-xl font-bold text-pink-600">Quản Lý Nhân Sự</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <p className="text-gray-600 mb-3 md:mb-4 text-sm md:text-base">Quản lý tài khoản và phân quyền người dùng</p>
                        <Badge variant="outline" className="text-xs md:text-sm">Chỉ Quản trị viên</Badge>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="text-center mt-8 md:mt-12 text-gray-500">
                <p className="text-sm md:text-base">© 2026 Hệ Thống Quản Lý Xưởng CNC-CK</p>
                <p className="text-xs md:text-sm mt-1">
                  <strong>Liên kết:</strong> Phiếu nhập kho • Phiếu xuất kho • Phiếu chuyển kho • Phiếu xuất dầu • Quản lý danh mục • Quản lý nhân sự
                </p>
              </div>
            </>
          )}

          {/* Render selected section (guarded) */}
          {activeSection === 'import' && canViewSection('import') && <ExactLayoutWarehouseImport onSubmit={handleWarehouseTransaction} />}
          {activeSection === 'export' && canViewSection('export') && <ExactLayoutWarehouseExport onSubmit={handleWarehouseTransaction} />}
          {activeSection === 'oil' && canViewSection('oil') && <ExactLayoutOilExport onSubmit={handleWarehouseTransaction} />}
          {activeSection === 'transfer' && canViewSection('transfer') && <ExactLayoutWarehouseTransfer onSubmit={handleWarehouseTransaction} />}
          {activeSection === 'categories' && isAdmin && isAdmin() && <CategoryManagement />}
          {activeSection === 'users' && isAdmin && isAdmin() && <UserManagement />}
          {activeSection === 'reports' && canViewSection('reports') && (
            <ReportsPage warehouseTransactions={warehouseTransactions} />
          )}
        </div>
      </div>
    </div>
  );
}