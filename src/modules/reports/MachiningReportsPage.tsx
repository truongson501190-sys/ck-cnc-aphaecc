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
import { Search, Plus, Edit3, Trash2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { buildLocalId, loadArrayFromStorage, saveArrayToStorage } from '@/lib/localStorage';
import type { ReportTemplate } from '@/types/reports';

const STORAGE_KEY = 'machiningReportTemplates';

const defaultTemplates: ReportTemplate[] = [
  {
    id: 'template-machining-1',
    name: 'Gia công theo tuần',
    description: 'Báo cáo theo tuần cho hiệu suất và tỷ lệ đạt.',
    createdAt: new Date().toISOString(),
    filterSettings: { period: '7_days', machine: 'Tất cả' },
  },
];

export function MachiningReportsPage() {
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Omit<ReportTemplate, 'id' | 'createdAt'>>({
    name: '',
    description: '',
    filterSettings: { period: '30_days', machine: 'Tất cả' },
  });

  useEffect(() => {
    const saved = loadArrayFromStorage<ReportTemplate>(STORAGE_KEY);
    setTemplates(saved.length ? saved : defaultTemplates);
  }, []);

  const saveTemplates = (next: ReportTemplate[]) => {
    saveArrayToStorage(STORAGE_KEY, next);
    setTemplates(next);
  };

  const filtered = useMemo(() => {
    return templates.filter((template) =>
      !searchTerm ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [templates, searchTerm]);

  const handleOpenNew = () => {
    setSelectedTemplate(null);
    setFormData({ name: '', description: '', filterSettings: { period: '30_days', machine: 'Tất cả' } });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setFormData({ name: template.name, description: template.description || '', filterSettings: template.filterSettings });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Xóa mẫu báo cáo này?')) {
      saveTemplates(templates.filter((item) => item.id !== id));
      toast.success('Đã xóa mẫu báo cáo');
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Tên mẫu không được để trống');
      return;
    }
    const next: ReportTemplate = {
      id: selectedTemplate?.id ?? buildLocalId('template-machining'),
      name: formData.name,
      description: formData.description,
      createdAt: selectedTemplate?.createdAt ?? new Date().toISOString(),
      filterSettings: formData.filterSettings,
    };
    if (selectedTemplate) {
      saveTemplates(templates.map((item) => (item.id === selectedTemplate.id ? next : item)));
      toast.success('Cập nhật mẫu báo cáo thành công');
    } else {
      saveTemplates([next, ...templates]);
      toast.success('Tạo mẫu báo cáo thành công');
    }
    setIsDialogOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Báo cáo gia công</h1>
            <p className="text-sm text-slate-600 mt-2">Phân tích hiệu suất gia công, tỷ lệ đạt và năng suất máy.</p>
          </div>
          <Button onClick={handleOpenNew} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tạo mẫu
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Mẫu báo cáo</CardTitle>
            <div className="relative max-w-lg">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                placeholder="Tìm mẫu báo cáo"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên mẫu</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-slate-500">
                        Không tìm thấy mẫu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>{template.name}</TableCell>
                        <TableCell>{template.description || 'Không có mô tả'}</TableCell>
                        <TableCell>{new Date(template.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                            <Trash2 className="w-4 h-4" />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Tổng quan báo cáo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Số mẫu</div>
              <div className="text-2xl font-semibold">{templates.length}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Bộ lọc điển hình</div>
              <div className="mt-2 text-slate-900">Máy: Tất cả · 30 ngày</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">Năng suất trung bình</div>
              <div className="mt-2 text-2xl font-semibold">82%</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTemplate ? 'Chỉnh sửa mẫu báo cáo' : 'Tạo mẫu báo cáo mới'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Tên mẫu</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period">Chu kỳ</Label>
                <Select id="period" value={(formData.filterSettings.period as string) ?? '30_days'} onValueChange={(value) => setFormData({ ...formData, filterSettings: { ...formData.filterSettings, period: value } })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7_days">7 ngày</SelectItem>
                    <SelectItem value="30_days">30 ngày</SelectItem>
                    <SelectItem value="90_days">90 ngày</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="machine">Máy</Label>
                <Select id="machine" value={(formData.filterSettings.machine as string) ?? 'Tất cả'} onValueChange={(value) => setFormData({ ...formData, filterSettings: { ...formData.filterSettings, machine: value } })}>
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
