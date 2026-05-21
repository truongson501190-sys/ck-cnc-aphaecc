import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit3, Trash2, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { MaterialConsumptionEntry } from '@/types/reports';

const STORAGE_KEY = 'materialConsumptionEntries';
const PAGE_SIZE = 8;

const defaultEntries: MaterialConsumptionEntry[] = [
  {
    id: 'material-1',
    date: new Date().toISOString().slice(0, 10),
    warehouse: 'Kho thành phẩm',
    materialCode: 'VL-101',
    materialName: 'Thép SKD11',
    quantity: 240,
    unit: 'kg',
    usageType: 'Gia công',
    note: 'Sử dụng cho đơn hàng HD-2026-032',
  },
  {
    id: 'material-2',
    date: new Date().toISOString().slice(0, 10),
    warehouse: 'Kho CNC',
    materialCode: 'VL-204',
    materialName: 'Nhôm 6061',
    quantity: 75,
    unit: 'kg',
    usageType: 'Gia công vỏ',
    note: 'Dự trữ cho lệnh đóng gói',
  },
];

export function MaterialConsumptionPage() {
  const [entries, setEntries] = useState<MaterialConsumptionEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MaterialConsumptionEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<MaterialConsumptionEntry, 'id'>>({
    date: new Date().toISOString().slice(0, 10),
    warehouse: 'Kho CNC',
    materialCode: '',
    materialName: '',
    quantity: 0,
    unit: 'kg',
    usageType: '',
    note: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<MaterialConsumptionEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultEntries);
  }, []);

  const saveEntries = (next: MaterialConsumptionEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.usageType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWarehouse = warehouseFilter === 'Tất cả' || entry.warehouse === warehouseFilter;
      return matchesSearch && matchesWarehouse;
    });
  }, [entries, searchTerm, warehouseFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      warehouse: 'Kho CNC',
      materialCode: '',
      materialName: '',
      quantity: 0,
      unit: 'kg',
      usageType: '',
      note: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: MaterialConsumptionEntry) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có muốn xóa bản ghi tiêu hao này?')) {
      saveEntries(entries.filter((item) => item.id !== id));
      toast.success('Đã xóa bản ghi tiêu hao');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.materialCode.trim() || !formData.materialName.trim() || !formData.usageType.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (formData.quantity <= 0) {
      toast.error('Số lượng phải lớn hơn 0');
      return;
    }
    const nextEntry: MaterialConsumptionEntry = {
      id: selectedEntry?.id ?? buildLocalId('material'),
      ...formData,
    };
    if (selectedEntry) {
      saveEntries(entries.map((item) => (item.id === selectedEntry.id ? nextEntry : item)));
      toast.success('Cập nhật tiêu hao nguyên vật liệu thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Thêm tiêu hao nguyên vật liệu thành công');
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Tiêu hao nguyên vật liệu</h1>
            <p className="text-sm text-slate-600 mt-2">Quản lý tiêu hao vật liệu theo kho và lệnh sản xuất.</p>
          </div>
          <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Thêm tiêu hao
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tiêu hao</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Đầu mục</span><span>{entries.length}</span></div>
              <div className="flex justify-between"><span>Tổng số lượng</span><span>{entries.reduce((sum, entry) => sum + entry.quantity, 0)} kg</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tìm kiếm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" placeholder="Mã/SP/Loại" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kho</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả</SelectItem>
                  <SelectItem value="Kho CNC">Kho CNC</SelectItem>
                  <SelectItem value="Kho thành phẩm">Kho thành phẩm</SelectItem>
                  <SelectItem value="Kho vật tư">Kho vật tư</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bảng tiêu hao vật liệu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Mã vật liệu</TableHead>
                    <TableHead>Tên vật liệu</TableHead>
                    <TableHead>Kho</TableHead>
                    <TableHead>Số lượng</TableHead>
                    <TableHead>Loại sử dụng</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                        Không có bản ghi nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.materialCode}</TableCell>
                        <TableCell>{entry.materialName}</TableCell>
                        <TableCell>{entry.warehouse}</TableCell>
                        <TableCell>{entry.quantity} {entry.unit}</TableCell>
                        <TableCell>{entry.usageType}</TableCell>
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
            <DialogTitle>{selectedEntry ? 'Sửa tiêu hao vật liệu' : 'Thêm tiêu hao vật liệu'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">Ngày</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="warehouse">Kho</Label>
                <Select id="warehouse" value={formData.warehouse} onValueChange={(value) => setFormData({ ...formData, warehouse: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kho CNC">Kho CNC</SelectItem>
                    <SelectItem value="Kho thành phẩm">Kho thành phẩm</SelectItem>
                    <SelectItem value="Kho vật tư">Kho vật tư</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="usageType">Loại sử dụng</Label>
                <Input id="usageType" value={formData.usageType} onChange={(e) => setFormData({ ...formData, usageType: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="materialCode">Mã vật liệu</Label>
                <Input id="materialCode" value={formData.materialCode} onChange={(e) => setFormData({ ...formData, materialCode: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="materialName">Tên vật liệu</Label>
                <Input id="materialName" value={formData.materialName} onChange={(e) => setFormData({ ...formData, materialName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="quantity">Số lượng</Label>
                <Input id="quantity" type="number" min={0} value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label htmlFor="note">Ghi chú</Label>
              <Textarea id="note" rows={3} value={formData.note} onChange={(e) => setFormData({ ...formData, note: e.target.value })} />
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
