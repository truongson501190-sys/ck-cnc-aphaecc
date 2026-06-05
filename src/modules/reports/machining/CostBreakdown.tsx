import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface CostReport {
  id: string;
  ngay: string;
  may: string;
  ca: string;
  maDuAn: string;
  chiPhiChayMay: number;
  chiPhiGa: number;
  chiPhiDao: number;
  tongChiPhi: number;
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';

export function CostBreakdown() {
  const [costs, setCosts] = useState<CostReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setCosts([]);
        return;
      }
      const parsed: any[] = JSON.parse(raw);
      const approved = parsed.filter(item => item.status === 'approved');
      
      const costReports: CostReport[] = approved.map(item => {
        const chiPhiDao = (item.toolEntries || []).reduce((sum: number, tool: any) => sum + (tool.thanhTien || 0), 0);
        return {
          id: item.id,
          ngay: item.ngay,
          may: item.may,
          ca: item.ca || 'Ngày',
          maDuAn: item.maDuAn,
          chiPhiChayMay: item.chiPhiChayMay || 0,
          chiPhiGa: item.chiPhiGa || 0,
          chiPhiDao: chiPhiDao,
          tongChiPhi: (item.chiPhiChayMay || 0) + (item.chiPhiGa || 0) + chiPhiDao,
        };
      });
      setCosts(costReports);
    } catch (error) {
      console.error('Error loading costs:', error);
      setCosts([]);
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

  const filteredCosts = useMemo(() => {
    return costs.filter(item => {
      const keyword = searchTerm.toLowerCase();
      return (
        item.maDuAn?.toLowerCase().includes(keyword) ||
        item.may?.toLowerCase().includes(keyword)
      );
    });
  }, [costs, searchTerm]);

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
    const exportData = filteredCosts.map(item => ({
      'Ngày': formatDate(item.ngay),
      'Máy': item.may,
      'Ca': item.ca,
      'Dự án': item.maDuAn,
      'Chi phí chạy máy': item.chiPhiChayMay,
      'Chi phí gá': item.chiPhiGa,
      'Chi phí dao cụ': item.chiPhiDao,
      'Tổng chi phí': item.tongChiPhi,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ChiPhiGiaCong');
    XLSX.writeFile(wb, `chi_phi_gia_cong_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  const totalRunCost = filteredCosts.reduce((sum, item) => sum + (item.chiPhiChayMay || 0), 0);
  const totalSetupCost = filteredCosts.reduce((sum, item) => sum + (item.chiPhiGa || 0), 0);
  const totalToolCost = filteredCosts.reduce((sum, item) => sum + (item.chiPhiDao || 0), 0);
  const totalCost = filteredCosts.reduce((sum, item) => sum + (item.tongChiPhi || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">💰 CHI PHÍ GIA CÔNG</h1>
          <p className="text-gray-500 mt-1">Phân tích chi tiết các khoản chi phí sản xuất</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Xuất Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Chi phí chạy máy</p>
            <p className="text-xl font-bold text-blue-600">{formatCurrency(totalRunCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Chi phí gá</p>
            <p className="text-xl font-bold text-amber-600">{formatCurrency(totalSetupCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-gray-500">Chi phí dao cụ</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(totalToolCost)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-r from-red-50 to-orange-50">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600">Tổng chi phí</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Chi tiết chi phí</CardTitle>
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
                  <th className="border p-2">Ca</th>
                  <th className="border p-2">Dự án</th>
                  <th className="border p-2 text-right">CP chạy</th>
                  <th className="border p-2 text-right">CP gá</th>
                  <th className="border p-2 text-right">CP dao</th>
                  <th className="border p-2 text-right">Tổng CP</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="border p-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredCosts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="border p-2">{formatDate(item.ngay)}</td>
                      <td className="border p-2">{item.may || '---'}</td>
                      <td className="border p-2 text-center">{item.ca}</td>
                      <td className="border p-2">{item.maDuAn || '---'}</td>
                      <td className="border p-2 text-right text-blue-600">{formatCurrency(item.chiPhiChayMay)}</td>
                      <td className="border p-2 text-right text-amber-600">{formatCurrency(item.chiPhiGa)}</td>
                      <td className="border p-2 text-right text-emerald-600">{formatCurrency(item.chiPhiDao)}</td>
                      <td className="border p-2 text-right text-red-600 font-bold">{formatCurrency(item.tongChiPhi)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-semibold">
                <tr>
                  <td colSpan={4} className="border p-2 text-right">Tổng cộng:</td>
                  <td className="border p-2 text-right text-blue-700">{formatCurrency(totalRunCost)}</td>
                  <td className="border p-2 text-right text-amber-700">{formatCurrency(totalSetupCost)}</td>
                  <td className="border p-2 text-right text-emerald-700">{formatCurrency(totalToolCost)}</td>
                  <td className="border p-2 text-right text-red-800 font-bold">{formatCurrency(totalCost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CostBreakdown;