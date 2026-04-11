import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WarehouseTransaction } from '@/types/inventory';

interface ReportsPageProps {
  warehouseTransactions: WarehouseTransaction[];
}

export function ReportsPage({ warehouseTransactions }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouse' | 'trends'>('overview');
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Filter data based on selected criteria
  const filteredWarehouseTransactions = useMemo(() => {
    return warehouseTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.transactionDate);
      const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

      const dateMatch = (!startDate || transactionDate >= startDate) && 
                       (!endDate || transactionDate <= endDate);
      const typeMatch = typeFilter === 'all' || transaction.type === typeFilter;

      return dateMatch && typeMatch;
    });
  }, [warehouseTransactions, dateFilter, typeFilter]);

  // Calculate statistics
  const warehouseStats = useMemo(() => {
    const transactions = filteredWarehouseTransactions;
    const totalValue = transactions.reduce((sum, t) => sum + (t.totalValue || 0), 0);
    
    return {
      totalTransactions: transactions.length,
      totalValue,
      imports: transactions.filter(t => t.type === 'import').length,
      exports: transactions.filter(t => t.type === 'export').length,
      transfers: transactions.filter(t => t.type === 'transfer').length,
      oilExports: transactions.filter(t => t.type === 'oil_export').length,
    };
  }, [filteredWarehouseTransactions]);

  // Calculate inventory levels
  const inventoryStats = useMemo(() => {
    // Try to load categories from both possible localStorage keys
    let categories: any[] = [];
    try {
      const categoryTypes = JSON.parse(localStorage.getItem('categoryTypes') || '[]');
      const categoryItems = JSON.parse(localStorage.getItem('category_items') || '[]');
      
      // Combine categories from both sources
      categories = [...categoryTypes, ...categoryItems.map((cat: any) => ({
        id: cat.id,
        maLoai: cat.maLoai || cat.tenChungLoai,
        tenLoai: cat.tenLoai || cat.tenChungLoai,
        donVi: cat.donVi || cat.donViTinh,
        gia: cat.gia || parseFloat(cat.donGia) || 0,
        minimumStock: cat.minimumStock || 0,
        createdAt: cat.createdAt || new Date().toISOString()
      }))];
      
      // Remove duplicates based on id
      const uniqueCategories = categories.filter((cat, index, self) => 
        index === self.findIndex(c => c.id === cat.id)
      );
      categories = uniqueCategories;
    } catch (error) {
      console.error('Error loading categories:', error);
      categories = [];
    }

    const inventoryMap = new Map();

    // Calculate current stock for each category
    filteredWarehouseTransactions.forEach(transaction => {
      if (transaction.items) {
        transaction.items.forEach(item => {
          const category = categories.find((c: any) => 
            c.tenLoai === item.itemName || 
            c.maLoai === item.itemName ||
            c.tenChungLoai === item.itemName
          );
          if (category) {
            const key = category.id;
            if (!inventoryMap.has(key)) {
              inventoryMap.set(key, {
                category: category,
                currentStock: 0,
                totalValue: 0
              });
            }
            const stock = inventoryMap.get(key);
            if (transaction.type === 'import') {
              stock.currentStock += item.quantity;
              stock.totalValue += item.totalValue || 0;
            } else if (transaction.type === 'export' || transaction.type === 'oil_export') {
              stock.currentStock -= item.quantity;
              stock.totalValue -= item.totalValue || 0;
            }
          }
        });
      } else {
        // Handle old format transactions
        const category = categories.find((c: any) => 
          c.tenLoai === (transaction as any).itemName ||
          c.tenChungLoai === (transaction as any).itemName
        );
        if (category) {
          const key = category.id;
          if (!inventoryMap.has(key)) {
            inventoryMap.set(key, {
              category: category,
              currentStock: 0,
              totalValue: 0
            });
          }
          const stock = inventoryMap.get(key);
          if (transaction.type === 'import') {
            stock.currentStock += (transaction as any).quantity;
            stock.totalValue += transaction.totalValue || 0;
          } else if (transaction.type === 'export' || transaction.type === 'oil_export') {
            stock.currentStock -= (transaction as any).quantity;
            stock.totalValue -= transaction.totalValue || 0;
          }
        }
      }
    });

    const result = Array.from(inventoryMap.values()).map(item => ({
      ...item,
      isLowStock: item.currentStock <= (item.category.minimumStock || 0)
    }));
    
    return result;
  }, [filteredWarehouseTransactions]);

  // Group data by date for trends
  const warehouseTrends = useMemo(() => {
    const grouped = filteredWarehouseTransactions.reduce((acc, transaction) => {
      const date = transaction.transactionDate;
      if (!acc[date]) {
        acc[date] = { date, count: 0, value: 0 };
      }
      acc[date].count++;
      acc[date].value += transaction.totalValue || 0;
      return acc;
    }, {} as Record<string, { date: string; count: number; value: number }>);
    const arr = Object.values(grouped) as { date: string; count: number; value: number }[];
    return arr.sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredWarehouseTransactions]);

  const handleExportData = () => {
    if (filteredWarehouseTransactions.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const exportData = filteredWarehouseTransactions.flatMap(t => {
      if (t.items && t.items.length > 0) {
        return t.items.map((item, index) => ({
          'Ngày': t.transactionDate,
          'Số Phiếu': t.referenceNumber,
          'Loại': t.type === 'import' ? 'Nhập' : t.type === 'export' ? 'Xuất' : t.type === 'transfer' ? 'Chuyển' : 'Xuất dầu',
          'Mặt Hàng': item.itemName,
          'Số Lượng': item.quantity,
          'Đơn Vị': item.unit,
          'Thành Tiền': item.totalValue || 0,
          'Người Thực Hiện': t.operator,
          'Trạng Thái Ban Đầu': t.trangThaiBanDau || '',
          'Ghi Chú': t.notes || ''
        }));
      } else {
        return [{
          'Ngày': t.transactionDate,
          'Số Phiếu': t.referenceNumber,
          'Loại': t.type === 'import' ? 'Nhập' : t.type === 'export' ? 'Xuất' : t.type === 'transfer' ? 'Chuyển' : 'Xuất dầu',
          'Mặt Hàng': (t as any).itemName || '',
          'Số Lượng': (t as any).quantity || 0,
          'Đơn Vị': (t as any).unit || '',
          'Thành Tiền': t.totalValue || 0,
          'Người Thực Hiện': t.operator,
          'Trạng Thái Ban Đầu': t.trangThaiBanDau || '',
          'Ghi Chú': t.notes || ''
        }];
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCao');
    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Đã xuất báo cáo Excel thành công');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-indigo-600 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Báo Cáo Tổng Hợp
          </CardTitle>

          <div className="flex items-center gap-2">
            <Button onClick={handleExportData} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Xuất dữ liệu
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Bộ Lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="startDate">Từ ngày</Label>
              <Input
                id="startDate"
                type="date"
                value={dateFilter.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Đến ngày</Label>
              <Input
                id="endDate"
                type="date"
                value={dateFilter.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="typeFilter">Loại giao dịch kho</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="import">Nhập kho</SelectItem>
                  <SelectItem value="export">Xuất kho</SelectItem>
                  <SelectItem value="transfer">Chuyển kho</SelectItem>
                  <SelectItem value="oil_export">Xuất dầu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleExportData} className="w-full flex items-center gap-2">
                <Download className="w-4 h-4" />
                Xuất dữ liệu
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="warehouse">Kho hàng</TabsTrigger>
          <TabsTrigger value="trends">Xu hướng</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Tổng giao dịch kho</p>
                    <p className="text-3xl font-bold">{warehouseStats.totalTransactions}</p>
                  </div>
                  <Package className="w-8 h-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Nhập kho</p>
                    <p className="text-3xl font-bold">{warehouseStats.imports}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Giá trị kho</p>
                    <p className="text-2xl font-bold">{warehouseStats.totalValue.toLocaleString('vi-VN')}</p>
                    <p className="text-purple-100 text-xs">VND</p>
                  </div>
                  <Package className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Warehouse Details */}
        <TabsContent value="warehouse" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Thống kê theo loại
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Nhập kho:</span>
                  <Badge variant="default">{warehouseStats.imports}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Xuất kho:</span>
                  <Badge variant="destructive">{warehouseStats.exports}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Chuyển kho:</span>
                  <Badge variant="secondary">{warehouseStats.transfers}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Xuất dầu:</span>
                  <Badge variant="outline">{warehouseStats.oilExports}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Giao dịch gần đây
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredWarehouseTransactions.slice(-20).reverse().map((transaction) => (
                    <div key={transaction.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            transaction.type === 'import' ? 'default' : 
                            transaction.type === 'export' ? 'destructive' : 
                            transaction.type === 'transfer' ? 'secondary' : 'outline'
                          }>
                            {transaction.type === 'import' ? 'Nhập' : 
                             transaction.type === 'export' ? 'Xuất' : 
                             transaction.type === 'transfer' ? 'Chuyển' : 'Xuất dầu'}
                          </Badge>
                          <span className="text-xs text-gray-500 font-mono">{transaction.referenceNumber}</span>
                        </div>
                        <span className="text-xs text-gray-500">{transaction.transactionDate}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {transaction.items && transaction.items.map((item, idx) => (
                          <div key={item.id || idx} className="flex justify-between text-sm">
                            <span className="text-gray-700 truncate max-w-[200px]">{item.itemName}</span>
                            <span className="text-gray-500">{item.quantity} {item.unit}</span>
                          </div>
                        ))}
                        {!transaction.items && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-700">{(transaction as any).itemName}</span>
                            <span className="text-gray-500">{(transaction as any).quantity} {(transaction as any).unit}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                        <span className="text-xs text-gray-400">Người lập: {transaction.operator}</span>
                        <span className="font-bold text-indigo-600">
                          {transaction.totalValue?.toLocaleString('vi-VN')} VND
                        </span>
                      </div>
                    </div>
                  ))}
                  {filteredWarehouseTransactions.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Không có dữ liệu</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        {/* Trends */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-700">
                  Xu hướng kho hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {warehouseTrends.map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(trend.date).toLocaleDateString('vi-VN')}</p>
                        <p className="text-sm text-gray-600">{trend.count} giao dịch</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {trend.value.toLocaleString('vi-VN')}
                        </p>
                        <p className="text-xs text-gray-500">VND</p>
                      </div>
                    </div>
                  ))}
                  {warehouseTrends.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Không có dữ liệu</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}