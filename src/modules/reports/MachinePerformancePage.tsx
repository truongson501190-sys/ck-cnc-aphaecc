import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit3, Trash2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { MachinePerformanceEntry } from '@/types/reports';

const STORAGE_KEY = 'machinePerformanceEntries';
const PAGE_SIZE = 8;

const defaultEntries: MachinePerformanceEntry[] = [
  {
    id: 'performance-1',
    machine: 'Máy CNC 1',
    date: new Date().toISOString().slice(0, 10),
    uptime: 92,
    downtime: 8,
    output: 46,
    qualityRate: 97,
    note: 'Hoạt động ổn định, không có dừng máy bất thường.',
  },
  {
    id: 'performance-2',
    machine: 'Máy CNC 2',
    date: new Date().toISOString().slice(0, 10),
    uptime: 86,
    downtime: 14,
    output: 38,
    qualityRate: 91,
    note: 'Có gián đoạn do điều chỉnh dao.',
  },
];

export function MachinePerformancePage() {
  const [entries, setEntries] = useState<MachinePerformanceEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MachinePerformanceEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [machineFilter, setMachineFilter] = useState('Tất cả');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<MachinePerformanceEntry, 'id'>>({
    machine: 'Máy CNC 1',
    date: new Date().toISOString().slice(0, 10),
    uptime: 0,
    downtime: 0,
    output: 0,
    qualityRate: 100,
    note: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<MachinePerformanceEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultEntries);
  }, []);

  const saveEntries = (next: MachinePerformanceEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.machine.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMachine = machineFilter === 'Tất cả' || entry.machine === machineFilter;
      return matchesSearch && matchesMachine;
    });
  }, [entries, searchTerm, machineFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      machine: 'Máy CNC 1',
      date: new Date().toISOString().slice(0, 10),
      uptime: 0,
      downtime: 0,
      output: 0,
      qualityRate: 100,
      note: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: MachinePerformanceEntry) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Xóa báo cáo hiệu suất máy này?')) {
      saveEntries(entries.filter((item) => item.id !== id));
      toast.success('Đã xóa báo cáo máy');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formData.uptime < 0 || formData.uptime > 100 || formData.downtime < 0 || formData.downtime > 100) {
      toast.error('Uptime/Downtime phải là phần trăm hợp lệ');
      return;
    }
    if (formData.qualityRate < 0 || formData.qualityRate > 100) {
      toast.error('Tỷ lệ chất lượng phải từ 0 đến 100');
      return;
    }
    const nextEntry: MachinePerformanceEntry = {
      id: selectedEntry?.id ?? buildLocalId('performance'),
      ...formData,
    };
    if (selectedEntry) {
      saveEntries(entries.map((item) => (item.id === selectedEntry.id ? nextEntry : item)));
      toast.success('Cập nhật báo cáo hiệu suất thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Tạo báo cáo hiệu suất thành công');
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Hiệu suất máy</h1>
            <p className="text-sm text-slate-600 mt-2">Quản lý hiệu suất, thời gian chạy và chất lượng máy CNC.</p>
          </div>
          <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Thêm báo cáo
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Báo cáo</span><span>{entries.length}</span></div>
              <div className="flex justify-between"><span>Uptime trung bình</span><span>{Math.round(entries.reduce((a, b) => a + b.uptime, 0) / Math.max(entries.length, 1))}%</span></div>
              <div className="flex justify-between"><span>Chất lượng trung bình</span><span>{Math.round(entries.reduce((a, b) => a + b.qualityRate, 0) / Math.max(entries.length, 1))}%</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tìm kiếm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" placeholder="Tìm máy hoặc ghi chú" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Máy</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={machineFilter} onValueChange={setMachineFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả</SelectItem>
                  <SelectItem value="Máy CNC 1">Máy CNC 1</SelectItem>
                  <SelectItem value="Máy CNC 2">Máy CNC 2</SelectItem>
                  <SelectItem value="Máy mài">Máy mài</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bảng hiệu suất máy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Máy</TableHead>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Downtime</TableHead>
                    <TableHead>Output</TableHead>
                    <TableHead>Chất lượng</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                        Không có báo cáo nào.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.machine}</TableCell>
                        <TableCell>{entry.date}</TableCell>
                        <TableCell>{entry.uptime}%</TableCell>
                        <TableCell>{entry.downtime}%</TableCell>
                        <TableCell>{entry.output}</TableCell>
                        <TableCell>{entry.qualityRate}%</TableCell>
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
            <DialogTitle>{selectedEntry ? 'Chỉnh sửa báo cáo máy' : 'Thêm báo cáo máy mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="machine">Máy</Label>
                <Select id="machine" value={formData.machine} onValueChange={(value) => setFormData({ ...formData, machine: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Máy CNC 1">Máy CNC 1</SelectItem>
                    <SelectItem value="Máy CNC 2">Máy CNC 2</SelectItem>
                    <SelectItem value="Máy mài">Máy mài</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date">Ngày</Label>
                <Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="qualityRate">Tỷ lệ chất lượng (%)</Label>
                <Input id="qualityRate" type="number" min={0} max={100} value={formData.qualityRate} onChange={(e) => setFormData({ ...formData, qualityRate: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="uptime">Uptime (%)</Label>
                <Input id="uptime" type="number" min={0} max={100} value={formData.uptime} onChange={(e) => setFormData({ ...formData, uptime: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="downtime">Downtime (%)</Label>
                <Input id="downtime" type="number" min={0} max={100} value={formData.downtime} onChange={(e) => setFormData({ ...formData, downtime: Number(e.target.value) })} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="output">Sản lượng</Label>
                <Input id="output" type="number" min={0} value={formData.output} onChange={(e) => setFormData({ ...formData, output: Number(e.target.value) })} />
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
