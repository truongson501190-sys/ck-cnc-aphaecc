import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Filter, Edit3, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { TransactionHistoryEntry } from '@/types/warehouse';

const STORAGE_KEY = 'transactionHistoryEntries';
const PAGE_SIZE = 10;

const defaultTransactions: TransactionHistoryEntry[] = [
  {
    id: 'tx-1',
    reference: 'NK-2026-001',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    type: 'import',
    quantity: 100,
    unit: 'cái',
    warehouseTo: 'Kho 1',
    status: 'completed',
    transactionDate: new Date().toISOString().slice(0, 10),
    createdBy: 'Admin',
    notes: 'Nhập nguyên liệu lô 001',
  },
  {
    id: 'tx-2',
    reference: 'XK-2026-005',
    itemCode: 'SP-002',
    itemName: 'Chi tiết CNC B',
    type: 'export',
    quantity: 18,
    unit: 'cái',
    warehouseFrom: 'Kho 1',
    warehouseTo: 'Công trình A',
    status: 'completed',
    transactionDate: new Date().toISOString().slice(0, 10),
    createdBy: 'Kho trưởng',
    notes: 'Xuất cho đơn hàng A12',
  },
];

export function TransactionHistory() {
  const [entries, setEntries] = useState<TransactionHistoryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<TransactionHistoryEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionHistoryEntry['type']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TransactionHistoryEntry['status']>('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<TransactionHistoryEntry, 'id'>>({
    reference: '',
    itemCode: '',
    itemName: '',
    type: 'import',
    quantity: 0,
    unit: 'cái',
    warehouseFrom: '',
    warehouseTo: '',
    project: '',
    machine: '',
    status: 'draft',
    transactionDate: new Date().toISOString().slice(0, 10),
    createdBy: '',
    notes: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<TransactionHistoryEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultTransactions);
  }, []);

  const saveEntries = (next: TransactionHistoryEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.warehouseFrom?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (entry.warehouseTo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [entries, searchTerm, typeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      reference: '',
      itemCode: '',
      itemName: '',
      type: 'import',
      quantity: 0,
      unit: 'cái',
      warehouseFrom: '',
      warehouseTo: '',
      project: '',
      machine: '',
      status: 'draft',
      transactionDate: new Date().toISOString().slice(0, 10),
      createdBy: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: TransactionHistoryEntry) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
      saveEntries(entries.filter((entry) => entry.id !== id));
      toast.success('Xóa giao dịch thành công');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.reference.trim() || !formData.itemCode.trim() || !formData.itemName.trim() || !formData.createdBy.trim()) {
      toast.error('Vui lòng điền đủ thông tin bắt buộc');
      return;
    }
    const nextEntry: TransactionHistoryEntry = {
      id: selectedEntry?.id ?? buildLocalId('tx'),
      ...formData,
    };
    if (selectedEntry) {
      saveEntries(entries.map((entry) => (entry.id === selectedEntry.id ? nextEntry : entry)));
      toast.success('Cập nhật giao dịch thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Thêm giao dịch mới thành công');
    }
    setIsDialogOpen(false);
  };

  const statusBadge = (status: TransactionHistoryEntry['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Bản nháp</Badge>;
      case 'completed':
        return <Badge variant="secondary">Hoàn thành</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Hủy</Badge>;
      default:
        return <Badge>Không xác định</Badge>;
    }
  };

  const typeBadge = (type: TransactionHistoryEntry['type']) => {
    switch (type) {
      case 'import':
        return <Badge variant="secondary">Nhập</Badge>;
      case 'export':
        return <Badge variant="destructive">Xuất</Badge>;
      case 'transfer':
        return <Badge variant="outline">Chuyển</Badge>;
      case 'oil_export':
        return <Badge variant="ghost">Xuất dầu</Badge>;
      default:
        return <Badge>Không xác định</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Lịch sử giao dịch</h1>
            <p className="text-sm text-slate-600 mt-2">Xem chi tiết và quản lý các giao dịch kho đã thực hiện.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">{entries.length} giao dịch</Badge>
            <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thêm giao dịch
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách giao dịch</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm mã tham chiếu, vật tư, kho"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả loại</SelectItem>
                  <SelectItem value="import">Nhập</SelectItem>
                  <SelectItem value="export">Xuất</SelectItem>
                  <SelectItem value="transfer">Chuyển</SelectItem>
                  <SelectItem value="oil_export">Xuất dầu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="draft">Bản nháp</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="cancelled">Hủy</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Tham chiếu</TableHead>
                    <TableHead>Vật tư</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Kho Từ/Đến</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        Không có giao dịch phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.transactionDate}</TableCell>
                        <TableCell>{entry.reference}</TableCell>
                        <TableCell>{entry.itemCode} · {entry.itemName}</TableCell>
                        <TableCell>{typeBadge(entry.type)}</TableCell>
                        <TableCell>{entry.quantity} {entry.unit}</TableCell>
                        <TableCell>
                          {entry.warehouseFrom ? `Từ ${entry.warehouseFrom}` : ''}
                          {entry.warehouseTo ? <><br />Đến {entry.warehouseTo}</> : ''}
                        </TableCell>
                        <TableCell>{statusBadge(entry.status)}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
              <div>Hiển thị {pageItems.length} / {filtered.length} kết quả</div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
                  Trước
                </Button>
                <span>{page} / {pageCount}</span>
                <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}>
                  Sau
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedEntry ? 'Chỉnh sửa giao dịch' : 'Thêm giao dịch mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reference">Số tham chiếu</Label>
                <Input
                  id="reference"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="transactionDate">Ngày giao dịch</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={formData.transactionDate}
                  onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="itemCode">Mã vật tư</Label>
                <Input
                  id="itemCode"
                  value={formData.itemCode}
                  onChange={(e) => setFormData({ ...formData, itemCode: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="itemName">Tên vật tư</Label>
                <Input
                  id="itemName"
                  value={formData.itemName}
                  onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="type">Loại</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as TransactionHistoryEntry['type'] })}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="import">Nhập</SelectItem>
                    <SelectItem value="export">Xuất</SelectItem>
                    <SelectItem value="transfer">Chuyển</SelectItem>
                    <SelectItem value="oil_export">Xuất dầu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quantity">Số lượng</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={0}
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="unit">Đơn vị</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warehouseFrom">Kho từ</Label>
                <Input
                  id="warehouseFrom"
                  value={formData.warehouseFrom}
                  onChange={(e) => setFormData({ ...formData, warehouseFrom: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="warehouseTo">Kho đến / Đơn hàng</Label>
                <Input
                  id="warehouseTo"
                  value={formData.warehouseTo}
                  onChange={(e) => setFormData({ ...formData, warehouseTo: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project">Dự án</Label>
                <Input
                  id="project"
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="machine">Máy</Label>
                <Input
                  id="machine"
                  value={formData.machine}
                  onChange={(e) => setFormData({ ...formData, machine: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Trạng thái</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as TransactionHistoryEntry['status'] })}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Bản nháp</SelectItem>
                    <SelectItem value="completed">Hoàn thành</SelectItem>
                    <SelectItem value="cancelled">Hủy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="createdBy">Người tạo</Label>
                <Input
                  id="createdBy"
                  value={formData.createdBy}
                  onChange={(e) => setFormData({ ...formData, createdBy: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea
                id="notes"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit">Lưu</Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Hủy
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
