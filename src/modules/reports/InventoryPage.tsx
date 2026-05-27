import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getSavedCategories } from '@/lib/utils';
import { Package, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useOnHandByProduct } from '@/shared/hooks/useInventory';

export function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: onHandRows = [], isLoading, isError } = useOnHandByProduct();

  const inventoryStats = useMemo(() => {
    const categories = getSavedCategories();
    const byProduct = new Map(onHandRows.map((r) => [r.productId, r]));

    return categories
      .map((category) => {
        const productKey = category.id || category.maLoai || category.maChungLoai || '';
        const ledger = byProduct.get(productKey);
        const currentStock = ledger?.quantityOnHand ?? 0;
        const totalValue = ledger?.valuationAmount ?? 0;
        const min = category.minimumStock || 0;
        return {
          category,
          currentStock,
          totalValue,
          isLowStock: currentStock <= min && min > 0,
        };
      })
      .filter((row) => row.currentStock !== 0 || row.category);
  }, [onHandRows]);

  const summary = useMemo(() => {
    const totalQuantity = inventoryStats.reduce((sum, item) => sum + item.currentStock, 0);
    const totalValue = inventoryStats.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockCount = inventoryStats.filter((item) => item.isLowStock).length;
    return {
      totalQuantity,
      totalValue,
      lowStockCount,
      totalItems: inventoryStats.filter((i) => i.currentStock > 0).length,
    };
  }, [inventoryStats]);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/")}
            className="border-gray-300 hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tồn kho</h1>
            <p className="text-gray-600 text-sm">
              Nguồn dữ liệu: <strong>stock_ledger</strong>. Không tính từ phiếu kho.
            </p>
          </div>
        </div>

        {isError && (
          <p className="text-amber-700 text-sm mb-4">
            Chưa kết nối ledger — chạy migration SQL trên Supabase và đăng nhập lại.
          </p>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Tổng mặt hàng</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-indigo-700">{isLoading ? "..." : summary.totalItems}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Số lượng hiện có</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-green-700">{isLoading ? "..." : summary.totalQuantity.toLocaleString("vi-VN")}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Cảnh báo</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-red-700">{summary.lowStockCount}</p></CardContent>
          </Card>
        </div>

        {/* TABLE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5" /> Danh sách tồn kho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 text-xs font-semibold uppercase">Mã loại</th>
                    <th className="text-left p-3 text-xs font-semibold uppercase">Tên loại</th>
                    <th className="text-left p-3 text-xs font-semibold uppercase">Đơn vị</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase">Tồn kho</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase">Tối thiểu</th>
                    <th className="text-right p-3 text-xs font-semibold uppercase">Giá trị</th>
                    <th className="text-center p-3 text-xs font-semibold uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={7} className="p-8 text-center">Đang tải...</td></tr>
                  ) : inventoryStats.length > 0 ? (
                    inventoryStats.map((item) => (
                      <tr key={item.category.id} className={item.isLowStock ? "bg-red-50" : "bg-white"}>
                        <td className="p-3 text-sm">{item.category.maLoai || item.category.tenLoai}</td>
                        <td className="p-3 text-sm">{item.category.tenLoai || item.category.tenChungLoai}</td>
                        <td className="p-3 text-sm">{item.category.donVi}</td>
                        <td className="p-3 text-right font-semibold">{item.currentStock.toLocaleString("vi-VN")}</td>
                        <td className="p-3 text-right text-sm">{item.category.minimumStock || 0}</td>
                        <td className="p-3 text-right text-sm">{item.totalValue.toLocaleString("vi-VN")} VND</td>
                        <td className="p-3 text-center text-sm">
                          {item.isLowStock ? <span className="text-red-700 flex items-center justify-center gap-1"><AlertTriangle className="w-4 h-4" /> Sắp hết</span> : <span className="text-green-700">Bình thường</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">Chưa có dữ liệu tồn kho.</td></tr>
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