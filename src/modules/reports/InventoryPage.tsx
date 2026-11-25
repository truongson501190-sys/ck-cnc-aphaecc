// src/modules/reports/InventoryPage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Package, AlertTriangle, ArrowLeft, Trash2, CheckSquare, FileSpreadsheet, RefreshCw, Square } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { loadArrayFromStorage, saveArrayToStorage, STORAGE_KEYS } from '@/lib/localStorage';
import type { Category, Transaction, ImportTransaction, ExportTransaction, TransferTransaction, ConsumableTransaction, AdjustmentTransaction, InventoryCountEntry } from '@/types/warehouse';

export function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const calculateInventory = () => {
    setIsLoading(true);
    try {
      const cats = loadArrayFromStorage<Category>(STORAGE_KEYS.CATEGORIES);
      setCategories(cats);

      // Load all transactions
      const imports = loadArrayFromStorage<ImportTransaction>(STORAGE_KEYS.IMPORTS);
      const exports = loadArrayFromStorage<ExportTransaction>(STORAGE_KEYS.EXPORTS);
      const transfers = loadArrayFromStorage<TransferTransaction>(STORAGE_KEYS.TRANSFERS);
      const consumables = loadArrayFromStorage<ConsumableTransaction>(STORAGE_KEYS.CONSUMABLES);
      const adjustments = loadArrayFromStorage<AdjustmentTransaction>(STORAGE_KEYS.ADJUSTMENTS);

      const allTx: Transaction[] = [
        ...imports.map(t => ({ ...t, type: 'import' as const })),
        ...exports.map(t => ({ ...t, type: 'export' as const })),
        ...transfers.map(t => ({ ...t, type: 'transfer' as const })),
        ...consumables.map(t => ({ ...t, type: 'consumable' as const })),
        ...adjustments.map(t => ({ ...t, type: 'adjustment' as const })),
      ];

      // Load inventory counts applied
      const counts = loadArrayFromStorage<InventoryCountEntry>(STORAGE_KEYS.INVENTORY_COUNTS)
        .filter(c => c.status === 'applied');

      const inventory = cats.map(cat => {
        let totalImport = 0;
        let totalExport = 0;

        allTx.forEach(tx => {
          const items = tx.items || [];
          items.forEach(item => {
            if (item.categoryId === cat.id) {
              const qty = item.quantity || 0;
              if (tx.type === 'import') totalImport += qty;
              else if (tx.type === 'export' || tx.type === 'transfer' || tx.type === 'consumable') {
                totalExport += qty;
              } else if (tx.type === 'adjustment') {
                if (qty > 0) totalImport += qty;
                else totalExport += Math.abs(qty);
              }
            }
          });
        });

        const currentStock = totalImport - totalExport;
        const latestCount = counts
          .filter(c => c.categoryId === cat.id)
          .sort((a, b) => new Date(b.countedAt).getTime() - new Date(a.countedAt).getTime())[0];

        return {
          category: cat,
          uniqueId: cat.id,
          currentStock: Math.max(0, currentStock),
          totalValue: 0,
          isLowStock: currentStock <= cat.minStock && cat.minStock > 0,
          importQuantity: totalImport,
          exportQuantity: totalExport,
          lastCountedAt: latestCount?.countedAt || null,
          lastCountedQuantity: latestCount?.countedQuantity || null,
          difference: latestCount ? latestCount.countedQuantity - currentStock : 0,
        };
      });

      setInventoryData(inventory);
    } catch (error) {
      console.error('Error calculating inventory:', error);
      toast.error('Lỗi tính toán tồn kho');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    calculateInventory();
  }, []);

  const summary = useMemo(() => {
    const totalQuantity = inventoryData.reduce((sum, item) => sum + item.currentStock, 0);
    const lowStockCount = inventoryData.filter(item => item.isLowStock).length;
    const totalItems = inventoryData.filter(item => item.currentStock > 0).length;
    return { totalQuantity, lowStockCount, totalItems };
  }, [inventoryData]);

  const isAllItemsSelected = inventoryData.length > 0 && inventoryData.every(item => selectedIds.includes(item.uniqueId));

  const handleSelectAllToggle = () => {
    if (isAllItemsSelected) setSelectedIds([]);
    else setSelectedIds(inventoryData.map(item => item.uniqueId));
  };

  const handleSelectRowToggle = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một mặt hàng');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mặt hàng?`)) {
      const remaining = categories.filter(cat => !selectedIds.includes(cat.id));
      saveArrayToStorage(STORAGE_KEYS.CATEGORIES, remaining);
      setCategories(remaining);
      setSelectedIds([]);
      toast.success(`Đã xóa ${selectedIds.length} mặt hàng`);
      calculateInventory();
    }
  };

  const handleExportExcel = () => {
    if (inventoryData.length === 0) {
      toast.error('Không có dữ liệu');
      return;
    }
    const rows = inventoryData.map((item, idx) => ({
      'STT': idx + 1,
      'Mã loại': item.category.code,
      'Tên loại': item.category.name,
      'Đơn vị': item.category.unit,
      'Nhập': item.importQuantity,
      'Xuất': item.exportQuantity,
      'Tồn': item.currentStock,
      'Tồn tối thiểu': item.category.minStock,
      'Trạng thái': item.isLowStock ? 'Sắp hết' : 'Bình thường',
      'Kiểm kê gần nhất': item.lastCountedAt ? new Date(item.lastCountedAt).toLocaleDateString('vi-VN') : 'Chưa kiểm kê',
      'Chênh lệch': item.difference || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TonKho');
    XLSX.writeFile(wb, `BaoCaoTonKho_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  if (!user) {
    return <div className="p-8 text-center">Vui lòng đăng nhập</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Tồn kho</h1>
              <p className="text-xs text-gray-500">Tổng hợp từ nhập, xuất, chuyển, tiêu hao, điều chỉnh</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-7 text-xs px-2.5">
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Xuất Excel
            </Button>
            <Button variant="outline" size="sm" onClick={calculateInventory} className="h-7 text-xs px-2.5">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tính lại
            </Button>
            {selectedIds.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="h-7 text-xs px-2.5">
                <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Xóa ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Mặt hàng có tồn</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-indigo-700">{isLoading ? '...' : summary.totalItems}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Tổng số lượng tồn</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-700">{isLoading ? '...' : summary.totalQuantity.toLocaleString('vi-VN')}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Cảnh báo tồn thấp</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-700">{summary.lowStockCount}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" /> Danh sách tồn kho</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-8 px-2 py-1.5 text-center">
                      <Button variant="ghost" size="sm" onClick={handleSelectAllToggle} className="p-0 h-5 w-5" disabled={inventoryData.length === 0}>
                        {isAllItemsSelected ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                      </Button>
                    </th>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Mã loại</th>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Tên loại</th>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Đơn vị</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Nhập</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Xuất</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Tồn</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Tối thiểu</th>
                    <th className="text-center px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Trạng thái</th>
                    <th className="text-center px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Kiểm kê gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={10} className="p-6 text-center text-sm">Đang tính toán...</td></tr>
                  ) : inventoryData.length === 0 ? (
                    <tr><td colSpan={10} className="p-6 text-center text-sm text-gray-500">Chưa có dữ liệu tồn kho</td></tr>
                  ) : (
                    inventoryData.map((item) => (
                      <tr key={item.uniqueId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-center">
                          <Button variant="ghost" size="sm" onClick={() => handleSelectRowToggle(item.uniqueId)} className="p-0 h-5 w-5">
                            {selectedIds.includes(item.uniqueId) ? <CheckSquare className="w-3.5 h-3.5 text-blue-600" /> : <Square className="w-3.5 h-3.5 text-gray-400" />}
                          </Button>
                        </td>
                        <td className="px-2 py-1.5 text-xs font-medium">{item.category.code}</td>
                        <td className="px-2 py-1.5 text-xs">{item.category.name}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-500">{item.category.unit}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-green-600">{item.importQuantity}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-red-600">{item.exportQuantity}</td>
                        <td className="px-2 py-1.5 text-right text-xs font-semibold">{item.currentStock}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-gray-500">{item.category.minStock}</td>
                        <td className="px-2 py-1.5 text-center text-xs">
                          {item.isLowStock ? (
                            <span className="text-red-700 flex items-center justify-center gap-0.5 text-[10px]">
                              <AlertTriangle className="w-3 h-3" /> Sắp hết
                            </span>
                          ) : item.currentStock === 0 ? (
                            <span className="text-gray-500 text-[10px]">Hết hàng</span>
                          ) : (
                            <span className="text-green-700 text-[10px]">Bình thường</span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-center text-xs">
                          {item.lastCountedAt ? (
                            <div>
                              <span>{new Date(item.lastCountedAt).toLocaleDateString('vi-VN')}</span>
                              {item.difference !== 0 && (
                                <span className={`ml-1 text-[10px] ${item.difference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ({item.difference > 0 ? '+' : ''}{item.difference})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-[10px]">Chưa kiểm kê</span>
                          )}
                        </td>
                      </tr>
                    ))
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

export default InventoryPage;