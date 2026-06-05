import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Download, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductionLog {
  id: string;
  ngay: string;
  may: string;
  maDuAn: string;
  tenDuAn: string;
  tenChiTiet: string;
  sanLuong: number;
  gioGa: number;
  gioChay: number;
  nguoiVanHanh: string;
  ca: string;
  status: string;
  toolEntries: any[];
}

const STORAGE_KEY = 'PRODUCTION_LOGS_DATA';

export function ProductionSummary() {
  const [reports, setReports] = useState<ProductionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProductionLog | null>(null);

  const loadReports = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setReports([]);
        return;
      }
      const parsed: any[] = JSON.parse(raw);
      const approved = parsed.filter(item => item.status === 'approved');
      setReports(approved);
    } catch (error) {
      console.error('Error loading reports:', error);
      setReports([]);
    }
  };

  useEffect(() => {
    loadReports();
    const reload = () => loadReports();
    window.addEventListener('storage', reload);
    window.addEventListener('app-data-synced', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('app-data-synced', reload);
    };
  }, []);

  const filteredReports = useMemo(() => {
    return reports.filter(item => {
      const keyword = searchTerm.toLowerCase();
      return (
        item.maDuAn?.toLowerCase().includes(keyword) ||
        item.tenDuAn?.toLowerCase().includes(keyword) ||
        item.may?.toLowerCase().includes(keyword) ||
        item.nguoiVanHanh?.toLowerCase().includes(keyword)
      );
    });
  }, [reports, searchTerm]);

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
    const exportData = filteredReports.map(item => ({
      'Ngày': formatDate(item.ngay),
      'Máy': item.may,
      'Ca': item.ca,
      'Mã Dự Án': item.maDuAn,
      'Tên Dự Án': item.tenDuAn,
      'Số Lượng': item.sanLuong,
      'Giờ Gá': item.gioGa,
      'Giờ Chạy': item.gioChay,
      'Người Vận Hành': item.nguoiVanHanh,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TongHopSanXuat');
    XLSX.writeFile(wb, `tong_hop_san_xuat_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Xuất Excel thành công');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">📋 TỔNG HỢP SẢN XUẤT</h1>
          <p className="text-gray-500 mt-1">Tổng hợp các báo cáo sản xuất đã được duyệt</p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Xuất Excel
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Danh sách báo cáo</CardTitle>
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
                  <th className="border p-2">Mã dự án</th>
                  <th className="border p-2">Tên dự án</th>
                  <th className="border p-2 text-center">SL</th>
                  <th className="border p-2 text-center">Giờ gá</th>
                  <th className="border p-2 text-center">Giờ chạy</th>
                  <th className="border p-2">NV vận hành</th>
                  <th className="border p-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="border p-8 text-center text-gray-500">
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="border p-2">{formatDate(item.ngay)}</td>
                      <td className="border p-2">{item.may || '---'}</td>
                      <td className="border p-2 text-center">{item.ca || '---'}</td>
                      <td className="border p-2 font-semibold">{item.maDuAn || '---'}</td>
                      <td className="border p-2">{item.tenDuAn || '---'}</td>
                      <td className="border p-2 text-center">{item.sanLuong || 0}</td>
                      <td className="border p-2 text-center">{item.gioGa || 0}h</td>
                      <td className="border p-2 text-center">{item.gioChay || 0}h</td>
                      <td className="border p-2">{item.nguoiVanHanh || '---'}</td>
                      <td className="border p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(item);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog chi tiết */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết báo cáo sản xuất</DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="font-semibold">Ngày:</span> {formatDate(selectedReport.ngay)}</div>
                <div><span className="font-semibold">Máy:</span> {selectedReport.may}</div>
                <div><span className="font-semibold">Ca:</span> {selectedReport.ca}</div>
                <div><span className="font-semibold">Mã dự án:</span> {selectedReport.maDuAn}</div>
                <div><span className="font-semibold">Tên dự án:</span> {selectedReport.tenDuAn}</div>
                <div><span className="font-semibold">Số lượng:</span> {selectedReport.sanLuong}</div>
                <div><span className="font-semibold">Giờ gá:</span> {selectedReport.gioGa}h</div>
                <div><span className="font-semibold">Giờ chạy:</span> {selectedReport.gioChay}h</div>
                <div><span className="font-semibold">Người vận hành:</span> {selectedReport.nguoiVanHanh}</div>
              </div>
              <div className="border-t pt-3">
                <div><span className="font-semibold">Trạng thái:</span> <Badge className="bg-green-600">Đã duyệt</Badge></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductionSummary;