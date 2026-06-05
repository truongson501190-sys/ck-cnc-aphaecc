import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface DamageReport {
  ngay: string;
  may: string;
  maDuAn: string;
  tenDao: string;
  hong: number;
  donGia: number;
  thietHai: number;
  nguoiVanHanh: string;
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';

export function ToolsDamage() {
  const [damages, setDamages] = useState<DamageReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setDamages([]);
        return;
      }
      const parsed: any[] = JSON.parse(raw);
      const approved = parsed.filter(item => item.status === 'approved');
      
      const damageReports: DamageReport[] = [];
      approved.forEach(report => {
        if (report.toolEntries && report.toolEntries.length > 0) {
          report.toolEntries.forEach((tool: any) => {
            const hong = tool.hong || 0;
            if (hong > 0) {
              damageReports.push({
                ngay: report.ngay,
                may: report.may,
                maDuAn: report.maDuAn,
                tenDao: tool.tenDao,
                hong: hong,
                donGia: tool.donGia || 0,
                thietHai: hong * (tool.donGia || 0),
                nguoiVanHanh: report.nguoiVanHanh,
              });
            }
          });
        }
      });
      setDamages(damageReports);
    } catch (error) {
      console.error('Error loading damages:', error);
      setDamages([]);
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

  const filteredDamages = useMemo(() => {
    return damages.filter(item => {
      const keyword = searchTerm.toLowerCase();
      return (
        item.tenDao?.toLowerCase().includes(keyword) ||
        item.maDuAn?.toLowerCase().includes(keyword) ||
        item.may?.toLowerCase().includes(keyword)
      );
    });
  }, [damages, searchTerm]);

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
    const exportData = filteredDamages.map(item => ({
      'Ngày': formatDate(item.ngay),
      'Máy': item.may,
      'Dự án': item.maDuAn,
      'Tên dao': item.tenDao,
      'SL hỏng': item.hong,
      'Đơn giá': item.donGia,
      'Thiệt hại': item.thietHai,
      'Người vận hành': item.nguoiVanHanh,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'HaoHutDaoCu');
    XLSX.writeFile(wb, `hao_hut_dao_cu_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  const totalDamage = filteredDamages.reduce((sum, item) => sum + (item.thietHai || 0), 0);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">⚠️ HAO HỤT DAO CỤ</h1>
          <p className="text-gray-500 mt-1">Thống kê các dao cụ bị hỏng hóc trong quá trình sản xuất</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-red-50 rounded-lg">
            <span className="text-sm text-gray-600">Tổng thiệt hại:</span>
            <span className="ml-2 font-bold text-red-600">{formatCurrency(totalDamage)}</span>
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
            <CardTitle>Danh sách hao hụt</CardTitle>
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
                  <th className="border p-2">Dao cụ</th>
                  <th className="border p-2 text-center">SL hỏng</th>
                  <th className="border p-2 text-right">Đơn giá</th>
                  <th className="border p-2 text-right">Thiệt hại</th>
                </tr>
              </thead>
              <tbody>
                {filteredDamages.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="border p-8 text-center text-gray-500">
                      Không có dữ liệu hao hụt
                    </td>
                  </tr>
                ) : (
                  filteredDamages.map((item, idx) => (
                    <tr key={idx} className="hover:bg-red-50 transition-colors">
                      <td className="border p-2">{formatDate(item.ngay)}</td>
                      <td className="border p-2">{item.may || '---'}</td>
                      <td className="border p-2">{item.maDuAn || '---'}</td>
                      <td className="border p-2 font-medium">{item.tenDao || '---'}</td>
                      <td className="border p-2 text-center text-red-600 font-bold">{item.hong}</td>
                      <td className="border p-2 text-right">{formatCurrency(item.donGia)}</td>
                      <td className="border p-2 text-right text-red-600 font-bold">{formatCurrency(item.thietHai)}</td>
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

export default ToolsDamage;