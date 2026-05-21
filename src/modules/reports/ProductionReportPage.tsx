import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductionForm } from '@/modules/reports/ProductionForm';
import { ProductionReport } from '@/types/production';
import { Plus, Filter, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { loadReports, saveReports } from '@/lib/reportsStorage';

export function ProductionReportPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ProductionReport[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilterStart, setDateFilterStart] = useState('');
  const [dateFilterEnd, setDateFilterEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchReports = async () => {
    try {
      const data = await loadReports('production');
      setReports(data);
    } catch (error) {
      console.error('Error loading production reports:', error);
      toast.error('Lỗi tải báo cáo');
    }
  };

  useEffect(() => {
    fetchReports();
    const onSynced = () => fetchReports();
    window.addEventListener('app-data-synced', onSynced);
    return () => window.removeEventListener('app-data-synced', onSynced);
  }, []);

  const persistReports = async (updatedReports: ProductionReport[]) => {
    setReports(updatedReports);
    await saveReports('production', updatedReports);
  };

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      // Search filter
      const searchMatch = !searchTerm || 
        report.duAn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.khachHang?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.tenChiTiet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.banVeSo?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const statusMatch = statusFilter === 'all' || report.status === statusFilter;

      // Date filter
      const reportDate = new Date(report.ngayThang);
      const startDate = dateFilterStart ? new Date(dateFilterStart) : null;
      const endDate = dateFilterEnd ? new Date(dateFilterEnd) : null;
      
      const dateMatch = 
        (!startDate || reportDate >= startDate) &&
        (!endDate || reportDate <= endDate);

      return searchMatch && statusMatch && dateMatch;
    });
  }, [reports, searchTerm, statusFilter, dateFilterStart, dateFilterEnd]);

  const stats = useMemo(() => {
    return {
      total: reports.length,
      approved: reports.filter(r => r.status === 'approved').length,
      pending: reports.filter(r => r.status === 'pending').length,
      rejected: reports.filter(r => r.status === 'rejected').length,
    };
  }, [reports]);

  const handleAddReport = (reportData: Omit<ProductionReport, 'id' | 'createdAt'>) => {
    const newReport: ProductionReport = {
      ...reportData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    void persistReports([...reports, newReport]);
    setIsDialogOpen(false);
    setFormKey((k) => k + 1);
    toast.success('Thêm báo cáo sản xuất thành công');
  };

  const handleDeleteReport = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa báo cáo này?')) {
      void persistReports(reports.filter((r) => r.id !== id));
      toast.success('Xóa báo cáo thành công');
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">Đã duyệt</Badge>;
      case 'pending':
        return <Badge variant="secondary">Chờ duyệt</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Từ chối</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilterStart('');
    setDateFilterEnd('');
    setShowFilters(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/trang-chu')}
            className="h-10 w-10"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Báo Cáo Sản Xuất</h1>
            <p className="text-gray-600 mt-1">Quản lý và theo dõi báo cáo sản xuất</p>
          </div>
        </div>

        {/* Add Report Button */}
          <div className="mb-6 flex justify-end">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Thêm báo cáo sản xuất
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Thêm Báo Cáo Sản Xuất Mới</DialogTitle>
              </DialogHeader>
              <ProductionForm key={formKey} onSubmit={handleAddReport} onCancel={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Tổng Báo Cáo</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Đã Duyệt</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.approved}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Chờ Duyệt</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600">Từ Chối</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejected}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="mb-6">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Bộ Lọc</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Ẩn' : 'Hiển Thị'}
            </Button>
          </CardHeader>
          {showFilters && (
            <CardContent className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Tìm Kiếm</Label>
                  <Input
                    id="search"
                    placeholder="Dự án, khách hàng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Trạng Thái</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất Cả</SelectItem>
                      <SelectItem value="approved">Đã Duyệt</SelectItem>
                      <SelectItem value="pending">Chờ Duyệt</SelectItem>
                      <SelectItem value="rejected">Từ Chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="dateStart">Từ Ngày</Label>
                  <Input
                    id="dateStart"
                    type="date"
                    value={dateFilterStart}
                    onChange={(e) => setDateFilterStart(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateEnd">Đến Ngày</Label>
                  <Input
                    id="dateEnd"
                    type="date"
                    value={dateFilterEnd}
                    onChange={(e) => setDateFilterEnd(e.target.value)}
                  />
                </div>
              </div>
              {(searchTerm || statusFilter !== 'all' || dateFilterStart || dateFilterEnd) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="flex items-center gap-2 mt-4"
                >
                  <X className="w-4 h-4" />
                  Xóa Bộ Lọc
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Danh Sách Báo Cáo</span>
              <Badge variant="secondary">{filteredReports.length} báo cáo</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Dự Án</TableHead>
                    <TableHead>Khách Hàng</TableHead>
                    <TableHead>Bản Vẽ Số</TableHead>
                    <TableHead>Tên Chi Tiết</TableHead>
                    <TableHead>SL Hoàn Thành</TableHead>
                    <TableHead>Trạng Thái</TableHead>
                    <TableHead className="text-right">Thao Tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        {reports.length === 0
                          ? 'Chưa có báo cáo sản xuất nào'
                          : 'Không tìm thấy báo cáo phù hợp'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          {new Date(report.ngayThang).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell className="font-medium">{report.duAn}</TableCell>
                        <TableCell>{report.khachHang}</TableCell>
                        <TableCell>{report.banVeSo}</TableCell>
                        <TableCell>{report.tenChiTiet}</TableCell>
                        <TableCell>{report.soLuongHoanThanh}</TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Xóa
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProductionReportPage;
