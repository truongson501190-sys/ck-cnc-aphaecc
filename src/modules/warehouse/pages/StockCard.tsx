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
import type { StockCardEntry } from '@/types/warehouse';

const STORAGE_KEY = 'stockCardEntries';
const PAGE_SIZE = 8;

const defaultEntries: StockCardEntry[] = [
  {
    id: 'card-1',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    warehouse: 'Kho 1',
    transactionType: 'import',
    quantity: 120,
    balanceAfter: 120,
    transactionDate: new Date().toISOString().slice(0, 10),
    reference: 'NK-2026-001',
    note: 'Nhập lô nguyên liệu đầu tháng',
  },
  {
    id: 'card-2',
    itemCode: 'SP-001',
    itemName: 'Chi tiết CNC A',
    warehouse: 'Kho 1',
    transactionType: 'export',
    quantity: 30,
    balanceAfter: 90,
    transactionDate: new Date().toISOString().slice(0, 10),
    reference: 'XK-2026-012',
    note: 'Xuất cho đơn hàng 123',
  },
];

export function StockCard() {
  const [entries, setEntries] = useState<StockCardEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<StockCardEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StockCardEntry['transactionType']>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<StockCardEntry, 'id'>>({
    itemCode: '',
    itemName: '',
    warehouse: '',
    transactionType: 'import',
    quantity: 0,
    balanceAfter: 0,
    transactionDate: new Date().toISOString().slice(0, 10),
    reference: '',
    note: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<StockCardEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultEntries);
  }, []);

  const saveEntries = (next: StockCardEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.itemCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || entry.transactionType === typeFilter;
      const matchesWarehouse = warehouseFilter === 'all' || entry.warehouse === warehouseFilter;
      return matchesSearch && matchesType && matchesWarehouse;
    });
  }, [entries, searchTerm, typeFilter, warehouseFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      itemCode: '',
      itemName: '',
      warehouse: '',
      transactionType: 'import',
      quantity: 0,
      balanceAfter: 0,
      transactionDate: new Date().toISOString().slice(0, 10),
      reference: '',
      note: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: StockCardEntry) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa dòng thẻ kho này?')) {
      saveEntries(entries.filter((entry) => entry.id !== id));
      toast.success('Xóa thẻ kho thành công');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.itemCode.trim() || !formData.itemName.trim() || !formData.warehouse.trim()) {
      toast.error('Vui lòng điền đủ mã, tên và kho');
      return;
    }
    const nextEntry: StockCardEntry = {
      id: selectedEntry?.id ?? buildLocalId('stock-card'),
      ...formData,
    };
    if (selectedEntry) {
      saveEntries(entries.map((entry) => (entry.id === selectedEntry.id ? nextEntry : entry)));
      toast.success('Cập nhật thẻ kho thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Thêm thẻ kho mới thành công');
    }
    setIsDialogOpen(false);
  };

  const warehouseOptions = Array.from(new Set(entries.map((entry) => entry.warehouse).filter(Boolean)));

  const statusBadge = (type: StockCardEntry['transactionType']) => {
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
            <h1 className="text-3xl font-bold text-slate-900">Thẻ kho</h1>
            <p className="text-sm text-slate-600 mt-2">Theo dõi dòng tồn, nhập xuất và số dư cuối kỳ cho mỗi vật tư.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="secondary">{entries.length} dòng</Badge>
            <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thêm dòng
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Danh sách thẻ kho</CardTitle>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm mã, tên, tham chiếu"
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="min-w-[160px]">
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
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Mã</TableHead>
                    <TableHead>Tên</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Số dư</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-slate-500">
                        Không có dữ liệu thẻ kho phù hợp.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.transactionDate}</TableCell>
                        <TableCell>{entry.itemCode}</TableCell>
                        <TableCell>{entry.itemName}</TableCell>
                        <TableCell>{entry.warehouse}</TableCell>
                        <TableCell>{statusBadge(entry.transactionType)}</TableCell>
                        <TableCell>{entry.quantity}</TableCell>
                        <TableCell>{entry.balanceAfter}</TableCell>
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
            <DialogTitle>{selectedEntry ? 'Chỉnh sửa thẻ kho' : 'Thêm thẻ kho mới'}</DialogTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="transactionType">Loại</Label>
                <Select value={formData.transactionType} onValueChange={(value) => setFormData({ ...formData, transactionType: value as StockCardEntry['transactionType'] })}>
                  <SelectTrigger id="transactionType">
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
                <Label htmlFor="balanceAfter">Số dư sau</Label>
                <Input
                  id="balanceAfter"
                  type="number"
                  min={0}
                  value={formData.balanceAfter}
                  onChange={(e) => setFormData({ ...formData, balanceAfter: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="reference">Số tham chiếu</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea
                id="note"
                rows={3}
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
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
