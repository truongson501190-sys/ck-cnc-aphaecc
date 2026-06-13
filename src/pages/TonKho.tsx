import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/Sidebar';
import { MobileSidebar } from '@/components/MobileSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { WarehouseTransaction } from '@/types/inventory';
import { Package, AlertTriangle } from 'lucide-react';

const SECTION_PATHS: Record<string, string> = {
  import: '/nhap-kho',
  export: '/xuat-kho',
  transfer: '/chuyen-kho',
  oil: '/xuat-dau',
  reports: '/trang-chu',
  categories: '/quan-ly-danh-muc',
  users: '/user-management',
  inventory: '/ton-kho',
};

export function TonKho() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [warehouseTransactions, setWarehouseTransactions] = useState<WarehouseTransaction[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('warehouseTransactions');
      if (saved) {
        setWarehouseTransactions(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading warehouse transactions:', error);
      setWarehouseTransactions([]);
    }
  }, []);

  const inventoryStats = useMemo(() => {
    let categories: any[] = [];
    try {
      const categoryTypes = JSON.parse(localStorage.getItem('categoryTypes') || '[]');
      const categoryItems = JSON.parse(localStorage.getItem('category_items') || '[]');

      categories = [
        ...categoryTypes,
        ...categoryItems.map((cat: any) => ({
          id: cat.id,
          maLoai: cat.maLoai || cat.tenChungLoai,
          tenLoai: cat.tenLoai || cat.tenChungLoai,
          tenChungLoai: cat.tenChungLoai || cat.tenLoai,
          donVi: cat.donVi || cat.donViTinh,
          gia: cat.gia || parseFloat(cat.donGia) || 0,
          minimumStock: cat.minimumStock || 0,
          createdAt: cat.createdAt || new Date().toISOString(),
        })),
      ];

      categories = categories.filter((cat, index, self) => index === self.findIndex((c) => c.id === cat.id));
    } catch (error) {
      console.error('Error loading categories:', error);
      categories = [];
    }

    const inventoryMap = new Map<string, { category: any; currentStock: number; totalValue: number }>();

    warehouseTransactions.forEach((transaction) => {
      // Chỉ tính approved transactions
      if (transaction.status !== 'approved') return;
      if (transaction.items) {
        transaction.items.forEach((item) => {
          const category = categories.find(
            (c: any) => c.tenLoai === item.itemName || c.maLoai === item.itemName || c.tenChungLoai === item.itemName
          );
          if (!category) return;

          const key = category.id;
          if (!inventoryMap.has(key)) {
            inventoryMap.set(key, { category, currentStock: 0, totalValue: 0 });
          }
          const stock = inventoryMap.get(key)!;
          if (transaction.type === 'import') {
            stock.currentStock += item.quantity;
            stock.totalValue += item.totalValue || 0;
          } else if (transaction.type === 'export' || transaction.type === 'oil_export') {
            stock.currentStock -= item.quantity;
            stock.totalValue -= item.totalValue || 0;
          }
          // Transfer không affect tổng stock
        });
      } else {
        const category = categories.find(
          (c: any) => c.tenLoai === (transaction as any).itemName || c.tenChungLoai === (transaction as any).itemName
        );
        if (!category) return;

        const key = category.id;
        if (!inventoryMap.has(key)) {
          inventoryMap.set(key, { category, currentStock: 0, totalValue: 0 });
        }
        const stock = inventoryMap.get(key)!;
        if (transaction.type === 'import') {
          stock.currentStock += (transaction as any).quantity || 0;
          stock.totalValue += transaction.totalValue || 0;
        } else if (transaction.type === 'export' || transaction.type === 'oil_export') {
          stock.currentStock -= (transaction as any).quantity || 0;
          stock.totalValue -= transaction.totalValue || 0;
        }
        // Transfer không affect tổng stock, chỉ di chuyển giữa kho
      }
    });

    return Array.from(inventoryMap.values()).map((item) => ({
      ...item,
      isLowStock: item.currentStock <= (item.category.minimumStock || 0),
    }));
  }, [warehouseTransactions]);

  const summary = useMemo(() => {
    const totalQuantity = inventoryStats.reduce((sum, item) => sum + item.currentStock, 0);
    const totalValue = inventoryStats.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockCount = inventoryStats.filter((item) => item.isLowStock).length;
    return { totalQuantity, totalValue, lowStockCount, totalItems: inventoryStats.length };
  }, [inventoryStats]);

  const handleSectionChange = (section: string | null) => {
    if (!section) {
      navigate('/trang-chu');
      return;
    }

    const path = SECTION_PATHS[section] ?? '/';
    navigate(path);
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex">
      <div className="hidden md:block">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      </div>
      <div className="md:hidden">
        <MobileSidebar />
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-6 mt-12 md:mt-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Tồn kho</h1>
          <p className="text-gray-600 mt-2">Trang chuyên biệt cho báo cáo tồn kho và cảnh báo hàng sắp hết.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700">Tổng mặt hàng</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-700">{summary.totalItems}</p>
              <p className="text-sm text-gray-500">Mặt hàng tồn kho</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700">Số lượng hiện có</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-700">{summary.totalQuantity}</p>
              <p className="text-sm text-gray-500">Đơn vị tổng</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-700">Cảnh báo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-700">{summary.lowStockCount}</p>
              <p className="text-sm text-gray-500">Mặt hàng thấp hơn tồn tối thiểu</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Danh sách tồn kho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase">Mã loại</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase">Tên loại</th>
                    <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase">Đơn vị</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-600 uppercase">Tồn kho</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-600 uppercase">Tối thiểu</th>
                    <th className="text-right p-3 text-xs font-semibold text-gray-600 uppercase">Giá trị</th>
                    <th className="text-center p-3 text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryStats.length > 0 ? (
                    inventoryStats.map((item) => (
                      <tr key={item.category.id} className={item.isLowStock ? 'bg-red-50' : 'bg-white'}>
                        <td className="p-3 font-medium text-sm text-gray-700">{item.category.maLoai || item.category.tenLoai}</td>
                        <td className="p-3 text-sm text-gray-600">{item.category.tenLoai || item.category.tenChungLoai}</td>
                        <td className="p-3 text-sm text-gray-600">{item.category.donVi || item.category.donViTinh}</td>
                        <td className="p-3 text-right font-semibold text-gray-700">{item.currentStock}</td>
                        <td className="p-3 text-right text-sm text-gray-600">{item.category.minimumStock || 0}</td>
                        <td className="p-3 text-right text-sm text-gray-600">{item.totalValue.toLocaleString('vi-VN')} VND</td>
                        <td className="p-3 text-center text-sm font-medium">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-red-700">
                              <AlertTriangle className="w-4 h-4" /> Sắp hết
                            </span>
                          ) : (
                            <span className="text-green-700">Bình thường</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        Không có dữ liệu tồn kho. Vui lòng thêm danh mục và thực hiện giao dịch nhập kho.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
