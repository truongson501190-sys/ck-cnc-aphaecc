import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MaintenanceForm } from '@/modules/reports/MaintenanceForm';
import type { MaintenanceReport } from '@/types/maintenance';
import { POST_MAINTENANCE_STATUS_LABELS } from '@/types/maintenance';
import { useAuth } from '@/hooks/useAuth';
import { Plus, ArrowLeft, Wrench, Calendar, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { loadReports, saveReports } from '@/lib/reportsStorage';

export function MaintenanceReportPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [reports, setReports] = useState<MaintenanceReport[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReports = async () => {
    try {
      const data = await loadReports('maintenance');
      setReports(data);
    } catch {
      toast.error('Lỗi tải báo cáo bảo trì');
    }
  };

  useEffect(() => {
    fetchReports();
    const onSynced = () => fetchReports();
    window.addEventListener('app-data-synced', onSynced);
    return () => window.removeEventListener('app-data-synced', onSynced);
  }, []);

  const persistReports = async (updated: MaintenanceReport[]) => {
    setReports(updated);
    await saveReports('maintenance', updated);
  };

  const filteredReports = useMemo(() => {
    if (!searchTerm) return reports;
    const q = searchTerm.toLowerCase();
    return reports.filter(
      (r) =>
        r.machineName.toLowerCase().includes(q) ||
        r.equipmentCode.toLowerCase().includes(q) ||
        r.technician.toLowerCase().includes(q) ||
        r.jobContent.toLowerCase().includes(q)
    );
  }, [reports, searchTerm]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = reports.filter((r) => {
      const d = new Date(r.ngay);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const needMonitor = reports.filter((r) => r.postMaintenanceStatus === 'other').length;
    const upcoming = reports.filter((r) => {
      if (!r.nextMaintenanceSchedule) return false;
      const next = new Date(r.nextMaintenanceSchedule);
      const diff = (next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 30;
    }).length;
    return { total: reports.length, thisMonth, needMonitor, upcoming };
  }, [reports]);

  const handleAdd = (data: Omit<MaintenanceReport, 'id' | 'createdAt'>) => {
    const newReport: MaintenanceReport = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    void persistReports([...reports, newReport]);
    setIsDialogOpen(false);
    toast.success('Thêm báo cáo bảo trì thành công');
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
            <h1 className="text-3xl font-bold text-gray-900">Báo Cáo Bảo Trì</h1>
            {isAdmin && (
              <Badge className="mt-1 bg-gray-900">Quản trị viên</Badge>
            )}
            {user && !isAdmin && (
              <p className="text-gray-600 mt-1">{user.fullName || user.name}</p>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-500" />
              Báo cáo bảo trì
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm báo cáo bảo trì
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Thêm báo cáo bảo trì mới</DialogTitle>
                </DialogHeader>
                <MaintenanceForm onSubmit={handleAdd} onCancel={() => setIsDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Tổng báo cáo</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                  </div>
                  <Wrench className="w-8 h-8 text-orange-400" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Tháng này</p>
                    <p className="text-2xl font-bold">{stats.thisMonth}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-400" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Cần theo dõi</p>
                    <p className="text-2xl font-bold">{stats.needMonitor}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Sắp bảo trì</p>
                    <p className="text-2xl font-bold">{stats.upcoming}</p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Danh sách báo cáo bảo trì</h3>
              <Input
                placeholder="Tìm kiếm báo cáo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Tên máy</TableHead>
                  <TableHead>Mã thiết bị</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Tình trạng</TableHead>
                  <TableHead>Bảo trì tiếp theo</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      <Wrench className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      Chưa có báo cáo bảo trì nào
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>{new Date(report.ngay).toLocaleDateString('vi-VN')}</TableCell>
                      <TableCell className="font-medium">{report.machineName}</TableCell>
                      <TableCell>{report.equipmentCode}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{report.jobContent}</TableCell>
                      <TableCell>{report.technician || '—'}</TableCell>
                      <TableCell>{POST_MAINTENANCE_STATUS_LABELS[report.postMaintenanceStatus]}</TableCell>
                      <TableCell>
                        {report.nextMaintenanceSchedule
                          ? new Date(report.nextMaintenanceSchedule).toLocaleDateString('vi-VN')
                          : '—'}
                      </TableCell>
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

export default MaintenanceReportPage;
