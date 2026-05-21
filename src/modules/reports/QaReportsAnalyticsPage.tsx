import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Edit3, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { QaReportEntry } from '@/types/reports';

const STORAGE_KEY = 'qaReportEntries';
const PAGE_SIZE = 8;

const defaultEntries: QaReportEntry[] = [
  {
    id: 'qa-1',
    inspectionDate: new Date().toISOString().slice(0, 10),
    orderNumber: 'HD-2026-001',
    inspectionType: 'Kiểm tra đầu vào',
    result: 'passed',
    defectCount: 0,
    inspector: 'Lê Thị C',
    notes: 'Sản phẩm đạt tiêu chuẩn đầu vào.',
  },
  {
    id: 'qa-2',
    inspectionDate: new Date().toISOString().slice(0, 10),
    orderNumber: 'HD-2026-014',
    inspectionType: 'Kiểm tra giữa quá trình',
    result: 'failed',
    defectCount: 3,
    inspector: 'Nguyễn Văn D',
    notes: 'Phát hiện nhiều vết xước, cần điều chỉnh dao.',
  },
];

export function QaReportsAnalyticsPage() {
  const [entries, setEntries] = useState<QaReportEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<QaReportEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<QaReportEntry, 'id'>>({
    inspectionDate: new Date().toISOString().slice(0, 10),
    orderNumber: '',
    inspectionType: 'Kiểm tra đầu vào',
    result: 'passed',
    defectCount: 0,
    inspector: '',
    notes: '',
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<QaReportEntry>(STORAGE_KEY);
    setEntries(saved.length ? saved : defaultEntries);
  }, []);

  const saveEntries = (next: QaReportEntry[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setEntries(next);
  };

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const matchesSearch =
        !searchTerm ||
        entry.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.inspector.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.inspectionType.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResult = resultFilter === 'all' || entry.result === resultFilter;
      return matchesSearch && matchesResult;
    });
  }, [entries, searchTerm, resultFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openNewDialog = () => {
    setSelectedEntry(null);
    setFormData({
      inspectionDate: new Date().toISOString().slice(0, 10),
      orderNumber: '',
      inspectionType: 'Kiểm tra đầu vào',
      result: 'passed',
      defectCount: 0,
      inspector: '',
      notes: '',
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: QaReportEntry) => {
    setSelectedEntry(entry);
    setFormData({ ...entry });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Xóa báo cáo QC này?')) {
      saveEntries(entries.filter((item) => item.id !== id));
      toast.success('Đã xóa báo cáo QC');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.orderNumber.trim() || !formData.inspector.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (formData.defectCount < 0) {
      toast.error('Số lượng lỗi không thể âm');
      return;
    }
    const nextEntry: QaReportEntry = {
      id: selectedEntry?.id ?? buildLocalId('qa'),
      ...formData,
    };
    if (selectedEntry) {
      saveEntries(entries.map((item) => (item.id === selectedEntry.id ? nextEntry : item)));
      toast.success('Cập nhật báo cáo QC thành công');
    } else {
      saveEntries([nextEntry, ...entries]);
      toast.success('Tạo báo cáo QC thành công');
    }
    setIsDialogOpen(false);
  };

  const badgeVariant = (result: QaReportEntry['result']) => {
    return result === 'passed' ? 'success' : 'destructive';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Báo cáo QC</h1>
            <p className="text-sm text-slate-600 mt-2">Xem và quản lý kết quả kiểm tra chất lượng sản phẩm.</p>
          </div>
          <Button onClick={openNewDialog} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Thêm báo cáo
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span>Tổng báo cáo</span><span>{entries.length}</span></div>
              <div className="flex justify-between"><span>Passed</span><span>{entries.filter((item) => item.result === 'passed').length}</span></div>
              <div className="flex justify-between"><span>Failed</span><span>{entries.filter((item) => item.result === 'failed').length}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tìm kiếm</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input className="pl-10" placeholder="Mã đơn / kiểm tra / người" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kết quả</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={resultFilter} onValueChange={setResultFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Danh sách báo cáo QC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead>Đơn hàng</TableHead>
                    <TableHead>Loại kiểm tra</TableHead>
                    <TableHead>Kết quả</TableHead>
                    <TableHead>Lỗi</TableHead>
                    <TableHead>Người kiểm tra</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                        Không có báo cáo QC.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pageItems.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.inspectionDate}</TableCell>
                        <TableCell>{entry.orderNumber}</TableCell>
                        <TableCell>{entry.inspectionType}</TableCell>
                        <TableCell>
                          <Badge variant={badgeVariant(entry.result)}>{entry.result === 'passed' ? 'Passed' : 'Failed'}</Badge>
                        </TableCell>
                        <TableCell>{entry.defectCount}</TableCell>
                        <TableCell>{entry.inspector}</TableCell>
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
            <DialogTitle>{selectedEntry ? 'Chỉnh sửa báo cáo QC' : 'Thêm báo cáo QC mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inspectionDate">Ngày kiểm tra</Label>
                <Input id="inspectionDate" type="date" value={formData.inspectionDate} onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="orderNumber">Đơn hàng</Label>
                <Input id="orderNumber" value={formData.orderNumber} onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="inspectionType">Loại kiểm tra</Label>
                <Select id="inspectionType" value={formData.inspectionType} onValueChange={(value) => setFormData({ ...formData, inspectionType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Kiểm tra đầu vào">Kiểm tra đầu vào</SelectItem>
                    <SelectItem value="Kiểm tra giữa quá trình">Kiểm tra giữa quá trình</SelectItem>
                    <SelectItem value="Kiểm tra hoàn chỉnh">Kiểm tra hoàn chỉnh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="result">Kết quả</Label>
                <Select id="result" value={formData.result} onValueChange={(value) => setFormData({ ...formData, result: value as QaReportEntry['result'] })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">Passed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defectCount">Số lỗi</Label>
                <Input id="defectCount" type="number" min={0} value={formData.defectCount} onChange={(e) => setFormData({ ...formData, defectCount: Number(e.target.value) })} />
              </div>
              <div>
                <Label htmlFor="inspector">Người kiểm tra</Label>
                <Input id="inspector" value={formData.inspector} onChange={(e) => setFormData({ ...formData, inspector: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea id="notes" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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
