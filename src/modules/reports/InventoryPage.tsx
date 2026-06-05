import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getSavedCategories } from '@/lib/utils';
import { Package, AlertTriangle, ArrowLeft, Trash2, CheckSquare, FileSpreadsheet } from 'lucide-react';
import { useOnHandByProduct } from '@/shared/hooks/useInventory';
import { toast } from 'sonner';
import * as XLSX from 'xlsx'; // Import thư viện SheetJS

export function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: onHandRows = [], isLoading, isError } = useOnHandByProduct();

  // State lưu trữ các ID danh mục được chọn nhiều
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // State cục bộ để quản lý danh sách categories sau khi bị xóa
  const [categories, setCategories] = useState<any[]>([]);

  // Khởi tạo dữ liệu categories từ bộ nhớ
  useEffect(() => {
    setCategories(getSavedCategories());
  }, []);

  const inventoryStats = useMemo(() => {
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
          // Đảm bảo luôn có một ID chuẩn để làm Key chọn/xóa
          uniqueId: category.id || productKey,
          currentStock,
          totalValue,
          isLowStock: currentStock <= min && min > 0,
        };
      })
      .filter((row) => row.currentStock !== 0 || row.category);
  }, [onHandRows, categories]);

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

  // Logic chọn / bỏ chọn tất cả các dòng đang hiển thị
  const isAllItemsSelected = inventoryStats.length > 0 && inventoryStats.every(item => selectedIds.includes(item.uniqueId));

  const handleSelectAllToggle = () => {
    if (isAllItemsSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inventoryStats.map(item => item.uniqueId));
    }
  };

  const handleSelectRowToggle = (uniqueId: string) => {
    setSelectedIds(prev =>
      prev.includes(uniqueId) ? prev.filter(id => id !== uniqueId) : [...prev, uniqueId]
    );
  };

  // Hàm xử lý xóa các mục đã chọn
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mặt hàng đã chọn khỏi danh mục?`)) {
      const nextCategories = categories.filter(
        (cat) => !selectedIds.includes(cat.id || cat.maLoai || cat.maChungLoai || '')
      );
      
      localStorage.setItem('saved_categories_key_hoac_tuong_duong', JSON.stringify(nextCategories)); 
      
      setCategories(nextCategories);
      setSelectedIds([]);
      toast.success(`Đã xóa thành công ${selectedIds.length} mặt hàng`);
    }
  };

  // Hàm xử lý xuất file Excel
  const handleExportExcel = () => {
    if (inventoryStats.length === 0) {
      toast.error("Không có dữ liệu để xuất file Excel!");
      return;
    }

    // 1. Chuẩn bị map dữ liệu sang cấu trúc bảng Excel tiếng Việt công nghiệp
    const excelRows = inventoryStats.map((item, index) => ({
      "STT": index + 1,
      "Mã Loại": item.category.maLoai || item.category.tenLoai || '',
      "Tên Loại": item.category.tenLoai || item.category.tenChungLoai || '',
      "Đơn Vị Tính": item.category.donVi || '',
      "Số Lượng Tồn": item.currentStock,
      "Tồn Tối Thiểu": item.category.minimumStock || 0,
      "Giá Trị (VND)": item.totalValue,
      "Trạng Thái": item.isLowStock ? "Sắp hết hàng" : "Bình thường"
    }));

    // 2. Khởi tạo worksheet và workbook
    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TonKho");

    // 3. Tự động căn chỉnh độ rộng cột cơ bản
    const maxProps = [{ wch: 6 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }];
    worksheet['!cols'] = maxProps;

    // 4. Tạo tên file kèm theo mốc thời gian cụ thể
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const fileName = `Bao_Cao_Ton_Kho_${dateStr}.xlsx`;

    // 5. Xuất file xuống máy khách
    XLSX.writeFile(workbook, fileName);
    toast.success("Đã xuất báo cáo Excel thành công!");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
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

          {/* NHÓM NÚT ĐIỀU KHIỂN HÀNG LOẠT & TIỆN ÍCH */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Nút Xuất Excel */}
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 bg-white"
            >
              <FileSpreadsheet className="w-4 h-4" /> Xuất Excel
            </Button>

            {/* Nút xóa nhiều xuất hiện động khi có check */}
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-2 animate-in fade-in zoom-in-95 duration-150"
              >
                <Trash2 className="w-4 h-4" /> Xóa mục đã chọn ({selectedIds.length})
              </Button>
            )}
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
            <CardContent>
              <p className="text-3xl font-bold text-indigo-700">{isLoading ? "..." : summary.totalItems}</p>
              {selectedIds.length > 0 && (
                <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 mt-1">
                  <CheckSquare className="w-3.5 h-3.5" /> Đang chọn {selectedIds.length} hàng
                </span>
              )}
            </CardContent>
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
                    <th className="w-[50px] p-3 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 transform scale-50 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer align-middle"
                        checked={isAllItemsSelected}
                        onChange={handleSelectAllToggle}
                        disabled={inventoryStats.length === 0}
                      />
                    </th>
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
                    <tr><td colSpan={8} className="p-8 text-center">Đang tải...</td></tr>
                  ) : inventoryStats.length > 0 ? (
                    inventoryStats.map((item) => (
                      <tr 
                        key={item.uniqueId} 
                        className={`border-b border-gray-100 transition-colors ${
                          selectedIds.includes(item.uniqueId) 
                            ? "bg-indigo-50/60" 
                            : item.isLowStock ? "bg-red-50 hover:bg-red-100/70" : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 transform scale-50 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer align-middle"
                            checked={selectedIds.includes(item.uniqueId)}
                            onChange={() => handleSelectRowToggle(item.uniqueId)}
                          />
                        </td>
                        <td className="p-3 text-sm font-medium">{item.category.maLoai || item.category.tenLoai}</td>
                        <td className="p-3 text-sm">{item.category.tenLoai || item.category.tenChungLoai}</td>
                        <td className="p-3 text-sm text-gray-500">{item.category.donVi}</td>
                        <td className="p-3 text-right font-semibold">{item.currentStock.toLocaleString("vi-VN")}</td>
                        <td className="p-3 text-right text-sm text-gray-500">{item.category.minimumStock || 0}</td>
                        <td className="p-3 text-right text-sm font-medium">{item.totalValue.toLocaleString("vi-VN")} VND</td>
                        <td className="p-3 text-center text-sm">
                          {item.isLowStock ? (
                            <span className="text-red-700 flex items-center justify-center gap-1 font-medium">
                              <AlertTriangle className="w-4 h-4" /> Sắp hết
                            </span>
                          ) : (
                            <span className="text-green-700">Bình thường</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">Chưa có dữ liệu tồn kho.</td></tr>
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