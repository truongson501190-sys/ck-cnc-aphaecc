// src/modules/reports/warehouse/WarehouseReport.tsx
import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, ArrowLeft, Loader2, RefreshCw, FileSpreadsheet, Eye, ChevronDown, ChevronUp, Calendar, Package, TrendingUp } from 'lucide-react';
import { ReportTable, Column } from '@/components/ReportTable';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

// Key lưu trữ
const STORAGE_KEYS = {
  imports: 'warehouseImports',
  exports: 'warehouseExports',
  transfers: 'warehouseTransfers',
  consumables: 'consumableExports',
};

// Helper function
const movementTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    import: '📥 Nhập kho',
    export: '📤 Xuất kho',
    transfer: '🔄 Chuyển kho',
    oil_export: '🔧 Xuất vật tư',
  };
  return map[type] || type;
};

const getStatusBadge = (status: string) => {
  const statusMap: Record<string, { label: string; className: string }> = {
    pending: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Đã duyệt', className: 'bg-blue-100 text-blue-800' },
    transferred: { label: 'Đã xuất', className: 'bg-indigo-100 text-indigo-800' },
    received: { label: 'Đã nhận', className: 'bg-green-100 text-green-800' },
    rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-800' },
  };
  return statusMap[status] || { label: status || 'Không xác định', className: 'bg-gray-100 text-gray-800' };
};

// Màu cho biểu đồ
const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#8b5cf6'];

export function WarehouseReport() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0],
  });
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [movements, setMovements] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Hàm lấy dữ liệu từ localStorage
  const loadData = () => {
    setIsLoading(true);
    try {
      const imports = JSON.parse(localStorage.getItem(STORAGE_KEYS.imports) || '[]');
      const exports = JSON.parse(localStorage.getItem(STORAGE_KEYS.exports) || '[]');
      const transfers = JSON.parse(localStorage.getItem(STORAGE_KEYS.transfers) || '[]');
      const consumables = JSON.parse(localStorage.getItem(STORAGE_KEYS.consumables) || '[]');

      const allMovements: any[] = [];

      // Xử lý nhập kho
      imports.forEach((imp: any) => {
        if (imp.items && Array.isArray(imp.items)) {
          const totalItems = imp.items.reduce((sum: number, item: any) => sum + (item.soLuong || item.quantity || 0), 0);
          allMovements.push({
            id: imp.soPhieu,
            type: 'import',
            soPhieu: imp.soPhieu,
            ngay: imp.ngayNhap || imp.createdAt?.slice(0, 10) || '',
            kho: imp.khoNhap || 'Kho chính',
            nguoi: imp.nguoiNhap || 'Admin',
            nhaCungCap: imp.nhaCungCap || '---',
            ghiChu: imp.ghiChu || '---',
            tongTien: imp.tongTien || 0,
            totalItems: totalItems,
            status: imp.status || 'approved',
            items: imp.items.map((item: any) => ({
              ten: item.tenChungLoai || item.itemName || 'Unknown',
              soLuong: item.soLuong || item.quantity || 0,
              donVi: item.donVi || item.unit || '',
              donGia: item.donGia || item.price || 0,
              thanhTien: (item.soLuong || item.quantity || 0) * (item.donGia || item.price || 0),
              jobNo: item.jobNo || '',
            })),
          });
        }
      });

      // Xử lý xuất kho
      exports.forEach((exp: any) => {
        if (exp.items && Array.isArray(exp.items)) {
          const totalItems = exp.items.reduce((sum: number, item: any) => sum + (item.soLuong || item.quantity || 0), 0);
          allMovements.push({
            id: exp.soPhieu,
            type: 'export',
            soPhieu: exp.soPhieu,
            ngay: exp.ngayXuat || exp.createdAt?.slice(0, 10) || '',
            kho: exp.khoXuat || 'Kho chính',
            nguoi: exp.nguoiXuat || 'Admin',
            nguoiNhan: exp.nguoiNhan || '',
            duAn: exp.duAn || '',
            ghiChu: exp.ghiChu || '---',
            tongTien: exp.tongTien || 0,
            totalItems: totalItems,
            status: exp.status || 'approved',
            items: exp.items.map((item: any) => ({
              ten: item.tenChungLoai || item.itemName || 'Unknown',
              soLuong: item.soLuong || item.quantity || 0,
              donVi: item.donVi || item.unit || '',
              donGia: item.donGia || item.price || 0,
              thanhTien: (item.soLuong || item.quantity || 0) * (item.donGia || item.price || 0),
              jobNo: item.jobNo || '',
            })),
          });
        }
      });

      // Xử lý chuyển kho
      transfers.forEach((t: any) => {
        if (t.items && Array.isArray(t.items)) {
          const totalItems = t.items.reduce((sum: number, item: any) => sum + (item.soLuong || 0), 0);
          allMovements.push({
            id: t.soPhieu,
            type: 'transfer',
            soPhieu: t.soPhieu,
            ngay: t.ngayChuyen || t.createdAt?.slice(0, 10) || '',
            kho: `${t.khoXuat || 'Kho xuất'} → ${t.khoNhap || 'Kho nhập'}`,
            nguoi: t.nguoiThucHien || 'Admin',
            duAn: t.duAn || '',
            ghiChu: t.ghiChu || '---',
            tongTien: 0,
            totalItems: totalItems,
            status: t.status || 'approved',
            items: t.items.map((item: any) => ({
              ten: item.tenChungLoai || 'Unknown',
              soLuong: item.soLuong || 0,
              donVi: item.donVi || '',
              donGia: 0,
              thanhTien: 0,
            })),
          });
        }
      });

      // Xử lý xuất vật tư tiêu hao
      consumables.forEach((c: any) => {
        if (c.items && Array.isArray(c.items)) {
          const totalItems = c.items.reduce((sum: number, item: any) => sum + (item.quantity || item.soLuong || 0), 0);
          allMovements.push({
            id: c.soPhieu,
            type: 'oil_export',
            soPhieu: c.soPhieu,
            ngay: c.ngayXuat || c.createdAt?.slice(0, 10) || '',
            kho: c.mayMoc || 'Máy móc',
            nguoi: c.nguoiNhan || '',
            lyDo: c.lyDo || '',
            ghiChu: c.ghiChu || '---',
            tongTien: c.totalValue || 0,
            totalItems: totalItems,
            status: c.status || 'approved',
            items: c.items.map((item: any) => ({
              ten: item.itemName || item.tenChungLoai || 'Unknown',
              soLuong: item.quantity || item.soLuong || 0,
              donVi: item.unit || '',
              donGia: item.price || item.donGia || 0,
              thanhTien: (item.quantity || item.soLuong || 0) * (item.price || item.donGia || 0),
            })),
          });
        }
      });

      // Sắp xếp theo ngày mới nhất
      allMovements.sort((a, b) => (b.ngay || '').localeCompare(a.ngay || ''));

      setMovements(allMovements);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Lỗi tải dữ liệu báo cáo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lọc dữ liệu
  const filteredMovements = useMemo(() => {
    let result = movements;

    if (typeFilter !== 'all') {
      result = result.filter((row) => row.type === typeFilter);
    }

    if (dateFilter.startDate) {
      result = result.filter((row) => {
        return row.ngay >= dateFilter.startDate;
      });
    }
    if (dateFilter.endDate) {
      result = result.filter((row) => {
        return row.ngay <= dateFilter.endDate;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        row.soPhieu?.toLowerCase().includes(term) ||
        row.kho?.toLowerCase().includes(term) ||
        row.nguoi?.toLowerCase().includes(term) ||
        row.items?.some((item: any) => item.ten?.toLowerCase().includes(term))
      );
    }

    return result;
  }, [movements, typeFilter, dateFilter, searchTerm]);

  // Thống kê
  const stats = useMemo(() => {
    const totalLines = filteredMovements.length;
    const totalValue = filteredMovements.reduce((sum: number, row: any) => sum + (row.tongTien || 0), 0);
    const totalItems = filteredMovements.reduce((sum: number, row: any) => sum + (row.totalItems || 0), 0);
    
    return { totalLines, totalValue, totalItems };
  }, [filteredMovements]);

  // Dữ liệu biểu đồ
  const chartData = useMemo(() => {
    const grouped = filteredMovements.reduce(
      (acc: any, row: any) => {
        const date = row.ngay || '';
        if (!date) return acc;
        if (!acc[date]) acc[date] = { date, value: 0, count: 0 };
        acc[date].value += row.tongTien || 0;
        acc[date].count += 1;
        return acc;
      },
      {} as Record<string, { date: string; value: number; count: number }>
    );
    return Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [filteredMovements]);

  // Dữ liệu biểu đồ tròn
  const pieData = useMemo(() => {
    const types = ['import', 'export', 'transfer', 'oil_export'];
    return types.map((type) => {
      const count = filteredMovements.filter((m: any) => m.type === type).length;
      const value = filteredMovements.filter((m: any) => m.type === type).reduce((sum: number, m: any) => sum + (m.tongTien || 0), 0);
      return {
        name: movementTypeLabel(type),
        count: count,
        value: value,
      };
    }).filter((d: any) => d.count > 0);
  }, [filteredMovements]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // ===== XUẤT EXCEL =====
  const handleExportExcel = (row: any) => {
    if (!row || !row.items) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const data = row.items.map((item: any, idx: number) => ({
      'STT': idx + 1,
      'Tên vật tư': item.ten,
      'Số lượng': item.soLuong,
      'Đơn vị': item.donVi,
      'Đơn giá': item.donGia,
      'Thành tiền': item.thanhTien,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ChiTiet');
    
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    XLSX.writeFile(wb, `${row.soPhieu}_${dateStr}.xlsx`);
    toast.success(`Đã xuất file Excel cho ${row.soPhieu}`);
  };

  // ===== XUẤT TẤT CẢ EXCEL =====
  const handleExportAllExcel = () => {
    if (filteredMovements.length === 0) {
      toast.error('Không có dữ liệu để xuất');
      return;
    }

    const data = filteredMovements.map((row) => ({
      'Số phiếu': row.soPhieu,
      'Ngày': row.ngay,
      'Loại': movementTypeLabel(row.type),
      'Kho': row.kho,
      'Người tạo': row.nguoi,
      'Trạng thái': getStatusBadge(row.status).label,
      'Tổng tiền': row.tongTien || 0,
      'Số mặt hàng': row.totalItems || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BaoCaoKho');
    
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    XLSX.writeFile(wb, `Bao_cao_kho_${dateStr}.xlsx`);
    toast.success('Đã xuất file Excel tổng hợp');
  };

  // Expanded row render
  const expandedRowRender = (row: any) => {
    if (!expandedItems.has(row.id)) return null;

    return (
      <div className="p-4 bg-gray-50 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="text-xs">
            <span className="text-gray-500">Số phiếu:</span>
            <span className="ml-1 font-medium">{row.soPhieu}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Ngày:</span>
            <span className="ml-1 font-medium">{row.ngay}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Người tạo:</span>
            <span className="ml-1 font-medium">{row.nguoi}</span>
          </div>
          <div className="text-xs">
            <span className="text-gray-500">Tổng tiền:</span>
            <span className="ml-1 font-medium text-green-600">
              {(row.tongTien || 0).toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-1.5 text-left text-xs">STT</th>
                <th className="px-3 py-1.5 text-left text-xs">Tên vật tư</th>
                <th className="px-3 py-1.5 text-right text-xs">SL</th>
                <th className="px-3 py-1.5 text-left text-xs">Đơn vị</th>
                {row.type === 'export' && <th className="px-3 py-1.5 text-left text-xs">Job No</th>}
                <th className="px-3 py-1.5 text-right text-xs">Đơn giá</th>
                <th className="px-3 py-1.5 text-right text-xs">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {row.items.map((item: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-1.5 text-xs">{idx + 1}</td>
                  <td className="px-3 py-1.5 text-xs">{item.ten}</td>
                  <td className="px-3 py-1.5 text-right text-xs">{item.soLuong}</td>
                  <td className="px-3 py-1.5 text-xs">{item.donVi}</td>
                  {row.type === 'export' && (
                    <td className="px-3 py-1.5 text-xs">{item.jobNo || '---'}</td>
                  )}
                  <td className="px-3 py-1.5 text-right text-xs">
                    {item.donGia.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3 py-1.5 text-right text-xs">
                    {item.thanhTien.toLocaleString('vi-VN')}
                  </td>
                </tr>
              ))}
              <tr className="border-t bg-gray-50 font-semibold">
                <td colSpan={row.type === 'export' ? 6 : 5} className="px-3 py-1.5 text-right text-xs">
                  Tổng cộng:
                </td>
                <td className="px-3 py-1.5 text-right text-xs text-green-600">
                  {(row.tongTien || 0).toLocaleString('vi-VN')} ₫
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-3 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportExcel(row)}
            className="h-7 text-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Xuất Excel
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading && movements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">📊 Báo cáo kho</h1>
            <p className="text-xs text-gray-500">
              {movements.length} phiếu | {stats.totalItems} mặt hàng | Giá trị: {stats.totalValue.toLocaleString('vi-VN')} ₫
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 ml-auto">
          <Button variant="outline" size="sm" onClick={handleExportAllExcel} className="h-7 text-xs px-2.5">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Xuất tất cả
          </Button>
          <Button variant="outline" size="sm" onClick={loadData} className="h-7 text-xs px-2.5">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Làm mới
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="px-3 py-2 bg-blue-50 rounded-lg">
          <div className="text-xs text-gray-500">Tổng phiếu</div>
          <div className="text-lg font-bold text-blue-700">{stats.totalLines}</div>
        </div>
        <div className="px-3 py-2 bg-green-50 rounded-lg">
          <div className="text-xs text-gray-500">Tổng mặt hàng</div>
          <div className="text-lg font-bold text-green-700">{stats.totalItems}</div>
        </div>
        <div className="px-3 py-2 bg-purple-50 rounded-lg">
          <div className="text-xs text-gray-500">Tổng giá trị</div>
          <div className="text-lg font-bold text-purple-700">
            {stats.totalValue.toLocaleString('vi-VN')} ₫
          </div>
        </div>
        <div className="px-3 py-2 bg-indigo-50 rounded-lg">
          <div className="text-xs text-gray-500">Loại</div>
          <div className="text-sm font-medium text-indigo-700">
            {typeFilter === 'all' ? 'Tất cả' : movementTypeLabel(typeFilter)}
          </div>
        </div>
      </div>

      {/* Bộ lọc */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="w-4 h-4" /> Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Từ ngày</Label>
              <Input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Đến ngày</Label>
              <Input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))
                }
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Loại</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tất cả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="import">📥 Nhập kho</SelectItem>
                  <SelectItem value="export">📤 Xuất kho</SelectItem>
                  <SelectItem value="transfer">🔄 Chuyển kho</SelectItem>
                  <SelectItem value="oil_export">🔧 Xuất vật tư</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tìm kiếm</Label>
              <Input
                placeholder="Mã phiếu, kho, vật tư..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDateFilter({ startDate: '', endDate: new Date().toISOString().split('T')[0] });
                  setTypeFilter('all');
                  setSearchTerm('');
                }}
                className="h-8 text-xs w-full"
              >
                Xóa lọc
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="list" className="text-xs">📋 Danh sách phiếu</TabsTrigger>
          <TabsTrigger value="chart" className="text-xs">📊 Biểu đồ</TabsTrigger>
        </TabsList>

        {/* Tab Danh sách phiếu */}
        <TabsContent value="list">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <CardTitle className="text-sm">📋 Danh sách phiếu</CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{filteredMovements.length} phiếu</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="w-8 px-2 py-1.5"></th>
                      <th className="text-left px-2 py-1.5 text-xs font-medium text-gray-500">Số phiếu</th>
                      <th className="text-left px-2 py-1.5 text-xs font-medium text-gray-500">Ngày</th>
                      <th className="text-left px-2 py-1.5 text-xs font-medium text-gray-500">Loại</th>
                      <th className="text-left px-2 py-1.5 text-xs font-medium text-gray-500">Kho / Máy móc</th>
                      <th className="text-center px-2 py-1.5 text-xs font-medium text-gray-500">Trạng thái</th>
                      <th className="text-right px-2 py-1.5 text-xs font-medium text-gray-500">Tổng tiền</th>
                      <th className="text-center px-2 py-1.5 text-xs font-medium text-gray-500">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-xs text-gray-400">
                          Không có dữ liệu
                        </td>
                      </tr>
                    ) : (
                      filteredMovements.map((row) => (
                        <>
                          <tr key={row.id} className="border-b hover:bg-gray-50">
                            <td className="px-2 py-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(row.id)}
                                className="p-0 h-6 w-6"
                              >
                                {expandedItems.has(row.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </td>
                            <td className="px-2 py-1.5 text-xs font-medium">{row.soPhieu}</td>
                            <td className="px-2 py-1.5 text-xs">{row.ngay}</td>
                            <td className="px-2 py-1.5 text-xs">{movementTypeLabel(row.type)}</td>
                            <td className="px-2 py-1.5 text-xs">{row.kho}</td>
                            <td className="px-2 py-1.5 text-center">
                              <Badge className={getStatusBadge(row.status).className}>
                                {getStatusBadge(row.status).label}
                              </Badge>
                            </td>
                            <td className="px-2 py-1.5 text-right text-xs font-medium text-green-600">
                              {(row.tongTien || 0).toLocaleString('vi-VN')} ₫
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportExcel(row)}
                                className="h-6 text-[10px] px-2"
                              >
                                <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
                              </Button>
                            </td>
                          </tr>
                          {expandedItems.has(row.id) && (
                            <tr>
                              <td colSpan={8} className="p-0">
                                {expandedRowRender(row)}
                              </td>
                            </tr>
                          )}
                        </>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Biểu đồ */}
        <TabsContent value="chart">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Biểu đồ cột theo ngày */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Theo ngày
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" name="Giá trị" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Biểu đồ tròn phân loại */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="w-4 h-4" /> Phân loại phiếu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {pieData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Biểu đồ giá trị theo loại */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Giá trị theo loại
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pieData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8b5cf6" name="Giá trị" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}