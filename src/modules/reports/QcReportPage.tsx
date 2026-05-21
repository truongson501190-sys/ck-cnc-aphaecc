import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { QcForm } from '@/modules/reports/QcForm';
import type { QcReport } from '@/types/qc';
import { useAuth } from '@/hooks/useAuth';
import { Plus, ArrowLeft, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { loadReports, saveReports } from '@/lib/reportsStorage';

export function QcReportPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState<QcReport[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState<string>('all');

  const fetchReports = async () => {
    try {
      const data = await loadReports('qc');
      setReports(data);
    } catch {
      toast.error('Lỗi tải báo cáo QC');
    }
  };

  useEffect(() => {
    fetchReports();
    const onSynced = () => fetchReports();
    window.addEventListener('app-data-synced', onSynced);
    return () => window.removeEventListener('app-data-synced', onSynced);
  }, []);

  const persistReports = async (updated: QcReport[]) => {
    setReports(updated);
    await saveReports('qc', updated);
  };

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = searchTerm.toLowerCase();
      const searchMatch =
        !searchTerm ||
        r.duAn.toLowerCase().includes(q) ||
        r.tenChiTiet.toLowerCase().includes(q) ||
        r.chiTietSo.toLowerCase().includes(q);
      const resultMatch = resultFilter === 'all' || r.result === resultFilter;
      return searchMatch && resultMatch;
    });
  }, [reports, searchTerm, resultFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = reports.filter((r) => {
      const d = new Date(r.ngay);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const ok = reports.filter((r) => r.result === 'OK').length;
    const ng = reports.filter((r) => r.result === 'NG').length;
    const passRate = reports.length > 0 ? Math.round((ok / reports.length) * 100) : 0;
    return { total: reports.length, thisMonth, ok, ng, passRate };
  }, [reports]);

  const handleAdd = (data: Omit<QcReport, 'id' | 'createdAt'>) => {
    const newReport: QcReport = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    void persistReports([...reports, newReport]);
    setIsDialogOpen(false);
    toast.success('Thêm báo cáo QC thành công');
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
      void persistReports(reports.filter((r) => r.id !== id));
      toast.success('Đã xóa báo cáo');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/trang-chu')} className="h-10 w-10">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Báo Cáo QC (Kiểm tra chất lượng)</h1>
            {isAdmin && <Badge className="mt-1 bg-gray-900">Quản trị viên</Badge>}
            {user && !isAdmin && <p className="text-gray-600 mt-1">{user.fullName || user.name}</p>}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Báo cáo QC (Kiểm tra chất lượng)
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm báo cáo QC
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Thêm báo cáo QC mới</DialogTitle>
                </DialogHeader>
                <QcForm onSubmit={handleAdd} onCancel={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-600">Tổng báo cáo</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-600">Tháng này</p>
                  <p className="text-2xl font-bold">{stats.thisMonth}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Đạt (OK)</p>
                    <p className="text-2xl font-bold text-green-600">{stats.ok}</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex justify-between">
                  <div>
                    <p className="text-xs text-gray-600">Không đạt (NG)</p>
                    <p className="text-2xl font-bold text-red-600">{stats.ng}</p>
                  </div>
                  <XCircle className="w-6 h-6 text-red-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-600">Tỷ lệ đạt</p>
                  <p className="text-2xl font-bold text-green-600">{stats.passRate}%</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Tìm kiếm theo dự án, tên chi tiết, số chi tiết..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Kết quả" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="NG">NG</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <h3 className="font-semibold mb-2">Danh sách báo cáo QC ({filteredReports.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Dự án</TableHead>
                  <TableHead>Bản vẽ số</TableHead>
                  <TableHead>Chi tiết số</TableHead>
                  <TableHead>Tên chi tiết</TableHead>
                  <TableHead>SL kiểm tra</TableHead>
                  <TableHead>Kết quả</TableHead>
                  <TableHead>Người kiểm tra</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-gray-500">
                      Chưa có báo cáo QC nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{new Date(report.ngay).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell className="font-medium">{report.duAn}</TableCell>
                      <TableCell>{report.banVeSo || '—'}</TableCell>
                      <TableCell>{report.chiTietSo || '—'}</TableCell>
                      <TableCell>{report.tenChiTiet}</TableCell>
                      <TableCell>{report.inspectedQuantity}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            report.result === 'OK' ? 'bg-green-600' : 'bg-red-600'
                          }
                        >
                          {report.result}
                        </Badge>
                      </TableCell>
                      <TableCell>{report.inspector || '—'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDelete(report.id)}
                        >
                          Xóa
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default QcReportPage;
