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
import { Search, Plus, Edit3, Trash2, CalendarDays, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { ProductionPlanEntry } from '@/types/manufacturing';

const STORAGE_KEY = 'productionPlanEntries';
const PAGE_SIZE = 8;

const defaultPlans: ProductionPlanEntry[] = [
  {
    id: 'plan-1',
    project: 'Dự án A',
    productCode: 'SP-100',
    productName: 'Chi tiết bạc CNC',
    quantityPlanned: 250,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'planned',
    owner: 'Quản đốc',
    notes: 'Kế hoạch theo lô sản xuất tháng',
  },
  {
    id: 'plan-2',
    project: 'Dự án B',
    productCode: 'SP-200',
    productName: 'Vỏ động cơ',
    quantityPlanned: 80,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'in_progress',
    owner: 'Tổ trưởng CNC',
    notes: 'Đang thực hiện, ưu tiên nhanh giao',
  },
];

export function ProductionPlan() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ProductionPlanEntry[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ProductionPlanEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductionPlanEntry['status']>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<ProductionPlanEntry, 'id'>>({
    project: '',
    productCode: '',
    productName: '',
    quantityPlanned: 0,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    status: 'planned',
    owner: '',
    notes: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<ProductionPlanEntry>(STORAGE_KEY);
    setPlans(saved.length ? saved : defaultPlans);
  }, []);

  const savePlans = (next: ProductionPlanEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setPlans(next);
  };

  const filtered = useMemo(() => {
    return plans.filter((plan) => {
      const matchesSearch =
        !searchTerm ||
        plan.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [plans, searchTerm, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedPlan(null);
    setFormData({
      project: '',
      productCode: '',
      productName: '',
      quantityPlanned: 0,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date().toISOString().slice(0, 10),
      status: 'planned',
      owner: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (plan: ProductionPlanEntry) => {
    setSelectedPlan(plan);
    setFormData({ ...plan });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa kế hoạch này?')) {
      savePlans(plans.filter((plan) => plan.id !== id));
      toast.success('Xóa kế hoạch thành công');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.project.trim() || !formData.productCode.trim() || !formData.productName.trim() || !formData.owner.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }
    const nextPlan: ProductionPlanEntry = {
      id: selectedPlan?.id ?? buildLocalId('plan'),
      ...formData,
    };
    if (selectedPlan) {
      savePlans(plans.map((plan) => (plan.id === selectedPlan.id ? nextPlan : plan)));
      toast.success('Cập nhật kế hoạch thành công');
    } else {
      savePlans([nextPlan, ...plans]);
      toast.success('Thêm kế hoạch mới thành công');
    }
    setIsDialogOpen(false);
  };

  const statusBadge = (status: ProductionPlanEntry['status']) => {
    switch (status) {
      case 'planned':
        return <Badge variant="outline">Đã lập</Badge>;
      case 'in_progress':
        return <Badge variant="secondary">Đang chạy</Badge>;
      case 'completed':
        return <Badge variant="default">Hoàn thành</Badge>;
      case 'stopped':
        return <Badge variant="destructive">Dừng</Badge>;
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
              <h1 className="text-3xl font-bold text-slate-900">Kế hoạch sản xuất</h1>
              <p className="text-sm text-slate-600 mt-2">Tạo và quản lý kế hoạch sản xuất, tiến độ và trạng thái đơn hàng.</p>
            </div>
          </div>
          <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Thêm kế hoạch
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Thống kê</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Tổng kế hoạch</span><span>{plans.length}</span></div>
              <div className="flex justify-between"><span>Đang chạy</span><span>{plans.filter((plan) => plan.status === 'in_progress').length}</span></div>
              <div className="flex justify-between"><span>Hoàn thành</span><span>{plans.filter((plan) => plan.status === 'completed').length}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bộ lọc</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Tìm dự án / sản phẩm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="planned">Đã lập</SelectItem>
                  <SelectItem value="in_progress">Đang chạy</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="stopped">Dừng</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Kết quả</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-slate-600">
                <div>Hiển thị {filtered.length} kế hoạch</div>
                <div>{pageCount} trang</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết kế hoạch</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dự án</TableHead>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Chủ nhiệm</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                        Không tìm thấy kế hoạch.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>{plan.project}</TableCell>
                        <TableCell>{plan.productCode} · {plan.productName}</TableCell>
                        <TableCell>{plan.quantityPlanned}</TableCell>
                        <TableCell>{plan.startDate} → {plan.endDate}</TableCell>
                        <TableCell>{statusBadge(plan.status)}</TableCell>
                        <TableCell>{plan.owner}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(plan)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(plan.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-sm text-slate-600">
              <div>Hiển thị {pageItems.length} / {filtered.length} kế hoạch</div>
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
            <DialogTitle>{selectedPlan ? 'Chỉnh sửa kế hoạch' : 'Thêm kế hoạch mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project">Dự án</Label>
                <Input id="project" value={formData.project} onChange={(e) => setFormData({ ...formData, project: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="owner">Chủ nhiệm</Label>
                <Input id="owner" value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: e.target.value })} />
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
                <Label htmlFor="quantityPlanned">Số lượng</Label>
                <Input id="quantityPlanned" type="number" min={1} value={formData.quantityPlanned} onChange={(e) => setFormData({ ...formData, quantityPlanned: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="startDate">Bắt đầu</Label>
                <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="endDate">Kết thúc</Label>
                <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <Select id="status" value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as ProductionPlanEntry['status'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Đã lập</SelectItem>
                    <SelectItem value="in_progress">Đang chạy</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                    <SelectItem value="stopped">Dừng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Ghi chú</Label>
                <Textarea id="notes" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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
