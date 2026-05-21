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
import type { InventoryCountEntry } from '@/types/warehouse';

const STORAGE_KEY = 'inventoryCountEntries';
const PAGE_SIZE = 8;

const defaultItems: InventoryCountEntry[] = [
  {
    id: 'count-1',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    warehouse: 'Kho 1',
    countedQuantity: 42,
    expectedQuantity: 40,
    difference: 2,
    countedAt: new Date().toISOString().slice(0, 10),
    status: 'mismatch',
    notes: 'Chênh lệch sau kiểm kê tuần 1',
  },
  {
    id: 'count-2',
    itemCode: 'SP-002',
    itemName: 'Vật tư gia công B',
    warehouse: 'Kho 2',
    countedQuantity: 12,
    expectedQuantity: 12,
    difference: 0,
    countedAt: new Date().toISOString().slice(0, 10),
    status: 'matched',
    notes: 'Đã kiểm kê',
  },
];

export function InventoryCount() {
  const [entries, setEntries] = useState<InventoryCountEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<InventoryCountEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<InventoryCountEntry, 'id' | 'difference'>>({
    itemCode: '',
    itemName: '',
    warehouse: '',
    countedQuantity: 0,
    expectedQuantity: 0,
    countedAt: new Date().toISOString().slice(0, 10),
    status: 'pending',
    notes: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<InventoryCountEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultItems);
  }, []);

  const saveEntries = (next: InventoryCountEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.warehouse.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWarehouse = warehouseFilter === 'all' || entry.warehouse === warehouseFilter;
      const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
      return matchesSearch && matchesWarehouse && matchesStatus;
    });
  }, [entries, searchTerm, warehouseFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      itemCode: '',
      itemName: '',
      warehouse: '',
      countedQuantity: 0,
      expectedQuantity: 0,
      countedAt: new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: InventoryCountEntry) => {
    setSelectedEntry(entry);
    setFormData({
      itemCode: entry.itemCode,
      itemName: entry.itemName,
      warehouse: entry.warehouse,
      countedQuantity: entry.countedQuantity,
      expectedQuantity: entry.expectedQuantity,
      countedAt: entry.countedAt,
      status: entry.status,
      notes: entry.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa phiếu kiểm kê này?')) {
      saveEntries(entries.filter((entry) => entry.id !== id));
      toast.success('Xóa kiểm kê thành công');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.itemCode.trim() || !formData.itemName.trim() || !formData.warehouse.trim()) {
      toast.error('Vui lòng điền đủ mã vật tư, tên vật tư và kho');
      return;
    }
    const difference = formData.countedQuantity - formData.expectedQuantity;
    const nextEntry: InventoryCountEntry = {
      id: selectedEntry?.id ?? buildLocalId('count'),
      ...formData,
      difference,
    };

    if (selectedEntry) {
      saveEntries(entries.map((entry) => (entry.id === selectedEntry.id ? nextEntry : entry)));
      toast.success('Cập nhật phiếu kiểm kê thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Thêm phiếu kiểm kê mới thành công');
    }

    setIsDialogOpen(false);
  };

  const warehouseOptions = Array.from(new Set(entries.map((entry) => entry.warehouse).filter(Boolean)));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Kiểm kê kho</h1>
            <p className="text-sm text-slate-600 mt-2">Ghi nhận và đối soát số lượng tồn kho thực tế.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">{entries.length} phiếu</Badge>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Thêm phiếu
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{selectedEntry ? 'Chỉnh sửa kiểm kê' : 'Thêm kiểm kê mới'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <div>
                      <Label htmlFor="warehouse">Kho</Label>
                      <Input
                        id="warehouse"
                        value={formData.warehouse}
                        onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                        placeholder="Kho 1 / Kho 2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="countedAt">Ngày kiểm kê</Label>
                      <Input
                        id="countedAt"
                        type="date"
                        value={formData.countedAt}
                        onChange={(e) => setFormData({ ...formData, countedAt: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expectedQuantity">Số lượng kỳ vọng</Label>
                      <Input
                        id="expectedQuantity"
                        type="number"
                        min={0}
                        value={formData.expectedQuantity}
                        onChange={(e) => setFormData({ ...formData, expectedQuantity: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="countedQuantity">Số lượng thực tế</Label>
                      <Input
                        id="countedQuantity"
                        type="number"
                        min={0}
                        value={formData.countedQuantity}
                        onChange={(e) => setFormData({ ...formData, countedQuantity: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">Trạng thái</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as InventoryCountEntry['status'] })}>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Đang chờ</SelectItem>
                          <SelectItem value="matched">Khớp</SelectItem>
                          <SelectItem value="mismatch">Chênh lệch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Ghi chú</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={4}
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="submit">Lưu</Button>
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Hủy
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách kiểm kê</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm mã, tên hoặc kho"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả kho</SelectItem>
                    {warehouseOptions.map((warehouse) => (
                      <SelectItem key={warehouse} value={warehouse}>{warehouse}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="pending">Đang chờ</SelectItem>
                    <SelectItem value="matched">Khớp</SelectItem>
                    <SelectItem value="mismatch">Chênh lệch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã vật tư</TableHead>
                    <TableHead>Tên vật tư</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Thực tế</TableHead>
                    <TableHead>Kỳ vọng</TableHead>
                    <TableHead>Chênh lệch</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        Không có phiếu kiểm kê phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.itemCode}</TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell>{entry.warehouse}</TableCell>
                        <TableCell>{entry.countedQuantity}</TableCell>
                        <TableCell>{entry.expectedQuantity}</TableCell>
                        <TableCell>{entry.difference}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'matched' ? 'secondary' : entry.status === 'mismatch' ? 'destructive' : 'outline'}>
                            {entry.status === 'matched' ? 'Khớp' : entry.status === 'mismatch' ? 'Chênh lệch' : 'Đang chờ'}
                          </Badge>
                        </TableCell>
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
    </div>
  );
}
