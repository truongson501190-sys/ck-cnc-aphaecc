import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ToolReport {
  ngay: string;
  may: string;
  maDuAn: string;
  tenDao: string;
  slCap: number;
  slSuDung: number;
  hong: number;
  donVi: string;
  donGia: number;
  thanhTien: number;
  nguoiVanHanh: string;
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';

export function ToolsUsage() {
  const [tools, setTools] = useState<ToolReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setTools([]);
        return;
      }
      const parsed: any[] = JSON.parse(raw);
      const approved = parsed.filter(item => item.status === 'approved');
      
      const toolReports: ToolReport[] = [];
      approved.forEach(report => {
        if (report.toolEntries && report.toolEntries.length > 0) {
          report.toolEntries.forEach((tool: any) => {
            toolReports.push({
              ngay: report.ngay,
              may: report.may,
              maDuAn: report.maDuAn,
              tenDao: tool.tenDao,
              slCap: tool.slCap || 0,
              slSuDung: tool.slSuDung || 0,
              hong: tool.hong || 0,
              donVi: tool.donVi || 'Cái',
              donGia: tool.donGia || 0,
              thanhTien: tool.thanhTien || 0,
              nguoiVanHanh: report.nguoiVanHanh,
            });
          });
        }
      });
      setTools(toolReports);
    } catch (error) {
      console.error('Error loading tools:', error);
      setTools([]);
    }
  };

  useEffect(() => {
    loadData();
    const reload = () => loadData();
    window.addEventListener('storage', reload);
    window.addEventListener('app-data-synced', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('app-data-synced', reload);
    };
  }, []);

  const filteredTools = useMemo(() => {
    return tools.filter(item => {
      const keyword = searchTerm.toLowerCase();
      return (
        item.tenDao?.toLowerCase().includes(keyword) ||
        item.maDuAn?.toLowerCase().includes(keyword) ||
        item.may?.toLowerCase().includes(keyword)
      );
    });
  }, [tools, searchTerm]);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number) => {
    if (!value) return '0 đ';
    return value.toLocaleString('vi-VN') + ' đ';
  };

  const handleExport = () => {
    const exportData = filteredTools.map(item => ({
      'Ngày': formatDate(item.ngay),
      'Máy': item.may,
      'Dự án': item.maDuAn,
      'Tên dao': item.tenDao,
      'SL cấp': item.slCap,
      'SL sử dụng': item.slSuDung,
      'SL hỏng': item.hong,
      'Đơn vị': item.donVi,
      'Đơn giá': item.donGia,
      'Thành tiền': item.thanhTien,
      'Người vận hành': item.nguoiVanHanh,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DaoCuSuDung');
    XLSX.writeFile(wb, `dao_cu_su_dung_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  const totalCost = filteredTools.reduce((sum, item) => sum + (item.thanhTien || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">🔧 DAO CỤ SỬ DỤNG</h1>
          <p className="text-gray-500 mt-1">Chi tiết các loại dao cụ đã sử dụng trong sản xuất</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-emerald-50 rounded-lg">
            <span className="text-sm text-gray-600">Tổng chi phí:</span>
            <span className="ml-2 font-bold text-emerald-600">{formatCurrency(totalCost)}</span>
          </div>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Danh sách dao cụ</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border p-2">Ngày</th>
                  <th className="border p-2">Máy</th>
                  <th className="border p-2">Dự án</th>
                  <th className="border p-2">Tên dao</th>
                  <th className="border p-2 text-center">SL cấp</th>
                  <th className="border p-2 text-center">SL dùng</th>
                  <th className="border p-2 text-center">Hỏng</th>
                  <th className="border p-2">ĐVT</th>
                  <th className="border p-2 text-right">Đơn giá</th>
                  <th className="border p-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {filteredTools.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="border p-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredTools.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="border p-2">{formatDate(item.ngay)}</td>
                      <td className="border p-2">{item.may || '---'}</td>
                      <td className="border p-2">{item.maDuAn || '---'}</td>
                      <td className="border p-2 font-medium">{item.tenDao || '---'}</td>
                      <td className="border p-2 text-center">{item.slCap}</td>
                      <td className="border p-2 text-center">{item.slSuDung}</td>
                      <td className="border p-2 text-center text-red-600">{item.hong}</td>
                      <td className="border p-2">{item.donVi}</td>
                      <td className="border p-2 text-right">{formatCurrency(item.donGia)}</td>
                      <td className="border p-2 text-right text-emerald-600">{formatCurrency(item.thanhTien)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ToolsUsage;