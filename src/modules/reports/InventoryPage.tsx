// src/modules/reports/InventoryPage.tsx
import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Package, AlertTriangle, ArrowLeft, Trash2, CheckSquare, FileSpreadsheet, RefreshCw, Square } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

// Key lưu trữ
const CATEGORIES_STORAGE_KEY = 'saved_categories_key_hoac_tuong_duong';
const IMPORT_STORAGE_KEY = 'warehouseImports';
const EXPORT_STORAGE_KEY = 'warehouseExports';
const TRANSFER_STORAGE_KEY = 'warehouseTransfers';
const CONSUMABLE_STORAGE_KEY = 'consumableExports';

// Hàm lấy dữ liệu từ localStorage
const getStorageData = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export function InventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hàm tính toán tồn kho từ tất cả các nguồn
  const calculateInventory = () => {
    setIsLoading(true);
    
    try {
      let cats = getStorageData(CATEGORIES_STORAGE_KEY);
      if (cats.length === 0) {
        cats = [
          { id: 'cat-1', maLoai: 'SP-001', tenLoai: 'Chi tiết CNC A', donVi: 'Cái', minimumStock: 10 },
          { id: 'cat-2', maLoai: 'SP-002', tenLoai: 'Vật tư gia công B', donVi: 'Bộ', minimumStock: 5 },
          { id: 'cat-3', maLoai: 'SP-003', tenLoai: 'Dao phay CNC', donVi: 'Cây', minimumStock: 3 },
        ];
        localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(cats));
      }
      setCategories(cats);

      const imports = getStorageData(IMPORT_STORAGE_KEY);
      const exports = getStorageData(EXPORT_STORAGE_KEY);
      const transfers = getStorageData(TRANSFER_STORAGE_KEY);
      const consumables = getStorageData(CONSUMABLE_STORAGE_KEY);

      console.log('📊 Data sources:', {
        categories: cats.length,
        imports: imports.length,
        exports: exports.length,
        transfers: transfers.length,
        consumables: consumables.length
      });

      console.log('🔍 === ALL ITEM NAMES FROM TRANSACTIONS ===');
      
      const allItemNames: string[] = [];
      
      imports.forEach((imp: any) => {
        if (imp.items && Array.isArray(imp.items)) {
          imp.items.forEach((item: any) => {
            const name = item.tenChungLoai || item.itemName || item.tenLoai || '';
            if (name) {
              allItemNames.push(name);
              console.log(`📥 IMPORT: "${name}" - Số lượng: ${item.soLuong || item.quantity || 0}`);
            }
          });
        }
      });
      
      exports.forEach((exp: any) => {
        if (exp.items && Array.isArray(exp.items)) {
          exp.items.forEach((item: any) => {
            const name = item.tenChungLoai || item.itemName || item.tenLoai || '';
            if (name) {
              allItemNames.push(name);
              console.log(`📤 EXPORT: "${name}" - Số lượng: ${item.soLuong || item.quantity || 0}`);
            }
          });
        }
      });
      
      transfers.forEach((t: any) => {
        if (t.items && Array.isArray(t.items)) {
          t.items.forEach((item: any) => {
            const name = item.tenChungLoai || '';
            if (name) {
              allItemNames.push(name);
              console.log(`🔄 TRANSFER: "${name}" - Số lượng: ${item.soLuong || 0}`);
            }
          });
        }
      });
      
      consumables.forEach((c: any) => {
        if (c.items && Array.isArray(c.items)) {
          c.items.forEach((item: any) => {
            const name = item.itemName || item.tenChungLoai || '';
            if (name) {
              allItemNames.push(name);
              console.log(`🔧 CONSUMABLE: "${name}" - Số lượng: ${item.quantity || item.soLuong || 0}`);
            }
          });
        }
      });

      console.log('📋 Category Names:', cats.map((c: any) => c.tenLoai || c.tenChungLoai));
      console.log('📋 Unique Item Names:', [...new Set(allItemNames)]);
      console.log('🔍 === END DEBUG ===');

      const inventory = cats.map((cat: any) => {
        const catName = cat.tenLoai || cat.tenChungLoai || '';
        const catCode = cat.maLoai || cat.id || '';
        
        let totalImport = 0;
        let totalImportValue = 0;
        let totalExport = 0;
        let totalExportValue = 0;

        const isMatch = (itemName: string) => {
          if (!itemName || !catName) return false;
          const normalizedCat = catName.trim().toLowerCase();
          const normalizedItem = itemName.trim().toLowerCase();
          
          if (normalizedItem === normalizedCat) return true;
          if (normalizedCat.length <= 10 && normalizedItem.includes(normalizedCat)) return true;
          if (normalizedItem.length <= 10 && normalizedCat.includes(normalizedItem)) return true;
          
          return false;
        };

        imports.forEach((imp: any) => {
          if (imp.items && Array.isArray(imp.items)) {
            imp.items.forEach((item: any) => {
              const itemName = item.tenChungLoai || item.itemName || item.tenLoai || '';
              if (isMatch(itemName)) {
                const qty = Number(item.soLuong || item.quantity || 0);
                const price = Number(item.donGia || item.price || 0);
                totalImport += qty;
                totalImportValue += qty * price;
                console.log(`✅ MATCH IMPORT: "${itemName}" → ${catName} (+${qty})`);
              }
            });
          }
        });

        exports.forEach((exp: any) => {
          if (exp.items && Array.isArray(exp.items)) {
            exp.items.forEach((item: any) => {
              const itemName = item.tenChungLoai || item.itemName || item.tenLoai || '';
              if (isMatch(itemName)) {
                const qty = Number(item.soLuong || item.quantity || 0);
                const price = Number(item.donGia || item.price || 0);
                totalExport += qty;
                totalExportValue += qty * price;
                console.log(`✅ MATCH EXPORT: "${itemName}" → ${catName} (-${qty})`);
              }
            });
          }
        });

        transfers.forEach((t: any) => {
          if (t.items && Array.isArray(t.items)) {
            t.items.forEach((item: any) => {
              const itemName = item.tenChungLoai || '';
              if (isMatch(itemName)) {
                const qty = Number(item.soLuong || 0);
                totalExport += qty;
                console.log(`✅ MATCH TRANSFER: "${itemName}" → ${catName} (-${qty})`);
              }
            });
          }
        });

        consumables.forEach((c: any) => {
          if (c.items && Array.isArray(c.items)) {
            c.items.forEach((item: any) => {
              const itemName = item.itemName || item.tenChungLoai || '';
              if (isMatch(itemName)) {
                const qty = Number(item.quantity || item.soLuong || 0);
                const price = Number(item.price || item.donGia || 0);
                totalExport += qty;
                totalExportValue += qty * price;
                console.log(`✅ MATCH CONSUMABLE: "${itemName}" → ${catName} (-${qty})`);
              }
            });
          }
        });

        const currentStock = totalImport - totalExport;
        const totalValue = totalImportValue - totalExportValue;
        const min = cat.minimumStock || 0;

        console.log(`📊 RESULT: ${catName} → Import: ${totalImport}, Export: ${totalExport}, Stock: ${currentStock}`);

        return {
          category: cat,
          uniqueId: cat.id || catCode || `cat-${Math.random()}`,
          currentStock: Math.max(0, currentStock),
          totalValue: Math.max(0, totalValue),
          isLowStock: currentStock <= min && min > 0,
          importQuantity: totalImport,
          exportQuantity: totalExport,
        };
      });

      console.log('📊 FINAL INVENTORY:', inventory);
      setInventoryData(inventory);
      
    } catch (error) {
      console.error('❌ Error calculating inventory:', error);
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
    const totalValue = inventoryData.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockCount = inventoryData.filter((item) => item.isLowStock).length;
    const totalItems = inventoryData.filter((item) => item.currentStock > 0).length;
    return { totalQuantity, totalValue, lowStockCount, totalItems };
  }, [inventoryData]);

  const isAllItemsSelected = inventoryData.length > 0 && 
    inventoryData.every(item => selectedIds.includes(item.uniqueId));

  const handleSelectAllToggle = () => {
    if (isAllItemsSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inventoryData.map(item => item.uniqueId));
    }
  };

  const handleSelectRowToggle = (uniqueId: string) => {
    setSelectedIds(prev =>
      prev.includes(uniqueId) ? prev.filter(id => id !== uniqueId) : [...prev, uniqueId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất một mặt hàng để xóa');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} mặt hàng đã chọn?`)) {
      const nextCategories = categories.filter((cat) => {
        const catId = cat.id || cat.maLoai || cat.maChungLoai || '';
        return !selectedIds.includes(catId);
      });
      
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(nextCategories));
      setCategories(nextCategories);
      setSelectedIds([]);
      toast.success(`Đã xóa thành công ${selectedIds.length} mặt hàng`);
      calculateInventory();
    }
  };

  const handleExportExcel = () => {
    if (inventoryData.length === 0) {
      toast.error("Không có dữ liệu để xuất file Excel!");
      return;
    }

    const excelRows = inventoryData.map((item, index) => ({
      "STT": index + 1,
      "Mã Loại": item.category.maLoai || item.category.tenLoai || '',
      "Tên Loại": item.category.tenLoai || item.category.tenChungLoai || '',
      "Đơn Vị Tính": item.category.donVi || '',
      "Số Lượng Nhập": item.importQuantity || 0,
      "Số Lượng Xuất": item.exportQuantity || 0,
      "Số Lượng Tồn": item.currentStock,
      "Tồn Tối Thiểu": item.category.minimumStock || 0,
      "Giá Trị (VND)": item.totalValue,
      "Trạng Thái": item.isLowStock ? "Sắp hết hàng" : "Bình thường"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TonKho");

    worksheet['!cols'] = [
      { wch: 6 }, { wch: 15 }, { wch: 30 }, 
      { wch: 12 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }
    ];

    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const fileName = `Bao_Cao_Ton_Kho_${dateStr}.xlsx`;

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
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Tồn kho</h1>
              <p className="text-xs text-gray-500">
                Dữ liệu từ <strong>Nhập kho, Xuất kho, Chuyển kho, Xuất vật tư</strong>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">Tổng mặt hàng có tồn</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-700">
                {isLoading ? "..." : summary.totalItems}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Tổng số lượng tồn</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-700">
                {isLoading ? "..." : summary.totalQuantity.toLocaleString("vi-VN")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Cảnh báo tồn thấp</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-700">{summary.lowStockCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" /> Danh sách tồn kho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="w-8 px-2 py-1.5 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAllToggle}
                        className="p-0 h-5 w-5"
                        disabled={inventoryData.length === 0}
                      >
                        {isAllItemsSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-gray-400" />
                        )}
                      </Button>
                    </th>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Mã loại</th>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Tên loại</th>
                    <th className="text-left px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Đơn vị</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Nhập</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Xuất</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Tồn</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Tối thiểu</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Giá trị</th>
                    <th className="text-center px-2 py-1.5 text-[10px] font-medium text-gray-500 uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={10} className="p-6 text-center text-sm">Đang tính toán...</td></tr>
                  ) : inventoryData.length > 0 ? (
                    inventoryData.map((item) => (
                      <tr key={item.uniqueId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-2 py-1.5 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectRowToggle(item.uniqueId)}
                            className="p-0 h-5 w-5"
                          >
                            {selectedIds.includes(item.uniqueId) ? (
                              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-400" />
                            )}
                          </Button>
                        </td>
                        <td className="px-2 py-1.5 text-xs font-medium">{item.category.maLoai || '---'}</td>
                        <td className="px-2 py-1.5 text-xs">{item.category.tenLoai || '---'}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-500">{item.category.donVi || '---'}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-green-600">{item.importQuantity || 0}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-red-600">{item.exportQuantity || 0}</td>
                        <td className="px-2 py-1.5 text-right text-xs font-semibold">{item.currentStock}</td>
                        <td className="px-2 py-1.5 text-right text-xs text-gray-500">{item.category.minimumStock || 0}</td>
                        <td className="px-2 py-1.5 text-right text-xs font-medium">{item.totalValue.toLocaleString('vi-VN')} VND</td>
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
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={10} className="p-6 text-center text-sm text-gray-500">Chưa có dữ liệu tồn kho</td></tr>
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