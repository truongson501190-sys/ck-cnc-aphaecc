import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit3, Trash2, Activity, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { ProgressUpdateEntry } from '@/types/manufacturing';

const STORAGE_KEY = 'progressUpdateEntries';
const PAGE_SIZE = 8;

const defaultUpdates: ProgressUpdateEntry[] = [
  {
    id: 'progress-1',
    orderNumber: 'HD-2026-001',
    productCode: 'SP-100',
    productName: 'Chi tiết bạc CNC',
    machine: 'Máy CNC 1',
    operator: 'Nguyễn Văn A',
    progressPercent: 60,
    status: 'on_track',
    updatedAt: new Date().toISOString().slice(0, 10),
    comment: 'Hoạt động ổn định, dự kiến hoàn thành sớm.',
  },
  {
    id: 'progress-2',
    orderNumber: 'HD-2026-010',
    productCode: 'SP-300',
    productName: 'Vỏ máy móc',
    machine: 'Máy CNC 2',
    operator: 'Trần Thị B',
    progressPercent: 35,
    status: 'delayed',
    updatedAt: new Date().toISOString().slice(0, 10),
    comment: 'Chờ vật tư đầu vào.',
  },
];

export function ProgressTracking() {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<ProgressUpdateEntry[]>([]);
  const [selectedUpdate, setSelectedUpdate] = useState<ProgressUpdateEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProgressUpdateEntry['status']>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<ProgressUpdateEntry, 'id'>>({
    orderNumber: '',
    productCode: '',
    productName: '',
    machine: '',
    operator: '',
    progressPercent: 0,
    status: 'on_track',
    updatedAt: new Date().toISOString().slice(0, 10),
    comment: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<ProgressUpdateEntry>(STORAGE_KEY);
    setUpdates(saved.length ? saved : defaultUpdates);
  }, []);

  const saveUpdates = (next: ProgressUpdateEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setUpdates(next);
  };

  const filtered = useMemo(() => {
    return updates.filter((update) => {
      const matchesSearch =
        !searchTerm ||
        update.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        update.operator.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || update.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [updates, searchTerm, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedUpdate(null);
    setFormData({
      orderNumber: '',
      productCode: '',
      productName: '',
      machine: '',
      operator: '',
      progressPercent: 0,
      status: 'on_track',
      updatedAt: new Date().toISOString().slice(0, 10),
      comment: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (update: ProgressUpdateEntry) => {
    setSelectedUpdate(update);
    setFormData({ ...update });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa cập nhật này?')) {
      saveUpdates(updates.filter((item) => item.id !== id));
      toast.success('Xóa cập nhật tiến độ thành công');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.orderNumber.trim() || !formData.productCode.trim() || !formData.productName.trim() || !formData.operator.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (formData.progressPercent < 0 || formData.progressPercent > 100) {
      toast.error('Tiến độ phải nằm trong khoảng 0-100%');
      return;
    }
    const nextUpdate: ProgressUpdateEntry = {
      id: selectedUpdate?.id ?? buildLocalId('progress'),
      ...formData,
    };
    if (selectedUpdate) {
      saveUpdates(updates.map((item) => (item.id === selectedUpdate.id ? nextUpdate : item)));
      toast.success('Cập nhật tiến độ thành công');
    } else {
      saveUpdates([nextUpdate, ...updates]);
      toast.success('Thêm tiến độ mới thành công');
    }
    setIsDialogOpen(false);
  };

  const statusBadge = (status: ProgressUpdateEntry['status']) => {
    switch (status) {
      case 'on_track':
        return <Badge variant="secondary">Đúng tiến độ</Badge>;
      case 'delayed':
        return <Badge variant="destructive">Trễ</Badge>;
      case 'completed':
        return <Badge variant="default">Hoàn thành</Badge>;
      default:
        return <Badge>Không xác định</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/')}
              className="border-gray-300 hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Theo dõi tiến độ</h1>
              <p className="text-sm text-slate-600 mt-2">Quản lý tiến độ thực tế cho đơn hàng và lệnh sản xuất.</p>
            </div>
          </div>
          <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ghi tiến độ
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5" /> Tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Bản ghi</span><span>{updates.length}</span></div>
              <div className="flex justify-between"><span>Đúng tiến độ</span><span>{updates.filter((item) => item.status === 'on_track').length}</span></div>
              <div className="flex justify-between"><span>Trễ</span><span>{updates.filter((item) => item.status === 'delayed').length}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tìm kiếm nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              <Input placeholder="Mã đơn / sản phẩm / nhân viên" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="on_track">Đúng tiến độ</SelectItem>
                  <SelectItem value="delayed">Trễ</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ghi nhận tiến độ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Đơn hàng</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Máy</TableHead>
                    <TableHead>Nhân viên</TableHead>
                    <TableHead>Tiến độ</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        Không có bản ghi tiến độ phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.orderNumber}</TableCell>
                        <TableCell>{item.productCode} · {item.productName}</TableCell>
                        <TableCell>{item.machine}</TableCell>
                        <TableCell>{item.operator}</TableCell>
                        <TableCell>{item.progressPercent}%</TableCell>
                        <TableCell>{statusBadge(item.status)}</TableCell>
                        <TableCell>{item.updatedAt}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>Hiển thị {pageItems.length} / {filtered.length} kết quả</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>Trước</Button>
                <span>{page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}>Sau</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedUpdate ? 'Chỉnh sửa tiến độ' : 'Ghi tiến độ mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderNumber">Đơn hàng</Label>
                <Input id="orderNumber" value={formData.orderNumber} onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="operator">Nhân viên</Label>
                <Input id="operator" value={formData.operator} onChange={(e) => setFormData({ ...formData, operator: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="productCode">Mã sản phẩm</Label>
                <Input id="productCode" value={formData.productCode} onChange={(e) => setFormData({ ...formData, productCode: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="productName">Tên sản phẩm</Label>
                <Input id="productName" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="machine">Máy</Label>
                <Input id="machine" value={formData.machine} onChange={(e) => setFormData({ ...formData, machine: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="progressPercent">Tiến độ (%)</Label>
                <Input id="progressPercent" type="number" min={0} max={100} value={formData.progressPercent} onChange={(e) => setFormData({ ...formData, progressPercent: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="updatedAt">Ngày</Label>
                <Input id="updatedAt" type="date" value={formData.updatedAt} onChange={(e) => setFormData({ ...formData, updatedAt: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <Select id="status" value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as ProgressUpdateEntry['status'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">Đúng tiến độ</SelectItem>
                    <SelectItem value="delayed">Trễ</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="comment">Ghi chú</Label>
                <Textarea id="comment" rows={3} value={formData.comment} onChange={(e) => setFormData({ ...formData, comment: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit">Lưu</Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
